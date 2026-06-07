import requests

API = "http://localhost:8000"

events = [
    {
        "title": "Exposicion del Proyecto MOOD - Sesion Maniana",
        "description": "Presentacion oficial del proyecto MOOD: la plataforma que conecta emociones con eventos en tu ciudad. Te esperamos en el Auditorio de Pampa Energia para conocer como la inteligencia artificial y los datos geolocalizados transforman la experiencia cultural.",
        "date": "2026-06-09T09:00:00Z",
        "location": {
            "address": "Auditorio Pampa Energia, Av. Corrientes 515",
            "city": "Buenos Aires",
            "province": "CABA",
            "lat": -34.6037,
            "lng": -58.3748
        },
        "category": "cultural",
        "moods": ["alegre"],
        "is_outdoor": False,
        "is_free": True
    },
    {
        "title": "MOOD Networking y Demos en Pampa Energia",
        "description": "Segunda presentacion del proyecto MOOD con networking, demostraciones interactivas y espacio de preguntas. Conoce de primera mano como funciona la plataforma, su mapa interactivo y los filtros por estado de animo.",
        "date": "2026-06-09T14:00:00Z",
        "location": {
            "address": "Auditorio Pampa Energia, Av. Corrientes 515",
            "city": "Buenos Aires",
            "province": "CABA",
            "lat": -34.6037,
            "lng": -58.3748
        },
        "category": "cultural",
        "moods": ["alegre", "reservado"],
        "is_outdoor": False,
        "is_free": True
    }
]

s = requests.Session()
for ev in events:
    r = s.post(API + "/events/", json=ev, timeout=15)
    if r.status_code == 201:
        eid = r.json().get("id")
        s.patch(API + "/events/" + eid + "/approve", timeout=15)
        print("Created & approved: " + ev["title"] + " -> id=" + eid)
    else:
        print("ERROR: " + str(r.status_code) + " - " + r.text[:200])
