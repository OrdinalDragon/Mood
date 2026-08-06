import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Navigation, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseEventDate, getEventImage } from '@/lib/utils';

interface ChatEvent {
  id: string;
  title: string;
  date?: any;
  category?: string | string[];
  location?: { city?: string; address?: string } | null;
  is_free?: boolean;
  image_url?: string | null;
  cover_image?: string | null;
  distance?: number;
}

interface ChatMessageProps {
  role: 'user' | 'model' | 'function';
  content: string;
  name?: string;
  done?: boolean;
  events?: ChatEvent[];
}

const FUNCTION_LABELS: Record<string, { busy: string; done: string }> = {
  search_events: { busy: 'Buscando eventos...', done: 'Eventos encontrados' },
  get_event_detail: { busy: 'Obteniendo detalle...', done: 'Detalle obtenido' },
  get_mood_info: { busy: 'Consultando mood...', done: 'Mood consultado' },
  set_user_mood: { busy: 'Cambiando mood...', done: 'Mood actualizado' },
  clear_user_mood: { busy: 'Limpiando mood...', done: 'Mood limpiado' },
  add_to_favorites: { busy: 'Guardando favorito...', done: 'Favorito guardado' },
  share_event: { busy: 'Compartiendo...', done: 'Compartido' },
};

const CATEGORY_LABELS: Record<string, string> = {
  cultural: 'Cultural',
  adventure: 'Aventura',
  relax: 'Relax',
  nightlife: 'Nocturno',
  group: 'Grupal',
  solo: 'Solo',
  individual: 'Individual',
};

function formatEventDate(date: any): string {
  const d = parseEventDate(date);
  if (!d || isNaN(d.getTime())) return 'Fecha no disponible';
  return format(d, "EEE d 'de' MMM", { locale: es });
}

const EventSuggestionCard: React.FC<{ event: ChatEvent }> = ({ event }) => {
  const cat = Array.isArray(event.category) ? event.category[0] : event.category;
  const catLabel = cat ? CATEGORY_LABELS[cat] || cat : null;

  return (
    <Link
      to={`/event/${event.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 hover:border-primary hover:shadow-md transition-all group"
    >
      <img
        src={getEventImage(event as any)}
        alt=""
        className="w-16 h-16 rounded-lg object-cover shrink-0 bg-muted"
        referrerPolicy="no-referrer"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </p>
          <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />
            {formatEventDate(event.date)}
          </span>
          {event.location?.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              {event.location.city}
            </span>
          )}
          {typeof event.distance === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Navigation size={11} />
              {event.distance < 1 ? '<1' : Math.round(event.distance)} km
            </span>
          )}
        </div>
        {catLabel && (
          <span className="mt-1.5 inline-block rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium">
            {catLabel}
          </span>
        )}
      </div>
    </Link>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, name, done, events }) => {
  if (role === 'function') {
    const labels = name ? FUNCTION_LABELS[name] : undefined;
    const displayText = done
      ? (labels?.done || 'Listo')
      : (labels?.busy || `${name}...`);

    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-center">
          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-1.5">
            {done ? (
              <span className="w-3 h-3 flex items-center justify-center text-primary text-[10px] font-bold">&#10003;</span>
            ) : (
              <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
            )}
            {displayText}
          </div>
        </div>
        {events && events.length > 0 && (
          <div className="flex flex-col gap-2">
            {events.map(ev => (
              <EventSuggestionCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-card-foreground rounded-bl-md'
        }`}
      >
        {content}
      </div>
    </div>
  );
};
