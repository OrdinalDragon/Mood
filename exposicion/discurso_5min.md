# Discurso MOOD — Presentación 5 minutos (3 personas + demo en vivo)

> Formato: 5 minutos, audiencia mixta (profesores + referentes de empresas).
> 3 expositores: **Persona A** (apertura, problema, idea), **Persona B** (demo en vivo), **Persona C** (MVP, stack, negocio, cierre).
> Las marcas `[SLIDE X]` indican cambio de diapositiva. Las marcas `[TIEMPO X:XX]` son guías de reloj.
> Tono: entusiasta y profesional. No leer literal, usar como guía.
> Los nombres de expositores se completan antes de presentar.

---

## Datos de la cuenta demo

| Campo | Valor |
|-------|-------|
| Email | `demo@mood.com` |
| Contraseña | `demo123` |
| Favoritos ya cargados | Exposición Proyecto MOOD, Lollapalooza, Noche de las Peatonales Rosario, Trekking Perito Moreno, Fiesta del Chocolate Bariloche |
| Evento propio aprobado | "Noche de Vinilo y Café en San Telmo" |
| URL | https://prototipomood.jesrepresentaciones.com.ar |

---

## PERSONA A — Apertura, problema e idea — `[SLIDE 1-3]` (0:00–2:00)

### Apertura — [SLIDE 1] (0:00–0:30)

Buenas, buenas. Somos el Grupo 6 y hoy les vamos a presentar **MOOD**.

MOOD es una plataforma web que transforma cómo explorás tu ciudad: contale a la app **cómo te sentís hoy**, y ella te muestra eventos y actividades que combinan con tu estado de ánimo.

Antes de arrancar, una pregunta para que piensen: ¿cuántas veces buscaron "qué hacer hoy" y terminaron navegando entre Instagram, Google y veinte pestañas abiertas, sin encontrar nada que realmente les cierre? Eso es exactamente lo que venimos a resolver.

### El problema — [SLIDE 2] (0:30–1:15)

El problema tiene tres pilares.

**Primero, la dispersión.** Las propuestas de ocio y turismo están repartidas en decenas de sitios: redes sociales, volantes, portales municipales. No hay un lugar único donde ver todo lo que pasa en una ciudad. Si llegás mañana a Bariloche, ¿cómo sabés que el martes hay una feria artesanal y el miércoles un recital de jazz? No hay forma.

**Segundo, la información poco accesible.** Los eventos increíbles existen, pero no llegan a la gente. Un comercio que arma una noche de jazz tiene que pautar en Instagram y rezar para que alguien lo vea.

**Y tercero, el tiempo perdido.** Buscar un plan significa saltar de plataforma en plataforma, sin filtros claros ni recomendaciones personalizadas. En vez de disfrutar, uno termina quemando media hora buscando.

Esto le pasa al turista que no conoce nada, al vecino que quiere salir de la rutina y al comercio que organiza algo y no sabe cómo llegarle a la gente.

### La idea — [SLIDE 3] (1:15–2:00)

Acá viene lo que nos entusiasma. Nuestro insight fue una observación sencilla: cuando queremos hacer algo, **nadie piensa en categorías técnicas**. Nadie dice "quiero un evento de categoría gastronomía". Pensamos en cómo nos sentimos: "hoy quiero algo tranquilo", "hoy quiero salir con amigos", "hoy quiero algo cultural".

El estado de ánimo es el filtro más natural que existe. Entonces nos preguntamos: ¿y si la app te pregunta cómo te sentís y en base a eso te muestra opciones? Es como tener **un amigo que conoce toda la ciudad** y te dice "che, hoy andá acá".

Si te sentís alegre, MOOD te muestra conciertos y fiestas. Si querés algo tranquilo, te lleva a un café o una feria. Si buscás aventura, senderos y trekking. Si querés relajarte, spas y yoga.

Lo importante: la tecnología se adapta a cómo te sentís, no al revés.

*(Transición de Persona A a Persona B):* "Ahora les mostramos esto en vivo. La pantalla es nuestra y el micro pasa a ___."

---

## PERSONA B — Demo en vivo — (2:00–3:15)

> Antes: navegador Chrome en incógnito, zoom 110%, pantalla completa (F11), única pestaña, home pre-cargada.
> Backup: video grabado de la misma demo abierto y pausado en un segundo monitor; si falla, "cortamos a una demo grabada" y se sigue.

### Paso a paso (cronometrado)

**1. (2:00) El mood que cambia todo** — Home
"Acá la tienen, en vivo. Lo primero que te pregunta la app es simple: **¿cómo te sentís hoy?**"
→ Tocar el mood **Alegre**.
"Fíjense que no solo se filtran los eventos: **toda la página cambia de color**. El diseño se adapta a tu ánimo."

**2. (2:15) Recomendaciones filtradas** — Home, scroll
"Y acá, sin buscar nada, ya aparecen las recomendaciones para ese ánimo: conciertos, ferias, actividades."

**3. (2:25) El asistente con IA** — Chat (esquina inferior)
"Abrimos el asistente inteligente, que usa IA de Google. Le escribimos: **'quiero hacer algo tranquilo mañana'**."
→ Escribir el prompt y esperar la respuesta.
"Fíjense lo que pasó: el asistente **cambió el mood a Tranquilo** solo, y ahora la app muestra planes relajados. La IA entiende lo que querés y lo traduce a la app."
*(Este es el momento más fuerte; dejá 5-10 segundos para que se vea la respuesta.)*

