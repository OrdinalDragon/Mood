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
import { getPendingEvents, approveEvent, rejectEvent, deleteEvent } from '../lib/api';

// Tipos
import { Event } from '../types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Iconos
import { Check, X, Trash2, ExternalLink } from 'lucide-react';

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


  // ---- RENDER ----
  return (
    <div className="container mx-auto py-10 px-4">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Panel de Administración
          </h1>
          <p className="text-slate-500">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      
      // ---- ESTADO: SIN EVENTOS ----
      ) : pendingEvents.length === 0 ? (
        <Card className="text-center py-20 bg-slate-50 border-dashed">
          <CardContent>
            <p className="text-slate-500 text-lg">
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
                      <Badge className="mb-2 bg-orange-100 text-orange-700 hover:bg-orange-100">
                        {Array.isArray(event.category) ? event.category.join(', ') : event.category}
                      </Badge>
                      <h3 className="text-xl font-bold text-slate-900">
                        {event.title}
                      </h3>
                    </div>
                    {/* Fecha */}
                    <div className="text-right text-sm text-slate-500">
                      {format(new Date(event.date), "PPP", { locale: es })}
                    </div>
                  </div>
                  
                  {/* Descripción (max 2 líneas) */}
                  <p className="text-slate-600 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-6">
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
                      className="text-slate-400 hover:text-red-600 ml-auto"
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