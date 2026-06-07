import requests
s = requests.Session()
e = {
    "title": "MOOD Networking y Demos - Junio 2026",
    "description": "Segunda presentacion del proyecto MOOD con networking, demostraciones interactivas y espacio de preguntas.",
    "date": "2026-06-09T14:00:00Z",
    "location": {"address": "Auditorio Pampa Energia, Av. Corrientes 515", "city": "Buenos Aires", "province": "CABA", "lat": -34.6037, "lng": -58.3748},
    "category": "cultural",
    "moods": ["alegre", "reservado"],
    "is_outdoor": False,
    "is_free": True
}
r = s.post("http://localhost:8000/events/", json=e, timeout=15)
if r.status_code == 201:
    eid = r.json()["id"]
    s.patch("http://localhost:8000/events/" + eid + "/approve", timeout=15)
    print("Created & approved: id=" + eid)
else:
    print("Error " + str(r.status_code) + ": " + r.text[:300])
