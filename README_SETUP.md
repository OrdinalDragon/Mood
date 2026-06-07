# ============================================================
# MOOD - Setup Guide
# ============================================================
# Guia para levantar el proyecto en una nueva PC

## PASO 1 - Prerrequisitos

Instala en la nueva PC:
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Git (opcional): https://git-scm.com/

Verifica que Docker funcione:
```bash
docker --version
docker-compose --version
```

## PASO 2 - Configurar variables de entorno

Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

Edita `.env` y ajusta los valores si es necesario.

## PASO 3 - Levantar los contenedores

```bash
docker-compose up -d --build
```

Esto automaticamente:
1. Construye las imagenes de backend y frontend
2. Inicia MariaDB con volumen persistente
3. Inicia FastAPI (backend)
4. Inicia React (frontend)
5. Inicia Nginx (proxy reverso)
6. Inicia Cloudflare Tunnel (si hay token)

## PASO 4 - Importar la base de datos

Si tienes un backup de la base de datos (`mood_db_backup.sql`):

```bash
docker cp mood_db_backup.sql mood_db:/tmp/backup.sql
docker exec mood_db mysql -uroot -prootpassword mood_db < mood_db_backup.sql
```

Si no tienes backup, la base de datos se creara vacia.

## PASO 5 - Verificar

Abre en el navegador:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

Para verificar la API:
```bash
curl http://localhost:8000/events/ | python -m json.tool
```

## COMANDOS UTILES

```bash
# Ver logs de un servicio
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Detener y borrar datos (cuidado!)
docker-compose down -v

# Ver estado de contenedores
docker-compose ps

# Reconstruir imagenes
docker-compose up -d --build
```

## ESTRUCTURA DEL PROYECTO

```
mood-export/
├── app/                    # Backend Python (FastAPI)
│   ├── database.py         # Conexion a MariaDB
│   ├── main.py             # App principal
│   ├── models.py           # Modelos SQLAlchemy
│   ├── schemas.py          # Esquemas Pydantic
│   └── routes/             # Endpoints API
├── src/                    # Frontend React
│   ├── App.tsx             # Rutas principales
│   ├── components/         # Componentes UI
│   ├── pages/              # Paginas
│   └── types.ts            # Tipos TypeScript
├── Dockerfile              # Imagen backend
├── Dockerfile.frontend     # Imagen frontend
├── docker-compose.yml      # Orquestacion
├── nginx.conf              # Proxy reverso
├── requirements.txt        # Dependencias Python
└── package.json            # Dependencias Node
```

## TROUBLESHOOTING

**Error: "port already in use"**
- Cambia el puerto en `.env`: `DB_PORT=3307`
- O detiene el servicio que usa el puerto

**Error: "container unhealthy"**
- Revisa los logs: `docker-compose logs backend`
- Reinicia: `docker-compose restart backend`

**Error: "database connection refused"**
- Espera 30 segundos (la DB tarda en iniciar)
- Verifica: `docker-compose ps`
