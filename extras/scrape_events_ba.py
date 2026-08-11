# ============================================================
# extras/scrape_events_ba.py - Scraper de eventos reales de BA
# ============================================================
# Toma eventos REALES de la Agenda de Eventbrite Buenos Aires
# (datos estructurados ld+json: título, descripción, fecha futura,
# dirección, coordenadas GPS e imagen) y los inserta como "approved"
# directamente en MongoDB vía Beanie. Idempotente por slug.
#
# Uso (corre dentro del contenedor backend):
#   docker cp extras/scrape_events_ba.py mood_backend:/tmp/scrape_events_ba.py
#   docker compose exec -e PYTHONPATH=/app backend python /tmp/scrape_events_ba.py
# ============================================================
import asyncio
import datetime
import logging
import re
import time
import uuid

import requests

from app.database import init_db, close_db
from app.models import Event, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

H = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
}

BASE = 'https://www.eventbrite.com.ar/d/argentina--buenos-aires/'
SOURCES = [
    (BASE + 'eventos/', 10),
    (BASE + 'eventos/musica/', 3),
    (BASE + 'eventos/arte/', 3),
    (BASE + 'events/sports/', 3),
    (BASE + 'events/community/', 3),
]

ARG_TZ = datetime.timezone(datetime.timedelta(hours=-3))

# Lat/lng de Buenos Aires (CABA + GBA)
LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX = -34.9, -34.3, -58.7, -58.1

SKIP_TITLES = ['evento falso', 'test', 'testing', 'ejemplo']


def fetch_html(url, session=None, retries=4):
    sess = session or requests
    last = None
    for attempt in range(1, retries + 1):
        try:
            r = sess.get(url, headers=H, timeout=30)
            if r.status_code == 200:
                return r.text
            if r.status_code in (429, 403):
                retry_after = r.headers.get('Retry-After')
                wait = int(retry_after) if retry_after and retry_after.isdigit() else 15 * attempt
                logger.warning('HTTP %s for %s, waiting %ss', r.status_code, url, wait)
                time.sleep(wait)
                last = r.status_code
                continue
            r.raise_for_status()
        except Exception as e:
            last = e
            logger.warning('fetch failed (%s): %s', url, e)
            time.sleep(5 * attempt)
    raise requests.HTTPError('give up after retries: %s' % (last,))


def extract_items(html):
    items = []
    for block in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        import json
        try:
            data = json.loads(block)
        except Exception:
            continue
        if isinstance(data, dict) and 'itemListElement' in data:
            for it in data['itemListElement']:
                obj = it.get('item', it) if isinstance(it, dict) else {}
                if obj.get('name') and obj.get('startDate'):
                    items.append(obj)
    return items


def parse_dt(value, default_hour=0):
    if not value:
        return None
    value = value.strip()
    dt = None
    try:
        dt = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        try:
            dt = datetime.datetime.strptime(value[:10], '%Y-%m-%d')
        except (ValueError, IndexError):
            return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(ARG_TZ).replace(tzinfo=None)
    if dt.hour == 0 and dt.minute == 0 and dt.second == 0:
        dt = dt.replace(hour=default_hour)
    return dt


def slugify(title):
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug[:36]


