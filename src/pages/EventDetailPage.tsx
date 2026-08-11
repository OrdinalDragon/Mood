import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { getEvent, updateEvent, uploadImage, addFavorite, removeFavorite, getUserRating } from '../lib/api';
import { EventReviews } from '../components/EventReviews';
import { StarRatingDisplay } from '../components/StarRating';
import { UserRating } from '../types';
import { categoryLabels, sampleEvents } from '../lib/sampleEvents';
import { useAuth } from '../hooks/useAuth';
import { toLocalDatetimeString } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Share2, 
  Heart,
  Navigation,
  Pencil,
  Upload,
  X,
  ImagePlus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// Helper para parsear fecha de cualquier formato
const parseEventDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date.toDate && typeof date.toDate === 'function') return date.toDate();
  if (date.seconds && date.nanoseconds) return new Date(date.seconds * 1000);
  if (typeof date === 'string') {
    const s = date.replace(/Z$/i, '').replace(/\.\d{3}Z?$/i, '');
    return new Date(s);
  }
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
const [editOpen, setEditOpen] = useState(false);
const [editForm, setEditForm] = useState<Partial<Event>>({});
const [galleryOpen, setGalleryOpen] = useState(false);
const [selectedImage, setSelectedImage] = useState('');
const [organizerRating, setOrganizerRating] = useState<UserRating | null>(null);

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
    if (id && user) {
      setIsFavorite((user.favorites || []).includes(id));
    }
  }, [id, user]);

  useEffect(() => {
    if (event?.created_by) {
      getUserRating(event.created_by)
        .then(setOrganizerRating)
        .catch(() => setOrganizerRating(null));
    }
  }, [event?.created_by]);

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

  const handleFavorite = async () => {
    if (!id) return;
    if (!user) {
      toast.error('Por favor, registrate o inicia sesión para guardar este evento en favoritos');
      return;
    }
    try {
      if (isFavorite) {
        await removeFavorite(id);
        setIsFavorite(false);
      } else {
        await addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    console.log('Event not found! Showing error. ID was:', id);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Evento no encontrado</h1>
        <p className="text-slate-500 dark:text-slate-400">ID: {id}</p>
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
    return 'bg-primary';
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className={`relative h-64 md:h-80 ${event.cover_image ? '' : 'bg-gradient-to-br from-primary via-accent to-primary/60'}`}>
        {event.cover_image && (
          <img src={event.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <Link 
          to="/" 
          className="absolute top-4 left-4 z-10 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </Link>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="container mx-auto">
            <Badge className={`${getCategoryColor(event.category)} text-primary-foreground border-0 mb-3`}>
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
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Sobre este evento</h2>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Ubicación</h2>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-primary/15 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{event.location.address}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {event.location.city}, {event.location.province}
                    </p>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.location.lat},${event.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      <Navigation size={14} />
                      Cómo llegar
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Galería</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(event.images || []).length > 0 ? (
                    (event.images as string[]).map((url, i) => (
                      <div key={i} className="relative group cursor-pointer" onClick={() => {
                        setSelectedImage(url);
                        setGalleryOpen(true);
                      }}>
                        <img src={url} alt={`Galería ${i+1}`} className="w-full h-32 object-cover rounded-lg border" />
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm col-span-full">Sin imágenes</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <EventReviews eventId={event.id} canReply={!!user && (user.uid === event.created_by || isAdmin)} />
          </div>

          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Organizado por</p>
                    <p className="font-medium text-slate-900 dark:text-white">{event.author_name}</p>
                    {organizerRating && organizerRating.rating_count > 0 && organizerRating.avg_rating != null && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <StarRatingDisplay value={organizerRating.avg_rating} size={13} />
                        <span className="text-xs text-muted-foreground">
                          {organizerRating.avg_rating.toFixed(1).replace('.', ',')} · {organizerRating.rating_count} {organizerRating.rating_count === 1 ? 'valoración' : 'valoraciones'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Button 
                    className={`w-full ${attending ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`}
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
                    <Button variant="outline" className="flex-1" onClick={handleFavorite}>
                      <Heart size={16} className={`mr-1 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
                      {isFavorite ? 'Guardado' : 'Guardar'}
                    </Button>
                  </div>
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setEditForm({
                          title: event.title,
                          description: event.description,
                          date: event.date,
                          end_date: event.end_date,
                          category: Array.isArray(event.category) ? event.category[0] : event.category,
                          moods: event.moods,
                          is_free: event.is_free,
                          is_outdoor: event.is_outdoor,
                          cover_image: event.cover_image || '',
                          images: event.images || [],
                          image_url: event.image_url || '',
                          location: event.location,
                        });
                        setEditOpen(true);
                      }}
                    >
                      <Pencil size={16} className="mr-1" />
                      Editar evento
                    </Button>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Fecha</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {(() => { const d = parseEventDate(event.date); return d ? format(d, 'dd/MM/yyyy') : '—'; })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Hora</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {(() => { const d = parseEventDate(event.date); const ed = parseEventDate(event.end_date); return d ? `${format(d, 'HH:mm')} hs${ed ? ` a ${format(ed, 'HH:mm')} hs` : ''}` : '—'; })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Categoría</span>
                    <span className="font-medium text-slate-900 dark:text-white capitalize">
                      {categoryLabels[event.category] || event.category}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit dialog for admins */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="datetime-local" value={toLocalDatetimeString(editForm.date)} onChange={e => setEditForm(p => ({ ...p, date: e.target.value || null }))} />
            </div>
            <div>
              <Label>Fin (opcional)</Label>
              <Input type="datetime-local" value={toLocalDatetimeString(editForm.end_date)} onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value || null }))} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={Array.isArray(editForm.category) ? editForm.category[0] : editForm.category || 'cultural'} onValueChange={v => setEditForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="adventure">Aventura</SelectItem>
                  <SelectItem value="relax">Relajación</SelectItem>
                  <SelectItem value="nightlife">Vida Nocturna</SelectItem>
                  <SelectItem value="group">Grupal</SelectItem>
                  <SelectItem value="solo">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Moods */}
            <div>
              <Label>Estados de ánimo</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['alegre','triste','enojado','tranquilo','reservado'].map(mId => {
                  const labels: Record<string,string> = { alegre:'😊 Alegre', triste:'😢 Triste', enojado:'😠 Enojado', tranquilo:'😌 Tranquilo', reservado:'😐 Reservado' };
                  const selected = ((editForm.moods as string[]) || []).includes(mId);
                  return (
                    <button key={mId} type="button" onClick={() => setEditForm(p => {
                      const cur = (p.moods as string[]) || [];
                      return { ...p, moods: cur.includes(mId) ? cur.filter(m => m !== mId) : [...cur, mId] };
                    })} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary'}`}>{labels[mId]}</button>
                  );
                })}
              </div>
            </div>
            {/* Location */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-2 block">Ubicación</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Dirección</Label>
                  <Input value={(editForm.location as any)?.address || ''} onChange={e => setEditForm(p => ({ ...p, location: { ...(p.location as any || {}), address: e.target.value } }))} />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input value={(editForm.location as any)?.city || ''} onChange={e => setEditForm(p => ({ ...p, location: { ...(p.location as any || {}), city: e.target.value } }))} />
                </div>
                <div>
                  <Label>Provincia</Label>
                  <Input value={(editForm.location as any)?.province || ''} onChange={e => setEditForm(p => ({ ...p, location: { ...(p.location as any || {}), province: e.target.value } }))} />
                </div>
                <div>
                  <Label>Latitud</Label>
                  <Input type="number" step="any" value={(editForm.location as any)?.lat ?? ''} onChange={e => setEditForm(p => ({ ...p, location: { ...(p.location as any || {}), lat: parseFloat(e.target.value) || 0 } }))} />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input type="number" step="any" value={(editForm.location as any)?.lng ?? ''} onChange={e => setEditForm(p => ({ ...p, location: { ...(p.location as any || {}), lng: parseFloat(e.target.value) || 0 } }))} />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={async () => {
                const loc = editForm.location as any;
                if (!loc?.address && !loc?.city) return;
                const q = [loc.address, loc.city, loc.province].filter(Boolean).join(', ') + ', Argentina';
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ar`);
                  const data = await res.json();
                  if (data.length > 0) {
                    setEditForm(p => ({ ...p, location: { ...(p.location as any || {}), lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } }));
                    toast.success('Coordenadas actualizadas');
                  } else {
                    toast.error('No se encontró la dirección');
                  }
                } catch { toast.error('Error al geocodificar'); }
              }}>
                <MapPin size={14} className="mr-1" /> Buscar coordenadas
              </Button>
            </div>

            {/* Cover image */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-2 block">Imagen de portada</Label>
              {(editForm.cover_image as string) ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                  <img src={editForm.cover_image as string} alt="Portada" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setEditForm(p => ({ ...p, cover_image: '' }))} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/5 transition">
                  <Upload size={28} className="text-slate-400 mb-1" />
                  <span className="text-xs text-slate-500">Click para subir portada</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await uploadImage(file);
                      setEditForm(p => ({ ...p, cover_image: result.url }));
                      toast.success('Imagen subida');
                    } catch { toast.error('Error al subir'); }
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>

            {/* Gallery images */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Galería de imágenes</Label>
              <div className="grid grid-cols-3 gap-2">
                {((editForm.images as string[]) || []).map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Galería ${i+1}`} className="w-full h-20 object-cover rounded border" />
                    <button type="button" onClick={() => setEditForm(p => ({ ...p, images: ((p.images as string[]) || []).filter((_, j) => j !== i) }))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black transition">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/5 transition">
                  <ImagePlus size={20} className="text-slate-400" />
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async e => {
                    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
                    for (const file of files) {
                      try {
                        const result = await uploadImage(file);
                        setEditForm(p => ({ ...p, images: [...((p.images as string[]) || []), result.url] }));
                      } catch { toast.error('Error al subir'); }
                    }
                    e.target.value = '';
                  }} />
                </label>
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Miniatura (se ve en cards)</Label>
              {(editForm.image_url as string) ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                  <img src={editForm.image_url as string} alt="Miniatura" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setEditForm(p => ({ ...p, image_url: '' }))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black transition">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-lg cursor-pointer border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/5 transition">
                  <Upload size={20} className="text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500">Subir</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await uploadImage(file);
                      setEditForm(p => ({ ...p, image_url: result.url }));
                      toast.success('Miniatura subida');
                    } catch { toast.error('Error al subir'); }
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>

            <div>
              <Label>Gratuito</Label>
              <Select value={editForm.is_free ? 'true' : 'false'} onValueChange={v => setEditForm(p => ({ ...p, is_free: v === 'true' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Al aire libre</Label>
              <Select value={editForm.is_outdoor ? 'true' : 'false'} onValueChange={v => setEditForm(p => ({ ...p, is_outdoor: v === 'true' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={async () => {
                if (!event) return;
                try {
                  const updated = await updateEvent(event.id, editForm);
                  setEvent(updated);
                  toast.success("Evento actualizado");
                  setEditOpen(false);
                } catch { toast.error("Error al actualizar"); }
              }} className="bg-primary text-primary-foreground">Guardar Cambios</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery image viewer */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Imagen</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img src={selectedImage} alt="Galería" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
