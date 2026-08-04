/**
 * ============================================================
 * src/components/EventForm.tsx - Formulario de Eventos
 * ============================================================
 * Formulario para crear nuevos eventos.
 * Usa el backend FastAPI para guardar.
 */

// ------------------------------------------------------------
// IMPORTACIONES
// ------------------------------------------------------------

// React
import React, { useState } from 'react';

// Autenticación
import { useAuth } from '../hooks/useAuth';

// API del backend
import { createEvent, uploadImage } from '../lib/api';

// Componentes UI de Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Componente calendario
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Librerías de fecha
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Iconos
import { CalendarIcon, MapPin, Loader2, CheckCircle2, Upload, X, ImagePlus } from 'lucide-react';

// Estados de ánimo
import { MOODS } from '../lib/moods';

// Utilidades
import { cn } from '../lib/utils';
import { toast } from 'sonner';


// ============================================================
// CONSTANTES
// ============================================================

/**
 * CATEGORIES - Opciones del dropdown
 * Coincide con EventCategory en backend
 */
const CATEGORIES = [
  { value: 'cultural', label: 'Cultural' },
  { value: 'adventure', label: 'Aventura' },
  { value: 'relax', label: 'Relax' },
  { value: 'nightlife', label: 'Diversión Nocturna' },
  { value: 'group', label: 'Grupal' },
  { value: 'solo', label: 'Solitario' },
];


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

/**
 * EventForm - Formulario para crear eventos
 * 
 * Usage:
 *   <EventForm />
 */
