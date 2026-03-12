'use client';

import { useEffect, useState } from 'react';
import { activityService, AnalyticsSummary, PopularItem, TrendItem } from '@/services/activityService';
import { BarChart2, Eye, Star, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, p, t] = await Promise.all([
          activityService.getSummary(),
          activityService.getPopular(undefined, 10),
          activityService.getTrends(),
        ]);
        setSummary(s);
        setPopular(p);
        setTrends(t);
      } catch {
        setError('Analitik maglumatlary ýükläp bolmady');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const CONTENT_TYPE_LABELS: Record<string, string> = {
    article: 'Makala',
    book: 'Kitap',
    dissertation: 'Dissertasiýa',
  };

  const maxViews = trends.length > 0 ? Math.max(...trends.map((t) => t.views)) : 1;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Analitika</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Eye className="h-6 w-6 text-blue-600" />}
          label="Jemi görüşler"
          value={summary?.total_views ?? 0}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Star className="h-6 w-6 text-yellow-500" />}
          label="Jemi bahalandyrmalar"
          value={summary?.total_ratings ?? 0}
          bg="bg-yellow-50"
        />
        <StatCard
          icon={<BarChart2 className="h-6 w-6 text-green-600" />}
          label="Ortaça baha"
          value={summary?.average_rating != null ? summary.average_rating.toFixed(2) : '—'}
          bg="bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Popular content */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Iň köp görülen</h2>
          </div>
          {popular.length === 0 ? (
            <p className="p-6 text-gray-400">Maglumat ýok</p>
          ) : (
            <ol className="divide-y divide-gray-50">
              {popular.map((item, i) => (
                <li key={`${item.content_type}-${item.content_id}`} className="flex items-center gap-4 px-6 py-3">
                  <span className="w-6 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                  <div className="flex-1">
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                    </span>
                    <span className="ml-2 text-sm text-gray-900">#{item.content_id}</span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
                    <Eye size={14} />{item.views}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 30-day trend (mini bar chart) */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">30 günlük görüşler</h2>
          </div>
          {trends.length === 0 ? (
            <p className="p-6 text-gray-400">Maglumat ýok</p>
          ) : (
            <div className="p-4">
              <div className="flex h-40 items-end gap-0.5">
                {trends.map((t) => (
                  <div
                    key={t.date}
                    className="flex-1 rounded-t bg-indigo-400 transition-all hover:bg-indigo-600"
                    style={{ height: `${Math.max((t.views / maxViews) * 100, 2)}%` }}
                    title={`${t.date}: ${t.views} görüş`}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>{trends[0]?.date}</span>
                <span>{trends[trends.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-lg p-5 ${bg}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
