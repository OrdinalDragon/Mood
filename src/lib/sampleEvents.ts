import { Event } from '../types';

const createDate = (daysFromNow: number, hours: number = 18, minutes: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const getEventCount = (filter: 'all' | 'today' | 'weekend' | 'free' | 'outdoor' | string): number => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events = sampleEvents.filter(e => {
    if (!e.date) return false;
    const eventDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
    
    switch (filter) {
      case 'today':
        return eventDate.toDateString() === today.toDateString();
      case 'weekend':
        const dayOfWeek = eventDate.getDay();
        return dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      case 'free':
        return e.title?.toLowerCase().includes('gratis') || e.title?.toLowerCase().includes('gratuita');
      case 'outdoor':
        return e.title?.toLowerCase().includes('parque') || 
               e.title?.toLowerCase().includes('reserva') || 
               e.title?.toLowerCase().includes('aire');
      default:
        return true;
    }
  });
  
  return events.length + Math.floor(Math.random() * 50);
};

export const sampleEvents: Partial<Event>[] = [
  {
    id: 'sample-1',
    title: 'Tango en el Parque - Clase Abierta',
    description: 'Venite a aprender los pasos básicos del tango argentino con instructores profesionales. No necesitás pareja ni experiencia previa. La clase es gratuita y al final habrá una práctica libre.',
    date: createDate(0, 17, 0),
    location: {
      address: 'Parque Tres de Febrero',
      city: 'Palermo',
      province: 'Buenos Aires',
      lat: -34.5805,
      lng: -58.4114
    },
    category: 'cultural',
    moods: ['alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-2',
    title: 'Festival de Cerveza Artesanal',
    description: 'Más de 50 cervecerías artesanales te esperan con más de 200 variedades de cerveja. Food trucks, música en vivo y actividades para toda la familia.',
    date: createDate(1, 15, 0),
    location: {
      address: 'Estación Plaza Italia',
      city: 'Palermo',
      province: 'Buenos Aires',
      lat: -34.5807,
      lng: -58.4376
    },
    category: 'nightlife',
    moods: ['alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-3',
    title: 'Escape Room: Misterio en el Teatro',
    description: 'Tenés 60 minutos para resolver el misterio y escapar antes de que el tiempo se acaba. Ideal para grupos de 2 a 6 personas. Reservaciones obligatorias.',
    date: createDate(0, 19, 0),
    location: {
      address: 'Thames 1776',
      city: 'Villa Crespo',
      province: 'Buenos Aires',
      lat: -34.5973,
      lng: -58.4426
    },
    category: 'group',
    moods: ['enojado', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-4',
    title: 'Clase de Yoga al Amanecer',
    description: 'Empezá tu día con energía positiva. Clase de yoga para todos los niveles en el corazón de Palermo. Traé tu colchoneta o alquilá una en el lugar.',
    date: createDate(2, 7, 0),
    location: {
      address: 'Plaza Italia',
      city: 'Palermo',
      province: 'Buenos Aires',
      lat: -34.5815,
      lng: -58.4370
    },
    category: 'relax',
    moods: ['tranquilo', 'triste'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-5',
    title: 'Torneo de Fútbol 5 Amateur',
    description: 'Participá del torneo relámpago de fútbol 5. Equipos de 5 jugadores. Premiamos a los 3 primeros. Incluye hidratación y snacks.',
    date: createDate(3, 10, 0),
    location: {
      address: 'Club Atlético Platense',
      city: 'Caballito',
      province: 'Buenos Aires',
      lat: -34.6178,
      lng: -58.4380
    },
    category: 'group',
    moods: ['alegre', 'enojado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-6',
    title: 'Recorrido Gastronómico por Villa Crespo',
    description: 'Caminata gastronómica de 3 horas por las mejores opciones culinarias del barrio. Probá empanadas, pizzas artesanales, helados y mucho más.',
    date: createDate(4, 11, 0),
    location: {
      address: 'Av. Corrientes 5500',
      city: 'Villa Crespo',
      province: 'Buenos Aires',
      lat: -34.5980,
      lng: -58.4450
    },
    category: 'cultural',
    moods: ['alegre', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-7',
    title: 'Noche de Stand Up Comedy',
    description: 'Risas garantizadas con los mejores comediantes del país. 90 minutos de show contínuo. Edad mínima: 18 años. Comprá tus entradas anticipadas.',
    date: createDate(5, 21, 0),
    location: {
      address: 'Teatro La Casa de la Nona',
      city: 'Villa Crespo',
      province: 'Buenos Aires',
      lat: -34.5960,
      lng: -58.4435
    },
    category: 'nightlife',
    moods: ['alegre', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-8',
    title: 'Trekking Urbano: Reserva Ecológica',
    description: 'Explorá la Reserva Ecológica Costanera Sur con guías especializados. Vas a conocer flora y fauna native de Buenos Aires. No te olvides el repelente.',
    date: createDate(6, 9, 0),
    location: {
      address: 'Reserva Ecológica Costanera Sur',
      city: 'Ciudad de Buenos Aires',
      province: 'Buenos Aires',
      lat: -34.6175,
      lng: -58.4505
    },
    category: 'adventure',
    moods: ['tranquilo', 'alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-9',
    title: 'Workshop de Fotografía Urbana',
    description: 'Aprendé a capturar la esencia de la ciudad con tu celular o cámara. Vamos a recorrer las calles de Caballito fotografiando arquitectura y vida urbana.',
    date: createDate(7, 16, 0),
    location: {
      address: 'Plaza Ercilla',
      city: 'Caballito',
      province: 'Buenos Aires',
      lat: -34.6150,
      lng: -58.4320
    },
    category: 'cultural',
    moods: ['tranquilo', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-10',
    title: 'Noche de Karaoke y Cócteles',
    description: 'Mostrá tu talento vocal en nuestra noche de karaoke. Cocktails artesanales en promo toda la noche. Reservá tu canción con anticipación.',
    date: createDate(8, 22, 0),
    location: {
      address: 'Av. Rivadavia 5100',
      city: 'Caballito',
      province: 'Buenos Aires',
      lat: -34.6190,
      lng: -58.4340
    },
    category: 'nightlife',
    moods: ['alegre', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-11',
    title: 'Clínica de Running para Principiantes',
    description: 'Empezá a correr con guidance profesional. Te enseñamos técnica, respiración y cómo armar tu plan de entrenamiento. Zapatillas cómodas obligatorias.',
    date: createDate(9, 8, 0),
    location: {
      address: 'Parque Rivadavia',
      city: 'Ciudadela',
      province: 'Buenos Aires',
      lat: -34.6370,
      lng: -58.4540
    },
    category: 'adventure',
    moods: ['enojado', 'alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-12',
    title: 'Mercadito Orgánico de Ramos Mejía',
    description: 'Encontrá productos orgánicos, artesanales y saludables directo del productor. Frutas, verduras, panes, quesos y mucho más.',
    date: createDate(10, 9, 0),
    location: {
      address: 'Plaza San Martín',
      city: 'Ramos Mejía',
      province: 'Buenos Aires',
      lat: -34.6470,
      lng: -58.5630
    },
    category: 'relax',
    moods: ['tranquilo', 'triste'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-13',
    title: 'Clase Magistral de Cocina Italiana',
    description: 'Aprendé a hacer pasta fresca, risotto y tiramisú con un chef italiano auténtico. Degustación incluida. Cupos limitados.',
    date: createDate(11, 18, 0),
    location: {
      address: 'Instituto Gastronómico ICB',
      city: 'Villa Urquiza',
      province: 'Buenos Aires',
      lat: -34.5555,
      lng: -58.5085
    },
    category: 'cultural',
    moods: ['alegre', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-14',
    title: 'Quincho y Pietanza: Asado Comunitario',
    description: 'Compartí un asado con vecinos de Villa Urquiza. Cada uno trae su bebida y una porción para compartir. Mejor momento del año garantizado.',
    date: createDate(12, 13, 0),
    location: {
      address: 'Plaza de la Biodiversidad',
      city: 'Villa Urquiza',
      province: 'Buenos Aires',
      lat: -34.5535,
      lng: -58.5105
    },
    category: 'group',
    moods: ['alegre', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-15',
    title: 'Sesión de Meditación Guiada',
    description: 'Una hora de meditación guiada para reducir el estrés y encontrar tu centro. Ideal para principiantes. Almohadones y mantas proporcionados.',
    date: createDate(13, 18, 0),
    location: {
      address: 'Centro Cultural曙光',
      city: 'Villa Crespo',
      province: 'Buenos Aires',
      lat: -34.5950,
      lng: -58.4410
    },
    category: 'relax',
    moods: ['triste', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-16',
    title: 'Feria Gratis de Artesanos',
    description: 'Vení a conocer a los mejores artesanos locales. Productos únicos, hechos a mano. Entrada libre y gratuita.',
    date: createDate(0, 10, 0),
    location: {
      address: 'Plaza Armenia',
      city: 'Palermo',
      province: 'Buenos Aires',
      lat: -34.5820,
      lng: -58.4350
    },
    category: 'cultural',
    moods: ['alegre', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-17',
    title: 'Cine al Aire Libre - Gratis',
    description: 'Proyección de películas clásicas al aire libre. Traé tu blanket y disfruta. Popcorn gratis para los primeros 50.',
    date: createDate(2, 20, 0),
    location: {
      address: 'Parque Los Andes',
      city: 'Caballito',
      province: 'Buenos Aires',
      lat: -34.6160,
      lng: -58.4400
    },
    category: 'cultural',
    moods: ['triste', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-18',
    title: 'Rally de Aventura en el Parque',
    description: 'Competencia de aventura en equipo. Obstáculos, búsqueda de tesoro y mucha adrenalina. Inscripción gratis.',
    date: createDate(14, 9, 0),
    location: {
      address: 'Parque Chacabuco',
      city: 'Caballito',
      province: 'Buenos Aires',
      lat: -34.6250,
      lng: -58.4450
    },
    category: 'adventure',
    moods: ['enojado', 'alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-19',
    title: 'Tango en la Calle - Sesión Gratuita',
    description: 'Clase abierta de tango en la calle. Todos bienvenidos, sin pareja necesaria. Aprendé los pasos básicos con bailarines profesionales.',
    date: createDate(1, 18, 0),
    location: {
      address: 'Plaza San Martín',
      city: 'Córdoba',
      province: 'Córdoba',
      lat: -31.4201,
      lng: -64.1888
    },
    category: 'cultural',
    moods: ['alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-20',
    title: 'Treking por el Cerro de la Cruz',
    description: 'Excursión guiada por el Cerro de la Cruz. Vista panorámica de la ciudad. Dificultad media. Llevar agua y calzado cómodo.',
    date: createDate(2, 8, 0),
    location: {
      address: 'Cerro de la Cruz',
      city: 'Mendoza',
      province: 'Mendoza',
      lat: -32.8895,
      lng: -68.8458
    },
    category: 'adventure',
    moods: ['enojado', 'alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-21',
    title: 'Noche de Flamenco en Rosario',
    description: 'Show de flamenco en vivo con baile y guitarra. Cava y tapas incluidas. Reserva anticipada recomendada.',
    date: createDate(3, 21, 0),
    location: {
      address: 'Puerto de la Música',
      city: 'Rosario',
      province: 'Santa Fe',
      lat: -32.9445,
      lng: -60.6505
    },
    category: 'nightlife',
    moods: ['alegre', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-22',
    title: 'Yoga al Atardecer - Vista al Río',
    description: 'Sesión de yoga suave con vista al río Paraná. Trae tu colchoneta. Principiantes bienvenidos.',
    date: createDate(2, 17, 30),
    location: {
      address: 'Costanera Central',
      city: 'Rosario',
      province: 'Santa Fe',
      lat: -32.9511,
      lng: -60.6662
    },
    category: 'relax',
    moods: ['tranquilo', 'triste'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-23',
    title: 'Feria de Emprendedores - San Juan',
    description: 'Mercado de productos artesanales locales. Música en vivo, food trucks y actividades familiares.',
    date: createDate(4, 10, 0),
    location: {
      address: 'Plaza 25 de Mayo',
      city: 'San Juan',
      province: 'San Juan',
      lat: -31.5372,
      lng: -68.5360
    },
    category: 'cultural',
    moods: ['alegre', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-24',
    title: 'Karaoke Night - Salta',
    description: 'Noche de karaoke con los mejores themes de rock nacional. Bebidas en promoción.',
    date: createDate(5, 22, 0),
    location: {
      address: 'Bar El Quijano',
      city: 'Salta',
      province: 'Salta',
      lat: -24.7859,
      lng: -65.4117
    },
    category: 'nightlife',
    moods: ['alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-25',
    title: 'Caminata Urbana por el Centro',
    description: 'Recorrido histórico por el centro de la ciudad. Conoce la historia y arquitectura. Gratis para estudiantes.',
    date: createDate(3, 10, 0),
    location: {
      address: 'Plaza Principal',
      city: 'San Miguel de Tucumán',
      province: 'Tucumán',
      lat: -26.8083,
      lng: -65.2176
    },
    category: 'cultural',
    moods: ['tranquilo', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-26',
    title: 'Clase de Surf - Playa Bristol',
    description: 'Taller de surf para principiantes. Tablas y neopreno incluidos. Instructora certificada.',
    date: createDate(6, 9, 0),
    location: {
      address: 'Playa Bristol',
      city: 'Mar del Plata',
      province: 'Buenos Aires',
      lat: -38.0932,
      lng: -57.5022
    },
    category: 'adventure',
    moods: ['alegre', 'enojado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-27',
    title: 'Meditación en el Faro',
    description: 'Sesión de meditación al amanecer con vista al mar. Envolvente y relajante. Cupo limitado.',
    date: createDate(7, 6, 0),
    location: {
      address: 'Faro de Playa Bristol',
      city: 'Mar del Plata',
      province: 'Buenos Aires',
      lat: -38.1038,
      lng: -57.5325
    },
    category: 'relax',
    moods: ['triste', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-28',
    title: 'Gastronomic Tour - Buenos Aires',
    description: 'Tour gastronómico por Palermo. 4 paradas,food y bebida incluidos. Descubrí sabores únicos.',
    date: createDate(8, 12, 0),
    location: {
      address: 'Plaza Italia',
      city: 'Palermo',
      province: 'Buenos Aires',
      lat: -34.5815,
      lng: -58.4370
    },
    category: 'cultural',
    moods: ['alegre', 'tranquilo'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-29',
    title: 'Fútbol 5 - Tournament Amateur',
    description: 'Torneo de fútbol 5 open. Equipos de 5. Premiamos a los 3 primeros. Incluye hidratación.',
    date: createDate(4, 15, 0),
    location: {
      address: 'Estadio青春',
      city: 'La Plata',
      province: 'Buenos Aires',
      lat: -34.9205,
      lng: -57.9536
    },
    category: 'group',
    moods: ['enojado', 'alegre'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-30',
    title: 'Open Mic - Comedy Night',
    description: 'Noche de stand up comedy abierta. Todos pueden participar. Risas garantizadas.',
    date: createDate(9, 20, 0),
    location: {
      address: 'Teatro La Casa',
      city: 'Palermo',
      province: 'Buenos Aires',
      lat: -34.5830,
      lng: -58.4300
    },
    category: 'nightlife',
    moods: ['alegre', 'reservado'],
    status: 'approved',
    created_by: 'system',
    author_name: 'MOOD',
    is_recurring: true,
    created_at: new Date().toISOString()
  }
];

export const categoryLabels: Record<string, string> = {
  cultural: 'Cultural',
  adventure: 'Aventura',
  relax: 'Relax',
  nightlife: 'Nocturno',
  group: 'Grupal',
  solo: 'Solo',
  individual: 'Individual',
  nocturno: 'Nocturno',
  grupal: 'Grupal'
};
