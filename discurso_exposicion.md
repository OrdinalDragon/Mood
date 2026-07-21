# Discurso Exposición — MOOD (10 minutos)

> Cada sección indica el slide correspondiente y el tiempo estimado.
> Las marcas [SLIDE X] indican cuándo cambiar de diapositiva.
> Tono: profesional-relajado. No leer literalmente, usar como guía.

---

## 1. Apertura — [SLIDE 1] (~1 min)

Buenas, buenas tardes. Somos el Grupo 6, y estamos acá para presentarles MOOD.

MOOD es una plataforma web que transforma cómo vivís y explorás tu ciudad. La idea es simple pero poderosa: contale a la app cómo te sentís hoy, y ella te muestra eventos y actividades locales que combinan con tu estado de ánimo.

Antes de arrancar, les voy a tirar una pregunta para que piensen: cuantas veces buscaron "que hacer hoy" y terminaron navegando entre Instagram, Google, veinte pestañas distintas, y sin encontrar nada que realmente les cierre? Bueno, eso es exactamente lo que nosotros queremos resolver.

---

## 2. El Problema — [SLIDE 2] (~1:30 min)

El problema que identificamos tiene tres pilares que les quiero plantear.

El primero es la centralizacion. Las propuestas de ocio y turismo estan dispersas en decenas de sitios distintos. Redes sociales, volantes, portales municipales, agencias de viaje. No hay un lugar unico donde encontrar todo lo que pasa en una ciudad. Si vos llegas a Bariloche manana, como sabes que hay una feria artesanal el martes o un recital de jazz el miercoles? No hay forma.

El segundo pilar es que la informacion es poco accesible. Turistas y residentes no encuentran facilmente que hacer, donde ir, ni que eventos hay cerca. Se pierden cosas increibles simplemente porque no llegaron a ellas. Un restaurante que hace una noche de jazz tiene que pautar en Instagram y rezar para que alguien lo vea.

Y el tercero es el tiempo perdido. Buscar planes implica navegar multiples plataformas sin filtros claros ni recomendaciones personalizadas. En vez de disfrutar, uno termina quemando media hora buscando.

Esto le pasa a todo el mundo: al turista que acaba de llegar y no conoce nada, al residente que quiere salir de la rutina, al comercio que organiza un evento y no sabe como llegar a la gente.

---

## 3. Cómo la pensamos — [SLIDE 3] (~1:30 min)

Aca viene la parte que nos entusiasma. Lo que nos hizo pensar en MOOD fue una observacion sencilla: cada uno de nosotros, cuando quiere hacer algo, no busca "eventos cerca de mi". Busca segun como se siente. "Hoy quiero algo tranquilo", "hoy quiero salir con amigos", "hoy quiero algo cultural".

Ese estado de animo es el filtro mas natural que existe. Nadie piensa en categorias tecnicas como "gastronomia" o "entretenimiento". Piensa en "que pinta hoy".

Entonces nos dijimos: y si la app te pregunta como te sentis, y en base a eso te muestra opciones? Es como tener un amigo que conoce toda la ciudad y te dice "che, hoy anda aca".

Por ejemplo, si hoy te sentis alegre y con ganas de algo cultural, MOOD te muestra exposiciones, obras de teatro, conciertos. Si queres algo grupal, te propone salidas con amigos, juegos de mesa, picadas. Si buscas aventura, te muestra senderos, actividades al aire libre. Y si queres relajarte, te lleva a spas, yoga, un dia de playa.

Lo importante es que el enfoque esta puesto en vos, no en la base de datos. La tecnologia se adapta a como te sentis, no al reves.

---

## 4. Metodología y organización — [SLIDE 4] (~2 min)

Ahora les cuento como nos organizamos, porque somos 10 personas y eso requiere metodologia.

Trabajamos con Scrum formal. Usamos Jira para planificar sprints, definir tareas y hacer seguimiento del progreso. Cada sprint teniamos planning, daily si hacia falta, y retrospectiva para ver que mejoro y que no.

Pero ademas del Scrum, gran parte del desarrollo se hizo de forma asincrona. Cada uno trabajaba cuando podia, subia sus cambios a Git, y nos coordinabamos por el grupo de chat. Eso nos permitio avanzar rapido sin depender de que todos esten disponibles al mismo tiempo.

La division del trabajo fue por capas tecnicas. Tuvimos un equipo de frontend, que se encargo de todo lo que es la interfaz de usuario con React y TypeScript. Un equipo de backend, que desarrollo la API con Python y FastAPI. Y un equipo de base de datos, que diseño y administró MariaDB.

