// ============================================================
// src/lib/consent.ts - Gestión de consentimiento de cookies
// ============================================================

export type ConsentState = 'accepted' | 'rejected' | 'null';

const CONSENT_KEY = 'mood_consent_state';
const CONSENT_EVENT = 'mood:open-consent';

export function getConsentState(): ConsentState {
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'rejected') return 'rejected';
  if (val === 'accepted') return 'accepted';
  return 'null';
}

export function isConsentGiven(): boolean {
  return getConsentState() === 'accepted';
}

export function setConsent(state: 'accepted' | 'rejected'): void {
  localStorage.setItem(CONSENT_KEY, state);
}

// Fuerza la apertura del banner (link "Cookies" del footer).
// CookieConsent escucha este evento y se muestra aunque ya haya decidido.
export function openConsent(): void {
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}
