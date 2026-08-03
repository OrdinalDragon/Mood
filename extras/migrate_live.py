# ===========================================================
# migrate_live.py - Migrar datos desde MariaDB (live) a MongoDB
# ===========================================================
# Uso: python migrate_live.py
# ===========================================================

import json

try:
    import pymysql
    from pymongo import MongoClient
    from pymongo.errors import DuplicateKeyError
except ImportError as e:
    print(f"ERROR: {e}")
    print("Ejecutá: pip install pymysql pymongo")
    exit(1)

MYSQL_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "mood_user",
    "password": "mood_password",
    "database": "mood_db",
}
MONGO_URI = "mongodb://mood_user:mood_password@localhost:27017/mood_db?authSource=admin"


def j(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


def rows_to_dicts(cursor):
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def main():
    print("=" * 60)
    print("MOOD - Migracion MariaDB -> MongoDB")
    print("=" * 60)

    print("\n[1/4] Conectando a MariaDB (localhost:3306)...")
    try:
        mysql_conn = pymysql.connect(**MYSQL_CONFIG, charset="utf8mb4")
        cur = mysql_conn.cursor()
        print("  OK")
    except Exception as e:
        print(f"  ERROR: {e}")
        return

    print("\n[2/4] Conectando a MongoDB (localhost:27017)...")
    try:
        mc = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        mc.admin.command("ping")
        db = mc["mood_db"]
        print("  OK")
    except Exception as e:
        print(f"  ERROR: {e}")
        mysql_conn.close()
        return

    ev_col = db["events"]
    us_col = db["users"]

    print("\n[3/4] Migrando eventos...")
    cur.execute("SELECT * FROM events")
    rows = rows_to_dicts(cur)
    print(f"  Leidos {len(rows)} eventos")

    ins = 0
    skp = 0
    for r in rows:
        doc = {
            "_id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "date": r["date"],
            "end_date": r["end_date"],
            "location": j(r["location"]) or {},
            "category": j(r["category"]) or [],
            "categories": j(r["categories"]) or [],
            "status": r["status"] or "pending",
            "created_by": r["created_by"],
            "author_name": r["author_name"] or "",
            "moods": j(r.get("moods")) or [],
            "is_recurring": bool(r["is_recurring"]),
            "recurrence_rule": r["recurrence_rule"],
            "image_url": r["image_url"],
            "cover_image": r.get("cover_image"),
            "images": j(r.get("images")) or [],
            "is_free": bool(r.get("is_free", False)),
            "is_outdoor": bool(r.get("is_outdoor", False)),
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        try:
            ev_col.insert_one(doc)
            ins += 1
        except DuplicateKeyError:
            skp += 1

    print(f"  Insertados: {ins}, omitidos: {skp}")

    print("\n[4/4] Migrando usuarios...")
    cur.execute("SELECT * FROM users")
    rows = rows_to_dicts(cur)
    print(f"  Leidos {len(rows)} usuarios")

    ins = 0
    skp = 0
    for r in rows:
        doc = {
            "uid": r["uid"],
            "email": r["email"],
            "password_hash": r["password_hash"],
            "display_name": r["display_name"],
            "photo_url": r["photo_url"],
            "role": r["role"] or "user",
            "email_verified": r.get("email_verified") or "0",
            "verification_token": r.get("verification_token"),
            "created_at": r["created_at"],
        }
        try:
            us_col.insert_one(doc)
            ins += 1
        except DuplicateKeyError:
            skp += 1

    print(f"  Insertados: {ins}, omitidos: {skp}")

    print(f"\n{'=' * 60}")
    print(f"MIGRACION COMPLETADA")
    print(f"{'=' * 60}")
    print(f"  Eventos en MongoDB: {ev_col.count_documents({})}")
    print(f"  Usuarios en MongoDB: {us_col.count_documents({})}")

    cur.close()
    mysql_conn.close()
    mc.close()


if __name__ == "__main__":
    main()