export const EventForm: React.FC = () => {
  // ---- ESTADOS DEL FORMULARIO ----
  const { user } = useAuth();                    // Usuario actual
  const [loading, setLoading] = useState(false);   // Cargando?
  const [submitted, setSubmitted] = useState(false); // Enviado?
  
  // Campos del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('14:00');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);


  // ---- HANDLE SUBMIT ----
  /**
   * handleSubmit - Envía el formulario
   * 
   * 1. Valida datos requeridos
   * 2. Crea evento en el backend
   * 3. Muestra Toast de éxito/error
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevenir refresh de página
    e.preventDefault();
    
    // Validar que estén los datos requeridos
    if (!user || !date || !category) return;

    setLoading(true);
    try {
      // Combinar fecha y hora en un solo datetime local
      const [hh, mm] = (time || '14:00').split(':').map(Number);
      const dateTime = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(),
        hh || 0, mm || 0
      );

      // Horario de finalización opcional
      let endDateTime: Date | undefined;
      if (endTime) {
        const [ehh, emm] = endTime.split(':').map(Number);
        endDateTime = new Date(
          date.getFullYear(), date.getMonth(), date.getDate(),
          ehh || 0, emm || 0
        );
        if (endDateTime <= dateTime) {
          setLoading(false);
          toast.error('La hora de finalización debe ser posterior al inicio');
          return;
        }
      }

      // ---- GUARDAR EN BACKEND ----
      const newEvent = await createEvent({
        title,
        description,
        date: dateTime.toISOString(),
        end_date: endDateTime ? endDateTime.toISOString() : null,
        location: {
          address,
          city,
          province,
          lat: -34.6037 + (Math.random() - 0.5) * 0.1,
          lng: -58.3816 + (Math.random() - 0.5) * 0.1,
        },
        category,
        moods: selectedMoods.length > 0 ? selectedMoods : undefined,
        cover_image: coverImageUrl || undefined,
        image_url: coverImageUrl || undefined,
        images: galleryUrls.length > 0 ? galleryUrls : undefined,
        is_free: isFree,
        is_outdoor: isOutdoor,
      });
      
      // Guardar en localStorage para mostrar en Home
      const userEvents = localStorage.getItem('user_created_events');
      const eventsList = userEvents ? JSON.parse(userEvents) : [];
      eventsList.push({
        ...newEvent,
        date: dateTime.toISOString(),
        status: 'pending'
      });
      localStorage.setItem('user_created_events', JSON.stringify(eventsList));
      localStorage.setItem('event_created', Date.now().toString());
      
      // Éxito
      setSubmitted(true);
      toast.success("Evento enviado para revisión");
      
    } catch (error) {
      console.error("Error submitting event:", error);
      toast.error("Error al enviar el evento");
    } finally {
      setLoading(false);
    }
  };


  // ---- RENDER: USUARIO NO AUTENTICADO ----
  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 text-center p-12">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-primary/15 rounded-full flex items-center justify-center">
            <MapPin className="text-primary" size={40} />
          </div>
        </div>
        <CardTitle className="text-3xl mb-4">Iniciá sesión para subir un evento</CardTitle>
        <CardDescription className="text-lg mb-8">
          Necesitás estar registrado para poder compartir eventos en el mapa.
        </CardDescription>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <a href="/">Volver al inicio</a>
        </Button>
      </Card>
    );
  }

  // ---- RENDER: ESTADO ENVIADO ----
  // Si ya se envió, mostrar pantalla de éxito
  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto mt-10 text-center p-12">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={40} />
          </div>
        </div>
        <CardTitle className="text-3xl mb-4">¡Evento Recibido!</CardTitle>
        <CardDescription className="text-lg">
          Tu evento ha sido enviado correctamente. Un administrador lo revisará pronto para que aparezca en el mapa.
        </CardDescription>
        <Button 
          onClick={() => setSubmitted(false)} 
          className="mt-8 bg-primary hover:bg-primary/90"
        >
          Subir otro evento
        </Button>
      </Card>
    );
  }


  // ---- RENDER: FORMULARIO ----
  return (
    // Card de Shadcn (estilos con Tailwind)
    <Card className="max-w-3xl mx-auto mt-10 shadow-xl border-slate-100">
      {/* HEADER */}
      <CardHeader className="bg-slate-50 border-b p-8">
        <CardTitle className="text-2xl font-bold text-slate-900">
          Compartí tu Evento
        </CardTitle>
        <CardDescription>
          Completá los detalles de tu actividad para que otros puedan descubrirla.
        </CardDescription>
      </CardHeader>
      
      {/* CONTENIDO */}
      <CardContent className="p-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ---- CAMPO: TÍTULO ---- */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del Evento</Label>
            <Input 
              id="title" 
              placeholder="Ej: Feria de Artesanos en la Plaza" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* ---- FILA: CATEGORÍA + FECHA + HORA ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Categoría */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem 
                      key={cat.value} 
                      value={cat.value}
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha - using Popover + Calendar */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"  // gris si vacío
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccioná una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Hora - using Input type="time" */}
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-slate-400">Horario de inicio del evento</p>
            </div>
          </div>

          {/* Hora de finalización (opcional) */}
          <div className="space-y-2">
            <Label>Hora de finalización (opcional)</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-slate-400">Dejalo vacío si no sabés cuándo termina</p>
          </div>

          {/* ---- CAMPO: DESCRIPCIÓN ---- */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea 
              id="description" 
              placeholder="Contanos de qué se trata el evento..." 
              className="min-h-[120px]"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* ---- ESTADOS DE ÁNIMO ---- */}
          <div className="space-y-2">
            <Label>¿Para qué estado de ánimo es este evento?</Label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(mood => {
                const isSelected = selectedMoods.includes(mood.id);
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => {
                      setSelectedMoods(prev =>
                        isSelected ? prev.filter(m => m !== mood.id) : [...prev, mood.id]
                      );
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    <span>{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- OPCIONES: GRATIS / AIRE LIBRE ---- */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-slate-700">Evento gratuito</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOutdoor}
                onChange={(e) => setIsOutdoor(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-slate-700">Al aire libre</span>
            </label>
          </div>

          {/* ---- IMAGEN DE PORTADA ---- */}
          <div className="space-y-3">
            <Label>Imagen de Portada (opcional)</Label>
            {coverImageUrl ? (
              <div className="relative">
                <img
                  src={coverImageUrl}
                  alt="Portada"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => { setCoverImageUrl(''); setCoverUploading(false); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition ${coverUploading ? 'border-primary/40 bg-primary/8' : 'border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/5'}`}>
                {coverUploading ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Subiendo...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Upload size={32} />
                    <span className="text-sm font-medium">Hacé clic para subir una portada</span>
                    <span className="text-xs">JPG, PNG, WebP — máx 5MB</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={coverUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCoverUploading(true);
                    try {
                      const result = await uploadImage(file);
                      setCoverImageUrl(result.url);
                    } catch {
                      toast.error('Error al subir la imagen');
                    } finally {
                      setCoverUploading(false);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {/* ---- GALERÍA DE IMÁGENES ---- */}
          <div className="space-y-3">
            <Label>Galería de imágenes (opcional)</Label>
            <div className="grid grid-cols-3 gap-2">
              {galleryUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Galería ${idx + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryUrls(prev => prev.filter((_, i) => i !== idx));
                      setGalleryFiles(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/5 transition">
                <ImagePlus size={24} className="text-slate-400" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    for (const file of files) {
                      try {
                        const result = await uploadImage(file);
                        setGalleryUrls(prev => [...prev, result.url]);
                        setGalleryFiles(prev => [...prev, file]);
                      } catch {
                        toast.error('Error al subir una imagen');
                      }
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Subí imágenes del evento para mostrar cómo es el lugar
            </p>
          </div>

          {/* ---- FILA: DIRECCIÓN ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input 
                id="province" 
                placeholder="Ej: Mendoza" 
                required 
                value={province} 
                onChange={(e) => setProvince(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input 
                id="city" 
                placeholder="Ej: San Rafael" 
                required 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input 
                id="address" 
                placeholder="Ej: Av. Mitre 123" 
                required 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>
          </div>

          {/* ---- BOTÓN SUBMIT ---- */}
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              "Publicar Evento"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};


// ============================================================
// ESTILOS CON TAILWIND
// ============================================================
// Algunos ejemplos de clases usadas:
//
// Layout:
// - max-w-3xl: ancho máximo de 56rem
// - mx-auto: centrar horizontalmente
// - mt-10: margin-top de 2.5rem
// - shadow-xl: sombra grande
// - border-slate-100: border gris claro
//
// Grid:
// - grid grid-cols-1: 1 columna en mobile
// - md:grid-cols-2: 2 columnas en medium+
// - gap-6: gap de 1.5rem
//
// Espaciado:
// - space-y-6: margin-top entre elementos
// - p-8: padding de 2rem
// - h-12: height de 3rem
//
// Colores:
// - bg-slate-50: fondo gris muy claro
// - text-slate-900: texto casi negro
// - bg-orange-600: naranja principal
// - hover:bg-orange-700: naranja más oscuro al pasar
//
// Estados:
// - disabled: opacity reducido
// - animate-spin: animación de giro


// ============================================================
// NOTA DE MIGRACIÓN AL BACKEND
// ============================================================
// Para usar el backend FastAPI:
//
// Cambiar handleSubmit:
//
// const handleSubmit = async (e) => {
//   e.preventDefault();
//   const token = localStorage.getItem('token');
//   
//   const res = await fetch('http://localhost:8000/events/', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${token}`
//     },
//     body: JSON.stringify({
//       title,
//       description,
//       date: date.toISOString(),
//       location: { address, city, province, lat, lng },
//       category,
//       is_recurring: false
//     })
//   });
//   
//   if (res.ok) {
//     setSubmitted(true);
//     toast.success("Evento enviado para revisión");
//   }
// };