import requests, json, sys

API = "http://localhost:8000"
BATCH_SIZE = 20

# Each event: (title, description, date, address, city, province, lat, lng, category, moods, outdoor, free)
E = [
    # ===== CABA (Buenos Aires) =====
    ("Lollapalooza Argentina 2026","Festival internacional de música con bandas nacionales e internacionales en el Hipódromo de Palermo.","2026-11-20T12:00:00Z","Hipódromo de Palermo","Buenos Aires","CABA",-34.5711,-58.4097,"nightlife",["alegre"],True,False),
    ("Feria del Libro de Buenos Aires","La feria literaria más importante de Latinoamérica en La Rural de Palermo.","2026-04-24T10:00:00Z","La Rural, Palermo","Buenos Aires","CABA",-34.5777,-58.4218,"cultural",["alegre","reservado"],False,False),
    ("Noche de los Museos 2026","Museos de toda la ciudad abren sus puertas de forma gratuita durante toda la noche.","2026-11-07T18:00:00Z","Múltiples sedes","Buenos Aires","CABA",-34.6037,-58.3816,"cultural",["alegre"],True,True),
    ("Buenos Aires Jazz Festival","Festival de jazz con conciertos gratuitos en teatros y espacios al aire libre.","2026-08-14T19:00:00Z","Usina del Arte","Buenos Aires","CABA",-34.6195,-58.3608,"cultural",["alegre","reservado"],False,True),
    ("BAFICI 2026","Festival de Cine Independiente de Buenos Aires con proyecciones en múltiples salas.","2026-03-18T14:00:00Z","Village Recoleta","Buenos Aires","CABA",-34.5879,-58.3879,"cultural",["alegre","reservado"],False,False),
    ("Feria de Mataderos","Feria tradicional con artesanías, comidas típicas y jineteadas en el barrio de Mataderos.","2026-07-12T10:00:00Z","Av. Lisandro de la Torre y Av. de los Corrales","Buenos Aires","CABA",-34.6615,-58.5012,"cultural",["alegre"],True,True),
    ("Buenos Aires Tango Festival","El evento tanguero más grande del mundo con milongas, shows y clases gratuitas.","2026-08-21T20:00:00Z","Usina del Arte","Buenos Aires","CABA",-34.6195,-58.3608,"cultural",["alegre"],False,True),
    ("Personal Fest 2026","Festival de música con artistas nacionales e internacionales.","2026-10-17T14:00:00Z","Parque Sarmiento","Buenos Aires","CABA",-34.5598,-58.4952,"nightlife",["alegre"],True,False),
    ("BAFWeek Otoño-Invierno 2026","Semana de la moda porteña con desfiles de diseñadores argentinos.","2026-03-03T16:00:00Z","Centro Cultural Kirchner","Buenos Aires","CABA",-34.6142,-58.3702,"cultural",["alegre","reservado"],False,False),
    ("Caminata Nocturna por el Río de la Plata","Caminata guiada al atardecer por la Costanera Sur con vista al río.","2026-06-20T17:00:00Z","Costanera Sur","Buenos Aires","CABA",-34.6142,-58.3523,"adventure",["alegre"],True,True),
    ("Feria de las Colectividades en CABA","Muestra gastronómica y cultural de las comunidades extranjeras en la Ciudad.","2026-11-14T11:00:00Z","Parque de la Ciudad","Buenos Aires","CABA",-34.6705,-58.4544,"cultural",["alegre"],True,True),
    ("Maratón Internacional de Buenos Aires","Carrera de 42K por las calles más emblemáticas de la Ciudad.","2026-10-11T07:00:00Z","Obelisco","Buenos Aires","CABA",-34.6037,-58.3816,"adventure",["alegre"],True,False),

    # ===== Buenos Aires Province =====
    ("Fiesta Nacional del Tomate Platense","Festival gastronómico en La Plata celebrando el tomate platense con ferias y shows.","2026-03-07T10:00:00Z","Parque Saavedra","La Plata","Buenos Aires",-34.9215,-57.9545,"cultural",["alegre"],True,True),
    ("Fiesta Nacional de la Tradición","La tradición gaucha celebrada en San Antonio de Areco con desfiles y jineteadas.","2026-11-07T09:00:00Z","Parque Criollo","San Antonio de Areco","Buenos Aires",-34.2511,-59.4700,"cultural",["alegre"],True,True),
    ("Festival de Cine de Mar del Plata","Festival internacional de cine con proyecciones en salas de la ciudad balnearia.","2026-11-05T16:00:00Z","Teatro Auditorium","Mar del Plata","Buenos Aires",-38.0055,-57.5443,"cultural",["alegre","reservado"],False,False),
    ("Fiesta Nacional del Queso y el Salame","Festival gastronómico en Tandil con degustación de quesos y salames artesanales.","2026-10-10T10:00:00Z","Av. Santamarina","Tandil","Buenos Aires",-37.3109,-59.1397,"cultural",["alegre"],True,True),
    ("Feria de Artesanos de Tigre","Feria artesanal en el Puerto de Frutos con paseo en lancha por el Delta.","2026-06-07T10:00:00Z","Puerto de Frutos","Tigre","Buenos Aires",-34.4253,-58.5786,"cultural",["alegre","relax"],True,True),
    ("Semana Santa en Tandil","Celebraciones religiosas y vía crucis en las sierras de Tandil.","2026-04-02T08:00:00Z","Monte Calvario","Tandil","Buenos Aires",-37.3200,-59.1300,"relax",["reservado"],True,True),
    ("Fiesta de la Sierra de la Ventana","Festival turístico con actividades al aire libre en la localidad serrana.","2026-02-14T09:00:00Z","Plaza Principal","Sierra de la Ventana","Buenos Aires",-38.0667,-61.8000,"adventure",["alegre"],True,True),
    ("Fiesta Nacional de la Nieve en Pinamar","Festival invernal con actividades en la arena y shows en pleno invierno.","2026-07-18T14:00:00Z","Plaza Central","Pinamar","Buenos Aires",-37.1118,-56.8574,"adventure",["alegre"],True,True),
    ("Feria del Libro de Bahía Blanca","Feria literaria con presentaciones de libros y firmas de autores.","2026-09-15T15:00:00Z","Centro Cultural","Bahía Blanca","Buenos Aires",-38.7196,-62.2724,"cultural",["reservado","alegre"],False,True),
    ("Regata Internacional del Río de la Plata","Competencia de veleros desde el Club Náutico San Isidro.","2026-01-17T08:00:00Z","Club Náutico San Isidro","San Isidro","Buenos Aires",-34.4725,-58.5098,"adventure",["alegre"],True,False),
    ("Fiesta del Teatro de la Costa","Obras teatrales en Villa Gesell con elencos de toda la provincia.","2026-02-07T20:00:00Z","Teatro Municipal","Villa Gesell","Buenos Aires",-37.2540,-56.9700,"cultural",["alegre"],False,False),

    # ===== Córdoba =====
    ("Festival Nacional de Folklore de Cosquín","El festival folklórico más importante de Argentina, nueve noches de música en Cosquín.","2026-01-24T21:00:00Z","Plaza Próspero Molina","Cosquín","Córdoba",-31.2500,-64.4667,"cultural",["alegre"],True,False),
    ("Festival Nacional de Doma y Folklore de Jesús María","Jineteadas, música y tradición gaucha en el anfiteatro de Jesús María.","2026-01-09T20:00:00Z","Anfiteatro José Hernández","Jesús María","Córdoba",-30.9833,-64.1000,"cultural",["alegre"],True,False),
    ("Festival Internacional de Peñas de Villa María","Festival con artistas nacionales e internacionales en el Anfiteatro de Villa María.","2026-02-06T20:00:00Z","Anfiteatro Municipal","Villa María","Córdoba",-32.4057,-63.2619,"nightlife",["alegre"],True,False),
    ("Oktoberfest Córdoba","Fiesta de la cerveza al estilo alemán en Villa General Belgrano.","2026-10-03T12:00:00Z","Salón de Eventos","Villa General Belgrano","Córdoba",-31.9833,-64.5667,"nightlife",["alegre"],True,False),
    ("Noche de los Museos Córdoba","Museos de la ciudad de Córdoba abren sus puertas gratuitamente durante la noche.","2026-11-21T19:00:00Z","Museo Caraffa","Córdoba","Córdoba",-31.4201,-64.1888,"cultural",["alegre"],True,True),
    ("Temporada de Teatro en Carlos Paz","La temporada teatral de verano más convocante de Argentina en Villa Carlos Paz.","2026-01-02T21:00:00Z","Teatro Luxor","Villa Carlos Paz","Córdoba",-31.4167,-64.5000,"cultural",["alegre"],False,False),
    ("Fiesta del Río en Mina Clavero","Festival turístico a orillas del río con shows y actividades acuáticas.","2026-02-14T11:00:00Z","Costanera del Río","Mina Clavero","Córdoba",-31.7167,-65.0000,"adventure",["alegre"],True,True),
    ("Festival de la Falda","Festival de música y cultura en la localidad de La Falda.","2026-09-12T18:00:00Z","Anfiteatro Municipal","La Falda","Córdoba",-31.0833,-64.4833,"nightlife",["alegre"],True,False),
    ("Feria del Libro de Córdoba","Feria literaria con editoriales de todo el país en el Cabildo de Córdoba.","2026-08-28T14:00:00Z","Cabildo de Córdoba","Córdoba","Córdoba",-31.4167,-64.1833,"cultural",["reservado","alegre"],False,True),
    ("Maratón Internacional de Córdoba","Carrera de 42K por las calles de la ciudad de Córdoba.","2026-05-31T07:00:00Z","Plaza San Martín","Córdoba","Córdoba",-31.4167,-64.1833,"adventure",["alegre"],True,False),
    ("Fiesta Nacional de la Cerveza Artesanal","Degustación de cervezas artesanales de todo el país en Villa General Belgrano.","2026-10-10T12:00:00Z","Parque Cervecero","Villa General Belgrano","Córdoba",-31.9833,-64.5667,"nightlife",["alegre"],True,False),

    # ===== Santa Fe =====
    ("Festival Internacional de Poesía de Rosario","Encuentro de poetas de todo el mundo en el Centro Cultural Roberto Fontanarrosa.","2026-10-07T17:00:00Z","Centro Cultural Fontanarrosa","Rosario","Santa Fe",-32.9468,-60.6393,"cultural",["reservado"],False,True),
    ("Feria del Libro de Rosario","Feria literaria con autores rosarinos y nacionales en el Parque de la Independencia.","2026-09-10T14:00:00Z","Parque de la Independencia","Rosario","Santa Fe",-32.9411,-60.6626,"cultural",["reservado","alegre"],True,True),
    ("Noche de las Peatonales Rosario","Peatonales de Rosario se llenan de música, teatro y ferias al aire libre.","2026-12-05T18:00:00Z","Calle San Martín","Rosario","Santa Fe",-32.9468,-60.6393,"nightlife",["alegre"],True,True),
    ("Festival de Cine Latinoamericano de Rosario","Muestra de cine latinoamericano contemporáneo en salas de Rosario.","2026-05-06T15:00:00Z","Cine El Cairo","Rosario","Santa Fe",-32.9442,-60.6505,"cultural",["reservado"],False,False),
    ("Feria de las Colectividades de Santa Fe","Muestra gastronómica de las colectividades extranjeras en la capital santafesina.","2026-11-14T11:00:00Z","Estación Belgrano","Santa Fe","Santa Fe",-31.6333,-60.7000,"cultural",["alegre"],True,True),
    ("Fiesta de la Boga en Santa Fe","Festival gastronómico del pescado de río con shows en la costanera santafesina.","2026-03-21T11:00:00Z","Costanera Oeste","Santa Fe","Santa Fe",-31.6333,-60.7000,"cultural",["alegre"],True,True),
    ("Triatlón Internacional de Rosario","Competencia deportiva en la costa del río Paraná.","2026-02-08T07:00:00Z","Parque Scalabrini Ortiz","Rosario","Santa Fe",-32.9300,-60.6550,"adventure",["alegre"],True,False),
    ("Feria del Libro de Rafaela","Feria literaria en la ciudad de Rafaela con actividades culturales.","2026-07-08T15:00:00Z","Centro Cultural","Rafaela","Santa Fe",-31.2667,-61.4833,"cultural",["reservado"],False,True),
    ("Fiesta Nacional de la Cebada","Festival del campo y la cerveza en Venado Tuerto con shows musicales.","2026-03-14T10:00:00Z","Predio Ferial","Venado Tuerto","Santa Fe",-33.7500,-61.9667,"cultural",["alegre"],True,True),
    ("Maratón Internacional de Santa Fe","Carrera por las calles de la capital santafesina con vista al río.","2026-04-26T07:00:00Z","Plaza 25 de Mayo","Santa Fe","Santa Fe",-31.6333,-60.7000,"adventure",["alegre"],True,False),
    ("Feria del Libro de Venado Tuerto","Feria literaria en Venado Tuerto con autores santafesinos.","2026-10-14T15:00:00Z","Centro Cultural","Venado Tuerto","Santa Fe",-33.7500,-61.9667,"cultural",["reservado"],False,True),

    # ===== Mendoza =====
    ("Fiesta Nacional de la Vendimia","La fiesta más importante de Mendoza con el desfile de la Reina Nacional y show artístico.","2026-03-06T21:00:00Z","Teatro Griego Frank Romero Day","Mendoza","Mendoza",-32.8893,-68.8444,"cultural",["alegre"],True,False),
    ("Festival de la Cerveza Artesanal de Mendoza","Degustación de cervezas artesanales con food trucks y bandas en vivo.","2026-11-14T17:00:00Z","Parque Central","Mendoza","Mendoza",-32.8868,-68.8397,"nightlife",["alegre"],True,False),
    ("Feria del Libro de Mendoza","Feria literaria con autores nacionales en el Espacio Cultural Julio Le Parc.","2026-09-23T15:00:00Z","Espacio Cultural Julio Le Parc","Mendoza","Mendoza",-32.8777,-68.8417,"cultural",["reservado","alegre"],False,True),
    ("Mendoza Fashion Week","Semana de la moda mendocina con desfiles de diseñadores locales.","2026-04-15T19:00:00Z","Hotel Sheraton","Mendoza","Mendoza",-32.8903,-68.8478,"cultural",["alegre","reservado"],False,False),
    ("Fiesta Nacional de la Cosecha en San Rafael","Fiesta de la cosecha con degustación de vinos y productos regionales.","2026-03-20T11:00:00Z","Parque Hipólito Yrigoyen","San Rafael","Mendoza",-34.6000,-68.3333,"cultural",["alegre"],True,True),
    ("Vendimia de Luján de Cuyo","Celebración departamental de la vendimia en Luján de Cuyo.","2026-02-28T20:00:00Z","Plaza Departamental","Luján de Cuyo","Mendoza",-33.0500,-68.8667,"cultural",["alegre"],True,False),
    ("Fiesta del Chivo en Malargüe","Festival gastronómico con platos típicos de cabrito y shows folklóricos.","2026-02-07T12:00:00Z","Predio Ferial","Malargüe","Mendoza",-35.4667,-69.5833,"cultural",["alegre"],True,True),
    ("Festival de Montaña en Potrerillos","Actividades de montaña, trekking y camping en el dique Potrerillos.","2026-02-14T09:00:00Z","Dique Potrerillos","Potrerillos","Mendoza",-32.9833,-69.1833,"adventure",["alegre"],True,True),
    ("Fiesta de la Cosecha en Valle de Uco","Celebración de la cosecha de uvas en los viñedos del Valle de Uco.","2026-03-13T10:00:00Z","Bodega Salentein","Valle de Uco","Mendoza",-33.6833,-69.1500,"relax",["alegre","reservado"],True,False),
    ("Aconcagua Summit Trek","Expedición guiada al Cerro Aconcagua, el pico más alto de América.","2026-12-15T06:00:00Z","Parque Provincial Aconcagua","Las Heras","Mendoza",-32.6534,-70.0117,"adventure",["alegre"],True,False),

    # ===== Salta =====
    ("Serenata a Cafayate","Festival de música folklórica en el imponente anfiteatro natural de Cafayate.","2026-02-14T20:00:00Z","Anfiteatro Natural","Cafayate","Salta",-26.0725,-65.9761,"cultural",["alegre"],True,False),
    ("Festival de la Empanada Salteña","Concurso de la mejor empanada salteña con shows musicales en la plaza.","2026-04-11T11:00:00Z","Plaza 9 de Julio","Salta","Salta",-24.7883,-65.4106,"cultural",["alegre"],True,True),
    ("Noche de los Museos Salta","Museos salteños abren gratuitamente con visitas guiadas nocturnas.","2026-11-14T19:00:00Z","MAAM - Museo de Arqueología","Salta","Salta",-24.7883,-65.4106,"cultural",["alegre"],True,True),
    ("Feria del Libro de Salta","Feria literaria con autores salteños y nacionales en la Usina Cultural.","2026-08-05T15:00:00Z","Usina Cultural","Salta","Salta",-24.7883,-65.4106,"cultural",["reservado","alegre"],False,True),
    ("Fiesta del Vino Torrontés en Cafayate","Degustación del vino torrontés con visitas a bodegas y shows en Cafayate.","2026-02-21T11:00:00Z","Bodega El Esteco","Cafayate","Salta",-26.0725,-65.9761,"relax",["alegre","reservado"],True,False),
    ("Fiesta de la Pachamama en San Antonio de los Cobres","Ceremonia ancestral en honor a la Madre Tierra en la Puna salteña.","2026-08-01T08:00:00Z","Cerro de la Pachamama","San Antonio de los Cobres","Salta",-24.2167,-66.3167,"cultural",["reservado"],True,True),
    ("Fiesta del Norte Salteño en Tartagal","Festival regional con música, danzas y comidas típicas del norte salteño.","2026-07-18T18:00:00Z","Anfiteatro Municipal","Tartagal","Salta",-22.5167,-63.8000,"cultural",["alegre"],True,True),
    ("Fiesta del Vino en Cachi","Celebración del vino artesanal en los Valles Calchaquíes con degustaciones.","2026-03-28T11:00:00Z","Bodega Payogasta","Cachi","Salta",-25.1167,-66.1500,"relax",["alegre","reservado"],True,False),
    ("Tren a las Nubes Experience","Viaje en el tren turístico más alto de Latinoamérica por la Quebrada del Toro.","2026-06-06T07:00:00Z","Estación Salta","Salta","Salta",-24.7883,-65.4106,"adventure",["alegre"],True,False),
    ("Maratón de los Valles Calchaquíes","Carrera de montaña por los paisajes de los Valles Calchaquíes.","2026-09-20T07:00:00Z","Ruta 68","Cafayate","Salta",-26.0725,-65.9761,"adventure",["alegre"],True,False),

    # ===== Neuquén =====
    ("AOG Patagonia 2026","Exposición y congreso de energía en el Espacio DUAM.","2026-05-05T09:00:00Z","Espacio DUAM","Neuquén","Neuquén",-38.9516,-68.0591,"cultural",["reservado"],False,False),
    ("Fiesta de la Confluencia","Festival musical con artistas nacionales e internacionales en la costanera de Neuquén.","2026-02-13T18:00:00Z","Costanera del Río Neuquén","Neuquén","Neuquén",-38.9516,-68.0591,"nightlife",["alegre"],True,True),
    ("Semana Musical Llao Llao","Festival de música clásica en San Martín de los Andes con artistas internacionales.","2026-10-10T19:00:00Z","Teatro San Martín","San Martín de los Andes","Neuquén",-40.1667,-71.3500,"cultural",["reservado"],False,False),
    ("Fiesta Nacional de la Montaña","Festival de montaña con competencias de trail, trekking y escalada en Villa La Angostura.","2026-11-21T08:00:00Z","Cerro Bayo","Villa La Angostura","Neuquén",-40.7589,-71.6500,"adventure",["alegre"],True,False),
    ("Fiesta del Pehuén en Junín de los Andes","Festival de la cultura mapuche con ferias y ceremonias.","2026-12-05T10:00:00Z","Plaza Principal","Junín de los Andes","Neuquén",-39.9500,-71.0833,"cultural",["alegre","reservado"],True,True),
    ("Fiesta del Chivito en Chos Malal","Festival gastronómico del chivito con doma, jineteadas y música folklórica.","2026-02-21T10:00:00Z","Predio Ferial","Chos Malal","Neuquén",-37.3833,-70.2833,"cultural",["alegre"],True,True),
    ("Travesía del Río Limay","Rafting y kayak por el río Limay con guías especializados.","2026-01-24T09:00:00Z","Río Limay","Neuquén","Neuquén",-38.9516,-68.0591,"adventure",["alegre"],True,False),
    ("Feria del Libro de Neuquén","Feria literaria con actividades culturales en la ciudad de Neuquén.","2026-08-19T15:00:00Z","Museo Nacional de Bellas Artes","Neuquén","Neuquén",-38.9516,-68.0591,"cultural",["reservado"],False,True),
    ("Fiesta del Montañés en San Martín de los Andes","Homenaje a los montañeses con ferias de productos regionales y música.","2026-07-11T11:00:00Z","Centro Cívico","San Martín de los Andes","Neuquén",-40.1667,-71.3500,"cultural",["alegre"],True,True),
    ("Cruce de los Andes a Caballo","Expedición ecuestre siguiendo la ruta del General San Martín.","2026-02-07T06:00:00Z","Cerro de la Virgen","Las Lajas","Neuquén",-38.5167,-70.3667,"adventure",["alegre"],True,False),

    # ===== Río Negro =====
    ("Fiesta Nacional de la Nieve","Festival invernal con actividades en la nieve, shows y eventos deportivos en Bariloche.","2026-08-01T10:00:00Z","Cerro Catedral","Bariloche","Río Negro",-41.1750,-71.4350,"adventure",["alegre"],True,False),
    ("Bariloche UTMB 2026","Ultra maratón de montaña de 100K por los senderos del Parque Nacional Nahuel Huapi.","2026-04-02T05:00:00Z","Centro Cívico","Bariloche","Río Negro",-41.1335,-71.3102,"adventure",["alegre"],True,False),
    ("Fiesta Nacional del Lúpulo en El Bolsón","Festival cervecero con bandas en vivo y feria artesanal en El Bolsón.","2026-02-07T12:00:00Z","Parque Esperanza","El Bolsón","Río Negro",-41.9667,-71.5333,"nightlife",["alegre"],True,True),
    ("Fiesta Nacional de la Manzana","Festival de la fruticultura en General Roca con desfiles y elección de la reina.","2026-03-14T10:00:00Z","Predio Ferial","General Roca","Río Negro",-39.0333,-67.5833,"cultural",["alegre"],True,True),
    ("Fiesta del Río en Viedma","Festival a orillas del Río Negro con deportes acuáticos y shows musicales.","2026-02-28T10:00:00Z","Costanera del Río Negro","Viedma","Río Negro",-40.8133,-62.9960,"adventure",["alegre"],True,True),
    ("Fiesta de la Cerveza Artesanal de Bariloche","Degustación de cervezas artesanales de la Patagonia en el Centro Cívico.","2026-10-17T17:00:00Z","Centro Cívico","Bariloche","Río Negro",-41.1335,-71.3102,"nightlife",["alegre"],True,False),
    ("Fiesta del Chocolate en Bariloche","Festival del chocolate artesanal con degustaciones y shows.","2026-04-18T11:00:00Z","Calle Mitre","Bariloche","Río Negro",-41.1335,-71.3102,"cultural",["alegre"],True,True),
    ("Travesía en Kayak por el Nahuel Huapi","Excursión guiada en kayak por el lago Nahuel Huapi con vista a la cordillera.","2026-01-10T08:00:00Z","Puerto San Carlos","Bariloche","Río Negro",-41.1364,-71.3051,"adventure",["alegre"],True,False),
    ("Feria Regional de El Bolsón","Feria de productos orgánicos y artesanías en la plaza principal de El Bolsón.","2026-06-06T09:00:00Z","Plaza Pagano","El Bolsón","Río Negro",-41.9667,-71.5333,"cultural",["alegre","relax"],True,True),
    ("Aniversario de Bariloche","Celebración del aniversario de la ciudad con desfiles cívicos y shows.","2026-05-03T10:00:00Z","Centro Cívico","Bariloche","Río Negro",-41.1335,-71.3102,"cultural",["alegre"],True,True),

    # ===== Tierra del Fuego =====
    ("La Noche Más Larga del Año","Celebración del solsticio de invierno en Ushuaia con desfiles, ferias y shows en la calle.","2026-06-21T18:00:00Z","Calle San Martín","Ushuaia","Tierra del Fuego",-54.8019,-68.3030,"nightlife",["alegre"],True,True),
    ("Valhöll UTMB Ushuaia 2026","Ultra maratón de montaña por los senderos del Fin del Mundo.","2026-04-23T05:00:00Z","Parque Nacional Tierra del Fuego","Ushuaia","Tierra del Fuego",-54.8175,-68.3200,"adventure",["alegre"],True,False),
    ("Festival de Cine de Montaña de Ushuaia","Muestra de cine documental de montaña y naturaleza en Ushuaia.","2026-05-13T16:00:00Z","Casa de la Cultura","Ushuaia","Tierra del Fuego",-54.8019,-68.3030,"cultural",["reservado"],False,False),
    ("Feria del Libro de Ushuaia","Feria literaria en la ciudad más austral del mundo con autores patagónicos.","2026-09-16T14:00:00Z","Centro Cultural Esther Fadul","Ushuaia","Tierra del Fuego",-54.8019,-68.3030,"cultural",["reservado","alegre"],False,True),
    ("Fiesta Nacional de la Noche Más Larga","Celebración invernal en Río Grande con desfiles, ferias y actividades al aire libre.","2026-06-20T15:00:00Z","Plaza Almirante Brown","Río Grande","Tierra del Fuego",-53.7875,-67.7097,"nightlife",["alegre"],True,True),
    ("Feria de la Estepa en Río Grande","Feria de productos regionales y artesanías en la estepa fueguina.","2026-11-07T11:00:00Z","Centro Municipal","Río Grande","Tierra del Fuego",-53.7875,-67.7097,"cultural",["alegre"],True,True),
    ("Trekking al Glaciar Martial","Caminata guiada al Glaciar Martial con vista panorámica del Canal Beagle.","2026-01-03T08:00:00Z","Base del Glaciar Martial","Ushuaia","Tierra del Fuego",-54.7833,-68.3833,"adventure",["alegre"],True,False),
    ("Avistaje de Ballenas en el Canal Beagle","Excursión en barco para avistar ballenas francas australes en el Canal Beagle.","2026-10-03T09:00:00Z","Puerto de Ushuaia","Ushuaia","Tierra del Fuego",-54.8000,-68.3000,"adventure",["alegre"],True,False),

    # ===== Catamarca =====
    ("Fiesta Nacional e Internacional del Poncho","La fiesta más importante de Catamarca con artesanías, comidas típicas y festival folklórico.","2026-07-18T10:00:00Z","Predio Ferial Catamarca","San Fernando del Valle de Catamarca","Catamarca",-28.4686,-65.7792,"cultural",["alegre"],True,True),
    ("Feria del Libro de Catamarca","Feria literaria con presentaciones de libros y actividades culturales.","2026-08-12T15:00:00Z","Cine Teatro Catamarca","San Fernando del Valle de Catamarca","Catamarca",-28.4686,-65.7792,"cultural",["reservado"],False,True),
    ("Festival del Cabrito en Catamarca","Festival gastronómico con platos típicos de cabrito y música folklórica.","2026-10-17T11:00:00Z","Predio Ferial","San Fernando del Valle de Catamarca","Catamarca",-28.4686,-65.7792,"cultural",["alegre"],True,True),
    ("Fiesta del Olivo en Catamarca","Celebración de la olivicultura con degustación de aceites de oliva y aceitunas.","2026-05-16T10:00:00Z","Plaza 25 de Mayo","San Fernando del Valle de Catamarca","Catamarca",-28.4686,-65.7792,"cultural",["alegre"],True,True),
    ("Trekking al Cerro El Manchao","Excursión de montaña al cerro más emblemático de la provincia.","2026-09-26T07:00:00Z","Ruta Provincial 1","San Fernando del Valle de Catamarca","Catamarca",-28.4500,-65.7500,"adventure",["alegre"],True,True),
    ("Noche de los Museos Catamarca","Museos de Catamarca abren sus puertas con visitas guiadas nocturnas.","2026-11-28T19:00:00Z","Museo Arqueológico","San Fernando del Valle de Catamarca","Catamarca",-28.4686,-65.7792,"cultural",["alegre"],True,True),
    ("Fiesta de la Candelaria en Catamarca","Fiesta religiosa con procesiones y ferias en honor a la Virgen de la Candelaria.","2026-02-02T08:00:00Z","Catedral Basílica","San Fernando del Valle de Catamarca","Catamarca",-28.4686,-65.7792,"relax",["reservado"],True,True),

    # ===== Jujuy =====
    ("Carnaval de Los Tekis","El carnaval más importante del norte argentino con desfiles, corsos y música en Jujuy.","2026-02-14T20:00:00Z","Ciudad Cultural","San Salvador de Jujuy","Jujuy",-24.1858,-65.2995,"nightlife",["alegre"],True,False),
    ("Feria del Libro de Jujuy","Feria literaria con autores del NOA en el Centro Cultural Jorge Cafrune.","2026-08-05T15:00:00Z","Centro Cultural Jorge Cafrune","San Salvador de Jujuy","Jujuy",-24.1858,-65.2995,"cultural",["reservado"],False,True),
    ("Fiesta Nacional de los Estudiantes","Desfiles de carrozas y elección de la reina en la capital jujeña.","2026-09-19T15:00:00Z","Av. 19 de Abril","San Salvador de Jujuy","Jujuy",-24.1858,-65.2995,"nightlife",["alegre"],True,True),
    ("Carnaval de Tilcara","Carnaval tradicional con diablos, coplas y desfiles en la Quebrada de Humahuaca.","2026-02-07T15:00:00Z","Plaza Principal","Tilcara","Jujuy",-23.5833,-65.4000,"cultural",["alegre"],True,True),
    ("Semana de Tilcara","Fiesta patronal con procesiones, ferias y festival folklórico en Tilcara.","2026-10-12T09:00:00Z","Iglesia de Tilcara","Tilcara","Jujuy",-23.5833,-65.4000,"cultural",["alegre","reservado"],True,True),
    ("Fiesta de la Pachamama en Humahuaca","Ceremonia ancestral de ofrenda a la Madre Tierra en el cerro de la Cruz.","2026-08-01T08:00:00Z","Cerro de la Cruz","Humahuaca","Jujuy",-23.2000,-65.3500,"cultural",["reservado"],True,True),
    ("Fiesta de la Virgen de la Candelaria en Purmamarca","Festividad religiosa con danzas y procesiones en el pueblo del Cerro de los Siete Colores.","2026-02-02T09:00:00Z","Iglesia de Purmamarca","Purmamarca","Jujuy",-23.7500,-65.5000,"relax",["reservado"],True,True),
    ("Trekking al Cerro de los Siete Colores","Caminata guiada por los senderos del cerro multicolor de Purmamarca.","2026-04-18T08:00:00Z","Cerro de los Siete Colores","Purmamarca","Jujuy",-23.7500,-65.5000,"adventure",["alegre"],True,False),
    ("Feria Artesanal de la Quebrada","Feria de artesanías andinas con tejidos, cerámica y platería.","2026-06-20T09:00:00Z","Plaza Independencia","San Salvador de Jujuy","Jujuy",-24.1858,-65.2995,"cultural",["alegre"],True,True),

    # ===== San Luis =====
    ("Fiesta de la Calle Angosta","Festival de arte callejero con músicos, pintores y artesanos en la Calle Angosta de San Luis.","2026-10-03T18:00:00Z","Calle Angosta","San Luis","San Luis",-33.2980,-66.3384,"cultural",["alegre"],True,True),
    ("Feria del Libro de San Luis","Feria literaria con autores puntanos y nacionales en el Centro Cultural.","2026-09-09T14:00:00Z","Centro Cultural Puente Blanco","San Luis","San Luis",-33.2980,-66.3384,"cultural",["reservado"],False,True),
    ("Fiesta del Turismo en Merlo","Festival turístico con actividades al aire libre, ferias y espectáculos en Merlo.","2026-02-21T09:00:00Z","Plaza Sarmiento","Merlo","San Luis",-32.3333,-65.0167,"adventure",["alegre"],True,True),
    ("Feria de las Artes en Villa Mercedes","Exposición de artes plásticas, música y teatro en Villa Mercedes.","2026-04-25T16:00:00Z","Teatro Municipal","Villa Mercedes","San Luis",-33.6667,-65.4667,"cultural",["alegre","reservado"],False,True),
    ("Fiesta Nacional del Río en Merlo","Celebración a orillas del Río Conlara con deportes acuáticos y shows.","2026-01-17T10:00:00Z","Río Conlara","Merlo","San Luis",-32.3333,-65.0167,"adventure",["alegre"],True,True),
    ("Fiesta del Deporte en La Punta","Competencias deportivas al aire libre con maratón, ciclismo y vóley playa.","2026-03-28T08:00:00Z","Autódromo de La Punta","La Punta","San Luis",-33.1833,-66.3167,"adventure",["alegre"],True,True),
    ("Fiesta de la Cerveza Artesanal Puntana","Degustación de cervezas artesanales de San Luis con bandas locales.","2026-11-07T17:00:00Z","Parque de las Naciones","San Luis","San Luis",-33.2980,-66.3384,"nightlife",["alegre"],True,False),
    ("Trekking al Cerro Sololosta","Excursión de montaña al cerro más alto de la provincia de San Luis.","2026-08-15T06:00:00Z","Parque Nacional Sierra de las Quijadas","San Luis","San Luis",-32.5500,-66.9000,"adventure",["alegre"],True,False),

    # ===== Entre Ríos =====
    ("Carnaval de Gualeguaychú","El carnaval más importante de Argentina con desfiles de comparsas y carrozas en el corsódromo.","2026-01-10T21:00:00Z","Corsódromo","Gualeguaychú","Entre Ríos",-33.0108,-58.5175,"nightlife",["alegre"],True,False),
    ("Fiesta Nacional del Mate","Festival del mate con degustaciones, concursos y música en Paraná.","2026-10-10T10:00:00Z","Parque Urquiza","Paraná","Entre Ríos",-31.7333,-60.5333,"cultural",["alegre"],True,True),
    ("Feria del Libro de Paraná","Feria literaria con autores entrerrianos en la capital provincial.","2026-07-01T14:00:00Z","Centro Cultural La Vieja Usina","Paraná","Entre Ríos",-31.7333,-60.5333,"cultural",["reservado"],False,True),
    ("Fiesta Nacional de la Citricultura","Festival de la producción citrícola de Concordia con desfiles y degustaciones.","2026-03-14T10:00:00Z","Predio Ferial","Concordia","Entre Ríos",-31.3928,-58.0169,"cultural",["alegre"],True,True),
    ("Carnaval de Federación","Carnaval con desfiles de comparsas en la ciudad termal de Federación.","2026-02-07T21:00:00Z","Corsódromo","Federación","Entre Ríos",-30.9833,-57.9000,"nightlife",["alegre"],True,False),
    ("Fiesta Nacional de la Artesanía en Colón","Exposición de artesanías de todo el país en la ciudad de Colón.","2026-11-21T10:00:00Z","Predio Ferial","Colón","Entre Ríos",-32.2167,-58.1333,"cultural",["alegre"],True,True),
    ("Fiesta Nacional del Frigorífico","Festival gastronómico de la carne en Gualeguaychú con shows musicales.","2026-04-25T12:00:00Z","Predio Ferial","Gualeguaychú","Entre Ríos",-33.0108,-58.5175,"cultural",["alegre"],True,True),
    ("Rafting en el Río Uruguay","Aventura de rafting por los rápidos del Río Uruguay en la zona de Concordia.","2026-01-24T09:00:00Z","Río Uruguay","Concordia","Entre Ríos",-31.3928,-58.0169,"adventure",["alegre"],True,False),
    ("Fiesta de la Mujer Trabajadora","Homenaje a la mujer trabajadora con actividades culturales en Concepción del Uruguay.","2026-03-07T16:00:00Z","Plaza Ramírez","Concepción del Uruguay","Entre Ríos",-32.4833,-58.2333,"cultural",["alegre"],True,True),
    ("Termas de Federación Experience","Jornada de relax en las termas más famosas de la provincia.","2026-05-16T09:00:00Z","Complejo Termal","Federación","Entre Ríos",-30.9833,-57.9000,"relax",["relax","reservado"],True,False),

    # ===== Tucumán =====
    ("Fiesta Nacional de la Empanada","Concurso de la mejor empanada tucumana con festival folklórico en la plaza.","2026-09-12T11:00:00Z","Plaza Independencia","San Miguel de Tucumán","Tucumán",-26.8303,-65.2037,"cultural",["alegre"],True,True),
    ("Feria del Libro de Tucumán","Feria literaria con autores tucumanos en el Ente Cultural de Tucumán.","2026-10-07T15:00:00Z","Ente Cultural de Tucumán","San Miguel de Tucumán","Tucumán",-26.8303,-65.2037,"cultural",["reservado"],False,True),
    ("Festival de la Independencia","Festejos patrios en la Casa Histórica de la Independencia con shows y desfiles.","2026-07-09T09:00:00Z","Casa Histórica de la Independencia","San Miguel de Tucumán","Tucumán",-26.8303,-65.2037,"cultural",["alegre"],True,True),
    ("Fiesta del Queso en Tafí del Valle","Festival gastronómico con degustación de quesos artesanales de altura.","2026-02-21T10:00:00Z","Plaza Principal","Tafí del Valle","Tucumán",-26.8500,-65.6833,"cultural",["alegre"],True,True),
    ("Feria de la Flor en Yerba Buena","Exposición de flores y plantas con jardinería temática en Yerba Buena.","2026-10-17T09:00:00Z","Parque de la Flor","Yerba Buena","Tucumán",-26.8167,-65.2833,"relax",["alegre","relax"],True,True),
    ("Feria de Simoca","La feria más antigua de Argentina con productos regionales y artesanías.","2026-07-04T07:00:00Z","Plaza Principal","Simoca","Tucumán",-27.2667,-65.3667,"cultural",["alegre"],True,True),
    ("Fiesta de la Pachamama en Tafí del Valle","Ceremonia andina de agradecimiento a la Madre Tierra en los valles tucumanos.","2026-08-01T08:00:00Z","Cerro Cataratas","Tafí del Valle","Tucumán",-26.8500,-65.6833,"cultural",["reservado"],True,True),
    ("Maratón del Bicentenario","Carrera atlética por las calles de San Miguel de Tucumán.","2026-05-24T07:00:00Z","Plaza Independencia","San Miguel de Tucumán","Tucumán",-26.8303,-65.2037,"adventure",["alegre"],True,False),
    ("Noche de los Museos Tucumán","Museos tucumanos abren con entrada gratuita y visitas guiadas nocturnas.","2026-11-14T19:00:00Z","Museo de la Universidad","San Miguel de Tucumán","Tucumán",-26.8303,-65.2037,"cultural",["alegre"],True,True),

    # ===== Chubut =====
    ("Fiesta Nacional del Cordero","Festival gastronómico con cordero patagónico al asador en Puerto Madryn.","2026-02-07T12:00:00Z","Predio Ferial","Puerto Madryn","Chubut",-42.7722,-65.0339,"cultural",["alegre"],True,True),
    ("Avistaje de Ballenas en Puerto Madryn","Temporada de avistaje de ballenas francas australes en la Península Valdés.","2026-06-20T08:00:00Z","Península Valdés","Puerto Madryn","Chubut",-42.5000,-64.0000,"adventure",["alegre"],True,False),
    ("Eisteddfod del Valle","Festival de la cultura galesa en Trelew con coros, poesía y danzas.","2026-10-24T14:00:00Z","Teatro Español","Trelew","Chubut",-43.2522,-65.3100,"cultural",["alegre","reservado"],False,True),
    ("Fiesta Nacional del Esquí","Competencias de esquí alpino y nórdico en el Cerro La Hoya de Esquel.","2026-08-08T09:00:00Z","Cerro La Hoya","Esquel","Chubut",-42.9000,-71.3167,"adventure",["alegre"],True,False),
    ("Fiesta Nacional del Salmón","Festival del salmón con pesca deportiva y gastronomía en Rawson.","2026-02-28T08:00:00Z","Costanera de Rawson","Rawson","Chubut",-43.3000,-65.1000,"adventure",["alegre"],True,True),
    ("Feria del Libro de Comodoro Rivadavia","Feria literaria en la ciudad petrolera con autores patagónicos.","2026-09-02T15:00:00Z","Centro Cultural","Comodoro Rivadavia","Chubut",-45.8667,-67.5000,"cultural",["reservado"],False,True),
    ("Festival del Té Galés","Celebración de la cultura galesa con degustación de té y tortas en Gaiman.","2026-05-02T15:00:00Z","Salón de Té","Gaiman","Chubut",-43.2833,-65.4833,"cultural",["alegre","relax"],False,False),
    ("Fiesta de la Torta Galesa en Dolavon","Festival de la torta galesa tradicional con concursos y feria artesanal.","2026-10-31T10:00:00Z","Plaza Principal","Dolavon","Chubut",-43.3000,-65.7000,"cultural",["alegre"],True,True),
    ("Buceo en la Reserva Natural del Golfo Nuevo","Buceo con lobos marinos en las aguas del Golfo Nuevo.","2026-01-10T09:00:00Z","Golfo Nuevo","Puerto Madryn","Chubut",-42.7500,-65.0339,"adventure",["alegre"],True,False),

    # ===== Santiago del Estero =====
    ("Fiesta Nacional de la Chacarera","El festival folklórico más importante de Santiago del Estero con bailes y música tradicional.","2026-01-17T21:00:00Z","Anfiteatro Parque Aguirre","Santiago del Estero","Santiago del Estero",-27.7833,-64.2667,"cultural",["alegre"],True,True),
    ("Feria del Libro de Santiago del Estero","Feria literaria con autores santiagueños en el Centro Cultural del Bicentenario.","2026-07-15T15:00:00Z","Centro Cultural del Bicentenario","Santiago del Estero","Santiago del Estero",-27.7833,-64.2667,"cultural",["reservado"],False,True),
    ("Festival de la Chacarera en Termas de Río Hondo","Festival folklórico con artistas locales y nacionales en las Termas.","2026-02-21T20:00:00Z","Anfiteatro Municipal","Termas de Río Hondo","Santiago del Estero",-27.4833,-64.8667,"cultural",["alegre"],True,True),
    ("Feria del Libro de Termas de Río Hondo","Feria literaria en la ciudad termal con actividades culturales.","2026-08-12T15:00:00Z","Centro Cultural","Termas de Río Hondo","Santiago del Estero",-27.4833,-64.8667,"cultural",["reservado"],False,True),
    ("Fiesta del Ternero en Ojo de Agua","Festival ganadero con jineteadas y comidas típicas en Ojo de Agua.","2026-07-25T10:00:00Z","Predio Rural","Ojo de Agua","Santiago del Estero",-28.0000,-63.7500,"cultural",["alegre"],True,True),
    ("Feria Artesanal de la Madre Tierra","Feria de artesanías regionales con productos típicos santiagueños.","2026-10-10T09:00:00Z","Plaza Libertad","Santiago del Estero","Santiago del Estero",-27.7833,-64.2667,"cultural",["alegre"],True,True),
    ("Termas de Río Hondo Relax","Jornada de baños termales y spa en las aguas más cálidas de Argentina.","2026-04-04T09:00:00Z","Complejo Termal","Termas de Río Hondo","Santiago del Estero",-27.4833,-64.8667,"relax",["relax","reservado"],True,False),
    ("Maratón del 25 de Mayo","Carrera atlética por las calles de la capital santiagueña.","2026-05-25T07:00:00Z","Plaza Independencia","Santiago del Estero","Santiago del Estero",-27.7833,-64.2667,"adventure",["alegre"],True,False),

    # ===== Corrientes =====
    ("Fiesta Nacional del Chamamé","El festival chamamecero más importante del mundo con músicos de toda la región.","2026-01-16T20:00:00Z","Anfiteatro Cocomarola","Corrientes","Corrientes",-27.4696,-58.8308,"cultural",["alegre"],True,False),
    ("Carnaval de Corrientes","Desfiles de comparsas con carrozas y trajes de brillo en la costanera correntina.","2026-01-24T21:00:00Z","Costanera General San Martín","Corrientes","Corrientes",-27.4696,-58.8308,"nightlife",["alegre"],True,False),
    ("Fiesta de la Pesca del Dorado","Festival de pesca deportiva en Paso de la Patria con concursos y shows.","2026-09-26T07:00:00Z","Costanera del Río Paraná","Paso de la Patria","Corrientes",-27.3167,-58.5833,"adventure",["alegre"],True,True),
    ("Fiesta Nacional del Surubí","Festival del surubí con gastronomía y pesca deportiva en Goya.","2026-05-02T08:00:00Z","Puerto de Goya","Goya","Corrientes",-29.1333,-59.2500,"adventure",["alegre"],True,True),
    ("Fiesta de la Naranja en Bella Vista","Festival citrícola con degustación de naranjas y productos regionales.","2026-11-14T10:00:00Z","Plaza Principal","Bella Vista","Corrientes",-28.5000,-59.0500,"cultural",["alegre"],True,True),
    ("Feria del Libro de Corrientes","Feria literaria con autores correntinos en el Centro Cultural.","2026-07-22T15:00:00Z","Centro Cultural","Corrientes","Corrientes",-27.4696,-58.8308,"cultural",["reservado"],False,True),
    ("Fiesta Nacional de la Mandioca en Ituzaingó","Festival gastronómico de la mandioca con platos típicos y música.","2026-09-05T10:00:00Z","Predio Ferial","Ituzaingó","Corrientes",-27.5833,-56.6833,"cultural",["alegre"],True,True),
    ("Fiesta de la Tradición en Curuzú Cuatiá","Fiesta gaucha con jineteadas, desfiles y comidas típicas.","2026-11-21T09:00:00Z","Parque Gaucho","Curuzú Cuatiá","Corrientes",-29.7833,-58.0500,"cultural",["alegre"],True,True),
    ("Kayak en los Esteros del Iberá","Paseo en kayak por los esteros con avistaje de fauna autóctona.","2026-03-07T08:00:00Z","Portal Laguna Iberá","Colonia Carlos Pellegrini","Corrientes",-28.5333,-57.1667,"adventure",["alegre"],True,False),

    # ===== Misiones =====
    ("Fiesta Nacional del Inmigrante","Festival de las colectividades en Oberá con desfiles, comidas típicas y bailes.","2026-09-05T10:00:00Z","Parque de las Naciones","Oberá","Misiones",-27.4833,-55.1333,"cultural",["alegre"],True,True),
    ("Fiesta Nacional del Yerbal","Celebración de la yerba mate en Puerto Iguazú con degustaciones y shows.","2026-04-25T10:00:00Z","Plaza San Martín","Puerto Iguazú","Misiones",-25.6000,-54.5667,"cultural",["alegre"],True,True),
    ("Feria del Libro de Posadas","Feria literaria con autores misioneros en la capital provincial.","2026-08-19T15:00:00Z","Centro Cultural","Posadas","Misiones",-27.3667,-55.9000,"cultural",["reservado"],False,True),
    ("Cataratas del Iguazú - Tour Completo","Recorrido guiado por las pasarelas de las Cataratas del Iguazú.","2026-06-06T08:00:00Z","Parque Nacional Iguazú","Puerto Iguazú","Misiones",-25.6833,-54.4333,"adventure",["alegre"],True,False),
    ("Fiesta Nacional del Monte en Eldorado","Festival de la producción forestal y agrícola con ferias y espectáculos.","2026-10-10T10:00:00Z","Predio Ferial","Eldorado","Misiones",-26.4000,-54.6333,"cultural",["alegre"],True,True),
    ("Fiesta Nacional del Folklore en San Ignacio","Festival folklórico en las ruinas jesuíticas de San Ignacio Miní.","2026-08-15T19:00:00Z","Ruinas de San Ignacio","San Ignacio","Misiones",-27.2500,-55.5333,"cultural",["alegre"],True,True),
    ("Festival del Río en San Javier","Actividades náuticas y shows musicales a orillas del Río Uruguay.","2026-02-14T10:00:00Z","Costanera","San Javier","Misiones",-27.8833,-55.1333,"adventure",["alegre"],True,True),
    ("Ruta de la Yerba Mate","Tour guiado por plantaciones de yerba mate con degustación en Posadas.","2026-03-14T09:00:00Z","Plantación de Yerba Mate","Posadas","Misiones",-27.3667,-55.9000,"relax",["alegre","relax"],True,False),
    ("Noche de las Ruinas Jesuíticas","Visita nocturna con espectáculo de luces en las Ruinas de San Ignacio.","2026-11-07T19:00:00Z","Ruinas de San Ignacio","San Ignacio","Misiones",-27.2500,-55.5333,"cultural",["alegre","reservado"],True,False),

    # ===== La Pampa =====
    ("Feria del Libro de La Pampa","Feria literaria con autores pampeanos en Santa Rosa.","2026-08-26T15:00:00Z","Centro Cultural","Santa Rosa","La Pampa",-36.6167,-64.2833,"cultural",["reservado"],False,True),
    ("Fiesta Nacional del Caldén","Festival del árbol emblemático de La Pampa con ferias y espectáculos folklóricos.","2026-10-24T18:00:00Z","Parque Provincial","Santa Rosa","La Pampa",-36.6167,-64.2833,"cultural",["alegre"],True,True),
    ("Fiesta Nacional de la Ganadería","Exposición ganadera con remates y feria rural en General Pico.","2026-05-16T09:00:00Z","Predio Rural","General Pico","La Pampa",-35.6667,-63.7500,"cultural",["alegre"],True,True),
    ("Fiesta del Caldén en Victorica","Fiesta del árbol autóctono con ferias y música folklórica en Victorica.","2026-11-14T10:00:00Z","Plaza Principal","Victorica","La Pampa",-36.2167,-65.4333,"cultural",["alegre"],True,True),
    ("Fiesta del Cordero en Toay","Festival gastronómico del cordero patagónico con shows musicales.","2026-03-21T12:00:00Z","Predio Ferial","Toay","La Pampa",-36.6667,-64.3833,"cultural",["alegre"],True,True),
    ("Fiesta Provincial del Trigo en Macachín","Festival del trigo con exposiciones y degustaciones de productos regionales.","2026-01-24T09:00:00Z","Plaza Principal","Macachín","La Pampa",-37.1333,-63.6667,"cultural",["alegre"],True,True),
    ("Cicloturismo por la Pampa","Paseo en bicicleta por los paisajes pampeanos con guía.","2026-09-12T08:00:00Z","Ruta Nacional 35","Santa Rosa","La Pampa",-36.6167,-64.2833,"adventure",["alegre"],True,False),
    ("Noche de los Museos Pampeanos","Museos de Santa Rosa abren con entrada gratuita y visitas guiadas.","2026-11-21T19:00:00Z","Museo Provincial de Historia","Santa Rosa","La Pampa",-36.6167,-64.2833,"cultural",["alegre"],True,True),

    # ===== San Juan =====
    ("Fiesta Nacional del Sol","La fiesta más importante de San Juan con desfiles, carrozas y show central.","2026-02-27T21:00:00Z","Costa Canal","San Juan","San Juan",-31.5375,-68.5364,"cultural",["alegre"],True,True),
    ("Feria del Libro de San Juan","Feria literaria con autores sanjuaninos en el Auditorio Juan Victoria.","2026-08-12T15:00:00Z","Auditorio Juan Victoria","San Juan","San Juan",-31.5375,-68.5364,"cultural",["reservado"],False,True),
    ("Fiesta del Turismo en Valle Fértil","Festival turístico con actividades de trekking y paseos en 4x4.","2026-10-17T09:00:00Z","Parque Provincial","Valle Fértil","San Juan",-30.6333,-67.4500,"adventure",["alegre"],True,True),
    ("Fiesta de la Tradición Jachallera","Fiesta gaucha con jineteadas y danzas tradicionales en Jáchal.","2026-11-07T09:00:00Z","Plaza Principal","Jáchal","San Juan",-30.2333,-68.7500,"cultural",["alegre"],True,True),
    ("Fiesta de la Uva y el Vino en Jáchal","Celebración de la cosecha de uva en el norte sanjuanino con degustaciones.","2026-03-14T10:00:00Z","Bodegas de Jáchal","San José de Jáchal","San Juan",-30.2333,-68.7500,"cultural",["alegre"],True,True),
    ("Fiesta del Olivo en Calingasta","Degustación de aceites de oliva y aceitunas en el valle de Calingasta.","2026-05-09T10:00:00Z","Plaza Principal","Calingasta","San Juan",-31.3333,-69.4167,"cultural",["alegre"],True,True),
    ("Trekking al Cerro Mercedario","Expedición de montaña al Cerro Mercedario, el cuarto más alto de América.","2026-12-01T06:00:00Z","Parque Nacional San Guillermo","Calingasta","San Juan",-31.9667,-70.1500,"adventure",["alegre"],True,False),
    ("Bodega Tour San Juan","Recorrido por bodegas sanjuaninas con degustación de vinos.","2026-04-11T10:00:00Z","Calle de la Bodega","San Juan","San Juan",-31.5375,-68.5364,"relax",["alegre","relax"],True,False),

    # ===== Chaco =====
    ("Feria del Libro del Chaco","Feria literaria con autores chaqueños en el Centro Cultural Nordeste.","2026-07-08T15:00:00Z","Centro Cultural Nordeste","Resistencia","Chaco",-27.4511,-58.9867,"cultural",["reservado"],False,True),
    ("Fiesta Nacional de la Artesanía","Exposición de artesanías de todo el país en Resistencia.","2026-09-19T09:00:00Z","Domo del Centenario","Resistencia","Chaco",-27.4511,-58.9867,"cultural",["alegre"],True,True),
    ("Fiesta del Taninero","Festival de la producción forestal con ferias y música en Resistencia.","2026-10-31T10:00:00Z","Predio Ferial","Resistencia","Chaco",-27.4511,-58.9867,"cultural",["alegre"],True,True),
    ("Feria del Libro de Sáenz Peña","Feria literaria en Presidencia Roque Sáenz Peña con actividades culturales.","2026-08-05T15:00:00Z","Centro Cultural","Presidencia Roque Sáenz Peña","Chaco",-26.7833,-60.4500,"cultural",["reservado"],False,True),
    ("Fiesta del Inmigrante en Charata","Festival de las colectividades con comidas típicas y danzas.","2026-11-14T11:00:00Z","Plaza Principal","Charata","Chaco",-27.2167,-61.2000,"cultural",["alegre"],True,True),
    ("Fiesta del Quebracho en Villa Ángela","Festival forestal con exposiciones y música chaqueña.","2026-07-25T10:00:00Z","Predio Ferial","Villa Ángela","Chaco",-27.5833,-60.7167,"cultural",["alegre"],True,True),
    ("Paseo en Barco por el Río Paraná","Navegación por el Río Paraná desde Resistencia con avistaje de fauna.","2026-03-14T15:00:00Z","Puerto de Resistencia","Resistencia","Chaco",-27.4511,-58.9867,"adventure",["alegre"],True,False),
    ("Maratón de la Ciudad de Resistencia","Carrera por las calles de Resistencia pasando por sus famosas esculturas.","2026-04-26T07:00:00Z","Plaza 25 de Mayo","Resistencia","Chaco",-27.4511,-58.9867,"adventure",["alegre"],True,False),
    ("Fiesta de la Cultura Wichí","Celebración de la cultura originaria wichí con artesanías y ceremonias.","2026-08-08T09:00:00Z","Parque de la Ciudad","Resistencia","Chaco",-27.4511,-58.9867,"cultural",["alegre","reservado"],True,True),

    # ===== Formosa =====
    ("Feria del Libro de Formosa","Feria literaria con autores formoseños en el Centro Cultural.","2026-07-15T15:00:00Z","Centro Cultural","Formosa","Formosa",-26.1833,-58.1833,"cultural",["reservado"],False,True),
    ("Fiesta del Río en Formosa","Festival a orillas del Río Paraguay con deportes acuáticos y shows musicales.","2026-02-21T10:00:00Z","Costanera de Formosa","Formosa","Formosa",-26.1833,-58.1833,"adventure",["alegre"],True,True),
    ("Fiesta Nacional del Algodón","Festival del principal cultivo de Formosa con ferias y espectáculos.","2026-10-10T09:00:00Z","Predio Ferial","Formosa","Formosa",-26.1833,-58.1833,"cultural",["alegre"],True,True),
    ("Fiesta del Inmigrante en Clorinda","Festival de colectividades con comidas y bailes típicos en Clorinda.","2026-09-26T11:00:00Z","Plaza Principal","Clorinda","Formosa",-25.2833,-57.7167,"cultural",["alegre"],True,True),
    ("Fiesta de la Mandioca en Laguna Blanca","Festival gastronómico de la mandioca con ferias y música popular.","2026-08-22T10:00:00Z","Plaza Principal","Laguna Blanca","Formosa",-25.1333,-58.2500,"cultural",["alegre"],True,True),
    ("Fiesta del Pomelo en Piror","Festival citrícola del pomelo con degustaciones y actividades.","2026-06-06T09:00:00Z","Plaza Principal","Piror","Formosa",-25.4833,-58.4500,"cultural",["alegre"],True,True),
    ("Paseo en Canoa por el Río Paraguay","Excursión en canoa por los humedales del Río Paraguay.","2026-04-18T08:00:00Z","Puerto de Formosa","Formosa","Formosa",-26.1833,-58.1833,"adventure",["alegre"],True,False),
    ("Noche de la Cultura Formoseña","Muestra de arte, música y danza en la capital formoseña.","2026-11-14T19:00:00Z","Teatro Municipal","Formosa","Formosa",-26.1833,-58.1833,"cultural",["alegre"],False,True),

    # ===== La Rioja =====
    ("Fiesta Nacional del Olivo en La Rioja","Festival del olivo con degustación de aceites y aceitunas en la capital riojana.","2026-05-16T10:00:00Z","Predio Ferial","La Rioja","La Rioja",-29.4135,-66.8550,"cultural",["alegre"],True,True),
    ("Feria del Libro de La Rioja","Feria literaria con autores riojanos en el Centro Cultural.","2026-08-26T15:00:00Z","Centro Cultural","La Rioja","La Rioja",-29.4135,-66.8550,"cultural",["reservado"],False,True),
    ("Fiesta de la Chaya en Chilecito","Carnaval tradicional riojano con desfiles, música y danzas.","2026-02-14T20:00:00Z","Plaza Principal","Chilecito","La Rioja",-29.1667,-67.5000,"nightlife",["alegre"],True,True),
    ("Fiesta del Turismo en Chilecito","Festival turístico con actividades recreativas y visitas guiadas.","2026-10-24T09:00:00Z","Centro Cultural","Chilecito","La Rioja",-29.1667,-67.5000,"adventure",["alegre"],True,True),
    ("Fiesta del Olivo en Aimogasta","Festival del olivo en la capital nacional del olivo con degustaciones.","2026-05-09T10:00:00Z","Plaza Principal","Aimogasta","La Rioja",-28.5500,-66.8167,"cultural",["alegre"],True,True),
    ("Fiesta de la Nuez en Villa Unión","Festival de la nuez con productos regionales y música en Villa Unión.","2026-03-28T10:00:00Z","Plaza Principal","Villa Unión","La Rioja",-29.3500,-67.2167,"cultural",["alegre"],True,True),
    ("Trekking al Parque Nacional Talampaya","Excursión guiada al Cañón de Talampaya con formaciones geológicas únicas.","2026-04-25T07:00:00Z","Parque Nacional Talampaya","La Rioja","La Rioja",-29.8000,-67.8333,"adventure",["alegre"],True,False),
    ("Fiesta de la Candelaria en La Rioja","Fiesta religiosa con procesiones y ferias en honor a la Virgen.","2026-02-02T08:00:00Z","Catedral","La Rioja","La Rioja",-29.4135,-66.8550,"relax",["reservado"],True,True),

    # ===== Santa Cruz =====
    ("Fiesta del Lago en El Calafate","Festival turístico a orillas del Lago Argentino con shows y actividades.","2026-02-14T10:00:00Z","Costanera del Lago Argentino","El Calafate","Santa Cruz",-50.3358,-72.2616,"adventure",["alegre"],True,True),
    ("Feria del Libro de Santa Cruz","Feria literaria en Río Gallegos con autores patagónicos.","2026-08-19T15:00:00Z","Centro Cultural","Río Gallegos","Santa Cruz",-51.6333,-69.2333,"cultural",["reservado"],False,True),
    ("Fiesta del Cordero Patagónico","Festival gastronómico del cordero al asador en Río Gallegos.","2026-03-21T12:00:00Z","Predio Ferial","Río Gallegos","Santa Cruz",-51.6333,-69.2333,"cultural",["alegre"],True,True),
    ("Trekking al Glaciar Perito Moreno","Caminata guiada por las pasarelas del Glaciar Perito Moreno en El Calafate.","2026-06-13T08:00:00Z","Parque Nacional Los Glaciares","El Calafate","Santa Cruz",-50.4500,-73.0500,"adventure",["alegre"],True,False),
    ("Fiesta del Trekking en El Chaltén","Festival de senderismo con rutas guiadas por el Cerro Fitz Roy.","2026-10-10T08:00:00Z","Cerro Fitz Roy","El Chaltén","Santa Cruz",-49.1500,-72.8833,"adventure",["alegre"],True,False),
    ("Fiesta del Salmón en Puerto Deseado","Festival de pesca deportiva del salmón en la ría de Puerto Deseado.","2026-04-04T07:00:00Z","Ría Deseado","Puerto Deseado","Santa Cruz",-47.7500,-65.9000,"adventure",["alegre"],True,True),
    ("Fiesta del Petróleo en Caleta Olivia","Festival de la industria petrolera con ferias y espectáculos.","2026-12-12T10:00:00Z","Predio Ferial","Caleta Olivia","Santa Cruz",-46.4333,-67.5333,"cultural",["alegre"],True,True),
    ("Hielo en Glaciares - Mini Trekking","Caminata sobre el hielo del Glaciar Perito Moreno con crampones.","2026-09-12T08:00:00Z","Glaciar Perito Moreno","El Calafate","Santa Cruz",-50.4500,-73.0500,"adventure",["alegre"],True,False),
    ("Navegación por el Lago Argentino","Paseo en catamarán por el Lago Argentino con vista a los glaciares Upsala y Spegazzini.","2026-01-17T09:00:00Z","Puerto de El Calafate","El Calafate","Santa Cruz",-50.3358,-72.2616,"adventure",["alegre"],True,False),
]


