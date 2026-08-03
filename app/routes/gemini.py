import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

router = APIRouter(prefix="/gemini", tags=["Gemini"])

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
- Usar las funciones disponibles cuando necesites datos o acciones
- Si el usuario pide cambiar el mood, usa set_user_mood
- Si busca eventos, usa search_events con los filtros adecuados
- Recomendar máximo 3-4 eventos relevantes
- No inventar eventos que no existan"""

FUNCTION_DECLARATIONS = [
    {
        "name": "search_events",
        "description": "Busca eventos con filtros. Llama a esta función cuando el usuario quiera buscar eventos.",
        "parameters": {
            "type": "object",
            "properties": {
                "mood": {"type": "string", "description": "Filtrar por mood (alegre, triste, enojado, tranquilo, reservado)"},
                "category": {"type": "string", "description": "Categoría (cultural, adventure, relax, nightlife, group, individual)"},
                "province": {"type": "string", "description": "Provincia"},
                "city": {"type": "string", "description": "Ciudad"},
                "free_only": {"type": "boolean", "description": "Solo eventos gratis"},
                "limit": {"type": "integer", "description": "Cantidad máxima de resultados (default 5)"}
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
    role: str
    content: str
    name: Optional[str] = None


class ChatContext(BaseModel):
    currentMood: Optional[str] = None
    location: Optional[str] = None


class ChatRequest(BaseModel):
    history: List[ChatMessage]
    context: ChatContext


class TextResponse(BaseModel):
    type: str = "text"
    content: str


class FunctionCallResponse(BaseModel):
    type: str = "function_call"
    name: str
    args: dict[str, Any]


@router.post("/chat")
async def gemini_chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API no configurada. Falta GEMINI_API_KEY."
        )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash-lite",
            system_instruction=SYSTEM_PROMPT.format(
                currentMood=request.context.currentMood or "ninguno",
                location=request.context.location or "no especificada",
                today=datetime.utcnow().strftime("%Y-%m-%d")
            ),
            tools=[{"function_declarations": FUNCTION_DECLARATIONS}]
        )

        contents = []
        for msg in request.history:
            if msg.role == "user":
                contents.append({"role": "user", "parts": [{"text": msg.content}]})
            elif msg.role == "model":
                contents.append({"role": "model", "parts": [{"text": msg.content}]})
            elif msg.role == "function":
                contents.append({
                    "role": "user",
                    "parts": [{"function_response": {"name": msg.name, "response": {"result": msg.content}}}]
                })

        response = model.generate_content(contents)

        for part in response.candidates[0].content.parts:
            if part.function_call:
                fc = part.function_call
                return FunctionCallResponse(
                    name=fc.name,
                    args=dict(fc.args.items())
                )

        return TextResponse(content=response.text)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al comunicarse con Gemini: {str(e)}"
        )
