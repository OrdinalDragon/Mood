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
import { createEvent } from '../lib/api';

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
import { CalendarIcon, MapPin, Loader2, CheckCircle2 } from 'lucide-react';

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
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');


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
      // ---- GUARDAR EN BACKEND ----
      const newEvent = await createEvent({
        title,
        description,
        date: date.toISOString(),
        location: {
          address,
          city,
          province,
          // Coords aleatorias cerca de Buenos Aires
          lat: -34.6037 + (Math.random() - 0.5) * 0.1,
          lng: -58.3816 + (Math.random() - 0.5) * 0.1,
        },
        category,
        image_url: imageUrl || undefined,
      });
      
      // Guardar en localStorage para mostrar en Home
      const userEvents = localStorage.getItem('user_created_events');
      const eventsList = userEvents ? JSON.parse(userEvents) : [];
      eventsList.push({
        ...newEvent,
        date: { toDate: () => new Date(date) },
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
          className="mt-8 bg-orange-600 hover:bg-orange-700"
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

          {/* ---- FILA: CATEGORÍA + FECHA ---- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* ---- CAMPO: IMAGEN ---- */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL de Imagen (opcional)</Label>
            <Input 
              id="imageUrl" 
              placeholder="https://..." 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Pegá la URL de una imagen (ej: de Unsplash, Pexels, etc.)
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
            className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg font-bold"
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