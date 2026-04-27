import React, { useState, useEffect } from 'react';
import { getEvents } from '../lib/api';
import { Event } from '../types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock } from 'lucide-react';
import { parseEventDate } from '@/lib/utils';

export const EventCalendar: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      const evs = await getEvents('approved');
      setEvents(evs);
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (date) {
      const filtered = events.filter(e => {
        const d = parseEventDate(e.date);
        return d && isSameDay(d, date);
      });
      setSelectedEvents(filtered);
    } else {
      setSelectedEvents([]);
    }
  }, [date, events]);

  // Days that have events
  const eventDays = events.map(e => parseEventDate(e.date)).filter((d): d is Date => d !== null);

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <Card className="shadow-xl border-slate-100">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Calendario de Eventos</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-0 pb-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border-0"
                locale={es}
                modifiers={{ hasEvent: eventDays }}
                modifiersStyles={{
                  hasEvent: { fontWeight: 'bold', color: '#ea580c', textDecoration: 'underline' }
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : "Seleccioná una fecha"}
            </h2>
            <p className="text-slate-500">
              {selectedEvents.length} eventos encontrados para este día.
            </p>
          </div>

          {selectedEvents.length === 0 ? (
            <Card className="bg-slate-50 border-dashed py-20 text-center">
              <CardContent>
                <p className="text-slate-400">No hay eventos programados para esta fecha.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {selectedEvents.map(event => (
                <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex">
                    <div className="w-32 h-32 bg-slate-100 flex-shrink-0">
                      <img 
                        src={`https://picsum.photos/seed/${Array.isArray(event.category) ? event.category[0] : event.category}/200/200`} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="mb-2 uppercase text-[10px] tracking-wider">
                          {Array.isArray(event.category) ? event.category.join(', ') : event.category}
                        </Badge>
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {(() => { const d = parseEventDate(event.date); return d ? format(d, "HH:mm") + ' hs' : ''; })()}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{event.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} /> {event.location.city}, {event.location.province}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
