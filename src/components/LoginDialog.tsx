import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToRegister: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ open, onOpenChange, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const { login: loginContext, googleLogin: googleLoginContext, resendVerification } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginContext(email, password, rememberMe);
      onOpenChange(false);
      toast.success('Bienvenido!');
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">¡Bienvenido de vuelta!</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (credentialResponse.credential) {
                try {
                  await googleLoginContext(credentialResponse.credential);
                  onOpenChange(false);
                  toast.success('Bienvenido!');
                } catch (err: any) {
                  toast.error(err.message || 'Error al iniciar sesión con Google');
                }
              }
            }}
            onError={() => toast.error('Error al iniciar sesión con Google')}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="100%"
          />
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-gray-500 dark:text-gray-400">
              o continúa con
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400">
                Recordarme
              </Label>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-md">
              <p>{error}</p>
              {error.includes('Verificá tu email') && (
                <button
                  type="button"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    try {
                      await resendVerification(email);
                      toast.success('Email de verificación reenviado');
                    } catch (err: any) {
                      toast.error(err.message || 'Error al reenviar');
                    } finally {
                      setResending(false);
                    }
                  }}
                  className="mt-2 text-primary hover:underline font-medium"
                >
                  {resending ? 'Reenviando...' : 'Reenviar email de verificación'}
                </button>
              )}
            </div>
          )}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-primary hover:underline font-medium"
          >
            Regístrate
          </button>
        </p>

        <ForgotPasswordDialog
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
          onBackToLogin={() => setShowForgotPassword(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
