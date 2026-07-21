import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { MOODS } from '@/lib/moods';

export const CategoriesPage = () => {
  const [groups, setGroups] = useState<{ id: string; emoji: string; label: string; events: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAndGroup = async () => {
      try {
        const res = await fetch('/api/events/?status_filter=approved');
        if (!res.ok) throw new Error('Error al cargar eventos');
        const events: any[] = await res.json();

        const moodMap: Record<string, any[]> = {};
        for (const mood of MOODS) {
          moodMap[mood.id] = [];
        }
        const moodAliases: Record<string, string> = { abrumado: 'tranquilo' };
        for (const event of events) {
          if (Array.isArray(event.moods)) {
            for (const mId of event.moods) {
              const resolved = moodAliases[mId] || mId;
              if (moodMap[resolved]) {
                moodMap[resolved].push(event);
              }
            }
          }
        }

        const result = MOODS
          .map(m => ({ id: m.id, emoji: m.emoji, label: m.label, events: moodMap[m.id] || [] }))
          .filter(g => g.events.length > 0);

        setGroups(result);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchAndGroup();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorías</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {groups.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">No hay eventos disponibles</p>
          </div>
        )}

        {groups.map(group => (
          <section key={group.id} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{group.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{group.label}</h2>
                  <p className="text-sm text-slate-500">{group.events.length} evento{group.events.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Link
                to={`/map?mood=${group.id}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Map size={14} />
                Ver todos en el mapa
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.events.slice(0, 8).map((event: any, idx: number) => (
                <EventCard key={event.id || idx} event={event} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};
