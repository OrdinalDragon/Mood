#!/usr/bin/env bash
# ============================================================
# healthcheck.sh - Chequeo operativo de MOOD
# ============================================================
# Uso:
#   ./scripts/healthcheck.sh
#   PUBLIC_URL=https://prototipomood.jesrepresentaciones.com.ar REQUIRE_BACKUP=1 ./scripts/healthcheck.sh
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1}"
PUBLIC_URL="${PUBLIC_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
REQUIRE_BACKUP="${REQUIRE_BACKUP:-0}"
MIN_FREE_GB="${MIN_FREE_GB:-5}"

FAILURES=0
WARNINGS=0

ok()   { printf 'OK    %s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf 'FAIL  %s\n' "$*"; FAILURES=$((FAILURES + 1)); }

# Contenedores
if ! status="$(docker compose ps --format '{{.Service}}|{{.Status}}' 2>/dev/null)"; then
  fail "no se pudo consultar Docker"
else
  for service in mongo backend frontend nginx cloudflare; do
    line="$(printf '%s\n' "$status" | grep -E "^${service}\|" || true)"
    if [[ -z "$line" ]]; then
      fail "contenedor $service no está corriendo"
    elif [[ "$line" != *"Up"* && "$line" != *"healthy"* ]]; then
      fail "contenedor $service en estado: ${line#*|}"
    else
      ok "contenedor $service: ${line#*|}"
    fi
  done
fi

# API local
if code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL/api/health" 2>/dev/null)"; then
  [[ "$code" == "200" ]] && ok "API /api/health 200" || fail "API /api/health devolvió $code"
else
  fail "API /api/health inaccesible"
fi

headers="$(curl -sSI --max-time 10 "$BASE_URL/" 2>/dev/null || true)"
if [[ "$headers" == HTTP/*" 200"* ]]; then
  if printf '%s' "$headers" | grep -qi '^content-security-policy:'; then
    ok "frontend local 200 con CSP"
  else
    fail "frontend local sin Content-Security-Policy"
  fi
else
  fail "frontend local inaccesible"
fi

# Sitio público
if [[ -n "$PUBLIC_URL" ]]; then
  if public_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL" 2>/dev/null)"; then
    [[ "$public_code" == "200" ]] && ok "sitio público 200" || fail "sitio público devolvió $public_code"
    if ! curl -sSI --max-time 20 "$PUBLIC_URL" 2>/dev/null | grep -qi '^strict-transport-security:'; then
      warn "sitio público sin HSTS"
    fi
  else
    fail "sitio público inaccesible"
  fi
fi

# Disco
free_kb="$(df -Pk "$PWD" | awk 'NR==2 {print $4}')"
free_gb=$((free_kb / 1024 / 1024))
if (( free_gb < MIN_FREE_GB )); then
  fail "poco espacio libre: ${free_gb} GB (mínimo ${MIN_FREE_GB} GB)"
else
  ok "espacio libre: ${free_gb} GB"
fi

# Backup reciente
latest="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mood-*.archive.gz.*' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -n1 | cut -d' ' -f2- || true)"
if [[ -z "$latest" ]]; then
  if [[ "$REQUIRE_BACKUP" == "1" ]]; then fail "no hay backups en $BACKUP_DIR"; else warn "no hay backups en $BACKUP_DIR"; fi
elif [[ -n "$(find "$latest" -mmin +1560 2>/dev/null)" ]]; then
  if [[ "$REQUIRE_BACKUP" == "1" ]]; then fail "el último backup tiene más de 26 h"; else warn "el último backup tiene más de 26 h"; fi
else
  ok "último backup: $latest"
fi

if (( FAILURES > 0 )); then
  printf '\n%d fallo(s), %d advertencia(s).\n' "$FAILURES" "$WARNINGS"
  exit 1
fi
printf '\nTodo OK (%d advertencia(s)).\n' "$WARNINGS"
