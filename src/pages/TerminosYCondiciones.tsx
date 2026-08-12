// ============================================================
// src/pages/TerminosYCondiciones.tsx - Términos, condiciones y privacidad
// ============================================================

import React from 'react';

export default function TerminosYCondiciones() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Términos de Servicio y Privacidad</h1>

      {/* ... contenido existente de términos generales ... */}

      {/* ── NUEVO: Sección Política de Cookies y Privacidad (id="cookies") ──── */}
      <section id="cookies" className="mt-12 border-t border-slate-200 pt-6">
        <h3 className="text-xl font-bold mb-4">🍪 Política de Cookies y Privacidad</h3>
        
        <p className="mb-4">
          Al visitar nuestra aplicación MOOD, utilizamos cookies para:
        </p>

        <ul className="space-y-2 text-sm mb-4">
          <li><strong>Personalización:</strong> Recordar tu estado de ánimo (mood) elegido en la app.</li>
          <li><strong>Rastreo de uso:</strong> Anotar qué páginas y eventos has visto para mejorar recomendaciones.</li>
          <li><strong>Autenticación:</strong> Mantener sesión activa tras login.</li>
          <li><strong>Preferencias:</strong> Recorrer preferencias de diseño (modo oscuro/luz, etc.).</li>
        </ul>

        <p className="mb-4">
          Al hacer click en "Aceptar" o "Rechazar", tu decisión se guarda localmente. Si eliges rechazar, 
          las funciones de analytics y telemetría se desactivan por completo, pero las demás 
          funcionalidades (login, mood, favoritos) seguirán funcionando normalmente.
        </p>

        <p className="mb-4">
          Si cambias tu decisión en cualquier momento, puedes volver a este aviso desde el enlace "Cookies y privacidad" 
          en la parte inferior de la página. Tu decisión se guardará permanentemente.
        </p>
      </section>

      {/* ... resto del contenido existente (licencia, etc.) ... */}
    </div>
  );
}