import os
import uuid
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.routes.auth import get_current_user
from app.models import User
from PIL import Image

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_DIMENSION = 1920
WEBP_QUALITY = 80

def compress_image(contents: bytes, ext: str) -> tuple[bytes, str]:
    """Comprime y convierte a WebP."""
    img = Image.open(io.BytesIO(contents))
    
    # Convertir RGBA/P a RGB para WebP
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # Redimensionar si excede MAX_DIMENSION
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
    
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=WEBP_QUALITY, optimize=True)
    return output.getvalue(), ".webp"

@router.post("/")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usá JPG, PNG, WebP o GIF.")

    contents = await file.read()

    is_admin = current_user.role == "admin"
    if not is_admin and len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="La imagen supera los 5MB.")

    # Comprimir y convertir a WebP
    contents, ext = compress_image(contents, ext)

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{filename}"}
