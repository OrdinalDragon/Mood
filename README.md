<div align="center">
<img width="1200" height="475" alt="MOOD Banner" src="./src/img/mood_logo.jpg" />
</div>

<p align="center">
  <a href="#english"><b>🇺🇸 English version ↓</b></a>
</p>

# Mood App 🎭

> **Prototipo — Trabajo en Progreso**

Aplicación web full-stack que recomienda eventos cercanos según cómo te sentís. Decile a la app tu estado de ánimo actual y ella te muestra eventos locales que combinan con tu vibe.

🌐 **Demo en vivo:** [prototipomood.jesrepresentaciones.com.ar](https://prototipomood.jesrepresentaciones.com.ar)

---

## Funcionalidades

- 🔐 Registro e inicio de sesión con JWT
- 😊 Selección de estado de ánimo para reflejar cómo te sentís
- 📍 Recomendaciones de eventos cercanos según tu estado de ánimo
- 🌗 Modo oscuro con detección de preferencia del sistema
- 🗺️ Mapa interactivo con búsqueda por ciudad y provincia (OpenStreetMap)
- 📝 Subida de eventos por la comunidad con flujo de aprobación por administradores
- 🗄️ Datos persistentes con MariaDB
- 📱 Diseño responsive (mobile, tablet, desktop)

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| **Front-End** | React 19, TypeScript, Tailwind CSS v4, shadcn UI, Vite, React Router, React Leaflet, date-fns, Lucide React |
| **Back-End** | FastAPI (Python 3.9+), SQLAlchemy, PyJWT |
| **Base de datos** | MariaDB |
| **Contenedores** | Docker & Docker Compose |
| **Proxy** | Nginx |
| **Tunnel** | Cloudflare Tunnel |
| **Geocoding** | Nominatim (OpenStreetMap) |

---

## Cómo empezar

### Info

Puede que falten archivos por información privada y API keys.

### Requisitos

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (recomendado)
- MariaDB (si no usás Docker)

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

5. **Ejecutar migraciones de base de datos**
   ```bash
   # Asegurate de que MariaDB esté corriendo y las credenciales coincidan con .env
   ```

6. **Ejecutar la app**
   ```bash
   # Iniciar el back-end
   uvicorn app.main:app --reload

   # En otra terminal, iniciar el front-end
   npm run dev
   ```

7. Abrir el navegador en `http://localhost:5173`

---

## Estado del proyecto

Este proyecto es actualmente un **prototipo**. Las funcionalidades están siendo desarrolladas y mejoradas activamente.

Mejoras planificadas:
- [ ] Integración de geolocalización para detección automática de cercanía
- [ ] Categorías de ánimo expandidas
- [ ] Mejoras de responsive mobile

---

## Integrantes

- Nicolás Schernetzki
- Maylen Speso
- Aylén Roldán
- Gastón Crespo
- Mariano Méndez
- Joel Aliendre
- Germán Ramírez
- Luciano Bustamante
- Diego Ruda
- Leonardo Nieto

---

## Licencia

Este proyecto es privado. Todos los derechos reservados. Podés ver el código como referencia, pero no podés copiarlo, modificarlo ni distribuirlo sin permiso explícito.

---

---

<span id="english"></span>

# Mood App 🎭

> **Prototype — Work in Progress**

A full-stack web application that recommends nearby events based on how you're feeling. Tell the app your current mood, and it surfaces local events that match your vibe.

🌐 **Live demo:** [prototipomood.jesrepresentaciones.com.ar](https://prototipomood.jesrepresentaciones.com.ar)

---

## Features

- 🔐 User registration and login with JWT
- 😊 Mood selection to reflect how you're feeling
- 📍 Nearby event recommendations based on your current mood
- 🌗 Dark mode with system preference detection
- 🗺️ Interactive map with city and province search (OpenStreetMap)
- 📝 Community event submission with admin approval workflow
- 🗄️ Persistent user data with MariaDB
- 📱 Responsive design (mobile, tablet, desktop)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Front-End** | React 19, TypeScript, Tailwind CSS v4, shadcn UI, Vite, React Router, React Leaflet, date-fns, Lucide React |
| **Back-End** | FastAPI (Python 3.9+), SQLAlchemy, PyJWT |
| **Database** | MariaDB |
| **Containerization** | Docker & Docker Compose |
| **Proxy** | Nginx |
| **Tunnel** | Cloudflare Tunnel |
| **Geocoding** | Nominatim (OpenStreetMap) |

---

## Getting Started

### Info

There may be missing files because of private info and API keys.

### Prerequisites

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (recommended)
- MariaDB (if not using Docker)

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

5. **Run database migrations**
   ```bash
   # Ensure MariaDB is running and credentials match .env
   ```

6. **Run the app**
   ```bash
   # Start the back-end
   uvicorn app.main:app --reload

   # In a separate terminal, start the front-end
   npm run dev
   ```

7. Open your browser at `http://localhost:5173`

---

## Project Status

This project is currently a **prototype**. Features are being actively developed and improved.

Planned improvements:
- [ ] Geolocation integration for automatic nearby detection
- [ ] Expanded mood categories
- [ ] Mobile-responsive polish

---

## Team

- Nicolás Schernetzki
- Maylen Speso
- Aylén Roldán
- Gastón Crespo
- Mariano Méndez
- Joel Aliendre
- Germán Ramírez
- Luciano Bustamante
- Diego Ruda
- Leonardo Nieto

---

## License

This project is proprietary. All rights reserved. You may view the code for reference purposes, but you may not copy, modify, or distribute it without explicit permission.
