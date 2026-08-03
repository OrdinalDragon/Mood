import React, { useEffect, useState } from 'react';
import { Event } from '../types';
import { getFavorites, removeFavorite } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FavoritesPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      const data = await getFavorites();
      setEvents(data);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (eventId: string) => {
    try {
      await removeFavorite(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Heart className="w-16 h-16 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Iniciá sesión para ver tus favoritos</h1>
        <Link to="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mis Favoritos</h1>
            <p className="text-slate-500 dark:text-slate-400">
              {events.length} {events.length === 1 ? 'evento guardado' : 'eventos guardados'}
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Heart className="w-16 h-16 text-slate-300" />
            <p className="text-lg text-slate-500 dark:text-slate-400">No tenés eventos favoritos todavía</p>
            <Link to="/map">
              <Button variant="outline">Explorar eventos</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map(event => (
              <div key={event.id} className="relative">
                <EventCard event={event} />
                <button
                  onClick={() => handleRemove(event.id)}
                  className="absolute top-3 right-3 z-10 p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Eliminar de favoritos"
                >
                  <Heart size={16} className="text-red-500 fill-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
