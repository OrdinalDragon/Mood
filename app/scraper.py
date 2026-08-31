# ============================================================
# app/scraper.py - Scraper de eventos reales de todo Argentina
# ============================================================
# Multi-fuente:
#   1) Eventbrite Argentina (feed nacional con rango de fechas,
#      eventos a 30 días, cobertura multi-provincia).
#   2) Qué Hacemos (api.quehacemos.com.ar): metabuscador argentino
#      que consolida 50+ plataformas de tickets (Passline, Plateanet,
#      Ticketek, etc.) y aporta cobertura de muchas ciudades/provincias.
#
# Los eventos se insertan como "approved" creados por el usuario MOOD.
# Corre cada 6 horas desde app/scheduler.py (scrape_loop).
# Idempotente: no duplica eventos ya existentes (title+date).
# ============================================================
import asyncio
import datetime
import json
import logging
import os
import random
import re
import time
import uuid

import requests

from app.models import Event, User

logger = logging.getLogger(__name__)

UA_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
]

# Rango continental de Argentina (excluye Uruguay, Chile, Brasil, Paraguay,
# Bolivia). Se usa para validar coordenadas de fuentes que las traen.
ARG_LAT_MIN, ARG_LAT_MAX = -55.0, -21.5
ARG_LNG_MIN, ARG_LNG_MAX = -74.0, -53.0

ARG_TZ = datetime.timezone(datetime.timedelta(hours=-3))

WINDOW_DAYS = 30

SKIP_TITLES = ['evento falso', 'test', 'testing', 'ejemplo', 'evento de prueba']

MOOD_EMAIL = 'mood@mood.com'

UPLOAD_DIR = '/app/uploads'
EXT_BY_TYPE = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
}

# ────────────────────────────────────────────────────────────
# PROVINCIAS: sinónimos → nombre canónico (coincide con dropdown frontend)
# ────────────────────────────────────────────────────────────
CANONICAL_PROVINCES = [
    'CABA', 'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
    'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
    'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán',
]

PROVINCE_SYNONYMS = {
    'CABA': ['caba', 'ciudad autonoma de buenos aires', 'ciudad autónoma de buenos aires',
             'ciudad de buenos aires', 'cdad autonoma de buenos aires',
             'cdad. autonoma de buenos aires', 'c.a.b.a.', 'c.a.b.a', 'bs as capital',
             'capital federal', 'buenos aires (capital)', 'caba (caba)', 'ciudad autónoma',
             'ciudad autonoma', 'cdad autonoma', 'cdad. autonoma', 'caba (capital)'],
    'Buenos Aires': ['buenos aires', 'provincia de buenos aires', 'pcia de buenos aires',
                     'pcia. de buenos aires', 'gba', 'gran buenos aires', 'bs as',
                     'buenos aires (gba)', 'zona norte', 'zona sur', 'zona oeste'],
    'Catamarca': ['catamarca'],
    'Chaco': ['chaco', 'resistencia'],
    'Chubut': ['chubut'],
    'Córdoba': ['cordoba', 'córdoba', 'provincia de cordoba', 'pcia de cordoba'],
    'Corrientes': ['corrientes'],
    'Entre Ríos': ['entre rios', 'entre ríos', 'entre rios (parana)', 'parana'],
    'Formosa': ['formosa'],
    'Jujuy': ['jujuy'],
    'La Pampa': ['la pampa', 'pampa', 'santa rosa'],
    'La Rioja': ['la rioja'],
    'Mendoza': ['mendoza'],
    'Misiones': ['misiones', 'posadas'],
    'Neuquén': ['neuquen', 'neuquén'],
    'Río Negro': ['rio negro', 'río negro', 'bariloche'],
    'Salta': ['salta'],
    'San Juan': ['san juan'],
    'San Luis': ['san luis'],
    'Santa Cruz': ['santa cruz', 'rio gallegos'],
    'Santa Fe': ['santa fe', 'rosario'],
    'Santiago del Estero': ['santiago del estero'],
    'Tierra del Fuego': ['tierra del fuego', 'tierra del fuego (ushuaia)', 'ushuaia'],
    'Tucumán': ['tucuman', 'tucumán'],
}

