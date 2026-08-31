# ============================================================
# app/scraper.py - Scraper automático de eventos reales de BA
# ============================================================
# Toma eventos REALES de la Agenda de Eventbrite Buenos Aires
# (ld+json: título, descripción, fecha futura, dirección,
# coordenadas GPS e imagen), filtrando SOLO los que ocurren
# dentro de la ventana de 1 semana desde "ahora", y los inserta
# como "approved" creados por el usuario sistema "MOOD".
#
# Corre cada 6 horas desde app/scheduler.py (scrape_loop).
# Idempotente: no duplica eventos ya existentes (title+date).
# ============================================================
import asyncio
import datetime
import json
import logging
import os
import re
import time
import uuid

import requests

from app.models import Event, User

logger = logging.getLogger(__name__)

H = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
}

BASE = 'https://www.eventbrite.com.ar/d/argentina--buenos-aires/'
SOURCES = [
    (BASE + 'eventos/', 3),
    (BASE + 'eventos/musica/', 1),
    (BASE + 'eventos/arte/', 1),
    (BASE + 'events/sports/', 1),
    (BASE + 'events/community/', 1),
]

ARG_TZ = datetime.timezone(datetime.timedelta(hours=-3))

# Lat/lng de Buenos Aires (CABA + GBA)
LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX = -34.9, -34.3, -58.7, -58.1

SKIP_TITLES = ['evento falso', 'test', 'testing', 'ejemplo']

MOOD_EMAIL = 'mood@mood.com'

UPLOAD_DIR = '/app/uploads'
EXT_BY_TYPE = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
}


def save_image_local(image_url: str):
    """Descarga una imagen (eventos-scrapers) y la guarda en uploads/ para
    no depender de servicios externos que puedan caerse. Devuelve la ruta
    local /uploads/xxxx o None si falla."""
    if not image_url or image_url.startswith('/uploads/'):
        return image_url
    try:
        r = requests.get(
            image_url,
            timeout=30,
            headers=H,
        )
        if r.status_code != 200 or len(r.content) < 100:
            return None
        ct = (r.headers.get('Content-Type') or 'image/jpeg').split(';')[0].strip()
        if not ct.startswith('image/'):
            return None
        ext = EXT_BY_TYPE.get(ct, '.jpg')
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        fname = uuid.uuid4().hex + ext
        with open(os.path.join(UPLOAD_DIR, fname), 'wb') as f:
            f.write(r.content)
        return f'/uploads/{fname}'
    except Exception as e:
        logger.warning('image download failed for %s: %s', (image_url or '')[:60], e)
        return None


def arg_now():
    return datetime.datetime.now(ARG_TZ).replace(tzinfo=None)


# ============================================================
# USUARIO SISTEMA MOOD
# ============================================================
async def get_or_create_mood_user() -> User:
    user = await User.find_one(User.email == MOOD_EMAIL)
    if user:
        return user
    user = User(
        uid=str(uuid.uuid4()),
        email=MOOD_EMAIL,
        display_name='MOOD',
        role='admin',
        email_verified='1',
        password_hash='',
        created_at=datetime.datetime.utcnow(),
    )
    await user.create()
    logger.info('created system user MOOD: %s', user.uid)
    return user


async def migrate_legacy_scraped_events(mood_uid: str):
    """Pasa los eventos viejos del scraper manual (Agenda Eventbrite /
    anonymous) al usuario MOOD para que también sean reclamables."""
    events = await Event.find(
        Event.created_by == 'anonymous',
        Event.author_name == 'Agenda Eventbrite',
    ).to_list()
    moved = 0
    for e in events:
        e.created_by = mood_uid
        e.author_name = 'MOOD'
        await e.save()
        moved += 1
    if moved:
        logger.info('migrated %s legacy scraped events to MOOD', moved)
    return moved


# ============================================================
# FETCH + PARSEO (bloqueante, corre en un thread)
# ============================================================
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
    }


def scrape_all_pages():
    """Fetch + parse de todas las fuentes. Bloqueante: correr en thread."""
    seen = set()
    results = []
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
                    continue
                key = (norm['title'].lower(), norm['date'].date().isoformat())
                if key in seen:
                    continue
                seen.add(key)
                results.append(norm)
            if len(items) < 20:
                break
            time.sleep(2)
    return results


def slugify(title):
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug[:36]


# ============================================================
# CORRIDA PRINCIPAL
# ============================================================
async def run_scrape(window_days: int = 7):
    """Scrapea eventos dentro de la ventana [ahora, ahora+window_days]
    y los inserta como aprobados, creados por el usuario MOOD."""
    mood = await get_or_create_mood_user()
    await migrate_legacy_scraped_events(mood.uid)

    now = arg_now()
    window_end = now + datetime.timedelta(days=window_days)

    normalized = await asyncio.to_thread(scrape_all_pages)

    saved = 0
    skipped = 0
    for norm in normalized:
        if not (now <= norm['date'] <= window_end):
            skipped += 1
            continue
        existing = await Event.find_one(
            Event.title == norm['title'],
            Event.date == norm['date'],
        )
        if existing:
            skipped += 1
            continue
        eid = slugify(norm['title'])
        if not eid:
            eid = 'evento-' + uuid.uuid4().hex[:6]

        # Guardar la imagen localmente para no depender de CDN externos.
        local_img = await asyncio.to_thread(save_image_local, norm['image_url'])

        ev = Event(
            id=eid,
            title=norm['title'],
            description=norm['description'],
            date=norm['date'],
            end_date=norm['end_date'],
            location=norm['location'],
            category=norm['category'],
            moods=norm['moods'],
            status='approved',
            created_by=mood.uid,
            author_name='MOOD',
            image_url=local_img,
            cover_image=local_img,
            is_free=norm['is_free'],
            is_outdoor=norm['is_outdoor'],
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        await ev.create()
        saved += 1
        logger.info('saved [%s] %s (%s)', norm['moods'][0], norm['title'][:60], norm['date'].date())

    logger.info(
        'scrape done: %d saved, %d skipped (window %s a %s)',
        saved, skipped, now.date(), window_end.date(),
    )
    return {'saved': saved, 'skipped': skipped}


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    from app.database import init_db, close_db

    async def _main():
        await init_db()
        await run_scrape(window_days=7)
        await close_db()

    asyncio.run(_main())
