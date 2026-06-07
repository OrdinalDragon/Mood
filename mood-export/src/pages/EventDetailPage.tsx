import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { getEvent } from '../lib/api';
import { categoryLabels, sampleEvents } from '../lib/sampleEvents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Share2, 
  Heart,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper para parsear fecha de cualquier formato
const parseEventDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date.toDate && typeof date.toDate === 'function') return date.toDate();
  if (date.seconds && date.nanoseconds) return new Date(date.seconds * 1000);
  if (typeof date === 'string') return new Date(date);
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    console.log('=== EventDetailPage mounted ===');
    console.log('Looking for event id:', id);
    
    // Safety check
    if (!sampleEvents || !Array.isArray(sampleEvents)) {
      console.error('sampleEvents is not available or not an array!');
    } else {
      console.log('Available sample events:', sampleEvents.map(e => e.id).join(', '));
    }
    
    // Buscar en sampleEvents (comparación robusta como strings)
    const searchId = String(id).trim();
    console.log('Search ID:', searchId, 'length:', searchId.length);
    
    let sampleEvent = null;
    try {
      if (sampleEvents && Array.isArray(sampleEvents)) {
        for (const e of sampleEvents) {
          const eventId = String(e.id || '').trim();
          console.log('Testing:', eventId, '===', searchId, '?', eventId === searchId);
          if (eventId === searchId) {
            sampleEvent = e;
            console.log('MATCH FOUND:', e.id);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error searching sampleEvents:', err);
    }
    
    if (sampleEvent) {
      console.log('FOUND in sampleEvents:', sampleEvent.title);
      setEvent(sampleEvent as Event);
      setLoading(false);
      return;
    }
    
    console.log('Not found in sampleEvents, checking user events...');
    // Buscar en eventos criados por el usuario
    const userEventsRaw = localStorage.getItem('user_created_events');
    if (userEventsRaw) {
      try {
        const userEvents = JSON.parse(userEventsRaw);
        const userEvent = userEvents.find((e: any) => e.id === id);
        if (userEvent) {
          console.log('FOUND in userEvents:', userEvent.title);
          setEvent(userEvent as Event);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing userEvents:', e);
      }
    }
    
    // Buscar en el backend
    getEvent(id)
      .then(apiEvent => {
        console.log('FOUND in backend:', apiEvent.title);
        setEvent(apiEvent);
        setLoading(false);
      })
      .catch(err => {
        console.error('Event not found in backend:', err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (id) {
      const stored = localStorage.getItem(`event_attendees_${id}`);
      const attendeesList = stored ? JSON.parse(stored) : [];
      setAttendeeCount(attendeesList.length);
      
      const currentUser = localStorage.getItem('user_uid');
      if (currentUser && attendeesList.includes(currentUser)) {
        setAttending(true);
      }
    }
  }, [id]);

  const handleAttend = () => {
    if (!id) return;
    
    const stored = localStorage.getItem(`event_attendees_${id}`);
    let attendeesList = stored ? JSON.parse(stored) : [];
    const currentUser = localStorage.getItem('user_uid') || 'anonymous';
    
    if (attending) {
      attendeesList = attendeesList.filter((u: string) => u !== currentUser);
      setAttending(false);
    } else {
      attendeesList.push(currentUser);
      setAttending(true);
    }
    
    localStorage.setItem(`event_attendees_${id}`, JSON.stringify(attendeesList));
    setAttendeeCount(attendeesList.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!event) {
    console.log('Event not found! Showing error. ID was:', id);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Evento no encontrado</h1>
        <p className="text-slate-500">ID: {id}</p>
        <Link to="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Enlace copiado al portapapeles');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      cultural: 'bg-purple-500',
      adventure: 'bg-green-500',
      relax: 'bg-blue-500',
      nocturno: 'bg-pink-500',
      grupal: 'bg-orange-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
        <Link 
          to="/" 
          className="absolute top-4 left-4 z-10 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="container mx-auto">
            <Badge className={`${getCategoryColor(event.category)} text-white border-0 mb-3`}>
              {categoryLabels[event.category] || event.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {format(parseEventDate(event.date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {format(parseEventDate(event.date), 'HH:mm')} hs
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Sobre este evento</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Ubicación</h2>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{event.location.address}</p>
                    <p className="text-sm text-slate-500">
                      {event.location.city}, {event.location.province}
                    </p>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.location.lat},${event.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      <Navigation size={14} />
                      Cómo llegar
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Organizado por</p>
                    <p className="font-medium text-slate-900">{event.author_name}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Button 
                    className={`w-full ${attending ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                    onClick={handleAttend}
                  >
                    {attending ? '✓ Asistirás' : 'Confirmar asistencia'}
                    {attendeeCount > 0 && (
                      <span className="ml-2 text-sm opacity-80">
                        ({attendeeCount} {attendeeCount === 1 ? 'persona' : 'personas'})
                      </span>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleShare}
                    >
                      <Share2 size={16} className="mr-1" />
                      Compartir
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Heart size={16} className="mr-1" />
                      Guardar
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha</span>
                    <span className="font-medium text-slate-900">
                      {format(parseEventDate(event.date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hora</span>
                    <span className="font-medium text-slate-900">
                      {format(new Date(event.date), 'HH:mm')} hs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Categoría</span>
                    <span className="font-medium text-slate-900 capitalize">
                      {categoryLabels[event.category] || event.category}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
