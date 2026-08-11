/**
 * ============================================================
 * src/pages/EventsPage.tsx - Página de Eventos
 * ============================================================
 * Muestra el buscador (Hero) y debajo los eventos aprobados,
 * con pestañas para ver los eventos futuros y los concluidos.
 */

import { useEffect, useState } from 'react';
import { Hero } from '@/components/Hero';
import { LayoutWithAds } from '@/components/LayoutWithAds';
import { EventCard } from '@/components/EventCard';
import { getEvents } from '@/lib/api';
import { sampleEvents } from '@/lib/sampleEvents';
import { Event } from '@/types';

function EventsPage() {
  const [tab, setTab] = useState<'upcoming' | 'concluded'>('upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const mapSamples = () =>
        sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
      try {
        const dbEvents = await getEvents(tab === 'concluded' ? 'archived' : 'approved');
        if (tab === 'concluded') {
          setEvents(dbEvents);
        } else {
          setEvents([...dbEvents, ...mapSamples()]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents(tab === 'concluded' ? [] : mapSamples());
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [tab]);

  const pill = (active: boolean) =>
    `px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <Hero />

      <LayoutWithAds>
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {tab === 'concluded' ? 'Eventos concluidos' : 'Todos los eventos'}
              </h2>
              <p className="text-slate-500">
                {tab === 'concluded'
                  ? 'Reviví los eventos que ya pasaron'
                  : 'Explorá las propuestas disponibles en todo el país'}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setTab('upcoming')} className={pill(tab === 'upcoming')}>
                Próximos
              </button>
              <button onClick={() => setTab('concluded')} className={pill(tab === 'concluded')}>
                Eventos concluidos
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              {tab === 'concluded'
                ? 'Todavía no hay eventos concluidos.'
                : 'No hay eventos disponibles por ahora.'}
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
