// ============================================================
// src/components/StatsTab.tsx - Estadísticas para el dashboard de admin
// ============================================================

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getAnalyticsSummary } from '../lib/analytics';
import type { SummaryStats } from '../types';

const DAY_RANGES = [7, 30, 90] as const;

function KpiCard({ title, value, subtitle }: { title: string; value: number | string; subtitle?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <p className="text-xs text-slate-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value.toLocaleString('es-AR')}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

function RankList({ title, items }: { title: string; items: Array<[string, number]> }) {
  return (
    <ChartCard title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos todavía.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
          {items.map(([label, count], i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-slate-400 text-xs">{i + 1}</span>
              <span className="font-medium truncate flex-1 text-slate-700 dark:text-slate-200">{label}</span>
              <span className="font-bold text-slate-900 dark:text-white">{count.toLocaleString('es-AR')}</span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}

export default function StatsTab() {
  const [days, setDays] = useState<number>(7);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAnalyticsSummary(days)
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>{error}</p>
        <p className="text-sm text-slate-400 mt-2">Verificá que estés logueado como admin.</p>
      </div>
    );
  }

  if (!summary) return null;

  const hourlyViews: Record<string, number> = summary.daily_views_by_hour;
  const moodsCounts: Record<string, number> = summary.moods_counts;
  const categories: Record<string, number> = summary.events_by_category;
  const weekdays: Record<string, number> = summary.weekday_distribution;
  const topFavorites: Record<string, number> = summary.top_favorites;
  const topRated: Record<string, number> = summary.top_rated;
  const providerCounts: Record<string, number> = summary.providers;
  const eventsStatus: Record<string, number> = summary.events_by_status;

  const hourlyData = Object.entries(hourlyViews).map(([hour, count]) => ({
    hour: `${hour.padStart(2, '0')}:00`,
    views: count,
  }));

  const moodData = Object.entries(moodsCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({ mood, count }));

  const categoryData = Object.entries(categories).map(([category, count]) => ({ category, count }));
  const weekdayData = Object.entries(weekdays).map(([day, count]) => ({ day, count }));

  const topPages = summary.top_pages.map((p) => [p.page, p.views] as [string, number]);

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">Período:</span>
        {DAY_RANGES.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Views totales" value={summary.traffic_views} />
        <KpiCard title="Visitantes únicos" value={summary.unique_clients} />
        <KpiCard title="IPs únicas" value={summary.unique_ips} />
        <KpiCard title="Usuarios registrados" value={summary.users_total} subtitle={`${summary.users_new_per_month} nuevos en 30 días`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Views por hora */}
        <ChartCard title="Visitas por hora del día">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" interval={2} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Día de la semana */}
        <ChartCard title="Visitas por día de la semana">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Moods más usados */}
        <ChartCard title="Moods más usados">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mood" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Eventos por categoría */}
        <ChartCard title="Eventos por categoría">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RankList title="Páginas más vistas" items={topPages} />
        <RankList title="Eventos favoritos" items={Object.entries(topFavorites)} />
        <RankList title="Eventos mejor valorados (por reviews)" items={Object.entries(topRated)} />
        <RankList title="Usuarios por provider" items={Object.entries(providerCounts)} />
      </div>

      {/* Eventos próximos */}
      <ChartCard title={`Eventos próximos (${summary.period_days} días)`}>
        {summary.upcoming_events.length === 0 ? (
          <p className="text-sm text-slate-400">No hay eventos próximos en este período.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {summary.upcoming_events.slice(0, 15).map((evt) => (
              <div key={evt.id} className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="font-medium truncate text-slate-700 dark:text-slate-200">{evt.title}</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(evt.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Engagement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Reviews" value={summary.engagement_reviews_count} />
        <KpiCard title="Favoritos" value={summary.engagement_favorites_count} />
        <KpiCard title="Reclamos de eventos" value={summary.engagement_claims_count} />
        <KpiCard
          title="Eventos totales"
          value={Object.values(eventsStatus).reduce((a, b) => a + b, 0)}
          subtitle={Object.entries(eventsStatus)
            .map(([s, c]) => `${s}: ${c}`)
            .join(' · ')}
        />
      </div>
    </div>
  );
}
