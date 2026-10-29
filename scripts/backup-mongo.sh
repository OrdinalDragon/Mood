#!/usr/bin/env bash
# ============================================================
# backup-mongo.sh - Backup cifrado de MongoDB para MOOD
# ============================================================
# Requiere: docker compose, mongodump dentro del contenedor mongo,
# age (recomendado) o gpg, y opcionalmente rclone.
#
# Uso:
#   AGE_RECIPIENT=age1... ./scripts/backup-mongo.sh
#   GPG_RECIPIENT=backup@example.com ENCRYPTION=gpg ./scripts/backup-mongo.sh
#
# Guarda en ./backups (ignorado por git) y cifra antes de escribir en disco.
set -Eeuo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-$PWD/backups}"
DATABASE="${DATABASE:-mood_db}"
ENCRYPTION="${ENCRYPTION:-age}"
AGE_RECIPIENT="${AGE_RECIPIENT:-}"
GPG_RECIPIENT="${GPG_RECIPIENT:-}"
DAILY_RETENTION="${DAILY_RETENTION:-14}"
WEEKLY_RETENTION="${WEEKLY_RETENTION:-8}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTAINER_PATH="/tmp/mood-${STAMP}.archive.gz"
RAW="${OUTPUT_DIR}/.mood-${STAMP}.archive.gz"
if [[ "$ENCRYPTION" == "age" ]]; then
  EXT="age"
else
  EXT="gpg"
fi
ENCRYPTED="${OUTPUT_DIR}/mood-${STAMP}.archive.gz.${EXT}"

cleanup() {
  rm -f "$RAW"
  docker compose exec -T mongo rm -f "$CONTAINER_PATH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

case "$ENCRYPTION" in
  age)
    command -v age >/dev/null || { echo "Falta age en PATH" >&2; exit 1; }
    [[ -n "$AGE_RECIPIENT" ]] || { echo "Definí AGE_RECIPIENT" >&2; exit 1; }
    ;;
  gpg)
    command -v gpg >/dev/null || { echo "Falta gpg en PATH" >&2; exit 1; }
    [[ -n "$GPG_RECIPIENT" ]] || { echo "Definí GPG_RECIPIENT" >&2; exit 1; }
    ;;
  *)
    echo "ENCRYPTION debe ser age o gpg" >&2
    exit 1
    ;;
esac

mkdir -p "$OUTPUT_DIR" "$OUTPUT_DIR/weekly"

if ! docker compose ps --services --filter "status=running" | grep -qx "mongo"; then
  echo "El servicio mongo no está corriendo." >&2
  exit 1
fi

echo "Generando dump de '$DATABASE'..."
docker compose exec -T \
  -e "DB_NAME=$DATABASE" \
  -e "MONGO_DUMP_PATH=$CONTAINER_PATH" \
  mongo sh -c 'mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$DB_NAME" --archive="$MONGO_DUMP_PATH" --gzip'

docker compose cp "mongo:$CONTAINER_PATH" "$RAW" >/dev/null
[[ -s "$RAW" ]] || { echo "El dump está vacío" >&2; exit 1; }
[[ "$(stat -c%s "$RAW" 2>/dev/null || stat -f%z "$RAW")" -ge 1024 ]] || {
  echo "El dump es sospechosamente pequeño" >&2
  exit 1
}

echo "Cifrando con $ENCRYPTION..."
if [[ "$ENCRYPTION" == "age" ]]; then
  age --recipient "$AGE_RECIPIENT" --output "$ENCRYPTED" "$RAW"
else
  gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" \
    --output "$ENCRYPTED" --encrypt "$RAW"
fi

[[ -s "$ENCRYPTED" ]] || { echo "El cifrado falló" >&2; exit 1; }
echo "Backup creado: $ENCRYPTED"

# Retención diaria: últimos N archivos.
mapfile -t ALL < <(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "mood-*.archive.gz.${EXT}" -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)
if (( ${#ALL[@]} > DAILY_RETENTION )); then
  printf '%s\n' "${ALL[@]:DAILY_RETENTION}" | xargs -r rm -f
fi

# Retención semanal: una copia por semana ISO, hasta N semanas.
declare -A seen=()
for file in "${ALL[@]:0:DAILY_RETENTION}"; do
  [[ -f "$file" ]] || continue
  week="$(date -u -r "$file" +%G-%V)"
  if [[ -z "${seen[$week]:-}" ]]; then
    seen[$week]=1
    cp -p "$file" "$OUTPUT_DIR/weekly/$(basename "$file")"
  fi
done
find "$OUTPUT_DIR/weekly" -maxdepth 1 -type f -name "mood-*.archive.gz.${EXT}" -printf '%T@ %p\n' 2>/dev/null |
  sort -rn | cut -d' ' -f2- | tail -n "+$((WEEKLY_RETENTION + 1))" | xargs -r rm -f

if [[ -n "$RCLONE_REMOTE" ]]; then
  command -v rclone >/dev/null || { echo "Falta rclone en PATH" >&2; exit 1; }
  echo "Copiando a $RCLONE_REMOTE..."
  rclone copy "$ENCRYPTED" "$RCLONE_REMOTE" --immutable
fi

echo "Retención: ${DAILY_RETENTION} diarios / ${WEEKLY_RETENTION} semanales."
