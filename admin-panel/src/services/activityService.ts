import api from '@/lib/api';

export interface ViewSummaryBucket {
  total: number;
  authenticated: number;
  anonymous: number;
}

export interface ViewSummaryResponse {
  total: number;
  authenticated: number;
  anonymous: number;
  byContentType: Record<'article' | 'book' | 'dissertation', ViewSummaryBucket>;
}

export interface PopularItem {
  content_type: string;
  content_id: number;
  views: number;
  last_viewed: string;
}

export interface TrendItem {
  date: string;
  views: number;
}

export interface AnalyticsSummary {
  total_views: number;
  total_ratings: number;
  average_rating: number | null;
}

export const activityService = {
  getViewSummary: async () => {
    const { data } = await api.get<ViewSummaryResponse>('/api/v1/views/summary');
    return data;
  },
  getPopular: async (content_type?: string, limit = 10) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (content_type) params.set('content_type', content_type);
    const { data } = await api.get<{ popular: PopularItem[] }>(`/api/v1/analytics/popular?${params}`);
    return data.popular;
  },
  getTrends: async (content_type?: string) => {
    const params = content_type ? `?content_type=${content_type}` : '';
    const { data } = await api.get<{ trends: TrendItem[] }>(`/api/v1/analytics/trends${params}`);
    return data.trends;
  },
  getSummary: async () => {
    const { data } = await api.get<AnalyticsSummary>('/api/v1/analytics/summary');
    return data;
  },
};
