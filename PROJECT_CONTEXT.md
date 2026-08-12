# 📘 CONTEXTO DEL PROYECTO: MOOD APP
## Estado actual: Prototipo en desarrollo activo  
**Version:** 1.0.0 | **Idioma:** Español/Inglés  

---

## 📁 ESTRUCTURA DE ARCHITECTURA

```
mood/                          ← Raíz del proyecto
├── .dockerignore              ← Archivos a ignorar en Docker
├── .env.example                ← Variables de entorno (plantilla)
├── .env                        ← Variables reales (CONSEJABLE: NO COMPROMETER)
├── package.json                ← Config frontend (React + Vite + TypeScript)
├── tsconfig.json               ← Configuración TypeScript
├── vite.config.ts              ← Configuración Vite
├── Dockerfile                  ← Frontend container
├── docker-compose.yml          ← Backend, MongoDB, Nginx
├── README.md                   ← Documentación del proyecto (español/inglés)
├── README_SETUP.md              ← Guía de setup paso a paso

├── app/                         ← BACKEND (FastAPI Python)
│   ├── main.py                  ← Entrada principal + rutas + lifecycle
│   ├── database.py              ← Inicialización MongoDB con Beanie ODM
│   ├── models.py                ← Modelos MongoDB: Event, User, Ad, Review...
│   ├── schemas.py               ← Esquemas Pydantic (validación de datos)
│   ├── auth.py                  ← Autenticación JWT + Google OAuth
│   ├── events.py                ← CRUD de eventos (aprobado/pendiente)
│   ├── uploads/                 ← Subida y gestión de archivos
│   └── routes/                  ← 10 módulos: auth, events, upload, gemini...

├── src/                         ← FRONTEND (React + TypeScript + Vite)
│   ├── App.tsx                  ← Componente raíz + Router HashRouter
│   ├── main.tsx                 ← Punto de entrada del app
│   ├── types.ts                 ← Tipos globales TS
│   ├── lib/api.ts               ← Client API con interceptores JWT
│   ├── lib/utils.ts             ← Utilities (parseEventDate, etc.)
│   ├── contexts/                ← Contexts React: MoodContext, ThemeContext
│   ├── hooks/useAuth.tsx        ← Hook de autenticación JWT + OAuth
│   ├── components/              ← Componentes reutilizables
│   │   ├── ui/                  ← Atómicos (input, button, badge...)
│   │   └── (componentes principales)
│   └── pages/                   ← 16 páginas de la app

├── assets/                      ← Imágenes y recursos estáticos
└── uploads/                     ← Subidas de eventos
```

---

## 🔑 ARQUITECTURA DE BASE DE DATAS

**Motor:** MongoDB  
**ODM:** Beanie (MongoDB ORM equivalente a SQLAlchemy)

### Modelos Clave:

| Modelo | Descripción | Campos Principales |
|--------|-------------|------------------|
| **Event** | Eventos de la app | title, date, location, moods[], status="pending"/"approved"/"rejected", created_by |
| **User** | Usuarios | uid, email, role="user"/"admin", favorites=[], google_id |
| **BannedEmail** | Correo baneados | email, banned_at, banned_by |
| **Ad** | Anuncios de la app | badge, title, hero=true/false, active, order |
| **Review** | Revisos de eventos | event_id, user_id, rating=1-5, comment |
| **Notification** | Notificaciones en email/push | user_id, type, message, read=false |
| **AnalyticsEvent** | Telemetría anónima | client_id (uuid), ip_hash, mood, created_at |

---

## 🌐 API DE RESTRICCIONES

Base URL: `/api/`  
Auth: JWT en `Authorization: Bearer <token>` header

### Rutas Principales por Módulo:

#### 🔹 auth.py
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión (JWT)
- `GET /auth/logout` - Salir de sesión

#### 🔹 events.py
- `GET /events/` - Listar eventos (filtro: status, mood, city, province, radius_km)
- `POST /events/` - Subir evento (solo usuarios y admins)
- `GET /events/{id}` - Detalles de un evento
- `PUT /events/{id}` - Actualizar evento
- `DELETE /events/{id}` - Eliminar evento

#### 🔹 uploads.py
- `POST /uploads/events/` - Subir imagen cover/image_url

#### 🔹 gemini.py
- `POST /gemini/chat` - Chat con Gemini API (usando GEMINI_API_KEY)

---

## ⚡ LIFECYCLE DE LA APP (app/main.py)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()                           # Inicializar MongoDB
    
    # Tareas en segundo plano:
    scan_task = asyncio.create_task(notification_scan_loop())   # Verificar eventos expirados
    scrape_task = asyncio.create_task(scrape_loop())           # Scraping automático de eventos
    
    yield                                           # Servir peticiones
    
    scan_task.cancel()                                # Limpiar tareas
    await close_db()                                   # Cerrar DB
```

**Tareas en segundo plano:**
- `scrape_loop`: Cada 6 horas, scraping de eventos mediante API externa (MOOD)
- `notification_scan_loop`: Verifica eventos con 7 días restantes y envía notificaciones/email

---

## 🚀 COMANDOS DE DESARROLLO

### Backend (FastAPI):
```bash
pip install -r requirements.txt          # Instalar dependencias backend
uvicorn app.main:app --reload             # Ejecutar backend con hot reload
```

### Frontend (React + Vite):
```bash
npm install                                 # Instalar dependencias frontend
npm run dev                                 # Servir frontend en http://localhost:3000
npm run build                               # Compilar para producción
```

### Docker:
```bash
cp .env.example .env                    # Copiar plantilla
docker compose up -d --build              # Levantar todo el stack
```

---

## 🔐 VARIABLES DE ENTORNOS CLAVE (.env)

| Variable | Descripción |
|----------|------------|
| `MONGO_INITDB_ROOT_USERNAME` | Username MongoDB (default: mood_user) |
| `MONGO_INITDB_ROOT_PASSWORD` | Password MongoDB (default: mood_password) |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GEMINI_API_KEY` | API Key Gemini para el chat |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | Email Gmail para notificaciones |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token Cloudflare Tunnel (opcional) |

