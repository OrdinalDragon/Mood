// ============================================================
// src/components/CookieConsent.tsx - Banner de consentimiento no bloqueante
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConsentState, setConsent } from '../lib/consent';
import { trackPageView } from '../lib/analytics';

const CONSENT_EVENT = 'mood:open-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  // Mostrar banner si el usuario aún no decidió; reaccionar a openConsent().
  useEffect(() => {
    const timer = setTimeout(() => {
      if (getConsentState() === 'null') setVisible(true);
    }, 1500);

    const open = () => setVisible(true);
    window.addEventListener(CONSENT_EVENT, open);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, open);
    };
  }, []);

  const handleAccept = () => {
    setConsent('accepted');
    setVisible(false);
    trackPageView(window.location.pathname);
  };

  const handleReject = () => {
    setConsent('rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white py-3 px-4 shadow-lg border-t border-slate-700"
      role="dialog"
      aria-label="Aviso de cookies"
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-300 max-w-2xl">
          🍪 Usamos cookies para entender cómo se usa la plataforma y mejorar la experiencia.
          Podés rechazarlas: el sitio sigue funcionando igual, solo que no se registran estadísticas de uso.
        </p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/terminos-y-condiciones#cookies')}
            className="text-xs text-slate-400 underline hover:text-white transition-colors"
          >
            Más información
          </button>
          <button
            onClick={handleReject}
            className="px-3 py-1.5 text-xs font-medium rounded border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 text-sm font-semibold rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
