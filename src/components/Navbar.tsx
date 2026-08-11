/**
 * ============================================================
 * src/components/Navbar.tsx - Barra de Navegación
 * ============================================================
 * Barra de navegación principal.
 * Muestra links y autenticación.
 */

// React
import React, { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

import { Button } from '@/components/ui/button';

import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';

import { 
  MapPin, 
  Calendar as CalendarIcon, 
  CalendarSearch,
  LayoutGrid,
  Sparkles,
  Heart,
  Menu,
  PlusCircle, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck,
  Bell,
  X,
  Sun,
  Moon,
  Lock,
  LockOpen
} from 'lucide-react';

import { MOODS } from '../lib/moods';
import { cn, formatRelativeTime, formatCountdown } from '@/lib/utils';
import { useMood } from '../contexts/MoodContext';
import { useTheme } from '../contexts/ThemeContext';

// Dropdown de Shadcn
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Avatar de Shadcn
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Sheet (drawer) para menú mobile
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const MOBILE_MENU_LINKS = [
  { to: '/map', icon: MapPin, label: 'Mapa' },
  { to: '/events', icon: CalendarSearch, label: 'Eventos' },
  { to: '/calendar', icon: CalendarIcon, label: 'Calendario' },
  { to: '/categories', icon: LayoutGrid, label: 'Categorías' },
  { to: '/about-moods', icon: Sparkles, label: 'Sobre los Moods' },
];


// ============================================================
// COMPONENTE: Navbar
// ============================================================

/**
 * Navbar - Barra de navegación
 * Fija arriba, con links y usuario
 */
export const Navbar: React.FC = () => {
  // Estado del usuario desde el hook
  const { user, profile, isAdmin, logout } = useAuth();
  
  const { mood: activeMood, setMood: setContextMood, clearMood, frozen, freezeMood, unfreezeMood } = useMood();
  const { dark, toggle: toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const navigate = useNavigate();

  // Estados para dialogs de auth
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMoodSelect = (moodId: string) => {
    if (moodId === activeMood) clearMood();
    else setContextMood(moodId);
  };

  // Handler de logout
  const handleLogout = () => logout();

  // Handler al clickear una notificación
  const handleNotificationClick = (notification: any) => {
    if (!notification.read) markRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  // Handler de login con Google (no usado actualmente)
  const handleGoogleLogin = async () => {
    
  };

  // Switch entre Login y Register
  const switchToRegister = () => {
    setLoginOpen(false);
    setRegisterOpen(true);
  };

  const switchToLogin = () => {
    setRegisterOpen(false);
    setLoginOpen(true);
  };

  // Render
  // Render del componente
  return (
    <>
      {/* Elemento nav fijo arriba */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo y nombre */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/icono.webp" 
              alt="MOOD" 
              className="h-12 w-auto max-w-[48px] rounded-xl object-contain"
            />
            <img 
              src="/minimood.webp" 
              alt="MOOD" 
              className="hidden sm:block h-8 w-auto object-contain"
            />
          </Link>

          {/* Links de navegación (hidden en mobile) */}
          <div className="hidden items-center gap-6 lg:flex">
            <Link to="/map" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1">
              <MapPin size={16} /> Mapa
            </Link>
            <Link to="/events" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1">
              <CalendarSearch size={16} /> Eventos
            </Link>
            <Link to="/calendar" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1">
              <CalendarIcon size={16} /> Calendario
            </Link>
            {/* Solo usuarios logueados */}
            {user && (
              <Link to="/submit" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1">
                <PlusCircle size={16} /> Subir Evento
              </Link>
            )}
            {/* Solo admins */}
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1">
                <ShieldCheck size={16} /> Admin
              </Link>
            )}
            {/* Mood selector (desktop) */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-base transition-all",
                    activeMood === mood.id
                      ? "emoji-btn-active shadow-sm scale-110"
                      : "text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    title={mood.label}
                >
                  {mood.emoji}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={frozen ? unfreezeMood : freezeMood}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full transition-all",
                  frozen
                    ? "emoji-btn-active shadow-sm scale-110"
                    : "text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                title={frozen ? 'Color fijo activo - tocar para desbloquear' : 'Fijar color (no cambiar aunque cambie el mood)'}
              >
                {frozen ? <LockOpen size={15} /> : <Lock size={15} />}
              </button>
            </div>
          </div>

          {/* Sección derecha: usuario o login */}
          <div className="flex items-center gap-2">
            {/* Menú mobile (hamburguesa) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </Button>
            {/* Dark mode toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <div className="flex items-center gap-4">
            {user ? (
              // Usuario logueado
              <div className="flex items-center gap-3">
                {/* Botón de notificaciones */}
                <DropdownMenu onOpenChange={(open) => { if (open) refresh(); }}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
                    <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No tenés notificaciones
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className="flex flex-col items-start gap-0.5 cursor-pointer"
                        >
                          <div className="flex w-full items-center gap-2">
                            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                            <span className="text-sm font-medium">{n.title}</span>
                            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                              {formatRelativeTime(n.created_at)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{n.message}</span>
                          {n.type === 'favorite_near' && n.event_date && (
                            <span className="text-xs font-medium text-primary">
                              {formatCountdown(n.event_date)}
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                    {notifications.length > 0 && unreadCount > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={markAllRead} className="justify-center text-xs text-primary">
                          Marcar todas como leídas
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Dropdown con menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent hover:border-primary transition-all">
                      <AvatarImage src={user.photo_url || ''} />
                      <AvatarFallback className="bg-primary/15 text-primary">
                        {(user as any).display_name?.charAt(0) || user_email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <UserIcon size={16} /> Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/favorites" className="flex items-center gap-2">
                        <PlusCircle size={16} /> Favoritos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut size={16} className="mr-2" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              // Usuario no logueado - botones de auth
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setRegisterOpen(true)}
                  className="rounded-full px-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Registrarse
                </Button>
                <Button 
                  onClick={() => setLoginOpen(true)} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
                >
                  Ingresar
                </Button>
              </div>
            )}
          </div>
          </div>
        </div>
      </nav>

      {/* Menú mobile (drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-3/4 sm:max-w-sm">
          <SheetHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 pb-2">
              <img src="/icono.webp" alt="MOOD" className="h-8 w-auto rounded-lg object-contain" />
              <SheetTitle>MOOD</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-2 overflow-y-auto">
            {MOBILE_MENU_LINKS.map((link) => (
              <button
                key={link.to}
                onClick={() => { setMobileOpen(false); navigate(link.to); }}
                className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors rounded-lg text-left"
              >
                <link.icon size={18} className="text-primary shrink-0" />
                {link.label}
              </button>
            ))}
            {user && (
              <button
                onClick={() => { setMobileOpen(false); navigate('/submit'); }}
                className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors rounded-lg text-left"
              >
                <PlusCircle size={18} className="text-primary shrink-0" />
                Subir Evento
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setMobileOpen(false); navigate('/admin'); }}
                className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors rounded-lg text-left"
              >
                <ShieldCheck size={18} className="text-primary shrink-0" />
                Admin
              </button>
            )}
          </div>

          {user && (
            <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 px-2 flex flex-col gap-1">
              <button
                onClick={() => { setMobileOpen(false); navigate('/profile'); }}
                className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors rounded-lg text-left"
              >
                <UserIcon size={18} className="text-primary shrink-0" />
                Perfil
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/favorites'); }}
                className="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors rounded-lg text-left"
              >
                <Heart size={18} className="text-primary shrink-0" />
                Favoritos
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Mood selector (mobile) */}
      <div className="lg:hidden flex items-center justify-center gap-2 pb-3 px-4 border-b border-slate-100 dark:border-slate-800 dark:bg-slate-950">
        {activeMood && (
          <button
            onClick={() => handleMoodSelect(activeMood)}
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Limpiar estado de ánimo"
          >
            <X size={14} />
          </button>
        )}
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            onClick={() => handleMoodSelect(mood.id)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-full text-lg transition-all",
              activeMood === mood.id
                ? "emoji-btn-active shadow-sm scale-110"
                : "text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            title={mood.label}
          >
            {mood.emoji}
          </button>
        ))}
        <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={frozen ? unfreezeMood : freezeMood}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-full transition-all",
            frozen
              ? "emoji-btn-active shadow-sm scale-110"
              : "text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
          title={frozen ? 'Color fijo activo - tocar para desbloquear' : 'Fijar color (no cambiar aunque cambie el mood)'}
        >
          {frozen ? <LockOpen size={16} /> : <Lock size={16} />}
        </button>
      </div>

      {/* Dialogs de autenticación (modals) */}
      <LoginDialog 
        open={loginOpen} 
        onOpenChange={setLoginOpen}
        onSwitchToRegister={switchToRegister}
      />
      
      <RegisterDialog 
        open={registerOpen} 
        onOpenChange={setRegisterOpen}
        onSwitchToLogin={switchToLogin}
      />
    </>
  );
};
