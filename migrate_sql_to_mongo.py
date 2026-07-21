# ===========================================================
# migrate_sql_to_mongo.py - Migrar datos de MariaDB SQL a MongoDB
# ===========================================================
# Uso:
#   1. docker-compose up -d mongo (levantar MongoDB)
#   2. pip install pymongo
#   3. python migrate_sql_to_mongo.py
# ===========================================================

import re
import json
from datetime import datetime
from urllib.parse import quote_plus

try:
    from pymongo import MongoClient
    from pymongo.errors import DuplicateKeyError
except ImportError:
    print("ERROR: Se necesita pymongo. Ejecutá: pip install pymongo")
    exit(1)

# ===========================================================
# CONFIGURACIÓN
# ===========================================================
SQL_FILE = "mood_db_backup.sql"
MONGO_URI = "mongodb://mood_user:mood_password@localhost:27017/mood_db?authSource=admin"
MONGO_DB = "mood_db"

# ===========================================================
# PARSER SQL (mysqldump INSERT VALUES)
# ===========================================================


def parse_sql_value(value_str):
    """Convierte un string SQL a valor Python."""
    value_str = value_str.strip()
    if value_str == "NULL":
        return None
    # String
    if value_str.startswith("'") and value_str.endswith("'"):
        s = value_str[1:-1]
        # Unescape SQL escapes
        s = s.replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")
        # Try parsing as JSON
        if s.startswith("{") or s.startswith("["):
            try:
                return json.loads(s)
            except json.JSONDecodeError:
                pass
        return s
    # Number
    try:
        if "." in value_str:
            return float(value_str)
        return int(value_str)
    except ValueError:
        return value_str


def parse_sql_values_section(text):
    """Parsea el bloque de VALUES de un INSERT de mysqldump.
    Ej: (1,'a'),(2,'b'),(3,'c');
    Retorna lista de listas de valores.
    """
    text = text.strip()
    # Remover trailing ;
    if text.endswith(";"):
        text = text[:-1]

    rows = []
    i = 0
    while i < len(text):
        # Skip whitespace and commas between rows
        while i < len(text) and text[i] in " ,\n\r\t":
            i += 1
        if i >= len(text):
            break

        # Expect opening paren
        if text[i] != "(":
            print(f"WARNING: Expected '(' at position {i}, found '{text[i]}'")
            i += 1
            continue
        i += 1  # skip (

        values = []
        current = ""
        in_string = False
        paren_depth = 0

        while i < len(text):
            ch = text[i]

            if ch == "\\" and in_string:
                current += ch + text[i + 1] if i + 1 < len(text) else ch
                i += 2
                continue

            if ch == "'":
                in_string = not in_string
                current += ch
                i += 1
                continue

            if not in_string:
                if ch == "(":
                    paren_depth += 1
                    current += ch
                    i += 1
                    continue
                if ch == ")":
                    if paren_depth > 0:
                        paren_depth -= 1
                        current += ch
                        i += 1
                        continue
                    # End of row
                    if current.strip():
                        values.append(parse_sql_value(current))
                    rows.append(values)
                    i += 1  # skip )
                    break
                if ch == "," and paren_depth == 0:
                    if current.strip():
                        values.append(parse_sql_value(current))
                    current = ""
                    i += 1
                    continue

            current += ch
            i += 1

    return rows


def extract_insert_data(sql, table_name):
    """Extrae los datos INSERT de una tabla desde el SQL dump."""
    pattern = rf"INSERT INTO `{table_name}` VALUES\s*(.+?);"
    m = re.search(pattern, sql, re.DOTALL)
    if m:
        return parse_sql_values_section(m.group(1))
    return []


# ===========================================================
# MIGRACIÓN
# ===========================================================


