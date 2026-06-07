/**
 * ============================================================
 * src/components/EventMap.tsx - Mapa de Eventos
 * ============================================================
 * Mapa interactivo con Leaflet.
 * Muestra marcadores por cada evento.
 */

// React
import React, { useEffect, useState } from 'react';

// React Leaflet
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Estilos de Leaflet
import 'leaflet/dist/leaflet.css';

// Leaflet core
import L from 'leaflet';

// Tipos
import { Event } from '../types';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Iconos
import { Calendar, MapPin, Clock } from 'lucide-react';

// date-fns
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Router
import { useNavigate } from 'react-router-dom';

// Labels
import { categoryLabels } from '@/lib/sampleEvents';

// Utils
import { parseEventDate } from '@/lib/utils';


// ============================================================
// CONFIGURACIÓN DE LEAFLET
// ============================================================

// Corregir URLs de iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


// ============================================================
// FUNCIÓN: createCustomIcon
// ============================================================

/**
 * createCustomIcon - Crea icono personalizado por categoría
 * @param category - Categoría del evento (puede ser string o array)
 * @return Icono de Leaflet
 */
const createCustomIcon = (category: string | string[]) => {
  const cat = Array.isArray(category) ? category[0] : category;
  const catLabel = cat ? cat.charAt(0).toUpperCase() : '';
  // Mapear colores por categoría
  const colors: Record<string, string> = {
    cultural: '#9333ea',
    adventure: '#22c55e',
    relax: '#3b82f6',
    nightlife: '#ec4899',
    group: '#f97316',
    individual: '#14b8a6',
  };
  const color = colors[cat] || '#f97316';
  
  // Crear icono HTML personalizado
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
          font-weight: bold;
        ">${catLabel}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};


// ============================================================
// INTERFAZ PROPS
// ============================================================

/**
 * EventMapProps - Props del componente
 */
interface EventMapProps {
  events: Event[];                // Lista de eventos
  center?: [number, number];    // Centro del mapa [lat, lng]
  zoom?: number;               // Zoom inicial
  interactive?: boolean;      // Si permite interactuar
  autoMove?: boolean;       // Si mueve el mapa automáticamente al cambiarel filtro
}


// ============================================================
// COMPONENTE: ChangeView
// ============================================================

/**
 * ChangeView - Hook para cambiar centro/zoom automáticamente
 */
const ChangeView = ({ center, zoom, events, autoMove = true }: { center: [number, number], zoom: number, events: Event[], autoMove?: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!autoMove) return;
    
    if (events && events.length > 0) {
      // Calcular el centro de los eventos visibles
      const lats = events.map(e => e.location?.lat).filter(Boolean);
      const lngs = events.map(e => e.location?.lng).filter(Boolean);
      
      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        
        // Usar zoom 6 para provincia, 10 para ciudad
        const newZoom = lats.length < 20 ? 6 : 10;
        map.setView([avgLat, avgLng], newZoom);
        return;
      }
    }
    // Si no hay eventos, usar el centro por defecto
    map.setView(center, zoom);
  }, [events, center, zoom, map]);
  
  return null;
};


// ============================================================
// COMPONENTE: EventMap
// ============================================================

/**
 * EventMap - Mapa con marcadores de eventos
 * Usa OpenStreetMap como proveedor de teselas
 */
export const EventMap: React.FC<EventMapProps> = ({ 
  events, 
  // Default: Buenos Aires
  center = [-34.6037, -58.3816], 
  zoom = 12,
  interactive = true,
  autoMove = true 
}) => {
  // Hook de navegación
  const navigate = useNavigate();

  /**
   * getCategoryColor - Obtiene color por categoría
   */
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

  // Render
  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="h-full w-full"
        style={{ minHeight: '100%', minWidth: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center as [number, number]} zoom={zoom} events={events} autoMove={autoMove} />
        {events.map((event) => (
          <Marker 
            key={event.id} 
            position={[event.location.lat, event.location.lng]}
            icon={createCustomIcon(event.category)}
            eventHandlers={{
              click: () => {
                if (interactive) {
                  navigate(`/event/${event.id}`);
                }
              }
            }}
          >
            <Popup className="custom-popup">
              <Card className="border-0 shadow-none w-64 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/event/${event.id}`)}>
                <CardContent className="p-0">
                  <div className="h-32 bg-slate-100 rounded-t-lg overflow-hidden relative">
                    <img 
                      src={`https://picsum.photos/seed/${event.id}/400/200`} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <Badge className={`absolute top-2 right-2 ${getCategoryColor(event.category)} text-white border-0`}>
                      {categoryLabels[event.category] || event.category}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <Calendar size={12} />
                      {(() => { const d = parseEventDate(event.date); return d ? format(d, "d 'de' MMM", { locale: es }) : ''; })()}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                      <MapPin size={12} />
                      {event.location.city}
                    </div>
                    <button 
                      className="w-full py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        navigate(`/event/${event.id}`);
                      }}
                    >
                      Ver Detalles
                    </button>
                  </div>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