def assign_mood(title, description):
    text = (title + ' ' + (description or '')).lower()
    rules = [
        ('triste', ['cine', 'documental', 'memoria', 'duelo', 'poesia', 'nostalg', 'despedida',
                    'melancol', 'homenaje', 'recordar', 'drama', 'llanto', 'archivo']),
        ('enojado', ['running', 'trail', 'carrera', 'maraton', 'crossfit', 'futbol', 'boxeo',
                     'kickboxing', 'lucha', 'torneo', 'competencia', 'deporte', 'rugby', 'basket',
                     'voley', 'hockey', 'trekking', 'escalada', 'kayak', 'bici', 'ciclismo',
                     'triatlon', 'natacion', 'atletismo', 'mountain', 'desafio', 'match']),
        ('tranquilo', ['yoga', 'meditacion', 'spa', 'masaje', 'wellness', 'bienestar', 'relax',
                       'pausar', 'mindfulness', 'respir', 'fondue', 'vino', 'cata', 'degustacion',
                       'te ', 'lectura', 'libro', 'biblioteca', 'silencio', 'naturaleza', 'parque',
                       'jardin', 'paseo', 'caminata', 'senderismo', 'picnic', 'ceramica',
                       'artesania', 'taller de arte', 'visita guiada', 'visita al', 'tour',
                       'coworking', 'networking', 'negocios', 'emprendedores', 'mentoria',
                       'reunion', 'desayuno', 'cowork', 'coaching', 'consejo', 'comunidad']),
        ('alegre', ['fiesta', 'rave', 'bolic', 'dj', 'party', 'bingo', 'karaoke', 'cumple',
                    'brunch', 'show', 'recital', 'concierto', 'musica en vivo', 'banda', 'festival',
                    'celebracion', 'carnaval', 'disfraces', '2000', 'bailanta', 'pena', 'folclore',
                    'happy hour', 'after', 'asado', 'joda', 'festejo', 'juego', 'trivia']),
        ('reservado', ['teatro', 'obra', 'stand up', 'museo', 'galeria', 'exposicion', 'muestra',
                       'pintura', 'escultura', 'opera', 'coral', 'orquesta', 'clasica', 'tango',
                       'jazz', 'camara', 'fotografia', 'literatura', 'escritura', 'arte',
                       'cultural', 'presentacion', 'charla', 'conferencia', 'congreso', 'foro']),
    ]
    for mood, kws in rules:
        if any(k in text for k in kws):
            return mood
    return 'reservado'


def assign_category(title, description):
    text = (title + ' ' + (description or '')).lower()
    rules = [
        ('nightlife', ['rave', 'fiesta', 'bolic', 'dj', 'party', 'bingo', 'karaoke', 'bar ',
                       'after', 'joda', 'bailanta']),
        ('adventure', ['running', 'trail', 'trekking', 'mountain', 'escalada', 'crossfit',
                       'kayak', 'bici', 'ciclismo', 'futbol', 'deporte', 'maraton', 'carrera',
                       'triatlon', 'natacion', 'rugby', 'boxeo']),
        ('relax', ['spa', 'yoga', 'masaje', 'meditacion', 'wellness', 'vino', 'cata', 'fondue',
                   'te', 'pausar', 'bienestar', 'picnic']),
        ('group', ['networking', 'workshop', 'curso', 'clase', 'foro', 'congreso', 'charla',
                   'conferencia', 'emprended', 'mentoria', 'reunion', 'comunidad', 'roundtable',
                   'desayuno', 'taller', 'presentacion']),
        ('solo', ['museo', 'galeria', 'lectura', 'cine', 'biblioteca', 'muestra', 'exposicion',
                  'fotografia', 'escritura']),
        ('cultural', ['teatro', 'obra', 'stand up', 'show', 'concierto', 'recital', 'musica',
                      'opera', 'tango', 'jazz', 'coral', 'orquesta', 'folclore', 'pena',
                      'festival', 'arte', 'ceramica']),
    ]
    for cat, kws in rules:
        if any(k in text for k in kws):
            return cat
    return 'cultural'


def normalize(item):
    title = (item.get('name') or '').strip()
    if len(title) < 3:
        return None
    tl = title.lower()
    if any(s in tl for s in SKIP_TITLES):
        return None

    date = parse_dt(item.get('startDate'), default_hour=19)
    if date is None:
        return None

    loc = item.get('location') or {}
    geo = loc.get('geo') or {}
    address = (loc.get('address') or {})
    try:
        lat = float(geo.get('latitude'))
        lng = float(geo.get('longitude'))
    except (TypeError, ValueError):
        return None
    if not (LAT_MIN <= lat <= LAT_MAX and LNG_MIN <= lng <= LNG_MAX):
        return None

    street = (address.get('streetAddress') or '').strip()
    venue = (loc.get('name') or '').strip()
    if len(street) < 4:
        street = venue or 'Buenos Aires'

    city = (address.get('addressLocality') or 'Buenos Aires').strip()
    city = city.title() if len(city) >= 4 else 'Buenos Aires'
    if city.upper() in ('CABA', 'C.A.B.A.', 'Cdad. Autonoma De Buenos Aires', 'Ciudad Autonoma De Buenos Aires'):
        city = 'Buenos Aires'
    province = 'Buenos Aires'

    end_date = None
    end_dt = parse_dt(item.get('endDate'), default_hour=23)
    if end_dt and end_dt >= date:
        end_date = end_dt

    description = (item.get('description') or '').strip()[:1000] or None
    image = (item.get('image') or '').strip() or None

    mood = assign_mood(title, description)
    category = assign_category(title, description)

    text = (title + ' ' + (description or '')).lower()
    is_free = bool(re.search(r'gratis|sin cargo|entrada libre|free', text))
    is_outdoor = bool(re.search(r'aire libre|parque|plaza|costanera|jardin|outdoor|al aire libre|al aire|running|trail|trekking', text))

    return {
        'title': title,
        'description': description,
        'date': date,
        'end_date': end_date,
        'location': {
            'address': street,
            'city': city,
            'province': province,
            'lat': round(lat, 6),
            'lng': round(lng, 6),
        },
        'category': [category],
        'moods': [mood],
        'cover_image': image,
        'image_url': image,
        'is_free': is_free,
        'is_outdoor': is_outdoor,
        'status': 'approved',
        'created_by': 'anonymous',
        'author_name': 'Agenda Eventbrite',
        'source_url': item.get('url'),
    }


