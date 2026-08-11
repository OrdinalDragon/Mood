/**
 * src/hooks/useAuth.tsx - Hook de Autenticación
 * Maneja la autenticación con el backend FastAPI.
 * Usa JWT almacenado en localStorage.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe, googleLogin as apiGoogleLogin, sendVerification as apiSendVerification, resendVerification as apiResendVerification, forgotPassword as apiForgotPassword, resetPassword as apiResetPassword, updateProfile as apiUpdateProfile } from '../lib/api';

interface AuthUser {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: string;
  favorites: string[];
  created_at: string;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<{ message: string }>;
  googleLogin: (credential: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: { display_name?: string; photo_url?: string; email_notifications?: boolean }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => ({} as { message: string }),
  googleLogin: async () => {},
  sendVerification: async () => {},
  resendVerification: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData as unknown as AuthUser);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    await apiLogin(email, password);
    const userData = await getMe();
    setUser(userData as unknown as AuthUser);
  };

  const register = async (email: string, password: string, displayName?: string) => {
    return apiRegister(email, password, displayName || '');
  };

  const sendVerification = async () => {
    await apiSendVerification();
  };

  const resendVerification = async (email: string) => {
    await apiResendVerification(email);
  };

  const forgotPassword = async (email: string) => {
    await apiForgotPassword(email);
  };

  const resetPassword = async (token: string, password: string) => {
    await apiResetPassword(token, password);
  };

  const googleLogin = async (credential: string) => {
    await apiGoogleLogin(credential);
    const userData = await getMe();
    setUser(userData as unknown as AuthUser);
  };

  const updateProfile = async (data: { display_name?: string; photo_url?: string; email_notifications?: boolean }) => {
    const updated = await apiUpdateProfile(data);
    setUser(updated as unknown as AuthUser);
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'schernetzki96@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile: user as unknown as UserProfile, loading, isAdmin, login, register, googleLogin, sendVerification, resendVerification, forgotPassword, resetPassword, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export type { AuthUser as User };