# Ciudad (addressLocality/locality) → provincia canónica (fallback si la
# fuente no trae region confiable).
CITY_TO_PROVINCE = {
    'buenos aires': 'CABA', 'caba': 'CABA', 'capital federal': 'CABA',
    'rosario': 'Santa Fe', 'santa fe': 'Santa Fe', 'rosario (santa fe)': 'Santa Fe',
    'cordoba': 'Córdoba', 'córdoba': 'Córdoba', 'villa maria': 'Córdoba',
    'mendoza': 'Mendoza', 'san rafael': 'Mendoza', 'godoy cruz': 'Mendoza',
    'la plata': 'Buenos Aires', 'mar del plata': 'Buenos Aires', 'tandil': 'Buenos Aires',
    'bahia blanca': 'Buenos Aires', 'quilmes': 'Buenos Aires', 'avellaneda': 'Buenos Aires',
    'lanus': 'Buenos Aires', 'san isidro': 'Buenos Aires', 'villa ballester': 'Buenos Aires',
    'tigre': 'Buenos Aires', 'pilar': 'Buenos Aires', 'san martin': 'Buenos Aires',
    'moreno': 'Buenos Aires', 'moron': 'Buenos Aires', 'general rodriguez': 'Buenos Aires',
    'zapala': 'Neuquén', 'neuquen': 'Neuquén', 'neuquén': 'Neuquén',
    'san carlos de bariloche': 'Río Negro', 'bariloche': 'Río Negro', 'roca': 'Río Negro',
    'viedma': 'Río Negro', 'salta': 'Salta', 'san salvador de jujuy': 'Jujuy', 'jujuy': 'Jujuy',
    'tucuman': 'Tucumán', 'tucumán': 'Tucumán', 'san miguel de tucuman': 'Tucumán',
    'corrientes': 'Corrientes', 'posadas': 'Misiones', 'formosa': 'Formosa',
    'resistencia': 'Chaco', 'santa rosa': 'La Pampa', 'la rioja': 'La Rioja',
    'san juan': 'San Juan', 'san luis': 'San Luis', 'rio gallegos': 'Santa Cruz',
    'ushuaia': 'Tierra del Fuego', 'santiago del estero': 'Santiago del Estero',
    'parana': 'Entre Ríos', 'concordia': 'Entre Ríos', 'catamarca': 'Catamarca',
    'belen': 'Catamarca', 'comodoro rivadavia': 'Chubut', 'puerto madryn': 'Chubut',
    'trelew': 'Chubut', 'esquel': 'Chubut', 'rawson': 'Chubut',
}


def _fold(text: str):
    """Quita acentos y pasa a minúsculas para comparaciones sencillas."""
    table = str.maketrans('áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')
    return (text or '').translate(table).lower().strip()


def _canonical_province(value: str):
    """Normaliza una string de provincia/region a su nombre canónico."""
    if not value:
        return None
    norm = _fold(value)
    if not norm:
        return None
    # coincidencia exacta sobre sinónimos
    hits = []
    for canon, syns in PROVINCE_SYNONYMS.items():
        for s in syns:
            f = _fold(s)
            if norm == f:
                return canon
            # si el valor es una ciudad conocida de la provincia
            if f and (norm.startswith(f + ' ') or norm.endswith(' ' + f) or f.startswith(norm + ' ')):
                hits.append((len(f), canon))
    # fallback: prefijos tipo "provincia de buenos aires" o "cdad autonoma de ..."
    for canon, syns in PROVINCE_SYNONYMS.items():
        for s in syns:
            f = _fold(s)
            if f and (norm.endswith(' ' + f) or norm.startswith(f)):
                hits.append((len(f) + 1, canon))
    if hits:
        hits.sort(key=lambda x: -x[0])
        return hits[0][1]
    return None


