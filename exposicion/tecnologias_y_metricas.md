# MOOD — Tecnologías y Métricas (cierre de presentación)

> Material de apoyo para la última slide de la expo: una versión corta para la
> imagen y una versión extensa con todos los detalles técnicos.

---

## 📋 TEXTO CORTO (para la imagen de la slide)

### Tecnologías
- Frontend: **React 19 + TypeScript + Vite + Tailwind CSS**
- Backend: **Python / FastAPI + MongoDB**
- Chat con **Gemini (IA)**: recomienda eventos según tu estado de ánimo
- Deploy con **Docker + Nginx + Cloudflare**

### Lo que hace la app
- Eventos reales de Buenos Aires traídos con un **scraper automático**
- Búsqueda por **estado de ánimo**, categoría, fecha, ubicación y mapa
- Favoritos, reviews, reclamos de organización, notificaciones y mails
- Modo claro/oscuro, público y **panel de administración**

### Métricas (dashboard de admin)
- **Con consentimiento**: sin aceptar cookies, no se trackea nada
- Mide vistas, visitantes únicos, búsquedas, moods y favoritos
- Gráficos de tráfico por hora y día de la semana, rankings de eventos
- Todo en **hora Argentina (UTC-3)**

---

## 🧱 STACK DE TECNOLOGÍAS

### Frontend
| Tecnología | Uso |
|---|---|
| React 19 + TypeScript 5.8 | Framework y tipado |
| Vite 6 | Build y dev server |
| Tailwind CSS 4 | Estilos |
| shadcn/ui + Radix UI | Componentes |
| lucide-react | Iconos |
| React Router 7 | Navegación |
| Recharts 3 | Gráficos del dashboard admin |
| React-Leaflet / Leaflet | Mapa de eventos |
| Motion | Animaciones |
| sonner | Toasts / avisos |
| date-fns | Fechas |
| Firebase / @react-oauth/google | Login con Google |
| @google/genai | Cliente de Gemini en el front |

### Backend
| Tecnología | Uso |
|---|---|
| Python 3.9 + FastAPI + Uvicorn | API REST |
| Beanie + Motor | ODM async para MongoDB |
| PyJWT | Tokens JWT (HS256) |
| google-auth | Verificación de tokens de Google |
| Pillow | Procesamiento de imágenes |
| google-generativeai | Chat con IA (function calling) |
| requests | Scraper de Eventbrite |
| smtplib | Emails (recordatorios y resumen) |

### Base de datos e infraestructura
| Tecnología | Uso |
|---|---|
| MongoDB 7 | Base de datos (volumen persistente) |
| Docker Compose | Orquestación (5 contenedores) |
| Nginx | Reverse proxy (front + API + uploads) |
| Cloudflare Tunnel (cloudflared) | Exponer la app a internet |

Contenedores:
- `mood_mongo` (MongoDB :27017)
- `mood_backend` (FastAPI :8000, uvicorn)
- `mood_frontend` (build estático servido por Nginx)
- `mood_nginx` (reverse proxy :80)
- `mood_tunnel` (cloudflared)

Ruteo de Nginx:
- `/` → frontend
- `/api/` → backend (sin prefijo)
- `/uploads/` → imágenes (cache 30 días)
- `/docs/` → Swagger de la API

### Colecciones de MongoDB
`events`, `users`, `reviews`, `notifications`, `ads`, `analytics_events`, `banned_emails`

---

## ⚙️ DETALLES TÉCNICOS

- **Autenticación**: email + contraseña (hash SHA-256) y Google OAuth; JWT con
  expiración; roles `user` / `moderator` / `admin`; verificación por email; ban
  de usuarios y emails.
- **Scraper de eventos**: corre cada 6 horas contra la agenda de Eventbrite BA
  (JSON-LD). Toma solo eventos dentro de los próximos 7 días y dentro de
  CABA/GBA (validación de coordenadas). Asigna **mood** y **categoría** por
  reglas de palabras clave. Es **idempotente** (no duplica por título+fecha).
- **Chat IA**: modelo `gemini-3.5-flash-lite` con *function calling*:
  `search_events` (los 3 más cercanos), `get_event_detail`, `get_mood_info`,
  `set_user_mood`, `add_to_favorites`, `share_event`. Responde en español y
  actúa sobre la app (cambia tu mood, agrega favoritos, comparte).
- **Estados de ánimo**: 5 moods (alegre, triste, enojado, tranquilo, reservado)
  que filtran y personalizan la búsqueda de eventos.
- **Reviews**: calificación 1–10 + comentario; el organizador reclamado puede
  responder.
- **Reclamos de evento**: un usuario pide ser organizador de un evento del
  scraper; admin aprueba/rechaza y se notifica a ambas partes.
- **Notificaciones**: in-app + email con **período de gracia de 5 min** para
  favoritos (evita mails accidentales y spam por taps repetidos). Tareas en
  background cada 1 min (flush de mails), 1 h (scaneo de favoritos/archivado) y
  6 h (scrape).
- **Favoritos**: permiten guardar eventos de ejemplo (`sample-*`) aunque no
  existan en la DB.
- **Zona horaria**: todo en **Argentina (UTC-3)**. Strings con `Z`/offset se
  tratan como instante absoluto; sin zona se asume Argentina.
- **Seguridad**: secrets solo por variables de entorno (`.env`), nunca en el
  repo; healthchecks y `restart: always` en cada servicio; IPs de analytics
  guardadas solo como hash.

---

## 📊 MÉTRICAS / ANALYTICS

### Diseño: consentimiento estricto (opt-in)
- Banner de cookies: si el usuario **no acepta, no se trackea nada** (ni
  siquiera se genera el ID de cliente).
- Al aceptar se crea un `client_id` anónimo persistente por navegador.
- Envío fire-and-forget con `navigator.sendBeacon` (no rompe la navegación).

### Qué se mide (`POST /analytics/track`, público)
Tipos: `page_view`, `mood_select`, `search`, `event_view`, `favorite`,
`review`, `consent`.
Se guarda: tipo, path, mood, `client_id` anónimo, **IP hasheada** (SHA-256 +
salt, sirve para contar únicos sin revelar la IP), referrer, user-agent y
timestamp (UTC).

### Dashboard de admin (`GET /analytics/summary`, solo admins)
Períodos: 7 / 30 / 90 días.

- **KPIs de tráfico**: views totales, visitantes únicos, IPs únicas, usuarios
  registrados (+ nuevos en 30 días).
- **Gráficos**: visitas por hora del día (línea), por día de la semana
  (barras), moods más usados, eventos por categoría.
- **Rankings**: páginas más vistas (top 20), eventos más favoritados, eventos
  mejor valorados (por cantidad de reviews), usuarios por provider
  (email/Google).
- **Datos de la app**: eventos por estado (pending/approved/archived), eventos
  próximos, reviews, favoritos y reclamos.
- Todo agrupado en **hora de Argentina (UTC-3)**.

### API
- Endpoints en Swagger: `http://localhost:8000/docs`
- `POST /api/analytics/track` (público) y `GET /api/analytics/summary?days=N`
  (admin: 200 OK / 403 no-admin / 401 sin token).
