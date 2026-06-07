<div align="center">
<img width="1200" height="475" alt="MOOD Banner" src="./src/img/mood_logo.jpg" />
</div>

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

## License

This project is proprietary. All rights reserved. You may view the code for reference purposes, but you may not copy, modify, or distribute it without explicit permission.
