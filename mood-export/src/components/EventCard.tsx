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
import { Calendar, MapPin } from 'lucide-react';

// date-fns para fechas
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Mapeo de categorías
import { categoryLabels } from '@/lib/sampleEvents';


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
  const colors: Record<string, string> = {
    cultural: 'bg-purple-500',
    adventure: 'bg-green-500',
    relax: 'bg-blue-400',
    nightlife: 'bg-indigo-600',
    group: 'bg-orange-500',
    solo: 'bg-pink-400',
    individual: 'bg-teal-500',
  };
  return colors[cat] || 'bg-gray-500';
};

  // Render
  return (
    // Link a la página de detalle
    <Link to={`/event/${event.id}`}>
      <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
        {/* Imagen del evento */}
        <div className="h-40 bg-slate-200 relative overflow-hidden">
          <img
            src={`https://picsum.photos/seed/${event.id}/400/300`}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          {/* Badges de categorías */}
          <div className="absolute top-3 left-3 flex gap-1 flex-wrap max-w-[80%]">
            {(Array.isArray(event.category) ? event.category : [event.category]).map((cat, idx) => (
              <Badge key={idx} className={`${getCategoryColor(cat)} text-white border-0 text-xs`}>
                {getCategoryLabel(cat)}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Contenido textual */}
        <CardContent className="p-4">
          {/* Título */}
          <h3 className="font-bold text-slate-900 line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
            {event.title}
          </h3>
          
          {/* Fecha */}
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <Calendar size={12} />
            {(() => {
              let d: Date;
              if (!event.date) {
                return 'Fecha no disponible';
              }
              if (event.date?.toDate) {
                d = event.date.toDate();
              } else if (typeof event.date === 'string') {
                d = new Date(event.date);
              } else if (event.date instanceof Date) {
                d = event.date;
              } else {
                return 'Fecha no disponible';
              }
              return isNaN(d.getTime()) ? 'Fecha no disponible' : format(d, "EEEE d 'de' MMM", { locale: es });
            })()}
          </div>
          
          {/* Ciudad */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} />
            {event.location.city}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
