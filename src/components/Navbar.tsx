/**
 * ============================================================
 * src/components/Navbar.tsx - Barra de Navegación
 * ============================================================
 * Barra de navegación principal.
 * Muestra links y autenticación.
 */

// React
import React, { useState } from 'react';

// React Router
import { Link } from 'react-router-dom';

// Hook de autenticación
import { useAuth } from '../hooks/useAuth';

// Componentes UI
import { Button } from '@/components/ui/button';

// Dialogs de auth
import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';

// Iconos de Lucide
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  PlusCircle, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck,
  Bell
} from 'lucide-react';

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
  
  // Estados para dialogs de auth
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

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
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo y nombre */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/icon.png" 
              alt="MOOD" 
              className="h-12 w-auto max-w-[48px] rounded-xl object-contain"
            />
            <img 
              src="/minimood.png" 
              alt="MOOD" 
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Links de navegación (hidden en mobile) */}
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/map" className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors flex items-center gap-1">
              <MapPin size={16} /> Mapa
            </Link>
            <Link to="/calendar" className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors flex items-center gap-1">
              <CalendarIcon size={16} /> Calendario
            </Link>
            {/* Solo usuarios logueados */}
            {user && (
              <Link to="/submit" className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors flex items-center gap-1">
                <PlusCircle size={16} /> Subir Evento
              </Link>
            )}
            {/* Solo admins */}
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors flex items-center gap-1">
                <ShieldCheck size={16} /> Admin
              </Link>
            )}
          </div>

          {/* Sección derecha: usuario o login */}
          <div className="flex items-center gap-4">
            {user ? (
              // Usuario logueado
              <div className="flex items-center gap-3">
                {/* Botón de notificaciones */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell size={20} className="text-slate-600" />
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-orange-500"></span>
                </Button>
                
                {/* Dropdown con menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent hover:border-orange-500 transition-all">
                      <AvatarImage src={user.photo_url || ''} />
                      <AvatarFallback className="bg-orange-100 text-orange-700">
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
                  className="rounded-full px-4"
                >
                  Registrarse
                </Button>
                <Button 
                  onClick={() => setLoginOpen(true)} 
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-6"
                >
                  Ingresar
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

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
