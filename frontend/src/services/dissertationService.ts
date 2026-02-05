import api from '@/lib/api';
import { Dissertation } from '@/types';

interface PaginatedResponse {
  items: Dissertation[];
  total: number;
  page: number;
  pages: number;
}

export const dissertationService = {
  getAll: async (page = 1, limit = 10, filters?: Record<string, any>): Promise<PaginatedResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/api/v1/dissertations?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Dissertation> => {
    const response = await api.get(`/api/v1/dissertations/${id}`);
    return response.data;
  },
};