# ────────────────────────────────────────────────────────────
# GEOCODE (Opción A): ciudad → (lat, lng) aproximados (centro de ciudad)
# Sin API externa. Capitales de provincia + ciudades importantes.
# ────────────────────────────────────────────────────────────
CITY_COORDS = {
    'CABA': (-34.6037, -58.3816), 'buenos aires': (-34.6037, -58.3816),
    'la plata': (-34.9215, -57.9545), 'mar del plata': (-38.0023, -57.5575),
    'tandil': (-37.3217, -59.1332), 'bahia blanca': (-38.7196, -62.2724),
    'quilmes': (-34.7201, -58.2606), 'avellaneda': (-34.6625, -58.3676),
    'lanus': (-34.7010, -58.3950), 'san isidro': (-34.4703, -58.5236),
    'tigre': (-34.4263, -58.5812), 'pilar': (-34.4565, -58.9144),
    'moron': (-34.6514, -58.6200), 'moreno': (-34.6510, -58.7920),
    'san martin': (-34.5694, -58.5392),
    'rosario': (-32.9468, -60.6393), 'santa fe': (-31.6107, -60.6973),
    'cordoba': (-31.4201, -64.1888), 'córdoba': (-31.4201, -64.1888),
    'villa maria': (-32.4075, -63.2401),
    'mendoza': (-32.8895, -68.8458), 'godoy cruz': (-32.9300, -68.8500),
    'san rafael': (-34.6177, -68.3300),
    'neuquen': (-38.9516, -68.0591), 'neuquén': (-38.9516, -68.0591),
    'zapala': (-38.8990, -70.0660),
    'bariloche': (-41.1335, -71.3103), 'san carlos de bariloche': (-41.1335, -71.3103),
    'viedma': (-40.8135, -62.9967), 'roca': (-39.0300, -67.5800),
    'salta': (-24.7821, -65.4232), 'san salvador de jujuy': (-24.1946, -65.2970),
    'jujuy': (-24.1946, -65.2970), 'tucuman': (-26.8083, -65.2176),
    'tucumán': (-26.8083, -65.2176), 'san miguel de tucuman': (-26.8083, -65.2176),
    'corrientes': (-27.4691, -58.8300), 'posadas': (-27.3671, -55.8960),
    'formosa': (-26.1845, -58.1731), 'resistencia': (-27.4514, -58.9865),
    'santa rosa': (-36.6167, -64.2833), 'la rioja': (-29.4128, -66.8568),
    'san juan': (-31.5375, -68.5364), 'san luis': (-33.2959, -66.3356),
    'rio gallegos': (-51.6226, -69.2181), 'ushuaia': (-54.8019, -68.3030),
    'santiago del estero': (-27.7951, -64.2615), 'parana': (-31.7317, -60.5240),
    'concordia': (-31.3929, -58.0209), 'catamarca': (-28.4696, -65.7790),
    'comodoro rivadavia': (-45.8657, -67.4810), 'puerto madryn': (-42.7692, -65.0380),
    'trelew': (-43.2490, -65.3070), 'esquel': (-42.9110, -71.3190),
    'rawson': (-43.3000, -65.1020), 'pinamar': (-37.1095, -56.8570),
    'necochea': (-38.5540, -58.7390), 'azul': (-36.7765, -59.8590),
    'chivilcoy': (-34.9060, -60.0160), 'olavarria': (-36.8920, -60.3210),
    'pergamino': (-33.8950, -60.5730), 'san nicolas': (-33.3280, -60.2220),
    'junin': (-34.5830, -60.9580), 'zona norte': (-34.5200, -58.5400),
    'reconquista': (-29.1430, -59.6440), 'rafoela': (-31.2510, -61.4910),
    'venado tuerto': (-33.7460, -61.9680), 'san francisco': (-31.4270, -62.0920),
    'rio cuarto': (-33.1300, -64.3490), 'alta gracia': (-31.6560, -64.4330),
    'villa carlos paz': (-31.4160, -64.5000), 'cosquin': (-31.2450, -64.4660),
    'villa gesell': (-37.2540, -56.9690), 'san clemente del tuyu': (-36.3570, -56.7240),
    'carilo': (-37.1650, -56.8830), 'monte hermoso': (-38.9830, -61.3020),
    'claromeco': (-38.8480, -60.0640), 'miramar': (-38.2710, -57.8380),
    'radich': (-38.0100, -58.0900), 'trenque lauquen': (-35.9770, -62.7320),
    'penin': (-34.3780, -58.2650), 'campana': (-34.1680, -58.9580),
    'zarate': (-34.0950, -59.0310), 'lujan': (-34.5400, -59.1090),
    'mercedes': (-34.6520, -59.4300), 'chacabuco': (-34.6420, -60.4940),
    'bragado': (-35.1210, -60.5070), 'nueve de julio': (-35.4440, -60.8930),
    '24 de febrero': (-35.0000, -60.0000),
    'metan': (-25.5000, -64.9700), 'tartagal': (-22.5200, -63.8100),
    'orans': (-23.1300, -64.3300), 'general guemes': (-24.6700, -65.0500),
    'cafayate': (-26.0800, -65.9780),
    'gualeguaychu': (-33.0100, -58.5130), 'gualeguay': (-33.1550, -59.3090),
    'concepcion del uruguay': (-32.4840, -58.2320), 'victoria': (-32.6200, -60.1580),
    'colon': (-32.2260, -58.1250), 'chajari': (-30.7680, -57.9770),
    'san pedro de entre rios': (-32.9720, -58.4050),
    'puerto iguazu': (-25.5980, -54.5860), 'eldorado': (-26.4080, -54.6150),
    'obera': (-27.4860, -55.1200), 'leandro n. alem': (-27.6020, -55.3240),
    'apostoles': (-27.9000, -55.7600),
    'perico': (-24.3760, -65.1120), 'palpala': (-24.2570, -65.2110), 'libertador': (-23.8000, -64.7900),
    'famailla': (-27.0530, -65.4010), 'concepcion': (-27.3250, -65.5950),
    'monteros': (-27.1650, -65.4990), 'agulhares': (-27.4100, -65.6200),
    'termas de rio hondo': (-27.4960, -64.8700), 'la banda': (-27.7350, -64.2410),
    'frias': (-28.6360, -65.1310),
    'pena colorada': (-31.6000, -69.5000), 'malargue': (-35.4750, -69.5830),
    'san martin de los andes': (-40.1580, -71.3540), 'junin de los andes': (-39.9500, -71.0700),
    'choele choel': (-39.2600, -65.6550), 'san antonio oeste': (-40.7310, -64.9500),
    'las grutas': (-41.0800, -65.0900), 'playa los lobos': (-40.9200, -65.1300),
    'caleta olivia': (-46.4330, -67.5210), 'pico truncado': (-46.7960, -67.9740),
    'las heras': (-46.5410, -68.8130), 'perito moreno': (-46.5900, -70.9220),
    'gobernador gregores': (-48.7500, -70.2490), 'el calafate': (-50.3380, -72.2620),
    'tolhuin': (-54.5100, -67.1900), 'rio grande': (-53.7870, -67.7090),
}


