/**
 * ============================================================
 * src/components/EventMap.tsx - Mapa de Eventos
 * ============================================================
 * Mapa interactivo con Leaflet.
 * Muestra marcadores por cada evento.
 */

// React
import React, { useEffect, useState, useRef } from 'react';

// React Leaflet
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';

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
  autoMoveKey?: number;     // Cambiar este valor fuerza re-centro (ignora interacción manual)
  userLocation?: [number, number] | null; // Ubicación del usuario para marcador azul
}


// ============================================================
// COMPONENTE: ChangeView
// ============================================================

/**
 * ChangeView - Hook para cambiar centro/zoom automáticamente
 * Solo corre una vez al montar o cuando autoMoveKey cambia explícitamente.
 * Después de que el usuario mueve el mapa manualmente, no lo re-centra.
 */
const ChangeView = ({ center, zoom, events, autoMove = true, userLocation, autoMoveKey }: { center: [number, number], zoom: number, events: Event[], autoMove?: boolean, userLocation?: [number, number] | null, autoMoveKey?: number }) => {
  const map = useMap();
  const hasInteracted = useRef(false);
  const prevAutoMove = useRef(autoMove);

  useEffect(() => {
    const onMoveStart = () => { hasInteracted.current = true; };
    map.on('dragstart', onMoveStart);
    map.on('zoomstart', onMoveStart);
    return () => {
      map.off('dragstart', onMoveStart);
      map.off('zoomstart', onMoveStart);
    };
  }, [map]);

  useEffect(() => {
    // Cuando el usuario selecciona una provincia (autoMove pasa de false a true),
    // reseteamos hasInteracted para forzar el centrado
    if (autoMove && !prevAutoMove.current) {
      hasInteracted.current = false;
    }
    prevAutoMove.current = autoMove;

    if (hasInteracted.current && !autoMoveKey) return;

    if (userLocation) {
      map.setView(userLocation, 8);
      return;
    }

    if (autoMoveKey) {
      map.setView(center, zoom);
      return;
    }

    if (!autoMove) return;

    if (events && events.length > 0) {
      const lats = events.map(e => e.location?.lat).filter(Boolean);
      const lngs = events.map(e => e.location?.lng).filter(Boolean);

      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        const newZoom = lats.length < 20 ? 6 : 8;
        map.setView([avgLat, avgLng], newZoom);
        return;
      }
    }

    map.setView(center, zoom);
  }, [autoMoveKey, userLocation, autoMove, center, zoom, events]);

  return null;
};


// ============================================================
// COMPONENTE: MapInteractionController
// ============================================================

/**
 * MapInteractionController - Controla la interactividad del mapa
 * 
 * Desktop: Ctrl+drag para mover, Ctrl+scroll para zoom
 * Móvil: botón flotante para activar/desactivar modo mapa
 */
const MapInteractionController = ({ mapLocked, onLockChange }: { mapLocked: boolean; onLockChange?: (locked: boolean) => void }) => {
  const map = useMap();
  const ctrlRef = useRef(false);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const enableInteraction = () => {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    map.touchZoom.enable();
  };

  const disableInteraction = () => {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.touchZoom.disable();
  };

  useEffect(() => {
    disableInteraction();

    if (!isTouchDevice) {
      // Desktop: Ctrl key habilita temporalmente
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Control' || e.key === 'Meta') && !ctrlRef.current) {
          ctrlRef.current = true;
          enableInteraction();
        }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Control' || e.key === 'Meta') {
          ctrlRef.current = false;
          disableInteraction();
        }
      };
      const handleBlur = () => {
        if (ctrlRef.current) {
          ctrlRef.current = false;
          disableInteraction();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('blur', handleBlur);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [map, isTouchDevice]);

  // Móvil: reacciona a cambios en mapLocked
  useEffect(() => {
    if (isTouchDevice) {
      if (mapLocked) {
        enableInteraction();
      } else {
        disableInteraction();
      }
    }
  }, [mapLocked, isTouchDevice, map]);

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
  zoom = 8,
  interactive = true,
  autoMove = true,
  autoMoveKey,
  userLocation = null
}) => {
  // Hook de navegación
  const navigate = useNavigate();

  // Estado para modo mapa en móvil
  const [mapLocked, setMapLocked] = useState(false);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  /**
   * getCategoryColor - Obtiene color por categoría
   */
  const getCategoryColor = (category: string) => {
    return 'bg-primary';
  };

  // Render
  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 relative z-0">
      {/* Hint desktop */}
      {!isTouchDevice && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
          Mantené Ctrl para mover el mapa
        </div>
      )}

      {/* Botón toggle para móvil */}
      {isTouchDevice && (
        <button
          onClick={() => setMapLocked(prev => !prev)}
          className={`absolute top-3 right-3 z-[1000] px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors pointer-events-auto ${
            mapLocked
              ? 'bg-primary text-white'
              : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
          }`}
        >
          {mapLocked ? '✕ Salir del mapa' : '☰ Mover mapa'}
        </button>
      )}

      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        dragging={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={true}
        className="h-full w-full"
        style={{ minHeight: '100%', minWidth: '100%' }}
      >
        <MapInteractionController mapLocked={mapLocked} onLockChange={setMapLocked} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={10}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 3 }}
          >
            <Popup>Tu ubicación actual</Popup>
          </CircleMarker>
        )}
        <ChangeView center={center as [number, number]} zoom={zoom} events={events} autoMove={autoMove} userLocation={userLocation} autoMoveKey={autoMoveKey} />
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
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <Calendar size={12} />
                      {(() => { const d = parseEventDate(event.date); return d ? format(d, "d 'de' MMM", { locale: es }) : ''; })()}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <MapPin size={12} />
                      {event.location.city}
                    </div>
                    <button 
                      className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
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
