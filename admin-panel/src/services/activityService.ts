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

export const activityService = {
  getViewSummary: async () => {
    const { data } = await api.get<ViewSummaryResponse>('/api/v1/views/summary');
    return data;
  },
};
