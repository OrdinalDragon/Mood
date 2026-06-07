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
import { getPendingEvents, approveEvent, rejectEvent, deleteEvent, updateEvent } from '../lib/api';

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
import { Check, X, Trash2, ExternalLink, Pencil } from 'lucide-react';

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
      category: event.category,
      moods: event.moods,
      is_free: event.is_free,
      is_outdoor: event.is_outdoor,
      cover_image: event.cover_image || '',
    });
    setDialogOpen(true);
  };

  /**
   * handleEditField - Actualiza un campo del formulario de edición
   */
  const handleEditField = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
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