# Architecture - MOOD

Diagram showing how a request travels from the client into the infrastructure, and how information flows between services.

## Deployment view (request flow)

```mermaid
flowchart LR
    subgraph Cliente["Client"]
        U["User<br/>(Web Browser)"]
    end

    subgraph Internet["Internet"]
        DNS["DNS / Edge<br/>Cloudflare"]
        TUN["Cloudflare Tunnel<br/>(cloudflared)"]
    end

    subgraph Host["Server - Docker Compose (bridge network mood_network)"]
        direction TB
        NGX["Nginx Reverse Proxy<br/>mood_nginx :80"]
        FR["React Frontend (SPA)<br/>mood_frontend :80<br/>nginx:alpine + Vite bundle"]
        API["FastAPI Backend<br/>mood_backend :8000<br/>Uvicorn + Routers"]
        SCR["Event scraper<br/>(backend background task,<br/>every 6 hs)"]
        DB[("MongoDB 7<br/>mood_mongo :27017<br/>mongodb_data volume")]
    end

    subgraph Externos["External Services"]
        SMTP["Gmail SMTP"]
        GEM["Google Gemini"]
        OAU["Google OAuth"]
    end

    U -->|"HTTPS https://domain"| TUN
    DNS -.-> TUN
    TUN -->|"internal request (docker network)"| NGX
    NGX -->|"location /   (HTML + assets)"| FR
    NGX -->|"location /api/  (prefix stripped)"| API
    NGX -->|"location /uploads/ (images)"| API
    NGX -->|"location /docs/ (Swagger)"| API
    FR -->|"fetch /api/..."| API
    API -->|"pymongo / Beanie ODM"| DB
    API --> SCR
    SCR -->|"inserts / dedupes events"| DB
    API -->|"email notifications"| SMTP
    API -->|"help chat"| GEM
    API -->|"social login"| OAU
```

## Sequence of a GET /api/events request

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser (React SPA)
    participant CF as Cloudflare Tunnel
    participant NG as Nginx :80
    participant API as FastAPI Backend :8000
    participant DB as MongoDB :27017

    U->>CF: GET https://domain/api/events/?province=Mendoza
    CF->>NG: internal request (docker network)
    NG->>API: /api/ -> /events (proxy_pass strip)
    API->>API: validates + applies filters (status, province, date)
    API->>DB: query with Beanie ODM (pymongo)
    DB-->>API: events as documents
    API-->>NG: 200 application/json
    NG-->>CF: 200 application/json
    CF-->>U: 200 application/json
    U->>U: renders cards / map
```

## Route mapping (nginx.conf)

| Public URL | Internal target | Serves |
|---|---|---|
| `/` | `mood_frontend:80` | React SPA (index.html + `/assets/` bundles) |
| `/api/*` | `mood_backend:8000/*` | FastAPI REST API (auth, events, upload, gemini, favorites, ads, notifications, reviews, analytics) |
| `/uploads/*` | `mood_backend:8000/uploads/*` | event images (static) |
| `/docs/*` | `mood_backend:8000/docs/*` | Swagger UI |

## Public host ports

| Port | Service | Purpose |
|---|---|---|
| `80` | `mood_nginx` | single traffic entry point (proxy + SPA) |
| `8000` | `mood_backend` | direct API (health, docs, debug) |
| `27017` | `mood_mongo` | MongoDB (not exposed externally in production) |

## Backend background tasks (app/main.py lifespan)

- `scrape_loop`: every 6 hs, consumes external event sources (30-day window), normalizes provinces/geocodes and inserts events into MongoDB.
- `notification_scan_loop`: detects events within 7 days and sends emails (Gmail SMTP).
- `favorite_email_flush_loop`: periodic flush of favorite-event emails.