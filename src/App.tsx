/**
 * ============================================================
 * src/App.tsx - Componente Principal y Rutas
 * ============================================================
 * Define todas las páginas de la aplicación y el enrutamiento.
 * Uso: HashRouter para compatibilidad con GitHub Pages.
 */

// React Router para navegación
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Context de autenticación
import { AuthProvider } from './hooks/useAuth';

// Componentes de la interfaz
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { EventMap } from './components/EventMap';
import { EventForm } from './components/EventForm';
import { AdminDashboard } from './components/AdminDashboard';
import { EventCalendar } from './components/EventCalendar';
import { EventDetailPage } from './pages/EventDetailPage';
import { GiveawaysPage } from './pages/GiveawaysPage';
import { EventCard } from '@/components/EventCard';
import { LayoutWithAds } from './components/LayoutWithAds';
import { Input } from '@/components/ui/input';

// Notificaciones toast
import { Toaster } from 'sonner';

// React hooks
import { useEffect, useState, useRef } from 'react';

// API del backend
import { getEvents } from './lib/api';

// Tipos locales
import { Event } from './types';

// Eventos de ejemplo (fallback)
import { sampleEvents } from './lib/sampleEvents';


// ============================================================
// PÁGINA: HomePage
// ============================================================

/**
 * HomePage - Página principal
 * Muestra el Hero, mapa pequeño y eventos recomendados
 */
