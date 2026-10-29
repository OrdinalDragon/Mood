import asyncio
import logging
import os

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from typing import Any, List, Literal, Optional
from datetime import datetime
from starlette.concurrency import run_in_threadpool

from app.audit import log_audit
from app.models import User
from app.routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gemini", tags=["Gemini"])
ALLOWED_FUNCTIONS = {
    "search_events",
    "get_event_detail",
    "get_mood_info",
    "set_user_mood",
    "clear_user_mood",
    "add_to_favorites",
    "share_event",
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """Eres MOOD Assistant, un asistente de eventos en Argentina. Tu objetivo es ayudar al usuario a descubrir eventos según su estado de ánimo, ubicación, fecha y preferencias.

Contexto actual del usuario:
- Mood activo: {currentMood}
- Ubicación: {location}
- Hoy: {today}

Reglas:
- Responder en español, tono amigable y conciso
- PROHIBIDO usar markdown o asteriscos: nunca uses *, **, cursivas, negritas, tablas, backticks ni viñetas. Texto plano siempre
- Para mencionar un estado de ánimo usá el emoji seguido del nombre: 😊 Alegre, 😢 Triste, 😤 Enojado, 😌 Tranquilo, 🤫 Reservado
- Para mencionar un evento usá solo su título (sin asteriscos ni comillas) y, si aporta, una descripción breve de una línea; la app ya muestra cada evento como tarjeta clicable
- Usar las funciones disponibles cuando necesites datos o acciones
- Si el usuario expresa cómo se siente o qué busca (tranquilo, relajado, etc.), SIEMPRE llamá set_user_mood PRIMERO para cambiar su mood, y luego search_events
- No combines mood con category en search_events — usá uno u otro, o dejá category vacío
- Después de ejecutar funciones, respondé con un texto breve y natural recomendando eventos o dando información útil. La app muestra los eventos encontrados como tarjetas clicables, por eso NO los listes como código, tablas, markdown ni listas largas: mencionálos en una o dos líneas nomás
- search_events ya devuelve los 3 eventos más cercanos, ordenados por ubicación y fecha; mencioná únicamente esos (máximo 3)
- No inventar eventos que no existan
- Si search_events no encuentra resultados, informá al usuario amablemente y sugerí buscar en otra zona o con otros filtros"""

FUNCTION_DECLARATIONS = [
    {
        "name": "search_events",
        "description": "Busca eventos con filtros. Los resultados ya vienen ordenados por cercanía: los 3 eventos más cercanos al usuario según ubicación y fecha. Llama a esta función cuando el usuario quiera buscar eventos.",
        "parameters": {
            "type": "object",
            "properties": {
                "mood": {"type": "string", "description": "Filtrar por mood (alegre, triste, enojado, tranquilo, reservado)"},
                "category": {"type": "string", "description": "Categoría (cultural, adventure, relax, nightlife, group, individual)"},
                "province": {"type": "string", "description": "Provincia"},
                "city": {"type": "string", "description": "Ciudad"},
                "free_only": {"type": "boolean", "description": "Solo eventos gratis"}
            }
        }
    },
    {
        "name": "get_event_detail",
        "description": "Obtiene detalle de un evento por ID",
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string", "description": "ID del evento"}
            },
            "required": ["event_id"]
        }
    },
    {
        "name": "get_mood_info",
        "description": "Obtiene información de un estado de ánimo",
        "parameters": {
            "type": "object",
            "properties": {
                "mood_id": {"type": "string", "description": "ID del mood (alegre, triste, enojado, tranquilo, reservado)"}
            },
            "required": ["mood_id"]
        }
    },
    {
        "name": "set_user_mood",
        "description": "Cambia el estado de ánimo del usuario en la aplicación",
        "parameters": {
            "type": "object",
            "properties": {
                "mood_id": {"type": "string", "description": "ID del mood (alegre, triste, enojado, tranquilo, reservado)"}
            },
            "required": ["mood_id"]
        }
    },
    {
        "name": "clear_user_mood",
        "description": "Limpia el estado de ánimo actual del usuario"
    },
    {
        "name": "add_to_favorites",
        "description": "Agrega un evento a favoritos del usuario",
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string", "description": "ID del evento"}
            },
            "required": ["event_id"]
        }
    },
    {
        "name": "share_event",
        "description": "Comparte un evento por WhatsApp o copiando el enlace",
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string", "description": "ID del evento"},
                "via": {"type": "string", "enum": ["copy", "whatsapp"], "description": "Método de compartir"}
            },
            "required": ["event_id", "via"]
        }
    }
]


