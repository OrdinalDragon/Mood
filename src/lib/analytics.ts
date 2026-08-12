// ============================================================
// src/lib/analytics.ts - Tracking de uso + resumen para admins
// ============================================================

import type { SummaryStats } from '../types';
import { isConsentGiven } from './consent';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const CLIENT_ID_KEY = 'mood_client_id';

export type AnalyticsEventType =
  | 'page_view'
  | 'mood_select'
  | 'search'
  | 'event_view'
  | 'favorite'
  | 'review'
  | 'consent';

type AnalyticsPayload = {
  type: AnalyticsEventType;
  path?: string;
  mood?: string;
  user_id?: string;
  client_id?: string;
  referrer?: string;
  user_agent?: string;
};

// Identificador anónimo persistente por navegador (solo se crea si hay consentimiento).
export function getClientId(): string | null {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

// Envío fire-and-forget: sin consentimiento no se manda nada (opt-in).
export function track(event: Omit<AnalyticsPayload, 'client_id'>): void {
  if (!isConsentGiven()) return;

  const payload: AnalyticsPayload = {
    ...event,
    client_id: getClientId() || undefined,
  };

  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_URL}/analytics/track`, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(`${API_URL}/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silencioso: el tracking nunca debe romper la navegación.
  }
}

export function trackPageView(path: string): void {
  track({ type: 'page_view', path });
}

export function trackMoodSelection(mood: string): void {
  track({ type: 'mood_select', mood, path: window.location.pathname });
}

export function trackSearch(query: string): void {
  track({ type: 'search', path: `${window.location.pathname}?q=${encodeURIComponent(query)}` });
}

export function trackEventView(eventId: string): void {
  track({ type: 'event_view', path: `/event/${eventId}` });
}

export function trackFavorite(eventId: string): void {
  track({ type: 'favorite', path: `/event/${eventId}` });
}

export function trackReview(eventId: string): void {
  track({ type: 'review', path: `/event/${eventId}` });
}

// ─── Resumen para el dashboard de admin ─────────────────────────────

export async function getAnalyticsSummary(days: number = 7): Promise<SummaryStats> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/analytics/summary?days=${days}`, { headers });
  if (!response.ok) {
    if (response.status === 403) throw new Error('Solo admins pueden ver estadísticas');
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