def city_coords(city: str, province: str):
    """Devuelve (lat, lng) aproximados para una ciudad. Fallback: centro de
    la capital de la provincia, luego None."""
    c = _fold(city) if city else ''
    if c and c in CITY_COORDS:
        return CITY_COORDS[c]
    p = _canonical_province(province)
    if c and c in CITY_COORDS:
        return CITY_COORDS[c]
    return _capital_coords(p) if p else None


def _capital_coords(canonical_province):
    cap = {
        'CABA': (-34.6037, -58.3816), 'Buenos Aires': (-34.9215, -57.9545),
        'Catamarca': (-28.4696, -65.7790), 'Chaco': (-27.4514, -58.9865),
        'Chubut': (-43.3000, -65.1020), 'Córdoba': (-31.4201, -64.1888),
        'Corrientes': (-27.4691, -58.8300), 'Entre Ríos': (-31.7317, -60.5240),
        'Formosa': (-26.1845, -58.1731), 'Jujuy': (-24.1946, -65.2970),
        'La Pampa': (-36.6167, -64.2833), 'La Rioja': (-29.4128, -66.8568),
        'Mendoza': (-32.8895, -68.8458), 'Misiones': (-27.3671, -55.8960),
        'Neuquén': (-38.9516, -68.0591), 'Río Negro': (-40.8135, -62.9967),
        'Salta': (-24.7821, -65.4232), 'San Juan': (-31.5375, -68.5364),
        'San Luis': (-33.2959, -66.3356), 'Santa Cruz': (-51.6226, -69.2181),
        'Santa Fe': (-31.6107, -60.6973), 'Santiago del Estero': (-27.7951, -64.2615),
        'Tierra del Fuego': (-54.8019, -68.3030), 'Tucumán': (-26.8083, -65.2176),
    }
    return cap.get(canonical_province)