---

## 🎯 FUNCIONALIDADES ACTUALES

### ✅ Implementadas:
- [x] Registro y login con JWT + Google OAuth
- [x] Selección de estado de ánimo (6 moods)
- [x] Recomendaciones de eventos por mood
- [x] Mapa interactivo con OpenStreetMap
- [x] Subida de eventos por la comunidad
- [x] Flujo de aprobación por administradores
- [x] Base de datos persistente (MongoDB)
- [x] Diseño responsive (mobile/tablet/desktop)
- [x] Modo oscuro con detección de preferencia del sistema
- [x] Chat Gemini integrado para soporte
- [x] Sistema de reviews/ratings para eventos
- [x] Notificaciones por email
- [x] Analytics anónimos

### 📋 En Progreso / Planificados:
- [ ] Geolocalización automática (detectar ubicación del usuario)
- [ ] Categorías de ánimo expandidas
- [ ] Mejoras de responsive mobile
- [ ] Push notifications en lugar de solo email
- [ ] Integración con calendar/Google Calendar
- [ ] Sistema de favoritos con sincronización
- [ ] Búsqueda por palabra clave en eventos

---

## 🐛 NOTAS IMPORTANTES Y LIMITACIONES

### ⚠️ Archivos con datos sensibles:
1. **`.env`** - Contiene claves API reales (NO commit it!)
2. **`mood_db_backup.sql`** - Backup de la base de datos (confidencial)
3. **`src/assets/**`** - Imágenes y recursos
4. **`node_modules/`** - Dependencias (aunque está en .gitignore)

### 📝 Notas sobre los archivos Python:
- `scraper.py`: Contiene scraping automático de eventos (cada 6h, ventana de 7 días)
- `analyze_backup.py`: Herramienta para analizar backups de la base de datos
- `seed_events.py`: Genera eventos de ejemplo para testing

### 🎨 Diseño y UI:
- **UI:** shadcn UI + Tailwind CSS v4
- **Mapas:** React Leaflet con OpenStreetMap
- **Calendario:** react-day-picker
- **Graficos:** Recharts
- **Animaciones:** framer-motion

### 🔒 Seguridad:
- JWT con token en header `Authorization`
- CORS configurado para permitir todos los orígenes (ajustar en producción)
- Banned emails sistema para bloquear accounts maliciosos

---

## 🔄 FLOJO DE LA APLICACIÓN

```
Usuario → Login/Register → Selecciona Mood → Ve Recomendaciones o Mapa 
   ↓
  - Si el evento tiene mood asignado y el usuario está en ese mood → se muestra
  - El mapa muestra eventos cercanos al usuario (si hay geolocalización)
  - Click en evento → EventDetailPage con reviews, images, location
  - Subir evento → Admin revisa → Aprobado o Rechazado
```

---

## 📝 PRÓXIMOS PASOS RECOMENDADOS SI NIECES ITES MODIFICAR ALGO

1. **Para backend:** Comienza por `app/main.py` para entender el flujo, luego `models.py` y `schemas.py`
2. **Para frontend:** Comienza por `src/App.tsx` para ver el router y contexto, luego las páginas individuales
3. **Para API:** Revisa los files en `app/routes/` que contienen todos los endpoints
4. **Para Docker:** Examena `docker-compose.yml` para entender cómo se comunican los servicios

---

## 📎 ARCHIVOS CLAVE PARA CONSULTAR FRECUENTEMENTE

| Archivo | Propósito |
|---------|-----------|
| `app/main.py` | Entrada principal, rutas, lifecycle |
| `app/models.py` | Esquema de datos MongoDB |
| `app/schemas.py` | Validación de datos API |
| `src/App.tsx` | Componente raíz y router |
| `docker-compose.yml` | Stack Docker completo |
| `.env.example` | Variables de entorno necesarias |
| `package.json` | Dependencias frontend y scripts |

---

## 📅 HISTORIA DE CAMPOS (git log -10)

```
d5abbcf Ordenar cronologicamente la lista combinada (backend + sample) en la pestana Proximos de eventos
737cf4b Permitir valorar eventos archivados (concluidos), no solo aprobados - fix API 400
37369be Carrusel solo en pagina de eventos, con todas las ads (no solo hero); quito columnas laterales y ads de la home
719080b Carrusel hero como marquee infinito (CSS animation, bucle sin fin) en vez de scroll-snap que no se movía con pocas ads
b572722 Carrusel de ads hero como cards chiquitas (scroll-snap + autoplay, varias visibles) en lugar de un banner a ancho completo
80fe2bc Carrusel autoplay con ads hero en LayoutWithAds; columnas laterales solo con ads no-hero; quito cards hero de Hero.tsx
cc01673 Merge Diegov2: carrusel de anuncios en LayoutWithAds (scroll-snap, fix de alineacion y touch)
a1240c6 Fix carrusel de anuncios: scroll-snap, alineacion correcta en todos los breakpoints, swipe nativo y flechas visibles en touch
ebdc579 Scraping automatico de eventos (MOOD, ventana 7 dias, cada 6h) y reclamo de eventos por organizadores con aprobacion desde panel admin
7bb6e8e Filtro por mood en pestana Proximos con boton 'Mostrar todos' y orden por proximidad de fecha (sort=soonest)
```

---

*Última actualización: 12/08/2026*  
*Estado: Prototipo activo - trabajo en progreso*