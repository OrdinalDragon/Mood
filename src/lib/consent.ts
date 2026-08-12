// ============================================================
// src/lib/consent.ts - Estado de consentimiento y función para reabrir banner
// ============================================================

const ANALYTICS_KEY = 'mood_analytics';
const CONSENT_KEY = 'mood_consent_state';
type ConsentState = 'accepted' | 'rejected' | 'null';

export function getConsentState(): ConsentState {
  const val: string | null = localStorage.getItem(CONSENT_KEY);
  if (val === 'rejected') return 'rejected';
  return val ? 'accepted' : 'null'; // null = indecidido
}

export function setConsent(state: 'accepted' | 'rejected'): void {
  localStorage.setItem(CONSENT_KEY, state);
}

// Reabrir el banner de consentimiento cuando se clicks en "Cookies" del footer
export function openConsent(): void {
  const consent = getConsentState();
  if (consent === 'accepted' || consent === 'rejected') {
    return; // Ya hizo decisión, no reabrir
  }
  // Si es "null" (indecidido), reabrir el banner
}