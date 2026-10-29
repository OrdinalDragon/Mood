/**
 * src/hooks/useAuth.tsx - Hook de Autenticación
 * Mantiene el access token en memoria y restaura la sesión con el refresh
 * token HttpOnly al cargar la página.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import {
  AuthResponse,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe,
  googleLogin as apiGoogleLogin,
  sendVerification as apiSendVerification,
  resendVerification as apiResendVerification,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  updateProfile as apiUpdateProfile,
  mfaVerify as apiMfaVerify,
  refreshAccessToken,
} from '../lib/api';

interface AuthUser {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: string;
  favorites: string[];
  created_at: string;
  email_verified?: string;
  auth_provider?: string;
  mfa_enabled?: boolean;
  has_password?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
  register: (email: string, password: string, displayName?: string) => Promise<{ message: string }>;
  googleLogin: (credential: string) => Promise<AuthResponse>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: { display_name?: string; photo_url?: string; email_notifications?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: async () => ({}),
  register: async () => ({} as { message: string }),
  googleLogin: async () => ({}),
  verifyMfa: async () => {},
  sendVerification: async () => {},
  resendVerification: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Restaura la sesión con la cookie HttpOnly; no hay token persistente.
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const userData = await getMe();
          setUser(userData as unknown as AuthUser);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false,
  ): Promise<AuthResponse> => {
    const response = await apiLogin(email, password, rememberMe);
    if (response.access_token) {
      const userData = await getMe();
      setUser(userData as unknown as AuthUser);
    }
    return response;
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    const response = await apiMfaVerify(mfaToken, code);
    if (!response.access_token) throw new Error('No se pudo completar el segundo factor');
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

  const googleLogin = async (credential: string): Promise<AuthResponse> => {
    const response = await apiGoogleLogin(credential);
    if (response.access_token) {
      const userData = await getMe();
      setUser(userData as unknown as AuthUser);
    }
    return response;
  };

  const updateProfile = async (data: {
    display_name?: string;
    photo_url?: string;
    email_notifications?: boolean;
  }) => {
    const updated = await apiUpdateProfile(data);
    setUser(updated as unknown as AuthUser);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user as unknown as UserProfile,
        loading,
        isAdmin,
        login,
        register,
        googleLogin,
        verifyMfa,
        sendVerification,
        resendVerification,
        forgotPassword,
        resetPassword,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export type { AuthUser as User };
