/**
 * ============================================================
 * src/components/AdminDashboard.tsx - Panel de Admin
 * ============================================================
 * Panel de administración para aprobar/rechazar eventos.
 * Solo visible para usuarios con role='admin'.
 */

// ------------------------------------------------------------
// IMPORTACIONES
// ------------------------------------------------------------

// React
import React, { useEffect, useState } from 'react';

// API
import { getPendingEvents, approveEvent, rejectEvent, deleteEvent, updateEvent, uploadImage } from '../lib/api';

// Tipos
import { Event } from '../types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Iconos
import { Check, X, Trash2, ExternalLink, Pencil, MapPin, Upload, ImagePlus } from 'lucide-react';

// Utils
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

/**
 * AdminDashboard - Panel de administración
 * 
 * Muestra eventos pendientes y permite:
 * - Aprobar → status = 'approved'
 * - Rechazar → status = 'rejected'
 * - Eliminar → borrar documento
 * 
 * Solo usuarios con isAdmin=true ven este componente
 */
export const AdminDashboard: React.FC = () => {
  // ---- ESTADOS ----
  // Lista de eventos pendientes
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  // Loading inicial
  const [loading, setLoading] = useState(true);
  // Modal de edición
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editForm, setEditForm] = useState<Partial<Event>>({});
  const [dialogOpen, setDialogOpen] = useState(false);


  // ---- EFFECT: CARGAR EVENTOS ----
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const events = await getPendingEvents();
        setPendingEvents(events);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);  // [] → solo una vez


  // ---- HANDLERS ----

  /**
   * handleApprove - Aprueba un evento
   * PATCH /events/{id}/approve en backend
   */
  const handleApprove = async (id: string) => {
    try {
      await approveEvent(id);
      setPendingEvents(prev => prev.filter(e => e.id !== id));
      toast.success("Evento aprobado");
    } catch (error) {
      toast.error("Error al aprobar");
    }
  };

  /**
   * handleReject - Rechaza un evento
   * PATCH /events/{id}/reject en backend
   */
  const handleReject = async (id: string) => {
    try {
      await rejectEvent(id);
      setPendingEvents(prev => prev.filter(e => e.id !== id));
      toast.success("Evento rechazado");
    } catch (error) {
      toast.error("Error al rechazar");
    }
  };

  /**
   * handleDelete - Elimina permanentemente
   */
  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este evento?")) {
      try {
        await deleteEvent(id);
        setPendingEvents(prev => prev.filter(e => e.id !== id));
        toast.success("Evento eliminado");
      } catch (error) {
        toast.error("Error al eliminar");
      }
    }
  };

  /**
   * openEditDialog - Abre el modal de edición con datos del evento
   */
  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description,
      date: event.date,
      category: Array.isArray(event.category) ? event.category[0] : event.category,
      moods: event.moods,
      is_free: event.is_free,
      is_outdoor: event.is_outdoor,
      cover_image: event.cover_image || '',
      images: event.images || [],
      image_url: event.image_url || '',
      location: event.location,
    });
    setDialogOpen(true);
  };

  /**
   * handleEditField - Actualiza un campo del formulario de edición
   */
  const handleEditField = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationField = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, location: { ...(prev.location as any || {}), [field]: value } }));
  };

  const toggleMood = (moodId: string) => {
    setEditForm(prev => {
      const current = (prev.moods as string[]) || [];
      const next = current.includes(moodId)
        ? current.filter(m => m !== moodId)
        : [...current, moodId];
      return { ...prev, moods: next };
    });
  };

  /**
   * handleSaveEdit - Guarda los cambios del evento
   */
  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    try {
      const updated = await updateEvent(editingEvent.id, editForm);
      setPendingEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      toast.success("Evento actualizado");
      setDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };


  // ---- RENDER ----
  return (
    <div className="container mx-auto py-10 px-4">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Panel de Administración
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Revisá y gestioná los eventos subidos por la comunidad.
          </p>
        </div>
        {/* Badge con contador */}
        <Badge variant="outline" className="text-lg py-1 px-4">
          {pendingEvents.length} Pendientes
        </Badge>
      </div>

      {/* ---- ESTADO: LOADING ---- */}
      {loading ? (
        <div className="flex justify-center py-20">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      
      // ---- ESTADO: SIN EVENTOS ----
      ) : pendingEvents.length === 0 ? (
        <Card className="text-center py-20 bg-slate-50 border-dashed">
          <CardContent>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              No hay eventos pendientes de revisión.
            </p>
          </CardContent>
        </Card>
      
      // ---- ESTADO: LISTA DE EVENTOS ----
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingEvents.map((event) => (
            <Card 
              key={event.id} 
              className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow"
            >
              {/* Layout: imagen + contenido */}
              <div className="flex flex-col md:flex-row">
                
                {/* IMAGEN */}
                <div className="w-full md:w-64 h-48 md:h-auto bg-slate-100">
                  <img 
                    src={`https://picsum.photos/seed/${Array.isArray(event.category) ? event.category[0] : event.category}/400/300`}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 p-6">
                  {/* Header del card */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/15">
                        {Array.isArray(event.category) ? event.category.join(', ') : event.category}
                      </Badge>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {event.title}
                      </h3>
                    </div>
                    {/* Fecha */}
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(event.date), "PPP", { locale: es })}
                    </div>
                  </div>
                  
                  {/* Descripción (max 2 líneas) */}
                  <p className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mb-6">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Ubicación:</span> 
                      {event.location.address}, {event.location.city}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Autor:</span> 
                      {event.author_name}
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div className="flex gap-3">
                    {/* Editar */}
                    <Button 
                      onClick={() => openEditDialog(event)}
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 flex-1 md:flex-none"
                    >
                      <Pencil size={18} className="mr-2" /> 
                      Editar
                    </Button>
                    {/* Aprobar */}
                    <Button 
                      onClick={() => handleApprove(event.id)}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                    >
                      <Check size={18} className="mr-2" /> 
                      Aprobar
                    </Button>
                    {/* Rechazar */}
                    <Button 
                      onClick={() => handleReject(event.id)}
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50 flex-1 md:flex-none"
                    >
                      <X size={18} className="mr-2" /> 
                      Rechazar
                    </Button>
                    {/* Eliminar */}
                    <Button 
                      onClick={() => handleDelete(event.id)}
                      variant="ghost" 
                      className="text-slate-400 dark:text-slate-500 hover:text-red-600 ml-auto"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input 
                  value={editForm.title || ''} 
                  onChange={e => handleEditField('title', e.target.value)}
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea 
                  value={editForm.description || ''} 
                  onChange={e => handleEditField('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input 
                  type="datetime-local"
                  value={editForm.date ? new Date(editForm.date as string).toISOString().slice(0, 16) : ''}
                  onChange={e => handleEditField('date', new Date(e.target.value).toISOString())}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select 
                  value={Array.isArray(editForm.category) ? editForm.category[0] : editForm.category || 'cultural'} 
                  onValueChange={v => handleEditField('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

              {/* Estados de ánimo */}
              <div>
                <Label>Estados de ánimo</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['alegre','triste','energetico','reservado','romantico','estresado'].map(mId => {
                    const labels: Record<string,string> = {
                      alegre: '😊 Alegre', triste: '😢 Triste', energetico: '⚡ Enérgico',
                      reservado: '😐 Reservado', romantico: '💕 Romántico', estresado: '😫 Estresado'
                    };
                    const selected = ((editForm.moods as string[]) || []).includes(mId);
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => toggleMood(mId)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary'
                        }`}
                      >
                        {labels[mId]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ubicación */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-2 block">Ubicación</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <Input 
                      value={(editForm.location as any)?.address || ''} 
                      onChange={e => handleLocationField('address', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Ciudad</Label>
                    <Input 
                      value={(editForm.location as any)?.city || ''} 
                      onChange={e => handleLocationField('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Provincia</Label>
                    <Input 
                      value={(editForm.location as any)?.province || ''} 
                      onChange={e => handleLocationField('province', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Latitud</Label>
                    <Input 
                      type="number" step="any"
                      value={(editForm.location as any)?.lat ?? ''} 
                      onChange={e => handleLocationField('lat', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Longitud</Label>
                    <Input 
                      type="number" step="any"
                      value={(editForm.location as any)?.lng ?? ''} 
                      onChange={e => handleLocationField('lng', parseFloat(e.target.value) || 0)}
                    />
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
                      handleLocationField('lat', parseFloat(data[0].lat));
                      handleLocationField('lng', parseFloat(data[0].lon));
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
                    <button type="button" onClick={() => handleEditField('cover_image', '')} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition">
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
                        handleEditField('cover_image', result.url);
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
                      <button type="button" onClick={() => handleEditField('images', ((editForm.images as string[]) || []).filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black transition">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/5 transition">
                    <ImagePlus size={20} className="text-slate-400" />
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" multiple onChange={async e => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        try {
                          const result = await uploadImage(file);
                          handleEditField('images', [...((editForm.images as string[]) || []), result.url]);
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
                  <button type="button" onClick={() => handleEditField('image_url', '')} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black transition">
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
                      handleEditField('image_url', result.url);
                      toast.success('Miniatura subida');
                    } catch { toast.error('Error al subir'); }
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>

            <div>
              <Label>Gratuito</Label>
                <Select 
                  value={editForm.is_free ? 'true' : 'false'} 
                  onValueChange={v => handleEditField('is_free', v === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Al aire libre</Label>
                <Select 
                  value={editForm.is_outdoor ? 'true' : 'false'} 
                  onValueChange={v => handleEditField('is_outdoor', v === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} className="bg-primary text-white">
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


// ============================================================
// RESUMEN: FLUJO DE ADMINISTRACIÓN
// ============================================================
// 1. AdminDashboard carga eventos con status='pending'
// 2. usuario admin ve la lista
// 3. Opciones:
//    a. Aprobar → Aparece en /map y /calendar
//    b. Rechazar → Queda marcado pero no visible
//    c. Eliminar → Se borra permanentemente
//
// En backend FastAPI:
//   GET /events/pending         → lista pendientes
//   PATCH /events/{id}/approve  → aprobar
//   PATCH /events/{id}/reject   → rechazar
//   DELETE /events/{id}          → eliminar