def save_image_local(image_url: str):
    """Descarga una imagen y la guarda en uploads/. Devuelve la ruta local
    /uploads/xxxx o None si falla."""
    if not image_url or image_url.startswith('/uploads/'):
        return image_url
    try:
        r = requests.get(image_url, timeout=30, headers={'User-Agent': random.choice(UA_LIST)})
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
# FETCH (bloqueante, corre en thread). Con rotación de UA + jitter.
# ============================================================
def fetch(url, session=None, retries=4):
    """GET con retry/backoff cortés. Respeta 429/403 con Retry-After y
    rota User-Agent; jitter entre reintentos."""
    sess = session or requests
    last = None
    for attempt in range(1, retries + 1):
        headers = {'User-Agent': random.choice(UA_LIST), 'Accept': 'application/json, text/html, */*'}
        try:
            r = sess.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                return r
            if r.status_code in (429, 403):
                retry_after = r.headers.get('Retry-After')
                wait = (int(retry_after) if retry_after and retry_after.isdigit() else 20 * attempt)
                wait = wait * random.uniform(0.8, 1.4)
                logger.warning('HTTP %s for %s, waiting %.1fs', r.status_code, url, wait)
                time.sleep(wait)
                last = r.status_code
                continue
            r.raise_for_status()
        except requests.exceptions.RequestException as e:
            last = e
            # No re-intentar con backoff largo si el host no resuelve/conecta:
            # es un fallo de infra que no se arregla en segundos. Un solo retry
            # corto por si el DNS es transitorio, luego abandonar para que el
            # resto de fuentes continúe.
            is_conn = isinstance(e, (requests.exceptions.ConnectionError,
                                     requests.exceptions.Timeout))
            logger.warning('fetch failed (%s): %s', url, e)
            if is_conn and attempt >= 2:
                logger.warning('conn/dns error persisting for %s, skipping', url)
                raise
            time.sleep((3 if is_conn else 5) * attempt * random.uniform(0.8, 1.4))
    raise requests.HTTPError('give up after retries: %s' % (last,))


