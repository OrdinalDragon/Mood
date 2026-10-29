#!/bin/sh
set -e

mkdir -p /app/uploads
# El bind mount de uploads puede pertenecer a root: lo cedemos al usuario sin privilegios.
chown -R appuser:appuser /app/uploads 2>/dev/null || true

exec gosu appuser "$@"
