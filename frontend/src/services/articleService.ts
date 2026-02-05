import api from '@/lib/api';
import { Article, PaginatedResponse } from '@/types';

export const articleService = {
  getAll: async (page = 1, perPage = 10, filters?: { author?: string; language?: string; category_id?: number; search?: string }) => {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (filters?.author) params.append('author', filters.author);
    if (filters?.language) params.append('language', filters.language);
    if (filters?.category_id) params.append('category_id', filters.category_id.toString());
    if (filters?.search) params.append('search', filters.search);

    const { data } = await api.get<PaginatedResponse<Article>>(`/api/v1/articles?${params.toString()}`);
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Article>(`/api/v1/articles/${id}`);
    return data;
  },
};
