import { getMood } from './moods';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function search_events(args: Record<string, any>): Promise<string> {
  try {
    let url = `${API_URL}/events/?status_filter=approved`;
    if (args.mood) url += `&mood=${encodeURIComponent(args.mood)}`;
    if (args.category) url += `&category=${encodeURIComponent(args.category)}`;
    if (args.province) url += `&province=${encodeURIComponent(args.province)}`;
    if (args.city) url += `&city=${encodeURIComponent(args.city)}`;
    if (args.free_only) url += `&is_free=true`;

    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    if (lat && lng) {
      url += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius_km=150&sort=closest`;
    } else {
      url += `&sort=soonest`;
    }
    url += `&limit=3`;

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) return `Error al buscar eventos: ${res.status}`;

    const events = await res.json();
    if (events.length === 0) return 'No se encontraron eventos con esos filtros.';

    return JSON.stringify(events.map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      category: e.category,
      moods: e.moods,
      location: e.location,
      is_free: e.is_free,
      image_url: e.image_url,
      cover_image: e.cover_image,
      distance: e.distance
    })));
  } catch (err) {
    return `Error al buscar eventos: ${err}`;
  }
}

export async function get_event_detail(args: Record<string, any>): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/events/${encodeURIComponent(args.event_id)}`);
    if (!res.ok) return `Evento no encontrado: ${res.status}`;
    const event = await res.json();
    return JSON.stringify(event);
  } catch (err) {
    return `Error al obtener detalle: ${err}`;
  }
}

export async function get_mood_info(args: Record<string, any>): Promise<string> {
  const mood = getMood(args.mood_id);
  if (!mood) return `Mood "${args.mood_id}" no encontrado. Los moods disponibles son: alegre, triste, enojado, tranquilo, reservado.`;
  const descriptions: Record<string, string> = {
    alegre: 'Eventos vibrantes y llenos de energía',
    triste: 'Planes tranquilos para consentirte',
    enojado: 'Actividades para liberar tensiones',
    tranquilo: 'Planes serenos para reconectar con vos mismo',
    reservado: 'Propuestas íntimas y sin multitudes',
  };
  return JSON.stringify({
    id: mood.id,
    emoji: mood.emoji,
    label: mood.label,
    description: descriptions[mood.id] || ''
  });
}

export async function set_user_mood(args: Record<string, any>): Promise<string> {
  return JSON.stringify({ action: 'set_user_mood', mood_id: args.mood_id });
}

export async function clear_user_mood(): Promise<string> {
  return JSON.stringify({ action: 'clear_user_mood' });
}

export async function add_to_favorites(args: Record<string, any>): Promise<string> {
  try {
    const token = getToken();
    if (!token) return 'Debés iniciar sesión para guardar favoritos';

    const res = await fetch(`${API_URL}/favorites/${encodeURIComponent(args.event_id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return `Error al agregar a favoritos: ${res.status}`;
    return JSON.stringify({ action: 'add_to_favorites', event_id: args.event_id });
  } catch (err) {
    return `Error al agregar a favoritos: ${err}`;
  }
}

export async function share_event(args: Record<string, any>): Promise<string> {
  const eventId = args.event_id;
  const baseUrl = window.location.origin;
  const eventUrl = `${baseUrl}/event/${encodeURIComponent(eventId)}`;

  if (args.via === 'whatsapp') {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`¡Mirá este evento en MOOD! ${eventUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    return JSON.stringify({ action: 'share_event', via: 'whatsapp', url: eventUrl });
  }

  return JSON.stringify({ action: 'share_event', via: 'copy', url: eventUrl });
}

export const FUNCTION_MAP: Record<string, (args: Record<string, any>) => Promise<string>> = {
  search_events,
  get_event_detail,
  get_mood_info,
  set_user_mood,
  clear_user_mood,
  add_to_favorites,
  share_event,
};
