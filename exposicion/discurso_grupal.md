# Discurso Grupal — MOOD (10 personas, 10 minutos)

> Formato: 10 integrantes, 1 seccion cada uno, ~1 minuto por persona.
> Cada persona tiene su parte claramente marcada.
> Las marcas [SLIDE X] indican cuándo cambiar de diapositiva.
> Tono: profesional-relajado.

---

## PERSONA 1 — Apertura — [SLIDE 1] (~1 min)

Buenas, buenas tardes. Somos el Grupo 6, y estamos acá para presentarles MOOD.

MOOD es una plataforma web que transforma cómo vivís y explorás tu ciudad. La idea es simple pero poderosa: contale a la app cómo te sentís hoy, y ella te muestra eventos y actividades locales que combinan con tu estado de ánimo.

Antes de arrancar, les voy a tirar una pregunta para que piensen: cuantas veces buscaron "que hacer hoy" y terminaron navegando entre Instagram, Google, veinte pestañas distintas, y sin encontrar nada que realmente les cierre? Bueno, eso es exactamente lo que nosotros queremos resolver.

---

## PERSONA 2 — El Problema — [SLIDE 2] (~1 min)

El problema que identificamos tiene tres pilares.

El primero es la centralizacion. Las propuestas de ocio y turismo estan dispersas en decenas de sitios distintos. Redes sociales, volantes, portales municipales. No hay un lugar unico donde encontrar todo lo que pasa en una ciudad.

El segundo es que la informacion es poco accesible. Turistas y residentes no encuentran facilmente que hacer, donde ir, ni que eventos hay cerca. Se pierden cosas increibles simplemente porque no llegaron a ellas.

Y el tercero es el tiempo perdido. Buscar planes implica navegar multiples plataformas sin filtros claros ni recomendaciones personalizadas. En vez de disfrutar, uno termina quemando media hora buscando.

---

## PERSONA 3 — Cómo la pensamos — [SLIDE 3] (~1 min)

Lo que nos hizo pensar en MOOD fue una observacion sencilla: cada uno de nosotros, cuando quiere hacer algo, no busca "eventos cerca de mi". Busca segun como se siente. "Hoy quiero algo tranquilo", "hoy quiero salir con amigos", "hoy quiero algo cultural".

Ese estado de animo es el filtro mas natural que existe. Nadie piensa en categorias tecnicas. Piensa en "que pinta hoy".

Entonces nos dijimos: y si la app te pregunta como te sentis, y en base a eso te muestra opciones? Es como tener un amigo que conoce toda la ciudad y te dice "che, hoy anda aca".

Si hoy te sentis alegre y con ganas de algo cultural, MOOD te muestra exposiciones, obras de teatro, conciertos. Si queres algo grupal, te propone salidas con amigos. Si buscas aventura, te muestra senderos. Y si queres relajarte, te lleva a spas, yoga, un dia de playa.

---

## PERSONA 4 — Metodología — [SLIDE 4] (~1 min)

Ahora les cuento como nos organizamos, porque somos 10 personas y eso requiere metodologia.

Trabajamos con Scrum formal. Usamos Jira para planificar sprints, definir tareas y hacer seguimiento del progreso. Cada sprint teniamos planning, daily si hacia falta, y retrospectiva para ver que mejoro y que no.

Pero ademas del Scrum, gran parte del desarrollo se hizo de forma asincrona. Cada uno trabajaba cuando podia, subia sus cambios a Git, y nos coordinabamos por el grupo de chat. Eso nos permitio avanzar rapido sin depender de que todos esten disponibles al mismo tiempo.

---

## PERSONA 5 — Organización del equipo — [SLIDE 4] (~1 min)

La division del trabajo fue por capas tecnicas.

Tuvimos un equipo de frontend, que se encargo de todo lo que es la interfaz de usuario. Un equipo de backend, que desarrollo la API y la logica del servidor. Y un equipo de base de datos, que diseño y administro la persistencia de datos.

Esta division nos permitio que cada uno se especializara en su area, pero siempre manteniendo la comunicacion entre equipos para que todo funcione junto.

