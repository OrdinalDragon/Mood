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
| **Back-End** | FastAPI (Python 3.9+), Beanie ODM (Motor), PyJWT |
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

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (recomendado)
- MongoDB 7 (si no usás Docker)

### Inicio rápido (Docker)

```bash
git clone https://github.com/MoodGrupo6/Prototipo-mood.git
cd Prototipo-mood
cp .env.example .env
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

6. Abrir el navegador en `http://localhost:5173`

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
| **Back-End** | FastAPI (Python 3.9+), Beanie ODM (Motor), PyJWT |
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

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (recommended)
- MongoDB 7 (if not using Docker)

### Quick Start (Docker)

```bash
git clone https://github.com/MoodGrupo6/Prototipo-mood.git
cd Prototipo-mood
cp .env.example .env
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

6. Open your browser at `http://localhost:5173`

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