def build_payload(e):
    return {
        "title": e[0],
        "description": e[1],
        "date": e[2],
        "location": {
            "address": e[3],
            "city": e[4],
            "province": e[5],
            "lat": e[6],
            "lng": e[7]
        },
        "category": e[8],
        "moods": e[9],
        "is_outdoor": e[10],
        "is_free": e[11]
    }


def main():
    session = requests.Session()
    total = len(E)
    created = 0
    approved = 0

    print(f"Seeding {total} events...")

    for i, e in enumerate(E, 1):
        payload = build_payload(e)

        try:
            resp = session.post(f"{API}/events/", json=payload, timeout=15)
            if resp.status_code == 201:
                event_id = resp.json().get("id")
                created += 1

                # Approve
                apr = session.patch(f"{API}/events/{event_id}/approve", timeout=15)
                if apr.status_code == 200:
                    approved += 1

                sys.stdout.write(f"\r  [{i}/{total}] Created: {e[0][:50]:50s} | Status: {resp.status_code}")
                sys.stdout.flush()
            else:
                print(f"\n  ERROR on {e[0][:40]}: HTTP {resp.status_code} - {resp.text[:200]}")
        except Exception as ex:
            print(f"\n  EXCEPTION on {e[0][:40]}: {ex}")

    print(f"\n\nDone! {created} created, {approved} approved out of {total}")


if __name__ == "__main__":
    main()
