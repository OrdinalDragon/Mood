// ============================================================
// src/types.ts - Tipos globales para la aplicación MOOD
// ============================================================

import type { AnalyticsEventType, ClientId } from '../lib/analytics';
import type { Event } from './App';

export interface MoodType {
  id: string;
  label: string;
  emoji: string;
}

export const MOODS: MoodType[] = [
  { id: 'alegre', label: 'Alegre 😊', emoji: '😊' },
  { id: 'triste', label: 'Triste 😢', emoji: '😢' },
  { id: 'enojado', label: 'Enojado 😠', emoji: '😠' },
  { id: 'tranquilo', label: 'Tranquilo 😌', emoji: '😌' },
  { id: 'reservado', label: 'Reservado 🤫', emoji: '🤫' }
];

export interface EventResponse extends any {
  id: string;
  title: string;
  date: Date | string;
  location: { lat: number; lng: number };
}

// ─── Tipos para analytics ────────────────────────────────────────

export type SummaryStats = {
  period_days: number;
  traffic_views: number;
  unique_clients: number;
  unique_ips: number;
  daily_views_by_hour: Record<number, number>;
  weekday_distribution: Record<string, number>;
  top_pages: Array<{ page: string; views: number }>;
  moods_counts: Record<string, number>;
  events_by_status: Record<string, number>;
  events_by_category: Record<string, number>;
  upcoming_events: Array<any>;
  top_favorites: Record<string, number>;
  top_rated: Record<string, number>;
  users_total: number;
  users_new_per_month: number;
  providers: Record<string, number>;
  engagement_reviews_count: number;
  engagement_favorites_count: number;
  engagement_claims_count: number;
};

export type ClientId = string;