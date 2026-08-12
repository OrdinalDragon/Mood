// ============================================================
// src/lib/analytics.ts - API para estadísticas de analytics
// ============================================================

import { type AnalyticsEventType } from './analytics';
import type { SummaryStats, ClientId } from '../types';

type AnalyticsPayload = {
  type: AnalyticsEventType;
  path?: string;
  mood?: string;
  user_id?: string;
  client_id?: string;
  referrer?: string;
  user_agent?: string;
};

export interface AnalyticsSummaryResponse extends SummaryStats {}

export function getAnalyticsSummary(days: number = 7): Promise<AnalyticsSummaryResponse> {
  return fetch(`/api/analytics/summary?days=${days}`, {
    credentials: 'include', // Incluir token JWT en requests
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

export async function trackAnalytics(event: AnalyticsPayload): Promise<void> {
  const payload: any = { ...event, timestamp: Date.now() };
  
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[Analytics] Error al enviar tracking:', error);
  }
}

export type ClientId = string;