class ChatMessage(BaseModel):
    role: Literal["user", "model", "function"]
    content: str = Field(min_length=1, max_length=2000)
    name: Optional[str] = Field(default=None, max_length=64)


class ChatContext(BaseModel):
    currentMood: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=200)


class ChatRequest(BaseModel):
    history: List[ChatMessage] = Field(min_length=1, max_length=20)
    context: ChatContext


class TextResponse(BaseModel):
    type: str = "text"
    content: str


class FunctionCallItem(BaseModel):
    name: str
    args: dict[str, Any]


class FunctionCallsResponse(BaseModel):
    type: str = "function_calls"
    calls: List[FunctionCallItem]


@router.post("/chat")
async def gemini_chat(
    request: ChatRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API no configurada. Falta GEMINI_API_KEY.",
        )

    # Validación estricta: solo el modelo puede pedir funciones declaradas.
    for msg in request.history:
        if msg.role == "function":
            if msg.name not in ALLOWED_FUNCTIONS:
                raise HTTPException(status_code=422, detail="Función no permitida")
        elif msg.name:
            raise HTTPException(
                status_code=422,
                detail="El campo name solo se permite en mensajes function",
            )

    started = datetime.utcnow()
    try:
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash-lite",
            system_instruction=SYSTEM_PROMPT.format(
                currentMood=request.context.currentMood or "ninguno",
                location=request.context.location or "no especificada",
                today=datetime.utcnow().strftime("%Y-%m-%d"),
            ),
            tools=[{"function_declarations": FUNCTION_DECLARATIONS}],
        )

        contents = []
        for msg in request.history:
            if msg.role == "user":
                contents.append({"role": "user", "parts": [{"text": msg.content}]})
            elif msg.role == "model":
                contents.append({"role": "model", "parts": [{"text": msg.content}]})
            elif msg.role == "function":
                contents.append(
                    {
                        "role": "user",
                        "parts": [
                            {
                                "function_response": {
                                    "name": msg.name,
                                    "response": {"result": msg.content},
                                }
                            }
                        ],
                    }
                )

        # La SDK es síncrona: no bloqueamos el event loop y ponemos timeout.
        response = await asyncio.wait_for(
            run_in_threadpool(model.generate_content, contents), timeout=30
        )

        function_calls = []
        text_parts = []
        for part in response.candidates[0].content.parts:
            if part.function_call:
                fc = part.function_call
                if fc.name not in ALLOWED_FUNCTIONS:
                    logger.warning("Gemini pidió una función no permitida: %s", fc.name)
                    continue
                function_calls.append(
                    FunctionCallItem(name=fc.name, args=dict(fc.args.items()))
                )
            elif part.text:
                text_parts.append(part.text)

        duration_ms = int((datetime.utcnow() - started).total_seconds() * 1000)
        await log_audit(
            "gemini_chat",
            request=http_request,
            actor_uid=current_user.uid,
            actor_email=current_user.email,
            success=True,
            metadata={"duration_ms": duration_ms, "messages": len(request.history)},
        )

        if function_calls:
            return FunctionCallsResponse(calls=function_calls)

        return TextResponse(content="".join(text_parts))

    except asyncio.TimeoutError:
        logger.warning("Gemini timeout para uid=%s", current_user.uid)
        await log_audit(
            "gemini_chat",
            request=http_request,
            actor_uid=current_user.uid,
            actor_email=current_user.email,
            success=False,
            metadata={"reason": "timeout"},
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El asistente tardó demasiado. Intentá de nuevo.",
        )
    except HTTPException:
        raise
    except Exception:
        # Nunca exponer detalles internos del proveedor al cliente.
        logger.exception("Error en Gemini chat para uid=%s", current_user.uid)
        await log_audit(
            "gemini_chat",
            request=http_request,
            actor_uid=current_user.uid,
            actor_email=current_user.email,
            success=False,
            metadata={"reason": "upstream"},
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo procesar la consulta. Intentá de nuevo.",
        )