# ============================================================
# PARSEO COMÚN
# ============================================================
def normalize_common(title, description, date, end_date, city, province,
                     street, venue, lat, lng, image, category_hint=None):
    title = (title or '').strip()
    if len(title) < 3:
        return None
    tl = title.lower()
    if any(s in tl for s in SKIP_TITLES):
        return None

    province = _canonical_province(province) or _canonical_province(city) or \
        CITY_TO_PROVINCE.get(_fold(city))

    city = (city or '').strip()
    if not city:
        city = 'Ciudad'
    if len(city) <= 3:
        city = 'Ciudad'
    city_title = city.title()

    # Dirección: si no hay calle, dejar vacío (el frontend muestra "Consultar").
    address = (street or '').strip()
    if len(address) < 4:
        address = ''

    mood = assign_mood(title, description or '')
    category = assign_category(title, description or '', category_hint)

    text = (title + ' ' + (description or '')).lower()
    is_free = bool(re.search(r'gratis|sin cargo|entrada libre|free', text))
    is_outdoor = bool(re.search(r'aire libre|parque|plaza|costanera|jardin|outdoor|al aire libre|al aire|running|trail|trekking', text))

    return {
        'title': title,
        'description': (description or '').strip()[:1000] or None,
        'date': date,
        'end_date': end_date,
        'location': {
            'address': address,
            'city': city_title,
            'province': province or 'Buenos Aires',
            'lat': lat,
            'lng': lng,
        },
        'category': [category],
        'moods': [mood],
        'cover_image': image,
        'image_url': image,
        'is_free': is_free,
        'is_outdoor': is_outdoor,
    }


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


def assign_category(title, description, category_hint=None):
    text = (title + ' ' + (description or '')).lower()
    # map hints from external sources
    if category_hint:
        hint = category_hint.lower()
        cats = {
            'fiesta': 'nightlife', 'party': 'nightlife', 'nightlife': 'nightlife',
            'concert': 'cultural', 'concierto': 'cultural', 'musica': 'cultural',
            'teatro': 'cultural', 'theatre': 'cultural', 'cultural': 'cultural',
            'festival': 'cultural', 'feria': 'cultural', 'fair': 'cultural',
            'deporte': 'adventure', 'sports': 'adventure', 'running': 'adventure',
            'conference': 'group', 'congreso': 'group', 'charla': 'group',
            'taller': 'group', 'workshop': 'group', 'curso': 'group',
            'networking': 'group', 'business': 'group',
            'museo': 'solo', 'museum': 'solo', 'exposicion': 'solo',
            'spa': 'relax', 'yoga': 'relax', 'vino': 'relax',
        }
        if hint in cats:
            return cats[hint]
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


def slugify(title):
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug[:36]


# ============================================================
# FUENTE 1: EVENTBRITE (feed nacional + rango de fechas)
# ============================================================
EB_BASE = 'https://www.eventbrite.com.ar/d/argentina/'
# El feed nacional "eventos/" ya agrupa todas las categorías y provincias.
# Las URLs de subcategoría disparan 429 (rate-limit) y aportan poca cobertura
# adicional (Qué Hacemos ya cubre la diversidad de categorías/ciudades), así
# que se scrapa el feed principal, más profundo.
EB_SOURCES = [
    (EB_BASE + 'eventos/', 1),
]
EB_MAX_PAGES = 12


def _extract_eventbrite_items(html):
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


def normalize_eventbrite(item, now, window_end):
    title = (item.get('name') or '').strip()
    if len(title) < 3:
        return None
    tl = title.lower()
    if any(s in tl for s in SKIP_TITLES):
        return None

    date = parse_dt(item.get('startDate'), default_hour=19)
    if date is None:
        return None
    if not (now <= date <= window_end):
        return None

    loc = item.get('location') or {}
    geo = loc.get('geo') or {}
    address = (loc.get('address') or {}) or {}
    try:
        lat = float(geo.get('latitude'))
        lng = float(geo.get('longitude'))
    except (TypeError, ValueError):
        lat = lng = None

    # Filtro Argentina continental: si hay coords, deben caer dentro del país.
    if lat is not None and lng is not None:
        if not (ARG_LAT_MIN <= lat <= ARG_LAT_MAX and ARG_LNG_MIN <= lng <= ARG_LNG_MAX):
            return None
    else:
        # sin coords fiables → descartar (Eventbrite debería traerlas)
        return None

    country = ((address.get('addressCountry') or '') or '').strip()
    if country and country.lower() not in ('ar', 'argentina', 'ars'):
        return None

    street = (address.get('streetAddress') or '').strip()
    venue = (loc.get('name') or '').strip()
    if len(street) < 4:
        street = venue or ''

    city = (address.get('addressLocality') or '').strip()
    province_raw = (address.get('addressRegion') or '').strip()

    end_date = None
    end_dt = parse_dt(item.get('endDate'), default_hour=23)
    if end_dt and end_dt >= date:
        end_date = end_dt

    description = (item.get('description') or '').strip()
    image = (item.get('image') or '').strip() or None

    return normalize_common(
        title, description, date, end_date, city, province_raw, street, venue,
        round(lat, 6), round(lng, 6), image,
    )


