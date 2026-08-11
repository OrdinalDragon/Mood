# ============================================================
# extras/archive_concluded.py - Archiva eventos concluidos
# ============================================================
# Marca como "archived" los eventos aprobados cuya fecha ya pasó.
# Los listados por defecto (GET /events/ sin status_filter=archived)
# solo muestran "approved", así que salen del mapa/home/calendario.
#
# Uso (el script corre dentro del contenedor backend):
#   docker cp extras/archive_concluded.py mood_backend:/tmp/archive_concluded.py
#   docker compose exec -e PYTHONPATH=/app backend python /tmp/archive_concluded.py
# ============================================================
import asyncio
from app.database import init_db, close_db
from app.notifications_service import archive_past_events


async def main():
    await init_db()
    n = await archive_past_events()
    print(f"Eventos archivados: {n}")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
