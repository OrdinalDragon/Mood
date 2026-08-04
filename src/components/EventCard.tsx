/**
 * ============================================================
 * src/components/EventCard.tsx - Tarjeta de Evento
 * ============================================================
 * Componente para mostrar un evento en una card.
 * 링크 a la página de detalle.
 */

// React
import React from 'react';

// React Router
import { Link } from 'react-router-dom';

// Tipos
import { Event } from '../types';

// Componentes UI
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Iconos
import { Calendar, MapPin, Heart } from 'lucide-react';

// date-fns para fechas
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Mapeo de categorías
import { categoryLabels } from '@/lib/sampleEvents';

// Auth & API
import { useAuth } from '../hooks/useAuth';
import { addFavorite, removeFavorite } from '../lib/api';

// Utilidades
import { getEventImage, parseEventDate } from '../lib/utils';

// Toasts
import { toast } from 'sonner';


// ============================================================
// INTERFAZ PROPS
// ============================================================

/**
 * EventCardProps - Props del componente
 */
interface EventCardProps {
  event: Event;  // Evento a mostrar
}


// ============================================================
// COMPONENTE: EventCard
// ============================================================

/**
 * EventCard - Card pequeña de evento
 * Muestra imagen, título, fecha y ciudad
 */
export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = React.useState(user?.favorites?.includes(event.id) || false);

  React.useEffect(() => {
    setIsFavorite(user?.favorites?.includes(event.id) || false);
  }, [user, event.id]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Por favor, registrate o inicia sesión para guardar este evento en favoritos');
      return;
    }
    try {
      if (isFavorite) {
        await removeFavorite(event.id);
        setIsFavorite(false);
      } else {
        await addFavorite(event.id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  /**
   * getCategoryColor - Obtiene color según categoría
   * @param category - Categoría del evento
   * @return Clases Tailwind
   */
const getCategoryLabel = (cat: string): string => {
  const labels: Record<string, string> = {
    cultural: 'Cultural',
    adventure: 'Aventura',
    relax: 'Relax',
    nightlife: 'Nocturno',
    group: 'Grupal',
    solo: 'Solo',
    individual: 'Individual',
  };
  return labels[cat] || cat;
};

const getCategoryColor = (cat: string): string => {
  return 'bg-primary';
};

  // Render
  return (
    // Link a la página de detalle
    <Link to={`/event/${event.id}`}>
      <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
        {/* Imagen del evento */}
        <div className="h-40 bg-muted relative overflow-hidden">
          <img
            src={getEventImage(event)}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          {/* Badges de categorías */}
          <div className="absolute top-3 left-3 flex gap-1 flex-wrap max-w-[80%]">
            {(Array.isArray(event.category) ? event.category : [event.category]).map((cat, idx) => (
              <Badge key={idx} className={`${getCategoryColor(cat)} border-0 text-xs`}>
                {getCategoryLabel(cat)}
              </Badge>
            ))}
          </div>
          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className="absolute top-3 right-3 z-10 p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all"
            title={user ? undefined : 'Iniciá sesión para guardar en favoritos'}
          >
            <Heart
              size={16}
              className={user && isFavorite ? 'text-red-500 fill-red-500' : 'text-slate-500'}
            />
          </button>
        </div>
        
        {/* Contenido textual */}
        <CardContent className="p-4">
          {/* Título */}
          <h3 className="font-bold text-card-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          
          {/* Fecha */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Calendar size={12} />
            {(() => {
              const d = parseEventDate(event.date);
              if (!d) return 'Fecha no disponible';
              return isNaN(d.getTime()) ? 'Fecha no disponible' : format(d, "EEEE d 'de' MMM", { locale: es });
            })()}
          </div>
          
          {/* Ciudad */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} />
            {event.location.city}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
