import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { changePassword, getMyEvents, uploadImage } from '../lib/api';
import { Event } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Mail, Shield, User as UserIcon, Camera, KeyRound, Loader2, MapPin, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { categoryLabels } from '../lib/sampleEvents';
import { getEventImage, parseEventDate } from '../lib/utils';

const parseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date.toDate && typeof date.toDate === 'function') return date.toDate();
  if (date.seconds && date.nanoseconds) return new Date(date.seconds * 1000);
  if (typeof date === 'string') {
    const s = date.replace(/Z$/i, '').replace(/\.\d{3}Z?$/i, '');
    return new Date(s);
  }
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Aprobado', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
};

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Edit profile dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password dialog state
  const [passOpen, setPassOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.display_name || '');
      setEditPhoto(user.photo_url || '');
    }
  }, [user]);

  useEffect(() => {
    const loadMyEvents = async () => {
      try {
        const events = await getMyEvents();
        setMyEvents(events);
      } catch (err) {
        console.error('Error loading my events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadMyEvents();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <UserIcon className="w-16 h-16 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Iniciá sesión para ver tu perfil</h1>
        <Link to="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ display_name: editName, photo_url: editPhoto });
      toast.success('Perfil actualizado');
      setEditOpen(false);
    } catch (err) {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPass.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSavingPass(true);
    try {
      await changePassword(currentPass, newPass);
      toast.success('Contraseña actualizada');
      setPassOpen(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      toast.error(err?.message || 'Error al cambiar la contraseña');
    } finally {
      setSavingPass(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const result = await uploadImage(file);
      setEditPhoto(result.url);
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const roleLabel = user.role === 'admin' ? 'Administrador' : user.role === 'moderator' ? 'Moderador' : 'Usuario';
  const joinedAt = parseDate(user.created_at);

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        {/* Header card */}
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-primary to-accent" />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={user.photo_url || ''} />
                <AvatarFallback className="text-2xl bg-primary/15 text-primary">
                  {user.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pt-4 sm:pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {user.display_name || 'Usuario'}
                  </h1>
                  <Badge className={user.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}>
                    {roleLabel}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} /> {user.email}
                  </span>
                  {joinedAt && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} /> Se unió el {format(joinedAt, "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  )}
                </div>
              </div>
              <Button className="bg-primary text-primary-foreground" onClick={() => setEditOpen(true)}>
                <Camera size={16} className="mr-1" /> Editar perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/15 rounded-lg">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground">Contraseña</h3>
                <p className="text-sm text-muted-foreground">Cambiá tu contraseña</p>
              </div>
              <Button variant="outline" onClick={() => setPassOpen(true)}>Cambiar</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/15 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-card-foreground">Favoritos</h3>
                <p className="text-sm text-muted-foreground">Tu lista de eventos guardados</p>
              </div>
              <Link to="/favorites">
                <Button variant="outline">Ver</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* My events */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Eventos Creados</CardTitle>
            <CardDescription>
              {myEvents.length} {myEvents.length === 1 ? 'evento' : 'eventos'} publicados por vos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : myEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-3">Todavía no creaste ningún evento</p>
                <Link to="/submit">
                  <Button variant="outline">Crear tu primer evento</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myEvents.map(event => {
                  const status = statusConfig[event.status] || statusConfig.pending;
                  const eventDate = parseDate(event.date);
                  return (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                      <div className="h-16 w-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img src={getEventImage(event)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/event/${event.id}`} className="font-semibold text-card-foreground hover:text-primary transition-colors line-clamp-1">
                          {event.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {eventDate ? format(eventDate, "d 'de' MMM", { locale: es }) : 'Fecha no disponible'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {event.location?.city || 'Sin ciudad'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {categoryLabels[event.category] || event.category}
                          </span>
                        </div>
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>Actualizá tu nombre y foto de perfil</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={editPhoto || ''} />
                <AvatarFallback className="text-xl bg-primary/15 text-primary">
                  {editName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Label>Foto de perfil</Label>
              <div className="flex gap-2 mt-2">
                <label className="flex-1 flex items-center justify-center h-10 border-2 border-dashed rounded-lg cursor-pointer border-slate-300 hover:border-primary/60 transition">
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Camera size={16} className="mr-1 text-slate-500" />
                      <span className="text-xs text-slate-500">Subir foto</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) await handlePhotoUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {editPhoto && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setEditPhoto('')}>
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="display_name">Nombre</Label>
              <Input
                id="display_name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>Ingresá tu contraseña actual y una nueva</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current_password">Contraseña actual</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repetí la nueva contraseña"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPassOpen(false)}>Cancelar</Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleChangePassword} disabled={savingPass}>
                {savingPass && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Cambiar contraseña
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