def scrape_eventbrite(now, window_end):
    """Fetch del feed nacional de Eventbrite con rango de fechas."""
    results = []
    seen = set()
    start_str = now.date().isoformat()
    end_str = window_end.date().isoformat()
    for url, start_page in EB_SOURCES:
        for pg in range(start_page, EB_MAX_PAGES + 1):
            page_url = url.rstrip('/') + '?start_date=%s&end_date=%s&page=%d' % (start_str, end_str, pg)
            try:
                r = fetch(page_url)
            except Exception as e:
                logger.warning('eventbrite page %d give up: %s', pg, e)
                break
            items = _extract_eventbrite_items(r.text)
            if not items:
                break
            for item in items:
                norm = normalize_eventbrite(item, now, window_end)
                if norm is None:
                    continue
                key = (norm['title'].lower(), norm['date'].date().isoformat())
                if key in seen:
                    continue
                seen.add(key)
                results.append(norm)
            if pg >= EB_MAX_PAGES:
                break
            time.sleep(random.uniform(1.0, 2.0))
        time.sleep(random.uniform(1.5, 3.0))
    logger.info('eventbrite source: %d normalized events', len(results))
    return results


# ============================================================
# FUENTE 2: QUÉ HACEMOS (API JSON pública)
# ============================================================
QH_API = 'https://api.quehacemos.com.ar/api/v1/events/'
QH_PAGE_LIMIT = 1000
QH_MAX_PAGES = 3


def normalize_quehacemos(e):
    title = (e.get('title') or '').strip()
    if len(title) < 3:
        return None
    tl = title.lower()
    if any(s in tl for s in SKIP_TITLES):
        return None
    if e.get('is_past'):
        return None

    date = parse_dt(e.get('date'), default_hour=19)
    if date is None:
        return None

    city = (e.get('city') or '').strip()
    province = (e.get('province') or '').strip()
    venue = (e.get('venue') or '').strip()
    address = (e.get('address') or '').strip()
    if not address and venue:
        address = venue

    # coordenadas: usar las de la API si existen, si no geocode por ciudad
    try:
        lat = float(e.get('latitude'))
        lng = float(e.get('longitude'))
    except (TypeError, ValueError):
        lat = lng = None
    if not (lat is not None and lng is not None and
            ARG_LAT_MIN <= lat <= ARG_LAT_MAX and ARG_LNG_MIN <= lng <= ARG_LNG_MAX):
        co = city_coords(city, province)
        if co:
            lat, lng = co
        else:
            lat = lng = None

    end_date = None
    date_str = e.get('date')
    if date_str and 'T' in date_str:
        try:
            ed = datetime.datetime.fromisoformat(date_str)
        except ValueError:
            ed = None
        if ed and ed >= date - datetime.timedelta(minutes=5):
            end_date = ed

    description = (e.get('description') or '').strip()
    image = (e.get('image_url') or '').strip() or None
    category_hint = e.get('event_type')

    return normalize_common(
        title, description, date, end_date, city, province, address, venue,
        (round(lat, 6) if lat is not None else None),
        (round(lng, 6) if lng is not None else None),
        image, category_hint,
    )