function HomePage() {
  // Estado para almacenar eventos
  const [events, setEvents] = useState<Event[]>([]);

  // Effect: Cargar eventos al montar el componente
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Llamar al backend API - obtener aprobados
        const dbEvents = await getEvents('approved');
        
        // Mapear eventos de ejemplo
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];

        // Combinar eventos de BD con ejemplos (ya son objetos Date del backend)
        setEvents([...dbEvents, ...sampleEventsMapped]);
      } catch (error) {
        // Si falla el backend, usar solo ejemplos
        console.error('Error fetching events:', error);
        const sampleEventsMapped = sampleEvents.map(e => ({
          ...e,
          date: e.date || e.date?.toDate?.() || new Date()
        })) as Event[];
        setEvents(sampleEventsMapped);
      }
    };

    // Ejecutar fetch
    fetchEvents();
  }, []);

  // Effect: Recargar cuando vuelve de crear evento
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

  // Render
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />
      
      {/* Contenido principal con ads */}
      <LayoutWithAds>
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Eventos Cercanos</h2>
              <p className="text-slate-500">Explorá las actividades que están pasando ahora mismo.</p>
            </div>
            <div className="flex gap-2">
              <a href="/map" className="px-4 py-2 rounded-lg bg-orange-50 text-orange-600 font-medium text-sm border border-orange-100 hover:bg-orange-100 transition-colors">
                Ver todos en el mapa
              </a>
            </div>
          </div>
          
          {/* Mapa pequeño */}
          <EventMap events={events} />
          
          {/* Eventos recomendados */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Recomendados para vos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {events.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      </LayoutWithAds>
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
  // Estado de eventos
  const [events, setEvents] = useState<Event[]>([]);

  // Effect: Cargar eventos
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const category = params.get('category');
        const province = params.get('province');
        const city = params.get('city');
        const filter = params.get('filter');
        
        let url = '/api/events/?status_filter=approved';
        if (province && province !== 'Todos') url += `&province=${encodeURIComponent(province)}`;
        if (city && city !== 'Todos') url += `&city=${encodeURIComponent(city)}`;
        if (category && category !== 'Todos') url += `&category=${encodeURIComponent(category)}`;
        if (filter) url += `&search=${encodeURIComponent(filter)}`;
        
        const response = await fetch(url);
        let dbEvents = await response.json();
        
        setEvents(dbEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [window.location.hash]);

  const categories = ['Todos', 'cultural', 'adventure', 'relax', 'nightlife', 'group', 'individual'];
  const categoryLabels: Record<string, string> = {
    cultural: 'Cultural',
    adventure: 'Aventura',
    relax: 'Relax',
    nightlife: 'Nocturno',
    group: 'Grupal',
    individual: 'Individual'
  };
  const allProvinces = ['Todos', 'CABA', 'Córdoba', 'Santa Fe', 'Mendoza', 'Neuquén', 'Salta', 'Tucumán', 'Río Negro', 'Tierra del Fuego'];
  const allCities = ['Todos', 'Buenos Aires', 'Córdoba', 'Rosario', 'Santa Fe', 'La Plata', 'Bariloche', 'Mendoza', 'Salta', 'Tucumán', 'Neuquén', 'Ushuaia'];

  const [activeCategory, setActiveCategory] = useState('Todos');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [activeProvince, setActiveProvince] = useState('Todos');
  const [activeCity, setActiveCity] = useState('Todos');

  const provinceRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) {
        setProvinceDropdownOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProvinces = allProvinces.filter(p => p.toLowerCase().includes(provinceSearch.toLowerCase()));
  const filteredCities = allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  const autoMove = activeProvince !== 'Todos' || activeCity !== 'Todos';

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    const params = new URLSearchParams();
    if (cat !== 'Todos') params.set('category', cat);
    const province = new URLSearchParams(window.location.hash.split('?')[1] || '').get('province');
    const city = new URLSearchParams(window.location.hash.split('?')[1] || '').get('city');
    if (province) params.set('province', province);
    if (city) params.set('city', city);
    window.location.hash = `/map?${params.toString()}`;
  };

  const handleProvinceClick = (prov: string) => {
    setActiveProvince(prov);
    setProvinceSearch('');
    setProvinceDropdownOpen(false);
    const params = new URLSearchParams();
    if (activeCategory !== 'Todos') params.set('category', activeCategory);
    if (prov !== 'Todos') params.set('province', prov);
    const city = new URLSearchParams(window.location.hash.split('?')[1] || '').get('city');
    if (city) params.set('city', city);
    window.location.hash = `/map?${params.toString()}`;
  };

  const handleCityClick = (city: string) => {
    setActiveCity(city);
    setCitySearch('');
    setCityDropdownOpen(false);
    const params = new URLSearchParams();
    if (activeCategory !== 'Todos') params.set('category', activeCategory);
    const province = new URLSearchParams(window.location.hash.split('?')[1] || '').get('province');
    if (province) params.set('province', province);
    if (city !== 'Todos') params.set('city', city);
    window.location.hash = `/map?${params.toString()}`;
  };

  // Render
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Mapa de Eventos</h1>
        <p className="text-slate-500 mb-6">Hacé click en los marcadores para ver los detalles de cada evento.</p>
        
        {/* Filtros por provincia con buscador */}
        <div className="mb-4 relative" ref={provinceRef}>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Provincia</h3>
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar provincia..."
              value={provinceSearch}
              onChange={(e) => { setProvinceSearch(e.target.value); setProvinceDropdownOpen(true); }}
              onFocus={() => setProvinceDropdownOpen(true)}
              className="w-full max-w-xs"
            />
            {provinceDropdownOpen && (
              <div className="absolute z-10 w-full max-w-xs bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProvinces.map((prov) => (
                  <button
                    key={prov}
                    onClick={() => handleProvinceClick(prov)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${
                      activeProvince === prov ? 'bg-orange-100 text-orange-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Filtros por ciudad con buscador */}
        <div className="mb-4 relative" ref={cityRef}>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Ciudad</h3>
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar ciudad..."
              value={citySearch}
              onChange={(e) => { setCitySearch(e.target.value); setCityDropdownOpen(true); }}
              onFocus={() => setCityDropdownOpen(true)}
              className="w-full max-w-xs"
            />
            {cityDropdownOpen && (
              <div className="absolute z-10 w-full max-w-xs bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCityClick(city)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${
                      activeCity === city ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Filtros por categoría */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Categoría</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'Todos' ? 'Todos' : categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Mapa con zoom 12 */}
        <EventMap events={events} zoom={12} autoMove={autoMove} />
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: App
// ============================================================

/**
 * App - Componente raíz
 * Envuelve toda la app con AuthProvider y Router
 */
export default function App() {
  return (
    // AuthProvider -> proporciona contexto de autenticación
    <AuthProvider>
      <Router>
        {/* Layout principal: flex column para footer pegajoso */}
        <div className="flex flex-col min-h-screen">
          
          {/* Barra de navegación */}
          <Navbar />
          
          {/* Contenido principal que ocupa el espacio restante */}
          <main className="flex-grow">
            {/* Definición de rutas */}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/event/:id" element={<EventDetailPage />} />
              <Route path="/calendar" element={<EventCalendar />} />
              <Route path="/submit" element={<EventForm />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/giveaways" element={<GiveawaysPage />} />
              {/* Rutacatchall para 404 */}
              <Route path="*" element={<div className="flex items-center justify-center h-96 text-2xl font-bold">404 - Página no encontrada</div>} />
            </Routes>
          </main>
          
          {/* Footer */}
          <footer className="bg-slate-900 text-white py-12">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Logo y descripción */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 bg-orange-500 rounded-lg"></div>
                  <span className="text-xl font-bold">MOOD</span>
                </div>
                <p className="text-slate-400 max-w-sm">
                  Transformando la forma en que vivís y explorás tu ciudad. 
                  Conectamos personas con experiencias locales únicas en toda Argentina.
                </p>
              </div>
              
              {/* Links de explorar */}
              <div>
                <h4 className="font-bold mb-4">Explorar</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li><a href="/map" className="hover:text-white transition-colors">Mapa de Eventos</a></li>
                  <li><a href="/calendar" className="hover:text-white transition-colors">Calendario</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Categorías</a></li>
                </ul>
              </div>
              
              {/* Links de comunidad */}
              <div>
                <h4 className="font-bold mb-4">Comunidad</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li><a href="/submit" className="hover:text-white transition-colors">Subir Evento</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                </ul>
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
      </Router>
    </AuthProvider>
  );
}
