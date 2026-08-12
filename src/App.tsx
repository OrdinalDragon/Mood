/**
 * ============================================================
 * src/App.tsx - Componente Principal y Rutas
 * ============================================================
 * Define todas las páginas de la aplicación y el enrutamiento.
 * Uso: HashRouter para compatibilidad con GitHub Pages.
 */

// React Router para navegación
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { LocateFixed, MapPin, Calendar } from 'lucide-react';

// Google OAuth
import { GoogleOAuthProvider } from '@react-oauth/google';

// Context de autenticación
import { AuthProvider } from './hooks/useAuth';
import { MoodProvider } from './contexts/MoodContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Componentes de la interfaz
import { Navbar } from './components/Navbar';
import { EventMap } from './components/EventMap';
import { EventForm } from './components/EventForm';
import { AdminDashboard } from './components/AdminDashboard';
import { EventCalendar } from './components/EventCalendar';
import { EventDetailPage } from './pages/EventDetailPage';
import EventsPage from './pages/EventsPage';
import { GiveawaysPage } from './pages/GiveawaysPage';
import { TerminosYCondiciones } from './pages/TerminosYCondiciones';
import { VerifyEmail } from './pages/VerifyEmail';
import { ResetPassword } from './pages/ResetPassword';
import { ContactPage } from './pages/ContactPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AboutMoodsPage } from './pages/AboutMoodsPage';
import { QuienesSomosPage } from './pages/QuienesSomosPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ProfilePage } from './pages/ProfilePage';
import { EventCard } from '@/components/EventCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Notificaciones toast
import { Toaster } from 'sonner';
import { GeminiChat } from './components/GeminiChat';

// Consentimiento de cookies y analytics
import CookieConsent from './components/CookieConsent';
import { openConsent } from './lib/consent';
import { trackPageView, trackSearch } from './lib/analytics';

// React hooks
import { useEffect, useState, useRef } from 'react';

// API del backend
import { getEvents } from './lib/api';
import { getEventImage, parseEventDate } from './lib/utils';

// Tipos locales
import { Event } from './types';

// Eventos de ejemplo (fallback)
import { sampleEvents } from './lib/sampleEvents';

import { useMood } from './contexts/MoodContext';
import { MOODS } from './lib/moods';


// ============================================================
// PÁGINA: HomePage
// ============================================================

/**
 * HomePage - Página principal
 * Muestra el splash de mood y los eventos recomendados
 */