Tambien usamos Docker para el despliegue. Cada servicio corre en su propio contenedor: base de datos, backend, frontend, nginx como reverse proxy, y un tunnel de Cloudflare para acceso externo. Esto nos da escalabilidad y facilita el deploy.

---

## PERSONA 6 — Tecnologías — [SLIDE 5] (~1 min)

Resumo el stack tecnologico.

En frontend usamos React 19 con TypeScript, que nos da tipado estatico y seguridad. Tailwind CSS para los estilos, shadcn para los componentes de UI, Vite como bundler, y React Leaflet para el mapa interactivo.

En backend, FastAPI con Python, que es rapido y moderno. SQLAlchemy como ORM para la base de datos, y PyJWT para la autenticacion con tokens.

La base de datos es MariaDB, que es estable y probada.

Y para la infraestructura: Docker Compose para orquestar todos los servicios, Nginx como reverse proxy, y Cloudflare Tunnel para exponer la app a internet de forma segura.

---

## PERSONA 7 — El MVP — [SLIDE 6] (~1 min)

El MVP se enfoco en lo esencial: lanzar rapido, aprender de los usuarios, y crecer.

Las funcionalidades principales son: registro e inicio de sesion con JWT, seleccion de estado de animo, recomendaciones de eventos cercanos segun tu animo, mapa interactivo con busqueda por ciudad y provincia, sistema de subida de eventos por la comunidad con flujo de aprobacion por administradores, modo oscuro, y diseno responsive para mobile, tablet y desktop.

Lo que dejamos para fases futuras es intencional. Chat entre usuarios, venta de productos fisicos, sistema de fidelizacion. Queriamos arrancar con lo que realmente importa y ir creciendo a medida que aprendemos.

---

## PERSONA 8 — Fortalezas del proyecto — [SLIDE 7] (~1 min)

Que hace fuerte a MOOD?

Lo primero es la recomendacion por animo. Ninguna otra plataforma hace esto. Instagram es desordenado y requiere pauta. Las guias oficiales son poco agiles. MOOD es rapido, personalizado y colaborativo.

Lo segundo es la arquitectura. Estar full-stack con Docker nos da escalabilidad. Si mañana tenemos mil usuarios o cien mil, la infraestructura escala.

Lo tercero es el modelo de negocio. No dependemos de una sola fuente de ingreso. Tenemos suscripciones premium, vouchers, comisiones por reservas, publicidades y alianzas municipales. Eso da estabilidad.

Y lo cuarto es que es colaborativo. Los usuarios y comercios suben contenido, se actualiza en tiempo real. No somos un portal estatico, somos una comunidad.

---

## PERSONA 9 — Próximos desarrollos — [SLIDE 8] (~30 seg)

Para el futuro inmediato, nos enfocamos en tres cosas.

Chat entre usuarios, para que la gente pueda coordinar salidas directamente desde la plataforma.

Sistema de vouchers, donde los comercios pueden crear y vender cupones de descuento, y MOOD cobra una comision.

Y publicidades contextuales, banners que se muestran a usuarios no premium, generando ingresos por impresiones y clicks.

---

## PERSONA 10 — Cierre — [SLIDE 9] (~30 seg)

MOOD es mas que una app de eventos. Es una plataforma que conecta turistas, vecinos, comercios y municipios por un solo objetivo: hacer de cada ciudad argentina un lugar que vale la pena vivir.

El futuro de explorar tu ciudad esta acá. Muchas gracias.

---

## Tips para la presentacion grupal

* Coordinen los silencios: cuando uno termina, que el siguiente arranque sin demora excesiva.
* Miren a la audiencia, no a la pantalla ni al compañero que esta hablando.
* Si un error, que nadie se detenga. Sigue el siguiente y listo.
* Cada uno debe conocer su parte, pero tambien tener una idea general de lo que dice el anterior y el siguiente.
* El tono debe ser consistente: todos hablan profesional-relajado, no que uno hable formal y otro muy casual.
* Practiquen al menos 2 veces juntos antes de la presentacion real.
