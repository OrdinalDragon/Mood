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
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToLogin: () => void;
}

export const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({ open, onOpenChange, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success('Si el correo existe, recibirás un enlace (revisá también correo no deseado)');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {sent ? 'Correo enviado' : 'Restablecer contraseña'}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-green-600 dark:text-green-400 text-lg font-medium">
              Revisá tu bandeja de entrada
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si existe una cuenta con ese correo, recibirás un enlace. Revisá también tu carpeta de correo no deseado.
            </p>
            <Button
              variant="outline"
              onClick={() => { setSent(false); setEmail(''); onBackToLogin(); }}
              className="mt-4"
            >
              Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </Button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
