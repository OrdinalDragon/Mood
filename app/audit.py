# ============================================================
# app/audit.py - Registro de eventos de seguridad
# ============================================================
# La auditoría nunca debe romper una request: si Mongo falla, se loguea el
# error y se sigue. Los datos sensibles (contraseñas, tokens, prompts) no se
# guardan acá.
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import Request

from app.models import AuditLog

logger = logging.getLogger(__name__)


def client_ip(request: Optional[Request]) -> Optional[str]:
    """IP real detrás de Cloudflare/Nginx.

    Nginx solo es alcanzable desde el túnel o loopback, por lo que
    CF-Connecting-IP es confiable en este despliegue.
    """
    if request is None:
        return None
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip()[:64]
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else None


async def log_audit(
    action: str,
    *,
    request: Optional[Request] = None,
    actor_uid: Optional[str] = None,
    actor_email: Optional[str] = None,
    target: Optional[str] = None,
    success: bool = True,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    try:
        await AuditLog(
            timestamp=datetime.utcnow(),
            action=action[:120],
            actor_uid=actor_uid,
            actor_email=(actor_email or "").strip().lower()[:320] or None,
            target=target[:512] if target else None,
            ip=client_ip(request),
            user_agent=(request.headers.get("user-agent") or "")[:512] or None
            if request
            else None,
            success=success,
            metadata=metadata or {},
        ).create()
    except Exception:  # pragma: no cover - la auditoría no debe romper nada
        logger.exception("No se pudo escribir el evento de auditoría: %s", action)
