#!/usr/bin/env bash
# ============================================================
# harden-env.sh - Permisos mínimos para .env en Linux/macOS
# ============================================================
# Deja .env en 600 y propiedad del usuario actual. No imprime su contenido.
set -Eeuo pipefail

ENV_FILE="${1:-$PWD/.env}"
[[ -f "$ENV_FILE" ]] || { echo "No existe $ENV_FILE" >&2; exit 1; }

chmod 600 "$ENV_FILE"
if command -v chown >/dev/null; then
  chown "$(id -u):$(id -g)" "$ENV_FILE"
fi

echo "Permisos de $ENV_FILE: $(stat -c '%a %U:%G' "$ENV_FILE" 2>/dev/null || stat -f '%Lp %Su:%Sg' "$ENV_FILE")"

if git check-ignore -q -- "$ENV_FILE"; then
  echo ".env está ignorado por git."
else
  echo "ADVERTENCIA: .env NO está ignorado por git." >&2
fi

jwt="$(grep -E '^JWT_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"
if [[ -z "$jwt" ]]; then
  echo "ADVERTENCIA: no se encontró JWT_SECRET." >&2
elif (( ${#jwt} < 32 )); then
  echo "ADVERTENCIA: JWT_SECRET tiene menos de 32 caracteres. Rotarlo con: openssl rand -hex 32" >&2
fi

echo "Recordá guardar la clave privada age/GPG fuera del servidor o en un gestor de secretos."
