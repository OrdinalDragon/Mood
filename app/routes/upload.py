import os
import uuid
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.routes.auth import get_current_user
from app.models import User
from PIL import Image

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError:
    # En CI el path por defecto puede no ser escribible; los tests usan UPLOAD_DIR.
    pass

# Límite duro para todos los usuarios (incluidos admins).
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_DIMENSION = 1920
WEBP_QUALITY = 80
READ_CHUNK_SIZE = 1024 * 1024  # 1 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}

# Evita "bombas de descompresión": imágenes con millones de píxeles.
Image.MAX_IMAGE_PIXELS = 40_000_000


async def _read_limited(file: UploadFile, limit: int) -> bytes:
    """Lee el archivo por chunks y corta si supera el límite (sin cargar todo en memoria)."""
    data = bytearray()
    while True:
        chunk = await file.read(READ_CHUNK_SIZE)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > limit:
            raise HTTPException(
                status_code=413,
                detail="La imagen supera el tamaño máximo permitido (10MB).",
            )
    if not data:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    return bytes(data)


def _validate_image(contents: bytes) -> str:
    """Verifica que sea una imagen real y de un formato permitido (según su contenido, no la extensión)."""
    try:
        with Image.open(io.BytesIO(contents)) as probe:
            image_format = (probe.format or "").upper()
            probe.verify()
    except Image.DecompressionBombError:
        raise HTTPException(status_code=400, detail="La imagen es demasiado grande.")
    except Exception:
        raise HTTPException(status_code=400, detail="Archivo de imagen inválido.")

    if image_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usá JPG, PNG, WebP o GIF.",
        )
    return image_format


def compress_image(contents: bytes) -> bytes:
    """Redimensiona y convierte a WebP de forma segura."""
    src = Image.open(io.BytesIO(contents))
    dst = src
    try:
        src.load()
        if src.width * src.height > Image.MAX_IMAGE_PIXELS:
            raise HTTPException(status_code=400, detail="La imagen tiene demasiados píxeles.")

        if src.mode not in ("RGB", "L"):
            dst = src.convert("RGB")

        if max(dst.size) > MAX_DIMENSION:
            dst.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        dst.save(output, format="WEBP", quality=WEBP_QUALITY, optimize=True)
        return output.getvalue()
    except HTTPException:
        raise
    except Image.DecompressionBombError:
        raise HTTPException(status_code=400, detail="La imagen es demasiado grande.")
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo procesar la imagen.")
    finally:
        if dst is not src:
            dst.close()
        src.close()


@router.post("/")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    contents = await _read_limited(file, MAX_FILE_SIZE)
    _validate_image(contents)
    contents = compress_image(contents)

    filename = f"{uuid.uuid4().hex}.webp"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{filename}"}
