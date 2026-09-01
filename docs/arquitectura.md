# Arquitectura - MOOD

Diagrama de como viaja una peticion desde el cliente hacia la infraestructura, y como fluye la informacion entre los servicios.

## Vista de despliegue (flujo de una peticion)

```mermaid
flowchart LR
    subgraph Cliente["Cliente"]
        U["Usuario<br/>(Navegador Web)"]
    end

    subgraph Internet["Internet"]
        DNS["DNS / Edge<br/>Cloudflare"]
        TUN["Cloudflare Tunnel<br/>(cloudflared)"]
    end

    subgraph Host["Servidor - Docker Compose (red bridge mood_network)"]
        direction TB
        NGX["Nginx Reverse Proxy<br/>mood_nginx :80"]
        FR["Frontend React (SPA)<br/>mood_frontend :80<br/>nginx:alpine + bundle Vite"]
        API["Backend FastAPI<br/>mood_backend :8000<br/>Uvicorn + Routers"]
        SCR["Scraper de eventos<br/>(tarea de fondo del backend,<br/>cada 6 hs)"]
        DB[("MongoDB 7<br/>mood_mongo :27017<br/>volumen mongodb_data")]
    end

    subgraph Externos["Servicios Externos"]
        EB["Eventbrite"]
        QH["QueHacemos API"]
        SMTP["Gmail SMTP"]
        GEM["Google Gemini"]
        OAU["Google OAuth"]
    end

    U -->|"HTTPS https://dominio"| TUN
    DNS -.-> TUN
    TUN -->|"requerimiento interno (red docker)"| NGX
    NGX -->|"location /   (HTML + assets)"| FR
    NGX -->|"location /api/  (quita prefijo)"| API
    NGX -->|"location /uploads/ (imagenes)"| API
    NGX -->|"location /docs/ (Swagger)"| API
    FR -->|"fetch /api/..."| API
    API -->|"pymongo / Beanie ODM"| DB
    API --> SCR
    SCR -->|"scraping cortes (30 dias)"| EB
    SCR -->|"REST JSON"| QH
    SCR -->|"inserta / deduplica eventos"| DB
    API -->|"notificaciones por email"| SMTP
    API -->|"chat de ayuda"| GEM
    API -->|"login social"| OAU
```

## Secuencia de una peticion GET /api/events

```mermaid
sequenceDiagram
    autonumber
    participant U as Navegador (React SPA)
    participant CF as Cloudflare Tunnel
    participant NG as Nginx :80
    participant API as Backend FastAPI :8000
    participant DB as MongoDB :27017

    U->>CF: GET https://dominio/api/events/?province=Mendoza
    CF->>NG: requerimiento interno (red docker)
    NG->>API: /api/ -> /events (proxy_pass strip)
    API->>API: valida + aplica filtros (status, provincia, fecha)
    API->>DB: query con Beanie ODM (pymongo)
    DB-->>API: eventos como documentos
    API-->>NG: 200 application/json
    NG-->>CF: 200 application/json
    CF-->>U: 200 application/json
    U->>U: renderiza cards / mapa
```

## Como se enrutan las rutas (nginx.conf)

| URL publica | destino interno | que sirve |
|---|---|---|
| `/` | `mood_frontend:80` | SPA React (index.html + bundles `/assets/`) |
| `/api/*` | `mood_backend:8000/*` | API REST FastAPI (auth, events, upload, gemini, favorites, ads, notifications, reviews, analytics) |
| `/uploads/*` | `mood_backend:8000/uploads/*` | imagenes de eventos (static) |
| `/docs/*` | `mood_backend:8000/docs/*` | Swagger UI |

## Puertos host visibles

| Puerto | servicio | uso |
|---|---|---|
| `80` | `mood_nginx` | entrada unica de trafico (proxy + SPA) |
| `8000` | `mood_backend` | API directa (health, docs, debug) |
| `27017` | `mood_mongo` | MongoDB (no expuesta al exterior en produccion) |

## Tareas de fondo del backend (app/main.py lifespan)

- `scrape_loop`: cada 6 hs, consume Eventbrite + QueHacemos (ventana 30 dias), normaliza provincias/geocode e inserta eventos en MongoDB.
- `notification_scan_loop`: detecta eventos a 7 dias y envia emails (Gmail SMTP).
- `favorite_email_flush_loop`: flush periodico de emails de favoritos.