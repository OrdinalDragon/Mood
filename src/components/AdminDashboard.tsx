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
import { getPendingEvents, approveEvent, rejectEvent, deleteEvent, updateEvent, uploadImage, getUsers, updateUserRole } from '../lib/api';

// Tipos
import { Event, UserAdmin } from '../types';

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
import { Check, X, Trash2, ExternalLink, Pencil, MapPin, Upload, ImagePlus, Users, Calendar } from 'lucide-react';

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
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderador',
  user: 'Usuario',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  moderator: 'bg-blue-100 text-blue-700 border-blue-200',
  user: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const AdminDashboard: React.FC = () => {
  // ---- ESTADOS ----
  const [tab, setTab] = useState<'events' | 'users'>('events');

  // Eventos
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editForm, setEditForm] = useState<Partial<Event>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  // Usuarios
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

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

  // ---- CARGAR USUARIOS ----
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab]);


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


  // ---- HANDLER CAMBIAR ROL ----
  const handleRoleChange = async (uid: string, newRole: string) => {
    setUpdatingUid(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole as any } : u));
      toast.success(`Rol actualizado a ${ROLE_LABELS[newRole] || newRole}`);
    } catch (error) {
      toast.error('Error al actualizar rol');
    } finally {
      setUpdatingUid(null);
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
            Gestioná eventos y usuarios de la plataforma.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            tab === 'events'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={16} />
          Eventos pendientes
          {pendingEvents.length > 0 && (
            <Badge className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0">{pendingEvents.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            tab === 'users'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Users size={16} />
          Usuarios
          {users.length > 0 && (
            <Badge className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0">{users.length}</Badge>
          )}
        </button>
      </div>

      {/* ---- TAB: EVENTOS ---- */}
      {tab === 'events' && (
        <>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      
      ) : pendingEvents.length === 0 ? (
        <Card className="text-center py-20 bg-slate-50 border-dashed">
          <CardContent>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              No hay eventos pendientes de revisión.
            </p>
          </CardContent>
        </Card>
      
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingEvents.map((event) => (
            <Card 
              key={event.id} 
              className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row">
                
                <div className="w-full md:w-64 h-48 md:h-auto bg-slate-100">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                  ) : event.cover_image ? (
                    <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <img 
                      src={`https://picsum.photos/seed/${Array.isArray(event.category) ? event.category[0] : event.category}/400/300`}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className="mb-2 bg-primary/15 text-primary hover:bg-primary/15">
                        {Array.isArray(event.category) ? event.category.join(', ') : event.category}
                      </Badge>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {event.title}
                      </h3>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(event.date), "PPP", { locale: es })}
                    </div>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  
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

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => openEditDialog(event)}
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 flex-1 md:flex-none"
                    >
                      <Pencil size={18} className="mr-2" /> 
                      Editar
                    </Button>
                    <Button 
                      onClick={() => handleApprove(event.id)}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                    >
                      <Check size={18} className="mr-2" /> 
                      Aprobar
                    </Button>
                    <Button 
                      onClick={() => handleReject(event.id)}
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50 flex-1 md:flex-none"
                    >
                      <X size={18} className="mr-2" /> 
                      Rechazar
                    </Button>
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
        </>
      )}

      {/* ---- TAB: USUARIOS ---- */}
      {tab === 'users' && (
        <>
        {usersLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Rol</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Registro</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Verificado</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Auth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.uid} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-900 dark:text-white">{user.email}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.display_name || '—'}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={user.role}
                            onValueChange={(v) => handleRoleChange(user.uid, v)}
                            disabled={updatingUid === user.uid}
                          >
                            <SelectTrigger className={`w-36 h-8 text-xs font-medium border rounded-full ${ROLE_COLORS[user.role] || ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderador</SelectItem>
                              <SelectItem value="user">Usuario</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {user.created_at ? format(new Date(user.created_at), 'P', { locale: es }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.email_verified === '1' ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Sí</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">No</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs capitalize">{user.auth_provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        </>
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
                <Button onClick={handleSaveEdit} className="bg-primary text-primary-foreground">
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