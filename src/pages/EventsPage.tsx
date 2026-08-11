/**
 * ============================================================
 * src/pages/EventsPage.tsx - Página de Eventos
 * ============================================================
 * Muestra el buscador (Hero) y debajo todos los eventos aprobados.
 */

import { useEffect, useState } from 'react';
import { Hero } from '@/components/Hero';
import { LayoutWithAds } from '@/components/LayoutWithAds';
import { EventCard } from '@/components/EventCard';
import { getEvents } from '@/lib/api';
import { sampleEvents } from '@/lib/sampleEvents';
import { Event } from '@/types';

function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const dbEvents = await getEvents('approved');
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
        setEvents([...dbEvents, ...sampleEventsMapped]);
      } catch (error) {
        console.error('Error fetching events:', error);
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
        setEvents(sampleEventsMapped);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Hero />

      <LayoutWithAds>
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Todos los eventos
            </h2>
            <p className="text-slate-500">
              Explorá las propuestas disponibles en todo el país
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              No hay eventos disponibles por ahora.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </LayoutWithAds>
    </div>
  );
}

export default EventsPage;
