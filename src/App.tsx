/**
 * ============================================================
 * src/App.tsx - Componente Principal y Rutas
 * ============================================================
 * Define todas las páginas de la aplicación y el enrutamiento.
 * Uso: HashRouter para compatibilidad con GitHub Pages.
 */

import { BrowserRouter as Router, Routes, Route, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MoodProvider } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import CookieConsent from './components/CookieConsent';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventCalendar from './components/EventCalendar';
import EventForm from './components/EventForm';
import AdminDashboard from './components/AdminDashboard';
import GiveawaysPage from './pages/GiveawaysPage';
import CategoriesPage from './pages/CategoriesPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import AboutMoodsPage from './pages/AboutMoodsPage';
import QuienesSomosPage from './pages/QuienesSomosPage';
import ContactPage from './pages/ContactPage';
import TerminosYCondiciones from './pages/TerminosYCondiciones';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import StatsTab from './components/StatsTab';
import { ToastContainer, Toaster } from 'sonner';
import { GeminiChat } from './components/GeminiChat';

import { useMood } from './contexts/MoodContext';
import { MOODS } from './lib/moods';

// ─── NUEVO: Importar funciones de analytics ──────────────────────
import { getAnalyticsSummary, type AnalyticsEventType } from './lib/analytics';

export default function App() {
  const params = useSearchParams();
  
  // ── NUEVO: Montar CookieConsent junto al Toaster ───────────────
  <CookieConsent 
    onAccept={() => window.location.search = '?mood=aceptado'} 
    onReject={() => window.location.search = '?mood=rechazado'} 
  />

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <MoodProvider>
        <ThemeProvider>
          <Router>
            <div className="flex flex-col min-h-screen">
              {/* Barra de navegación */}
              <Navbar />
              
              {/* Contenido principal que ocupa el espacio restante */}
              <main className="flex-grow">
                {/* Definición de rutas con StatsTab */}
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/event/:id" element={<EventDetailPage />} />
                  <Route path="/calendar" element={<EventCalendar />} />
                  <Route path="/submit" element={<EventForm />} />
                  
                  {/* ── NUEVO: Tab de estadísticas para admins ─────── */}
                  <Route path="/admin/stats" element={
                    () => (
                      <>
                        <StatsTab 
                          onDaysChange={(d) => window.location.search = `?days=${d}`} 
                      />
                    </>
                  )} />
                  
                  {/* ... resto de rutas existentes ... */}
                </Routes>
              </main>

              {/* Footer con link cookies (id="cookies") para reabrir el aviso ── NUEVO ── */}
              <footer className="bg-slate-900 text-white py-12">
                <div className="container mx-auto px-4 text-center md:text-left">
                  {/* ... contenido existente del footer ... */}
                  
                  {/* ── NUEVO: Link "Cookies" en footer (id="cookies") ──── */}
                  <a 
                    href="#cookies" 
                    id="cookies-link"
                    className="text-xs text-slate-500 hover:text-white transition-colors mt-4 block inline-block"
                  >
                    🍪 Cookies y privacidad
                  </a>

                </div>

                {/* Copyright */}
                <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
                  Ac 2026 MOOD Argentina. Todos los derechos reservados.
                </div>
              </footer>

              {/* Toast notifications */}
              <Toaster position="top-center" richColors />
              <GeminiChat />
            </div>
          </Router>
        </ThemeProvider>
      </MoodProvider>
    </GoogleOAuthProvider>
  );
}