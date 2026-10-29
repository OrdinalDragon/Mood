#!/usr/bin/env bash
# ============================================================
# restore-mongo.sh - Restauración de un backup cifrado de MOOD
# ============================================================
# !!! DESTRUCTIVO: --drop sobre la base indicada. !!!
#
# Uso:
#   AGE_IDENTITY_FILE=/ruta/age-key.txt ./scripts/restore-mongo.sh backups/mood-....age --confirm
#   ENCRYPTION=gpg ./scripts/restore-mongo.sh backups/mood-....gpg --confirm
#
# Recomendación: probar en una base distinta (DATABASE=mood_restore_test).
set -Eeuo pipefail

ARCHIVE="${1:-}"
shift || true
CONFIRM="${1:-}"
DATABASE="${DATABASE:-mood_db}"
SOURCE_DATABASE="${SOURCE_DATABASE:-mood_db}"
ENCRYPTION="${ENCRYPTION:-age}"
CONTAINER_PATH="/tmp/mood-restore.archive.gz"
TEMP="$(mktemp "${TMPDIR:-/tmp}/mood-restore-XXXXXX.archive.gz")"

cleanup() {
  rm -f "$TEMP"
  docker compose exec -T mongo rm -f "$CONTAINER_PATH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

[[ -n "$ARCHIVE" && -f "$ARCHIVE" ]] || { echo "Uso: $0 <archivo> --confirm" >&2; exit 1; }
[[ "$CONFIRM" == "--confirm" ]] || { echo "Restauración destructiva. Pasá --confirm." >&2; exit 1; }

if [[ "$ENCRYPTION" == "age" ]]; then
  command -v age >/dev/null || { echo "Falta age" >&2; exit 1; }
  [[ -n "${AGE_IDENTITY_FILE:-}" ]] || { echo "Definí AGE_IDENTITY_FILE" >&2; exit 1; }
  age --decrypt --identity "$AGE_IDENTITY_FILE" --output "$TEMP" "$ARCHIVE"
else
  command -v gpg >/dev/null || { echo "Falta gpg" >&2; exit 1; }
  gpg --batch --yes --output "$TEMP" --decrypt "$ARCHIVE"
fi

[[ -s "$TEMP" ]] || { echo "El backup descifrado está vacío" >&2; exit 1; }

docker compose cp "$TEMP" "mongo:$CONTAINER_PATH" >/dev/null

echo "Restaurando '$SOURCE_DATABASE' -> '$DATABASE' (--drop)..."
docker compose exec -T \
  -e "DB_NAME=$DATABASE" \
  -e "SOURCE_DB=$SOURCE_DATABASE" \
  -e "MONGO_RESTORE_PATH=$CONTAINER_PATH" \
  mongo sh -c 'mongorestore --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive="$MONGO_RESTORE_PATH" --gzip --drop --nsFrom "$SOURCE_DB.*" --nsTo "$DB_NAME.*"'

echo "Restauración completada. Verificá la app y los índices."
