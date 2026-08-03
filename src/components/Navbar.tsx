/**
 * ============================================================
 * src/components/Navbar.tsx - Barra de Navegación
 * ============================================================
 * Barra de navegación principal.
 * Muestra links y autenticación.
 */

// React
import React, { useState } from 'react';

import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import { Button } from '@/components/ui/button';

import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';

import { 
  MapPin, 
  Calendar as CalendarIcon, 
  PlusCircle, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck,
  Bell,
  X,
  Sun,
  Moon
} from 'lucide-react';

import { MOODS } from '../lib/moods';
import { cn } from '@/lib/utils';
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
  
  const { mood: activeMood, setMood: setContextMood, clearMood } = useMood();
  const { dark, toggle: toggleTheme } = useTheme();

  // Estados para dialogs de auth
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const handleMoodSelect = (moodId: string) => {
    if (moodId === activeMood) clearMood();
    else setContextMood(moodId);
  };

  // Handler de logout
  const handleLogout = () => logout();

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
            </div>
          </div>

          {/* Sección derecha: usuario o login */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <div className="flex items-center gap-4">
            {user ? (
              // Usuario logueado
              <div className="flex items-center gap-3">
                {/* Botón de notificaciones */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary"></span>
                </Button>
                
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
