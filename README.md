<div align="center">
<img width="1200" height="475" alt="MOOD Banner" src="./src/img/mood_logo.jpg" />
</div>

<p align="center">
  <a href="#english"><b>🇺🇸 English version ↓</b></a>
</p>

# Mood App 🎭

> **Trabajo en Progreso**

Aplicación web full-stack que recomienda eventos cercanos según cómo te sentís. Decile a la app tu estado de ánimo actual y ella te muestra eventos locales que combinan con tu vibe.

🌐 **Demo en vivo:** [prototipomood.jesrepresentaciones.com.ar](https://prototipomood.jesrepresentaciones.com.ar)

---

## Funcionalidades

- 🔐 Registro e inicio de sesión con JWT + Google OAuth
- 😊 Selección de estado de ánimo para reflejar cómo te sentís
- 📍 Recomendaciones de eventos cercanos según tu estado de ánimo y lista de próximos eventos
- 🗺️ Mapa interactivo con búsqueda por ciudad y provincia (OpenStreetMap)
- 📝 Subida de eventos por la comunidad con flujo de aprobación por administradores
- 🤖 Scraper automático de eventos a nivel nacional (multi-fuente, ventana móvil de 30 días)
- ⭐ Reviews y valoraciones de eventos (1 a 5 estrellas)
- 📧 Notificaciones por email (recordatorios de eventos próximos y favoritos)
- 💬 Chat de ayuda con IA (Gemini)
- 🌗 Modo oscuro con detección de preferencia del sistema
- 🗄️ Datos persistentes con MongoDB
- 📱 Diseño responsive (mobile, tablet, desktop)

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| **Front-End** | React 19, TypeScript, Tailwind CSS v4, shadcn UI, Vite, React Router, React Leaflet, date-fns, framer-motion, Recharts |
| **Back-End** | FastAPI (Python 3.12+), Beanie ODM (Motor), PyJWT |
| **Base de datos** | MongoDB 7 |
| **Contenedores** | Docker & Docker Compose |
| **Proxy** | Nginx |
| **Tunnel** | Cloudflare Tunnel |
| **Geocoding** | Nominatim (OpenStreetMap) + tabla local de ciudades para el scraper |

---

## Cómo empezar

### Info

Puede que falten archivos por información privada y API keys (Google OAuth, Gemini, SMTP).

### Requisitos

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (recomendado)
- MongoDB 7 (si no usás Docker)

### Inicio rápido (Docker)

```bash
git clone https://github.com/MoodGrupo6/Prototipo-mood.git
cd Prototipo-mood
cp .env.example .env
# JWT_SECRET: openssl rand -hex 32
docker compose up -d --build
```

### Instalación manual

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/MoodGrupo6/Prototipo-mood.git
   cd Prototipo-mood
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales de DB y API keys
   # Generar JWT_SECRET con: openssl rand -hex 32
   ```

3. **Instalar dependencias del back-end**
   ```bash
   pip install -r requirements.txt
   ```

4. **Instalar dependencias del front-end**
   ```bash
   npm install
   ```

5. **Ejecutar la app**
   ```bash
   # Asegurate de que MongoDB esté corriendo y que MONGO_URI coincida con .env

   # Iniciar el back-end
   uvicorn app.main:app --reload

   # En otra terminal, iniciar el front-end
   npm run dev
   ```

6. Abrir el navegador en `http://localhost:3000`

---

## Seguridad

Medidas implementadas:

- Contraseñas con **bcrypt** (costo 12) y migración transparente de hashes SHA-256 antiguos al iniciar sesión.
- `JWT_SECRET` obligatorio (sin valor por defecto); el backend no arranca si falta o es inseguro.
- Sesiones con access token corto en memoria + refresh rotativo en cookie `HttpOnly`/`Secure`/`SameSite=Lax`; revocación por `token_version`.
- CSRF de doble submit y validación de `Origin`/`Referer`; MFA TOTP con códigos de recuperación de un solo uso para cuentas con contraseña local. Las cuentas creadas solo con Google usan la verificación en dos pasos de Google.
- Tokens de verificación de email (24 h) y de reseteo de contraseña (1 h) con expiración, almacenados hasheados.
- Respuestas genéricas en recuperación de contraseña y reenvío de verificación (sin enumeración de usuarios).
- Auditoría de eventos de seguridad en `audit_logs` (TTL 180 días).
- Rate limiting en Nginx para `/api/auth/`, `/api/gemini/` y `/api/`; cabeceras de seguridad, CSP con reportes y Trusted Types en modo reporte.
- Uploads: límite de 10 MB leído en streaming, validación real de formato con Pillow y tope de píxeles.
- Nginx publicado solo en `127.0.0.1:80`; el túnel de Cloudflare accede por la red interna. MongoDB, backend y frontend no publican puertos.
- Backups cifrados de MongoDB con `mongodump` + age/GPG, retención diaria/semanal y runbook de restore.
- CI con tests, `pip-audit`, `npm audit`, gitleaks, Semgrep y Trivy; Dependabot semanal.
- Imágenes Docker fijadas a versiones parcheadas (Python 3.12, MongoDB 7.0.45, Nginx 1.31.8, cloudflared 2026.10.5) y backend ejecutado sin privilegios; las imágenes de Nginx actualizan paquetes base en build (`apk upgrade`) y se escanean con Trivy.
- Swagger/OpenAPI deshabilitados por defecto (`ENABLE_DOCS=0`).

Ver [`SECURITY.md`](SECURITY.md) y el [`RUNBOOK`](docs/RUNBOOK.md). Riesgos residuales conocidos: `google-generativeai` está deprecado (migración a `google-genai` pendiente), la CSP conserva `style-src 'unsafe-inline'` e `img-src https:` por compatibilidad, y el túnel de Cloudflare es un punto único de entrada.

---

## Estado del proyecto

Este proyecto es una aplicación web en producción activa. Las funcionalidades están siendo desarrolladas y mejoradas continuamente.

Mejoras planificadas:
- [x] Integración de geolocalización para detección automática de cercanía
- [ ] Push notifications (hoy las notificaciones son por email)
- [ ] Sincronización con Google Calendar
- [x] Búsqueda por palabra clave en eventos

---

## Integrantes

- Nicolás Schernetzki
- Maylen Speso
- Gastón Crespo
- Luciano Bustamante
- Diego Ruda

---

## Licencia

Este proyecto es privado. Todos los derechos reservados. Podés ver el código como referencia, pero no podés copiarlo, modificarlo ni distribuirlo sin permiso explícito.

---

---

<span id="english"></span>

# Mood App 🎭

> **Work in Progress**

A full-stack web application that recommends nearby events based on how you're feeling. Tell the app your current mood, and it surfaces local events that match your vibe.

🌐 **Live demo:** [prototipomood.jesrepresentaciones.com.ar](https://prototipomood.jesrepresentaciones.com.ar)

---

## Features

- 🔐 User registration and login with JWT + Google OAuth
- 😊 Mood selection to reflect how you're feeling
- 📍 Event recommendations based on your current mood plus an upcoming events list
- 🗺️ Interactive map with city and province search (OpenStreetMap)
- 📝 Community event submission with admin approval workflow
- 🤖 Automatic nationwide event scraper (multi-source, 30-day rolling window)
- ⭐ Event reviews and ratings (1 to 5 stars)
- 📧 Email notifications (reminders for upcoming and favorite events)
- 💬 AI-powered help chat (Gemini)
- 🌗 Dark mode with system preference detection
- 🗄️ Persistent user data with MongoDB
- 📱 Responsive design (mobile, tablet, desktop)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Front-End** | React 19, TypeScript, Tailwind CSS v4, shadcn UI, Vite, React Router, React Leaflet, date-fns, framer-motion, Recharts |
| **Back-End** | FastAPI (Python 3.12+), Beanie ODM (Motor), PyJWT |
| **Database** | MongoDB 7 |
| **Containerization** | Docker & Docker Compose |
| **Proxy** | Nginx |
| **Tunnel** | Cloudflare Tunnel |
| **Geocoding** | Nominatim (OpenStreetMap) + local city table for the scraper |

---

## Getting Started

### Info

There may be missing files because of private info and API keys (Google OAuth, Gemini, SMTP).

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (recommended)
- MongoDB 7 (if not using Docker)

### Quick Start (Docker)

```bash
git clone https://github.com/MoodGrupo6/Prototipo-mood.git
cd Prototipo-mood
cp .env.example .env
# JWT_SECRET: openssl rand -hex 32
docker compose up -d --build
```

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MoodGrupo6/Prototipo-mood.git
   cd Prototipo-mood
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your DB credentials and any API keys
   # Generate JWT_SECRET with: openssl rand -hex 32
   ```

3. **Install back-end dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install front-end dependencies**
   ```bash
   npm install
   ```

5. **Run the app**
   ```bash
   # Make sure MongoDB is running and MONGO_URI matches .env

   # Start the back-end
   uvicorn app.main:app --reload

   # In a separate terminal, start the front-end
   npm run dev
   ```

6. Open your browser at `http://localhost:3000`

---

## Security

Implemented measures:

- **bcrypt** password hashing (cost 12) with transparent migration of legacy SHA-256 hashes on login.
- Mandatory `JWT_SECRET` (no default); the backend refuses to start if it is missing or weak.
- Short-lived in-memory access token + rotating refresh token in an `HttpOnly`/`Secure`/`SameSite=Lax` cookie; real revocation via `token_version`.
- Double-submit CSRF and `Origin`/`Referer` validation; TOTP MFA with single-use recovery codes for accounts with a local password. Accounts created only through Google use Google 2-step verification.
- Email verification (24 h) and password reset (1 h) tokens with expiry, stored hashed.
- Generic responses for password recovery and verification resend (no user enumeration).
- Security audit log in `audit_logs` (180-day TTL).
- Nginx rate limiting for `/api/auth/`, `/api/gemini/` and `/api/`; security headers, CSP reporting, and report-only Trusted Types.
- Uploads: 10 MB streaming limit, real Pillow format validation, and a pixel cap.
- Nginx published only on `127.0.0.1:80`; Cloudflare Tunnel reaches it over the internal Docker network. MongoDB, backend and frontend publish no host ports.
- Encrypted MongoDB backups with `mongodump` + age/GPG, daily/weekly retention, and a restore runbook.
- CI with tests, `pip-audit`, `npm audit`, gitleaks, Semgrep and Trivy; weekly Dependabot.
- Docker images pinned to patched versions (Python 3.12, MongoDB 7.0.45, Nginx 1.31.8, cloudflared 2026.10.5) and the backend runs as a non-root user; Nginx images apply base-package updates at build time (`apk upgrade`) and are scanned with Trivy.
- Swagger/OpenAPI disabled by default (`ENABLE_DOCS=0`).

See [`SECURITY.md`](SECURITY.md) and the [`RUNBOOK`](docs/RUNBOOK.md). Known residual risks: `google-generativeai` is deprecated (migration to `google-genai` pending), CSP keeps `style-src 'unsafe-inline'` and `img-src https:` for compatibility, and the Cloudflare Tunnel is a single entry point.

---

## Project Status

This project is a web application actively in production use. Features are being continuously developed and improved.

Planned improvements:
- [x] Geolocation integration for automatic nearby detection
- [ ] Push notifications (currently email only)
- [ ] Google Calendar sync
- [x] Keyword search in events

---

## Team

- Nicolás Schernetzki
- Maylen Speso
- Gastón Crespo
- Luciano Bustamante
- Diego Ruda

---

## License

This project is proprietary. All rights reserved. You may view the code for reference purposes, but you may not copy, modify, or distribute it without explicit permission.