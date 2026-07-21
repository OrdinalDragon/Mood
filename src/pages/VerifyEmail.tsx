import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no encontrado');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verificado exitosamente');
        } else {
          setStatus('error');
          setMessage(data.detail || 'Token inválido o expirado');
        }
      } catch {
        setStatus('error');
        setMessage('Error de conexión al servidor');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verificando tu email...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{message}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Ya podés iniciar sesión con tu cuenta.</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Ir al inicio
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Error de verificación</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