Esta division nos permitio que cada uno se especializara en su area, pero siempre manteniendo la comunicacion entre equipos para que todo funcione junto.

Tambien usamos Docker para el despliegue. Cada servicio corre en su propio contenedor: base de datos, backend, frontend, nginx como reverse proxy, y un tunnel de Cloudflare para acceso externo. Esto nos da escalabilidad y facilita el deploy.

---

## 5. Tecnologías — [SLIDE 5] (~1 min)

Resumo el stack tecnologico.

En frontend usamos React 19 con TypeScript, que nos da tipado estatico y seguridad. Tailwind CSS para los estilos, shadcn para los componentes de UI, Vite como bundler, y React Leaflet para el mapa interactivo.

En backend, FastAPI con Python, que es rapido y moderno. SQLAlchemy como ORM para la base de datos, y PyJWT para la autenticacion con tokens.

La base de datos es MariaDB, que es estable y probada.

Y para la infraestructura: Docker Compose para orquestar todos los servicios, Nginx como reverse proxy, y Cloudflare Tunnel para exponer la app a internet de forma segura.

---

## 6. El MVP — [SLIDE 6] (~1:30 min)

El MVP se enfoco en lo esencial: lanzar rapido, aprender de los usuarios, y crecer.

Las funcionalidades principales son: registro e inicio de sesion con JWT, seleccion de estado de animo, recomendaciones de eventos cercanos segun tu animo, mapa interactivo con busqueda por ciudad y provincia, sistema de subida de eventos por la comunidad con flujo de aprobacion por administradores, modo oscuro, y diseno responsive para mobile, tablet y desktop.

Lo que dejamos para fases futuras es intencional. Chat entre usuarios, venta de productos fisicos, sistema de fidelizacion. Queriamos arrancar con lo que realmente importa e ir creciendo a medida que aprendemos.

La filosofia del MVP es: menos es mas. Mejor tener tres funcionalidades que funcionen bien, que diez que funcionen mas o menos.

---

## 7. Fortalezas del proyecto — [SLIDE 7] (~1 min)

Que hace fuerte a MOOD?

Lo primero es la recomendacion por animo. Ninguna otra plataforma hace esto. Instagram es desordenado y requiere pauta. Las guias oficiales son poco agiles. MOOD es rapido, personalizado y colaborativo.

Lo segundo es la arquitectura. Estar full-stack con Docker nos da escalabilidad. Si mañana tenemos mil usuarios o cien mil, la infraestructura escala.

Lo tercero es el modelo de negocio. No dependemos de una sola fuente de ingreso. Tenemos suscripciones premium para usuarios y comercios, vouchers, comisiones por reservas, publicidades y alianzas municipales. Eso da estabilidad.

Y lo cuarto es que es colaborativo. Los usuarios y comercios suben contenido, se actualiza en tiempo real. No somos un portal estatico, somos una comunidad.

---

## 8. Próximos desarrollos — [SLIDE 8] (~30 seg)

Para el futuro inmediato, nos enfocamos en tres cosas.

Chat entre usuarios, para que la gente pueda coordinar salidas directamente desde la plataforma.

Sistema de vouchers, donde los comercios pueden crear y vender cupones de descuento, y MOOD cobra una comision.

Y publicidades contextuales, banners que se muestran a usuarios no premium, generando ingresos por impresiones y clicks.

---

## 9. Cierre — [SLIDE 9] (~30 seg)

MOOD es mas que una app de eventos. Es una plataforma que conecta turistas, vecinos, comercios y municipios por un solo objetivo: hacer de cada ciudad argentina un lugar que vale la pena vivir.

El futuro de explorar tu ciudad esta acá. Muchas gracias.

---

## Tips para la presentacion

* Habla natural, no leas el discurso. Usa esto como guia, no como guion literal.
* Mira a la audiencia, no a la pantalla.
* Movete un poco, no te quedes estatico.
* Si alguien hace una pregunta, responde con confianza; no pasa nada si te salis del guion.
* El tono ideal es entusiasta pero profesional, como si les estuvieras contando algo que te copa.
* En la seccion de tecnologias, no te extiendas mucho; la gente no necesita saber cada libreria, solo el panorama general.
* En la seccion de MVP, enfocate en POR QUE esas funcionalidades, no en COMO funcionan tecnicamente.
