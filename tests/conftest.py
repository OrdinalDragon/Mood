"""Configuración de tests: entorno seguro y sin dependencias externas."""

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Debe estar definido antes de importar app.routes.auth (falla cerrado sin secreto).
# Se asignan de forma explicita: docker-compose puede dejar estas variables
# definidas pero vacias, y setdefault no reemplaza una cadena vacia.
os.environ["JWT_SECRET"] = "test-only-secret-" + "a" * 48
os.environ["JWT_ISSUER"] = "mood-tests"
os.environ["JWT_AUDIENCE"] = "mood-tests"
os.environ["MONGO_URI"] = "mongodb://127.0.0.1:27017/mood_test"
os.environ["MONGO_DB_NAME"] = "mood_test"
os.environ["FRONTEND_URL"] = "http://localhost"

# upload.py crea el directorio al importarse; en CI /app no es escribible.
os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="mood-uploads-"))