def scrape_quehacemos(now, window_end):
    """Trae eventos (hasta QH_MAX_PAGES páginas de ~QH_PAGE_LIMIT) de la API."""
    results = []
    seen = set()
    for pg in range(1, QH_MAX_PAGES + 1):
        url = QH_API + '?limit=%d&page=%d' % (QH_PAGE_LIMIT, pg)
        try:
            r = fetch(url)
            data = r.json()
        except Exception as e:
            logger.warning('quehacemos page %d give up: %s', pg, e)
            break
        if not isinstance(data, list) or not data:
            break
        added = 0
        for e in data:
            norm = normalize_quehacemos(e)
            if norm is None:
                continue
            if not (now <= norm['date'] <= window_end):
                continue
            key = (norm['title'].lower(), norm['date'].date().isoformat())
            if key in seen:
                continue
            seen.add(key)
            results.append(norm)
            added += 1
        logger.info('quehacemos page %d: %d new normalized events', pg, added)
        if len(data) < QH_PAGE_LIMIT:
            break
        time.sleep(random.uniform(1.0, 2.0))
    logger.info('quehacemos source: %d normalized events', len(results))
    return results


# ============================================================
# TOLERANCIAS: IDENTIFICADOR DE EVENTO + INSERT
# ============================================================
async def insert_normalized(norm, mood_uid, window_end):
    existing = await Event.find_one(
        Event.title == norm['title'],
        Event.date == norm['date'],
    )
    if existing:
        return None
    # id determinístico y único: slug del título + hash corto de
    # (título + fecha + ciudad) para evitar colisiones entre eventos
    # distintos que producen el mismo slug, manteniéndolo estable entre
    # corridas (idempotente).
    base = slugify(norm['title'])
    if not base:
        base = 'evento'
    loc = norm['location'] or {}
    seed = '%s|%s|%s|%s' % (
        norm['title'].lower(),
        norm['date'].date().isoformat(),
        (loc.get('city') or ''),
        (loc.get('province') or ''),
    )
    digest = uuid.uuid5(uuid.NAMESPACE_URL, seed).hex[:8]
    eid = '%s-%s' % (base, digest)
    # si por extremo caso ya existe ese _id, agregar sufijo corto
    while await Event.find_one(Event.id == eid):
        eid = '%s-%s' % (base, uuid.uuid4().hex[:6])
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
        created_by=mood_uid,
        author_name='MOOD',
        image_url=local_img,
        cover_image=local_img,
        is_free=norm['is_free'],
        is_outdoor=norm['is_outdoor'],
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    await ev.create()
    return ev


# ============================================================
# CORRIDA PRINCIPAL
# ============================================================
async def run_scrape(window_days: int = WINDOW_DAYS):
    mood = await get_or_create_mood_user()
    await migrate_legacy_scraped_events(mood.uid)

    now = arg_now()
    window_end = now + datetime.timedelta(days=window_days)

    def gather():
        all_norm = []
        all_norm += scrape_eventbrite(now, window_end)
        all_norm += scrape_quehacemos(now, window_end)
        return all_norm

    normalized = await asyncio.to_thread(gather)

    saved = 0
    skipped = 0
    dedup = set()
    for norm in normalized:
        if not (now <= norm['date'] <= window_end):
            skipped += 1
            continue
        key = (norm['title'].lower(), norm['date'].date().isoformat())
        if key in dedup:
            skipped += 1
            continue
        dedup.add(key)
        ev = await insert_normalized(norm, mood.uid, window_end)
        if ev is None:
            skipped += 1
            continue
        saved += 1
        logger.info('saved [%s/%s] %s (%s)', norm['moods'][0], norm['location']['province'],
                    norm['title'][:55], norm['date'].date())

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
        await run_scrape(window_days=WINDOW_DAYS)
        await close_db()

    asyncio.run(_main())