function HomePage() {
  const { mood: contextMood, setMood: setContextMood, clearMood } = useMood();

  const [events, setEvents] = useState<Event[]>([]);
  const [showSplash, setShowSplash] = useState(!contextMood);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollDone = useRef(false);

  const moodDescriptions: Record<string, string> = {
    alegre: 'Eventos vibrantes y llenos de energía',
    triste: 'Planes tranquilos para consentirte',
    enojado: 'Actividades para liberar tensiones',
    tranquilo: 'Planes serenos para reconectar con vos mismo',
    reservado: 'Propuestas íntimas y sin multitudes',
  };

  useEffect(() => {
    if (contextMood && showSplash && !scrollDone.current) {
      scrollDone.current = true;
      setShowSplash(false);
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [contextMood, showSplash]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const dbEvents = await getEvents('approved');
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
        setEvents([...dbEvents, ...sampleEventsMapped]);
      } catch (error) {
        console.error('Error fetching events:', error);
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
        setEvents(sampleEventsMapped);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const loadNewEvents = async () => {
      try {
        const dbEvents = await getEvents('approved');
        const userCreatedRaw = localStorage.getItem('user_created_events');
        const userCreated = userCreatedRaw ? JSON.parse(userCreatedRaw) : [];
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
        setEvents([...dbEvents, ...sampleEventsMapped, ...userCreated]);
      } catch (e) {
        console.error('Error reloading events:', e);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'event_created') {
        loadNewEvents();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // const moodCards = MOODS.map((mood) => {
  //   const isActive = contextMood === mood.id;
  //   return (
  //     <button
  //       key={mood.id}
  //       onClick={() => isActive ? clearMood() : setContextMood(mood.id)}
  //       className={`
  //         relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all cursor-pointer
  //         ${isActive
  //           ? 'btn-mood-active shadow-lg scale-105'
  //           : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:text-primary hover:shadow-md hover:-translate-y-1'
  //         }
  //       `}
  //     >
  //       <span className="text-6xl">{mood.emoji}</span>
  //       <span className="font-bold text-lg">{mood.label}</span>
  //       <span className={`text-sm leading-tight max-w-[140px] ${isActive ? 'text-primary-foreground/80' : 'text-slate-400 dark:text-slate-500'}`}>
  //         {moodDescriptions[mood.id]}
  //       </span>
  //       {isActive && (
  //         <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-primary-foreground text-primary rounded-full text-sm flex items-center justify-center font-bold shadow">
  //           ✓
  //         </span>
  //       )}
  //     </button>
  //   );
  // });
  const nowMs = Date.now();
  const recommendedEvents = events
    .filter(event => !contextMood || (event.moods && event.moods.includes(contextMood)))
    .map(event => ({ event, t: parseEventDate(event.date)?.getTime() ?? 0 }))
    .filter(x => x.t > 0)
    .sort((a, b) => {
      const aUpcoming = a.t >= nowMs ? 0 : 1;
      const bUpcoming = b.t >= nowMs ? 0 : 1;
      if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
      return aUpcoming === 0 ? a.t - b.t : b.t - a.t;
    })
    .slice(0, 12)
    .map(x => x.event);

  const moodCards = MOODS.map((mood, index) => {
    const isActive = contextMood === mood.id;
    // Si es el último elemento (índice 4), le aplicamos clases especiales para mobile
    const isLastItem = index === MOODS.length - 1;

    return (
      <button
        key={mood.id}
        onClick={() => isActive ? clearMood() : setContextMood(mood.id)}
        className={`
          relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all cursor-pointer
          ${isLastItem ? 'col-span-2 justify-self-center w-full max-w-[calc(50%-0.625rem)] sm:max-w-none sm:col-span-1' : ''}
          ${isActive
            ? 'btn-mood-active shadow-lg scale-105'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:text-primary hover:shadow-md hover:-translate-y-1'
          }
        `}
      >
        <span className="text-6xl">{mood.emoji}</span>
        <span className="font-bold text-lg">{mood.label}</span>
        <span className={`text-sm leading-tight max-w-[140px] ${isActive ? 'text-primary-foreground/80' : 'text-slate-400 dark:text-slate-500'}`}>
          {moodDescriptions[mood.id]}
        </span>
        {isActive && (
          <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-primary-foreground text-primary rounded-full text-sm flex items-center justify-center font-bold shadow">
            ✓
          </span>
        )}
      </button>
    );
  });

  if (showSplash) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <img src="/icono.webp" alt="MOOD" className="h-20 w-auto mx-auto mb-4" />
            <img src="/minimood.webp" alt="MOOD" className="h-10 w-auto mx-auto" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-3">
            ¿Cómo te sentís hoy?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-12 max-w-lg mx-auto text-lg">
            Elegí tu estado de ánimo y descubrí eventos pensados para vos
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 max-w-4xl mx-auto mb-12">
            {moodCards}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div ref={contentRef} className="container mx-auto px-4 py-12">
          <div className="mb-16">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {contextMood ? `Recomendados para ${MOODS.find(m => m.id === contextMood)?.label}` : 'Recomendados para vos'}
                </h2>
                <p className="text-slate-500">
                  {contextMood
                    ? 'Eventos que combinan con tu estado de ánimo'
                    : 'Explorá las actividades destacadas'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/map" className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium text-sm border border-primary/20 hover:bg-primary/15 transition-colors">
                  Ver todos en el mapa
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Explorá en el mapa</h3>
            <p className="text-slate-500 mb-6">Hacé click en los marcadores para ver los detalles de cada evento.</p>
            <EventMap events={events} />
          </div>
        </div>
    </div>
  );
}

// ============================================================
// ============================================================
// PÁGINA: MapPage
// ============================================================

/**
 * MapPage - Página del mapa completo
 * Muestra todos los eventos en un mapa interactivo
 */
function MapPage() {
  const { mood: contextMood, setMood: setContextMood } = useMood();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const centerLat = searchParams.get('center_lat');
  const centerLng = searchParams.get('center_lng');
  const userLocation: [number, number] | null = lat && lng ? [parseFloat(lat), parseFloat(lng)] : null;
  const mapCenter: [number, number] | undefined = centerLat && centerLng ? [parseFloat(centerLat), parseFloat(centerLng)] : userLocation || undefined;
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const geoInitDone = useRef(false);
  const urlSyncDone = useRef(false);

  useEffect(() => {
    if (geoInitDone.current) return;
    geoInitDone.current = true;
    if (!lat || !lng) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('lat', pos.coords.latitude.toFixed(6));
          params.set('lng', pos.coords.longitude.toFixed(6));
          navigate(`/map?${params.toString()}`, { replace: true });
        },
        (err) => console.warn('Geolocation no disponible:', err.message),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // On mount: sync URL mood param to context
  useEffect(() => {
    if (urlSyncDone.current) return;
    const urlMood = searchParams.get('mood');
    const validMoods = ['alegre', 'triste', 'enojado', 'tranquilo', 'reservado'];
    if (urlMood && validMoods.includes(urlMood)) {
      urlSyncDone.current = true;
      setContextMood(urlMood);
    }
  }, []);

  // When context mood changes, sync to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (contextMood) params.set('mood', contextMood);
    else params.delete('mood');
    navigate(`/map?${params.toString()}`, { replace: true });
  }, [contextMood]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const category = searchParams.get('category');
        const province = searchParams.get('province');
        const city = searchParams.get('city');
        const filter = searchParams.get('filter');
        const latParam = searchParams.get('lat');
        const lngParam = searchParams.get('lng');
        
        let url = '/api/events/?status_filter=approved';
        if (province && province !== 'Todos') url += `&province=${encodeURIComponent(province)}`;
        if (city && city !== 'Todos') url += `&city=${encodeURIComponent(city)}`;
        if (category && category !== 'Todos') url += `&category=${encodeURIComponent(category)}`;
        if (filter === 'today') url += '&today=true';
        else if (filter === 'weekend') url += '&weekend=true';
        else if (filter === 'free') url += '&is_free=true';
        else if (filter === 'outdoor') url += '&is_outdoor=true';
        if (latParam && lngParam) url += `&lat=${latParam}&lng=${lngParam}&radius_km=50`;
        if (contextMood) url += `&mood=${encodeURIComponent(contextMood)}`;
        
        const response = await fetch(url);
        let dbEvents = await response.json();
        
        setEvents(dbEvents);
        setActiveFilter(searchParams.get('filter') || '');
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [location.search, contextMood]);

  const categories = ['Todos', 'cultural', 'adventure', 'relax', 'nightlife', 'group', 'individual'];
  const categoryLabels: Record<string, string> = {
    cultural: 'Cultural',
    adventure: 'Aventura',
    relax: 'Relax',
    nightlife: 'Nocturno',
    group: 'Grupal',
    individual: 'Individual'
  };
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'Todos');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || '');
  const [activeProvince, setActiveProvince] = useState(searchParams.get('province') || 'Todos');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false);

  const [geoSearch, setGeoSearch] = useState('');
  const [geoResults, setGeoResults] = useState<{ lat: string; lon: string; display: string }[]>([]);
  const [geoOpen, setGeoOpen] = useState(false);
  const geoRef = useRef<HTMLDivElement>(null);
  const geoTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleGeoSearch = (value: string) => {
    setGeoSearch(value);
    setGeoOpen(true);
    if (geoTimeout.current) clearTimeout(geoTimeout.current);
    if (value.length < 3) { setGeoResults([]); return; }
    geoTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value + ', Argentina')}&format=json&limit=6&countrycodes=ar&addressdetails=1`,
          { headers: { 'User-Agent': 'MoodApp/1.0' } }
        );
        const data = await res.json();
        setGeoResults(data.map((r: any) => ({
          lat: r.lat,
          lon: r.lon,
          display: (r.address?.city || r.address?.town || r.address?.village || r.display_name?.split(',')[0] || '').trim() + ', ' + (r.address?.state || r.address?.region || '').trim()
        })));
      } catch (e) {
        console.error('Error al buscar ciudades:', e);
        setGeoResults([]);
      }
    }, 400);
  };

  const handleGeoSelect = (r: { lat: string; lon: string }) => {
    setGeoSearch('');
    setGeoOpen(false);
    setGeoResults([]);
    if (geoSearch.trim()) trackSearch(geoSearch.trim());
    const params = new URLSearchParams(searchParams.toString());
    params.set('lat', r.lat);
    params.set('lng', r.lon);
    params.set('center_lat', r.lat);
    params.set('center_lng', r.lon);
    params.delete('province');
    params.delete('city');
    setAutoMoveKey(k => k + 1);
    navigate(`/map?${params.toString()}`);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (geoRef.current && !geoRef.current.contains(e.target as Node)) setGeoOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allProvinces = [
    'Todos', 'CABA', 'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut',
    'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
    'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
    'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
    'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'
  ];

  const provinceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) {
        setProvinceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProvinces = allProvinces.filter(p => p.toLowerCase().includes(provinceSearch.toLowerCase()));

  const autoMove = activeProvince !== 'Todos';
  const [autoMoveKey, setAutoMoveKey] = useState(0);
  useEffect(() => {
    setAutoMoveKey(k => k + 1);
  }, [activeProvince]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    const params = new URLSearchParams(searchParams.toString());
    if (cat !== 'Todos') params.set('category', cat);
    else params.delete('category');
    navigate(`/map?${params.toString()}`);
  };

  const handleProvinceClick = (prov: string) => {
    setActiveProvince(prov);
    setProvinceSearch('');
    setProvinceDropdownOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (prov !== 'Todos') params.set('province', prov);
    else params.delete('province');
    params.delete('city');
    params.delete('lat');
    params.delete('lng');
    params.delete('center_lat');
    params.delete('center_lng');
    navigate(`/map?${params.toString()}`);
  };

  // Render
  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Mapa de Eventos</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Hacé click en los marcadores para ver los detalles de cada evento.</p>
        
        {/* Filtros rápidos activos */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilter && (
            <>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filtro:</span>
              <span className="px-3 py-1 bg-primary/15 text-primary rounded-full text-sm font-medium flex items-center gap-1">
                {activeFilter === 'today' ? 'Hoy' :
                 activeFilter === 'weekend' ? 'Este finde' :
                 activeFilter === 'free' ? 'Gratis' :
                 activeFilter === 'outdoor' ? 'Al aire libre' : activeFilter}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('filter');
                    navigate(`/map?${params.toString()}`);
                  }}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </span>
            </>
          )}
          {lat && lng && (
            <>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ubicación:</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                <LocateFixed size={14} />
                Cerca de mí
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete('lat');
                      params.delete('lng');
                      params.delete('center_lat');
                      params.delete('center_lng');
                      navigate(`/map?${params.toString()}`);
                    }}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </span>
            </>
          )}
        </div>

        {/* Buscador de ciudades (Nominatim) */}
        <div className="mb-4 relative" ref={geoRef}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Buscar ciudad</h3>
          <div className="relative">
            <Input
              type="text"
              placeholder="Ej: Mar del Plata, Salta, Bariloche..."
              value={geoSearch}
              onChange={(e) => handleGeoSearch(e.target.value)}
              onFocus={() => { if (geoResults.length > 0) setGeoOpen(true); }}
              className="w-full max-w-xs"
            />
            {geoOpen && geoResults.length > 0 && (
              <div className="absolute z-10 w-full max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {geoResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleGeoSelect(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {r.display}
                  </button>
                ))}
              </div>
            )}
            {geoOpen && geoSearch.length >= 3 && geoResults.length === 0 && (
              <div className="absolute z-10 w-full max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm text-slate-500 dark:text-slate-400">
                Sin resultados. Probá con otra ciudad.
              </div>
            )}
          </div>
        </div>

        {/* Filtros por provincia con buscador */}
        <div className="mb-4 relative" ref={provinceRef}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Provincia</h3>
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar provincia..."
              value={activeProvince !== 'Todos' && !provinceDropdownOpen ? activeProvince : provinceSearch}
              onChange={(e) => { setProvinceSearch(e.target.value); setProvinceDropdownOpen(true); }}
              onFocus={() => { setProvinceDropdownOpen(true); if (activeProvince !== 'Todos') setProvinceSearch(''); }}
              className="w-full max-w-xs"
            />
            {provinceDropdownOpen && (
              <div className="absolute z-10 w-full max-w-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProvinces.map((prov) => (
                  <button
                    key={prov}
                    onClick={() => handleProvinceClick(prov)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      activeProvince === prov ? 'bg-primary/15 text-primary font-medium' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Filtros por categoría */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Categoría</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'Todos' ? 'Todos' : categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          {/* Sidebar izquierdo: lista de eventos */}
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <div className="sticky top-20 h-[600px] overflow-y-auto space-y-3 pr-2">
              {events.length === 0 ? (
                <div className="text-center text-slate-500 dark:text-slate-400 text-sm py-8">
                  {lat && lng
                    ? 'No hay eventos cerca de esta ubicación'
                    : 'Buscá una ciudad o activá tu ubicación para ver eventos cercanos'}
                </div>
              ) : (
                events.map((event) => {
                  const eventMoods = event.moods || [];
                  const distance = (event as any).distance;
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedEvent?.id === event.id
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        <Badge className={`text-[10px] px-1.5 py-0 ${selectedEvent?.id === event.id ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}`}>
                          {categoryLabels[event.category] || event.category}
                        </Badge>
                        {event.is_free && (
                          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">GRATIS</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">{event.title}</p>
                      {eventMoods.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {eventMoods.map((mId: string) => {
                            const m = MOODS.find(mo => mo.id === mId);
                            return m ? (
                              <span key={mId} className="text-[11px] text-slate-500 dark:text-slate-400">{m.emoji} {m.label}</span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                        <span>{(() => { const d = parseEventDate(event.date); return !d || isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }); })()}</span>
                        {distance !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} /> {distance} km
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Mapa centrado en ubicación del usuario o CABA */}
          <div className="flex-1 min-w-0">
            <EventMap events={events} center={mapCenter} zoom={8} autoMove={autoMove} autoMoveKey={autoMoveKey} userLocation={userLocation} onEventClick={setSelectedEvent} />
          </div>

          {/* Sidebar derecho: detalle rápido del evento seleccionado */}
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <div className="sticky top-20 h-[600px] overflow-y-auto">
              {!selectedEvent ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500 text-sm px-4">
                  <MapPin size={32} className="mb-3 opacity-40" />
                  <p>Seleccioná un evento en el mapa o en la lista para ver sus detalles</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                  {/* Imagen */}
                  <div className="h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <img 
                      src={getEventImage(selectedEvent, '400/200')} 
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Categoría y gratis */}
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/15 text-primary">
                        {categoryLabels[selectedEvent.category] || selectedEvent.category}
                      </Badge>
                      {selectedEvent.is_free && (
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">GRATIS</span>
                      )}
                    </div>
                    
                    {/* Título */}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{selectedEvent.title}</h3>
                    
                    {/* Estados de ánimo */}
                    {(selectedEvent.moods || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedEvent.moods || []).map((mId: string) => {
                          const m = MOODS.find(mo => mo.id === mId);
                          return m ? (
                            <span key={mId} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                              {m.emoji} {m.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    {/* Descripción */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {selectedEvent.description}
                    </p>
                    
                    {/* Fecha y ubicación */}
                    <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="flex-shrink-0" />
                        <span>{(() => { const d = parseEventDate(selectedEvent.date); return !d || isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }); })()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="line-clamp-1">{selectedEvent.location.address}, {selectedEvent.location.city}</span>
                      </div>
                      {(selectedEvent as any).distance !== undefined && (
                        <div className="flex items-center gap-2">
                          <LocateFixed size={14} className="flex-shrink-0" />
                          <span>A {(selectedEvent as any).distance} km de distancia</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Botón ver más */}
                    <button
                      onClick={() => navigate(`/event/${selectedEvent.id}`)}
                      className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Ver detalles completos →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: App
// ============================================================

// ============================================================
// COMPONENTE: PageTracker
// ============================================================

/**
 * PageTracker - Registra page_view en cada navegación.
 * Sin consentimiento no se envía nada (opt-in en lib/analytics.ts).
 */
function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

/**
 * App - Componente raíz
 * Envuelve toda la app con AuthProvider y Router
 */
export default function App() {
  return (
    // GoogleOAuthProvider -> Google Sign-In
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    {/* AuthProvider -> proporciona contexto de autenticación */}
    <AuthProvider>
      <MoodProvider>
      <ThemeProvider>
      <Router>
        {/* Layout principal: flex column para footer pegajoso */}
        <div className="flex flex-col min-h-screen">
          
          {/* Barra de navegación */}
          <Navbar />
          
          {/* Tracking de vistas de página + banner de cookies */}
          <PageTracker />
          <CookieConsent />
          
          {/* Contenido principal que ocupa el espacio restante */}
          <main className="flex-grow">
          {/* Definición de rutas */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/event/:id" element={<EventDetailPage />} />
            <Route path="/calendar" element={<EventCalendar />} />
            <Route path="/submit" element={<EventForm />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/giveaways" element={<GiveawaysPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about-moods" element={<AboutMoodsPage />} />
            <Route path="/quienes-somos" element={<QuienesSomosPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terminos-y-condiciones" element={<TerminosYCondiciones />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Ruta catchall para 404 */}
            <Route path="*" element={<div className="flex items-center justify-center h-96 text-2xl font-bold">404 - Página no encontrada</div>} />
          </Routes>
          </main>
          
          {/* Footer */}
          <footer className="bg-slate-900 text-white py-12">
            {/* 1. Usamos text-center en mobile y md:text-left en escritorio */}
            <div className="container mx-auto px-4 text-center md:text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Sección 1: Logo y Descripción */}
                {/* flex-col y items-center centran el logo + texto en mobile */}
                <div className="flex flex-col items-center md:items-start space-y-4">
                  <div className="flex items-center gap-2">
                    {/* Tu imagen o icono de logo */}
                    <img src="/icono.webp" alt="MOOD" className="h-8 w-auto" />
                    <span className="text-xl font-bold">MOOD</span>
                  </div>
                  <p className="text-slate-400 text-sm max-w-sm">
                    Transformando la forma en que vivís y explorás tu ciudad. Conectamos personas con experiencias locales únicas en toda Argentina.
                  </p>
                </div>

                {/* Sección 2: Explorar */}
                <div>
                  <h4 className="font-bold text-lg mb-4">Explorar</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li><Link to="/map" className="hover:text-white transition-colors">Mapa de Eventos</Link></li>
                    <li><Link to="/calendar" className="hover:text-white transition-colors">Calendario</Link></li>
                    <li><Link to="/categories" className="hover:text-white transition-colors">Categorías</Link></li>
                    <li><Link to="/about-moods" className="hover:text-white transition-colors">Sobre los Moods</Link></li>
                  </ul>
                </div>

                {/* Sección 3: Comunidad */}
                <div>
                  <h4 className="font-bold text-lg mb-4">Comunidad</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li><Link to="/submit" className="hover:text-white transition-colors">Subir Evento</Link></li>
                    <li><Link to="/contact" className="hover:text-white transition-colors">Contacto</Link></li>
                    <li><Link to="/quienes-somos" className="hover:text-white transition-colors">Quiénes somos</Link></li>
                    <li><Link to="/terminos-y-condiciones" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
                    <li><Link to="/terminos-y-condiciones#cookies" className="hover:text-white transition-colors">Cookies y privacidad</Link></li>
                    <li>
                      <button onClick={openConsent} className="hover:text-white transition-colors underline-offset-4 hover:underline">
                        Gestionar cookies
                      </button>
                    </li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Copyright */}
            <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
              © 2026 MOOD Argentina. Todos los derechos reservados.
            </div>
          </footer>
        </div>
        
        {/* Toaster para notificaciones */}
        <Toaster position="top-center" richColors />
        <GeminiChat />
      </Router>
      </ThemeProvider>
      </MoodProvider>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}
