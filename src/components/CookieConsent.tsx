// ============================================================
// src/components/CookieConsent.tsx - Banner de consentimiento no bloqueante
// ============================================================

import React from 'react';
import { useState } from 'react';
import { getConsentState, setConsent, openConsent } from '../lib/consent';

interface CookieConsentProps {
  onAccept: () => void;
  onReject: () => void;
}

export default function CookieConsent({ onAccept, onReject }: CookieConsentProps) {
  const [showed, setShowed] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('mood_consent_state')) {
      // Mostrar banner inmediatamente al primer visitante
      setTimeout(showBanner, 1500);
    } else {
      setShowed(true);
    }
  }, []);

  function showBanner() {
    setShowed(false);
    setTimeout(() => setShowed(true), 2000); // Mostrar durante 2 segundos antes de cerrar
  }

  const handleAccept = () => {
    onAccept();
    localStorage.setItem('mood_consent_state', 'accepted');
    setShowed(true);
  };

  const handleReject = () => {
    onReject();
    localStorage.setItem('mood_consent_state', 'rejected');
    setShowed(true);
  };

  if (showed) return null; // Ocultado si ya fue interactuado

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white py-3 px-4 flex items-center justify-between">
      <span className="text-sm font-medium">
        ⚠️ Este sitio recolecta datos de uso para mejorar la experiencia. 
        Aceptar los términos y cookies?
      </span>
      <div className="flex gap-2">
        <button onClick={handleReject} className="px-3 py-1 text-xs rounded hover:bg-slate-700 transition">
          Rechazar
        </button>
        <button 
          onClick={handleAccept} 
          className="px-4 py-1 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-500 transition"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

import { useEffect } from 'react';