async def unique_id(base_title, date, existing_ids):
    base = slugify(base_title) or ('evento-' + uuid.uuid4().hex[:6])
    candidates = [base]
    if len(base) > 28:
        candidates.append(base[:28] + '-' + date.strftime('%m%d'))
    candidates.append(base + '-' + date.strftime('%m%d'))
    for i in range(1, 50):
        candidates.append((base[:30] + '-' + uuid.uuid4().hex[:4]))
    for c in candidates:
        if c not in existing_ids:
            existing_ids.add(c)
            return c
    return None


async def main():
    await init_db()

    existing_ids = set(e.id for e in await Event.find_all().to_list())
    today = datetime.date.today()
    seen = set()
    saved = 0
    skipped = 0

    for url, pages in SOURCES:
        logger.info('scraping %s (%d pages)', url, pages)
        for pg in range(1, pages + 1):
            page_url = url if pg == 1 else url.rstrip('/') + '/?page=%d' % pg
            try:
                html = fetch_html(page_url)
            except Exception as e:
                logger.warning('page %d give up: %s', pg, e)
                break
            items = extract_items(html)
            if not items:
                break
            for item in items:
                norm = normalize(item)
                if norm is None:
                    skipped += 1
                    continue
                if norm['date'].date() < today:
                    skipped += 1
                    continue
                key = (norm['title'].lower(), norm['date'].date().isoformat())
                if key in seen:
                    skipped += 1
                    continue
                seen.add(key)
                eid = await unique_id(norm['title'], norm['date'], existing_ids)
                if eid is None:
                    skipped += 1
                    continue
                ev = Event(
                    id=eid,
                    title=norm['title'],
                    description=norm['description'],
                    date=norm['date'],
                    end_date=norm['end_date'],
                    location=norm['location'],
                    category=norm['category'],
                    moods=norm['moods'],
                    status=norm['status'],
                    created_by=norm['created_by'],
                    author_name=norm['author_name'],
                    image_url=norm['image_url'],
                    cover_image=norm['cover_image'],
                    is_free=norm['is_free'],
                    is_outdoor=norm['is_outdoor'],
                    created_at=datetime.datetime.utcnow(),
                    updated_at=datetime.datetime.utcnow(),
                )
                await ev.create()
                saved += 1
                logger.info('saved [%s] %s (%s)', norm['moods'][0], norm['title'][:60], norm['date'].date())
            if len(items) < 20:
                break
            time.sleep(2)

    print()
    print('=' * 60)
    print('SCRAPING COMPLETADO')
    print('=' * 60)
    print('guardados:', saved)
    print('omitidos:', skipped)

    counts = {}
    for e in await Event.find(Event.status == 'approved').to_list():
        for m in (e.moods or []):
            counts[m] = counts.get(m, 0) + 1
    print('aprobados por mood:', dict(sorted(counts.items(), key=lambda x: -x[1])))
    for m in ['alegre', 'triste', 'enojado', 'tranquilo', 'reservado']:
        print('  %-10s %s' % (m, counts.get(m, 0)))

    await close_db()


if __name__ == '__main__':
    asyncio.run(main())
