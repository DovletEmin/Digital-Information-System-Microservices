import api from '@/lib/api';
import { Dissertation, CreateDissertationDto, PaginatedResponse } from '@/types';

export const dissertationService = {
  getAll: async (page = 1, perPage = 10) => {
    const { data } = await api.get<PaginatedResponse<Dissertation>>('/api/v1/dissertations', {
      params: { page, per_page: perPage },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Dissertation>(`/api/v1/dissertations/${id}`);
    return data;
  },

  create: async (dissertation: CreateDissertationDto) => {
    const { data } = await api.post<Dissertation>('/api/v1/dissertations', dissertation);
    return data;
  },

  update: async (id: number, dissertation: Partial<CreateDissertationDto>) => {
    const { data } = await api.put<Dissertation>(`/api/v1/dissertations/${id}`, dissertation);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/v1/dissertations/${id}`);
  },

  search: async (query: string, page = 1, perPage = 10) => {
    const { data } = await api.get<PaginatedResponse<Dissertation>>('/api/v1/dissertations', {
      params: { search: query, page, per_page: perPage },
    });
    return data;
  },
};