def migrate_events(collection, sql_data):
    """Migra eventos de SQL a MongoDB."""
    print(f"Migrando {len(sql_data)} eventos...")
    inserted = 0
    skipped = 0

    for row in sql_data:
        if len(row) < 20:
            print(f"  WARNING: fila con {len(row)} valores, esperado 20. Saltando.")
            skipped += 1
            continue

        doc = {
            "_id": row[0],  # id as string
            "title": row[1],
            "description": row[2],
            "date": row[3],
            "end_date": row[4],
            "location": row[5] if isinstance(row[5], dict) else {},
            "category": row[6] if isinstance(row[6], list) else ([row[6]] if row[6] else []),
            "categories": row[7] if isinstance(row[7], list) else [],
            "status": row[8] or "pending",
            "created_by": row[9],
            "author_name": row[10] or "",
            "is_recurring": bool(row[12]) if row[12] else False,
            "recurrence_rule": row[13],
            "image_url": row[14],
            "cover_image": None,
            "images": [],
            "moods": [],
            "is_free": False,
            "is_outdoor": False,
            "created_at": row[15],
            "updated_at": row[16],
        }

        try:
            collection.insert_one(doc)
            inserted += 1
        except DuplicateKeyError:
            skipped += 1

    print(f"  Insertados: {inserted}, omitidos (dupes): {skipped}")


def migrate_users(collection, sql_data):
    """Migra usuarios de SQL a MongoDB."""
    print(f"Migrando {len(sql_data)} usuarios...")
    inserted = 0
    skipped = 0

    for row in sql_data:
        if len(row) < 9:
            print(f"  WARNING: fila con {len(row)} valores, esperado 9. Saltando.")
            skipped += 1
            continue

        doc = {
            "uid": row[0],
            "email": row[1],
            "password_hash": row[2],
            "display_name": row[3],
            "photo_url": row[4],
            "role": row[5] or "user",
            "favorites": row[6] if isinstance(row[6], list) else [],
            "email_verified": "0",
            "verification_token": None,
            "created_at": row[7],
        }

        try:
            collection.insert_one(doc)
            inserted += 1
        except DuplicateKeyError:
            skipped += 1

    print(f"  Insertados: {inserted}, omitidos (dupes): {skipped}")


# ===========================================================
# MAIN
# ===========================================================


def main():
    print("=" * 60)
    print("MOOD - Migración MariaDB → MongoDB")
    print("=" * 60)

    # 1. Leer SQL
    print(f"\n[1/4] Leyendo backup SQL: {SQL_FILE}")
    with open(SQL_FILE, "r", encoding="utf-16-le") as f:
        sql = f.read()
    print(f"  Tamaño: {len(sql)} bytes")

    # 2. Parsear datos
    print(f"\n[2/4] Parseando datos SQL...")
    events_data = extract_insert_data(sql, "events")
    users_data = extract_insert_data(sql, "users")
    print(f"  Eventos: {len(events_data)} filas")
    print(f"  Usuarios: {len(users_data)} filas")

    if not events_data:
        print("  ERROR: No se encontraron eventos en el backup.")
        return

    # 3. Conectar a MongoDB
    print(f"\n[3/4] Conectando a MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print("  Conexión exitosa.")
    except Exception as e:
        print(f"  ERROR: No se pudo conectar a MongoDB: {e}")
        print("  Asegurate de que MongoDB esté corriendo:")
        print("    docker-compose up -d mongo")
        return

    db = client[MONGO_DB]
    events_coll = db["events"]
    users_coll = db["users"]

    # 4. Migrar
    print(f"\n[4/4] Migrando datos...")
    migrate_events(events_coll, events_data)
    migrate_users(users_coll, users_data)

    # 5. Resumen
    print(f"\n{'=' * 60}")
    print(f"MIGRACIÓN COMPLETADA")
    print(f"{'=' * 60}")
    print(f"  Eventos en MongoDB: {events_coll.count_documents({})}")
    print(f"  Usuarios en MongoDB: {users_coll.count_documents({})}")

    client.close()


if __name__ == "__main__":
    main()
