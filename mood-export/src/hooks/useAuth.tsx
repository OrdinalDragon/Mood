/**
 * ============================================================
 * src/hooks/useAuth.tsx - Hook de Autenticación
 * ============================================================
 * Maneja la autenticación con el backend FastAPI.
 * Usa JWT almacenado en localStorage.
 */

import React, { 
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import { UserProfile } from '../types';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '../lib/api';


/**
 * Usuario que usa la app (del backend)
 */
interface AuthUser {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: string;
  favorites: string[];
  created_at: string;
  [key: string]: any; // Allow any additional fields
}


/**
 * AuthContextType - Forma del contexto de autenticación
 */
interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}


// Valor inicial cuando no hay provider
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});


/**
 * AuthProvider - Provider que envuelve la app
 * Maneja toda la lógica de autenticación con el backend
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);


  // Effect: Verificar si hay sesión al iniciar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData as unknown as AuthUser);
        } catch (error) {
          // Token inválido o expirado
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);


  /**
   * login - Iniciar sesión
   */
  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    // El token ya se guarda en apiLogin
    const userData = await getMe();
    setUser(userData as unknown as AuthUser);
  };


  /**
   * register - Registrarse
   */
  const register = async (email: string, password: string, displayName?: string) => {
    await apiRegister(email, password, displayName);
    // Auto login después de registro
    await login(email, password);
  };


  /**
   * logout - Cerrar sesión
   */
  const logout = () => {
    apiLogout();
    setUser(null);
  };


  // isAdmin: true si el rol es admin
  const isAdmin = user?.role === 'admin' || user?.email === 'schernetzki96@gmail.com';


  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: user as unknown as UserProfile,  // Compatible con tipos existentes
      loading, 
      isAdmin,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};


/**
 * useAuth - Hook para consumir el contexto de auth
 */
export const useAuth = () => useContext(AuthContext);


/**
 * Tipos para compatibilidad con código existente
 */
export type { AuthUser as User };


/**
 * user - Usuario actual (del contexto)
 * profile - Perfil del usuario
 * loading - Si está cargando
 * isAdmin - Si es administrador
 * login(email, password) - Iniciar sesión
 * register(email, password, displayName?) - Registrarse
 * logout() - Cerrar sesión
 */