**4. (2:45) El mapa interactivo** — Mapa
"Después, el mapa interactivo: cada pin es un evento, con su imagen y su info. Podés explorar por ciudad y provincia."

**5. (3:00) Login + favoritos + perfil**
"Ahora entramos con una cuenta demo y vemos el toque personal: tocamos el corazón para guardar un evento, y en 'Mis favoritos' ya está. En el perfil también está mi evento propio aprobado. Todo lo que guardaste queda guardado."
→ Login con demo@mood.com / demo123 → abrir un evento → corazón → favoritos.

**6. (3:10) Cierre de la demo**
"En 70 segundos hicimos lo que normalmente lleva media hora de búsquedas. Les devuelvo el micro a ___."

*(Transición a Persona C)*

---

## PERSONA C — MVP, stack, negocio y cierre — `[SLIDE 4-6]` (3:15–5:00)

### El MVP — [SLIDE 4] (3:15–4:00)

El MVP se enfocó en lo esencial: **lanzar rápido, aprender de los usuarios y crecer**.

Las funcionalidades core son:
- **Registro e inicio de sesión** con JWT, incluido Google
- **Selección de ánimo** que re-themea toda la app
- **Recomendaciones personalizadas** según ese ánimo
- **Mapa interactivo** con búsqueda por ciudad y provincia
- **Eventos comunitarios**: cualquier persona o comercio sube su evento y pasa por un **flujo de aprobación de administradores**
- **Favoritos y perfil** de usuario
- **Modo oscuro** y diseño responsive en mobile, tablet y desktop

Lo que dejamos para fases futuras es intencional: queríamos tres funcionalidades que funcionen perfecto antes que diez que funcionen a medias.

### El stack — [SLIDE 4/5] (3:40–4:10)

A nivel técnico: **frontend con React 19 + TypeScript + Tailwind**, **backend con FastAPI (Python) y MongoDB**, un **asistente con IA de Google (Gemini)**, y todo desplegado con **Docker Compose, Nginx y Cloudflare Tunnel**, accesible desde internet con un link.

Es una arquitectura full-stack que **escala**: si mañana tenemos mil o cien mil usuarios, la infraestructura lo aguanta.

### El modelo de negocio — [SLIDE 5] (4:00–4:40)

Para las empresas, esto no es solo una app de eventos: es una **plataforma que conecta turistas, vecinos, comercios y municipios**.

Y no dependemos de una sola fuente de ingreso:
- **Suscripciones premium** para usuarios y comercios
- **Vouchers y comisiones** por reservas
- **Publicidad contextual** administrable
- **Alianzas municipales** para promocionar la agenda de cada ciudad

### Cierre — [SLIDE 6] (4:40–5:00)

MOOD es más que una app de eventos. Es la forma de **hacer de cada ciudad argentina un lugar que vale la pena vivir**, conectando a todos los que la hacen funcionar.

El futuro de explorar tu ciudad está acá. **Muchas gracias**, quedamos atentos a sus preguntas.

---

## Slides (6, mínimas — el fuerte es la demo en vivo)

1. **Portada**: logo + "Explorá tu ciudad según tu estado de ánimo" + integrantes
2. **El problema**: 3 pilares (dispersión, poca accesibilidad, tiempo perdido)
3. **La idea**: los 5 moods (alegre, tranquilo, reservado, triste, enojado) + "como un amigo que conoce la ciudad"
4. **MVP + stack**: funcionalidades core + iconos de tecnologías
5. **Modelo de negocio**: premium, vouchers, publicidad, alianzas municipales + roadmap (chat, vouchers, más regiones)
6. **Cierre**: frase + gracias + link de la demo

---

## Checklist técnico para el día

- [ ] Cuenta demo lista: `demo@mood.com` / `demo123` (favoritos + evento propio aprobado cargados)
- [ ] Probar la demo completa 2 veces con cronómetro, en navegador incógnito limpio
- [ ] Chrome: zoom ~110%, pantalla completa (F11), bookmarks ocultos, única pestaña abierta
- [ ] Home pre-cargada con un mood seleccionado
- [ ] Video de respaldo grabado (OBS o Win+G) abierto y pausado a un clic
- [ ] Verificar internet + tunnel 30 min antes
- [ ] Definir quién avanza las slides y quién da el cambio de micro
- [ ] Dejar escrito el prompt del chat IA en un bloc de notas para copiar: "quiero hacer algo tranquilo mañana"

## Preguntas probables y respuestas cortas

- **"¿Cómo consiguen los eventos?"** → Cualquier usuario o comercio sube su evento y pasa aprobación de admin; es una comunidad, no un portal estático.
- **"¿Cómo se monetiza?"** → Suscripciones premium, vouchers con comisión, publicidad contextual y alianzas municipales.
- **"¿Escala?"** → Sí: stack full-stack en contenedores Docker, base NoSQL; de cientos a miles de usuarios sin rediseño.
- **"¿Por qué por ánimo y no por categoría?"** → Porque así piensa la gente; es el filtro natural y es lo que nos diferencia de Instagram o guías oficiales.
