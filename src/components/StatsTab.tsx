// ============================================================
// src/components/StatsTab.tsx - Tablero de estadísticas para admins
// ============================================================

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { getAnalyticsSummary } from '../lib/api';

interface SummaryStats {
  period_days: number;
  traffic_views: number;
  unique_clients: int
  unique_ips: int
  daily_views_by_hour: Dict[int, int]
  weekday_distribution: Dict[str, int]
  top_pages: List[Dict[str, any]]
  moods_counts: Dict[str, int]
  events_by_status: Dict[str, int]
  events_by_category: Dict[str, int]
  upcoming_events: List[Dict[str, Any]]
  top_favorites: Dict[str, int]
  top_rated: Dict[str, int]
  users_total: int
  users_new_per_month: int
  providers: Dict[str, int]
  engagement_reviews_count: int
  engagement_favorites_count: int
  engagement_claims_count: int
}

interface StatsContext {
  summaryStats?: SummaryStats;
  loading?: boolean;
  error?: string;
}

const useStats = () => {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  
  useEffect(() => {
    const days = parseInt(params.get('days') || '7', 10) || 7;
    
    setLoading(true);
    getAnalyticsSummary(days)
      .then(data => setSummary(data))
      .catch(err => {
        console.error('Error fetching analytics:', err);
        alert('No se pudo cargar estadísticas. Verifica permisos de admin.');
        throw err;
      })
      .finally(() => setLoading(false));
  }, [params.get('days')]);

  return { summaryStats: summary, loading, error: null };
};

// Componente KPIs individual (card con métrica)
const KpiCard = ({ title, value, subtitle }: { title: string; value: number | string; subtitle?: string }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
    <p className="text-xs text-slate-500 font-medium">{title}</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

// Helper para ordenar por valor descendente
const sortDesc = (arr: Array<{ label: string; value: number }>) => 
  arr.sort((a, b) => b.value - a.value);

export default function StatsTab() {
  const { summaryStats, loading } = useStats();

  if (loading) return <div className="p-8 text-center">Cargando estadísticas...</div>;
  if (!summaryStats) return null;

  // Helper para ordenar por valor descendente
  const sortDesc = (arr: Array<{ label: string; value: number }>) => 
    arr.sort((a, b) => b.value - a.value);

  const topPages = sortDesc(summaryStats.top_pages);
  const topFavs = sortDesc(summaryStats.top_favorites as any);
  const topRated = sortDesc(summaryStats.top_rated as any);

  return (
    <div className="space-y-8">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Views totales" value={summaryStats.traffic_views} />
        <KpiCard title="Users únicos" value={summaryStats.unique_clients} />
        <KpiCard title="Eventos próximos (7d)" value={summaryStats.upcoming_events.length} />
        <KpiCard 
          title="Reviews totales" 
          value={summaryStats.engagement_reviews_count}
        />
      </div>

      {/* Gráfico de views por hora del día */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Visits por hora del día</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={Object.entries(summaryStats.daily_views_by_hour).map(([hour, count]) => ({ hour: `${hour}:00`, value: count })} dataKey="value" xAxisLabel="Hour">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tickValues={[0,6,12,18]} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" fill="none" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de moods más usados (bar chart) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Moods más usados</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={Object.entries(summaryStats.moods_counts).map(([mood, count]) => ({ mood, value: count })} xAxisLabel="Mood" yAxisLabel="Count">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mood" categoryColor="#4F46E5" />
            <YAxis />
            <Tooltip />
            <Bar type="bar" dataKey="value" fill="#4F46E5" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top páginas vistas */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Top páginas vistas</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {topPages.map((page, i) => (
            <div key={i} className="flex items-center gap-2 text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
              <span>{(i + 1).toString()}</span>
              <span className="font-medium truncate w-[60%]">{page.page}</span>
              <span className="text-right font-bold">{page.views.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Eventos por categoría y estado */}
      <div className="grid grid-cols-2 gap-4">
        {['Categorías', 'Estado'].map((title, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{title}</h3>
            {idx === 1 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(summaryStats.events_by_category).map(([cat, count]) => ({ category: cat, value: count })} xAxisLabel="Category" yAxisLabel="Count">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar type="bar" dataKey="value" fill="#10B981" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>

      {/* Usuarios por provider */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Usuarios por provider</h3>
        {Object.entries(summaryStats.providers).map(([prov, count], i) => (
          <div key={i} className={`flex items-center gap-2 mt-${i === 0 ? '0' : '1'} ${i === 0 ? 'border-b border-slate-100 dark:border-slate-700 pb-1' : ''}`}>
            <span>{prov.charAt(0).toUpperCase() + prov.slice(1)}</span>
            <span className="font-bold">{count}</span>
          </div>
        ))}
      </div>

      {/* Top favoritos y valorados */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Top favoritos</h3>
          {topFavs.length > 0 ? (
            Object.entries(topFavs).map((title, count), i) => (
              <div key={i} className={`flex items-center gap-2 mt-${i === 0 ? '0' : '1'} ${i === 0 ? 'border-b border-slate-100 dark:border-slate-700 pb-1' : ''}`}>
                <span>{(i + 1).toString()}</span>
                <span className="font-medium truncate w-[60%]">{title}</span>
                <span className="text-right font-bold text-xs">{count}</span>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No hay datos</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Top valorados</h3>
            {topRated.length > 0 ? (
              Object.entries(topRated).map((title, count), i) => (
                <div key={i} className={`flex items-center gap-2 mt-${i === 0 ? '0' : '1'} ${i === 0 ? 'border-b border-slate-100 dark:border-slate-700 pb-1' : ''}`}>
                  <span>{(i + 1).toString()}</span>
                  <span className="font-medium truncate w-[60%]">{title}</span>
                  <span className="text-right font-bold text-xs">{count}</span>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No hay datos</p>
            )}
          </div>
        </div>

        {/* Eventos próximos (lista compacta) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Eventos próximos ({summaryStats.period_days} días)</h3>
          {summaryStats.upcoming_events.length > 0 ? (
            summaryStats.upcoming_events.map((evt, i) => (
              <div key={i} className={`flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800 rounded ${i === 0 ? 'border-l-4 border-blue-500' : ''}`}>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{evt.date}</span>
                <div>
                  <p className="font-medium truncate w-[60%]">{evt.title}</p>
                  <p className="text-xs text-slate-500">{evt.location || 'Sin ubicación'}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No hay eventos próximos</p>
            )}
          </div>
        </div>

        {/* Resumen de usuarios y engagement */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Resumen de usuarios y engagement</h3>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
              <p>Total de usuarios: <span className="font-bold">{summaryStats.users_total}</span></p>
              <p>Nuevos por mes: <span className="font-bold">{summaryStats.users_new_per_month}</span></p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-3">
              <p>Reviews totales: <span className="font-bold text-green-600">{summaryStats.engagement_reviews_count}</span></p>
              <p>Favoritos totales: <span className="font-bold text-blue-600">{summaryStats.engagement_favorites_count}</span></p>
            </div>
          </div>
        </div>

      </div>

      {/* Eventos próximos (lista compacta) */}
      {summaryStats.upcoming_events.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Eventos próximos ({summaryStats.period_days} días)</h3>
          {summaryStats.upcoming_events.slice(0, 10).map((evt, i) => (
            <div key={i} className={`flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800 rounded ${i === 0 ? 'border-l-4 border-blue-500' : ''}`}>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{evt.date}</span>
              <div>
                <p className="font-medium truncate w-[60%]">{evt.title}</p>
                <p className="text-xs text-slate-500">{evt.location?.city || 'Sin ubicación'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};