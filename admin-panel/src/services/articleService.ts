import api from '@/lib/api';
import { Article, CreateArticleDto, PaginatedResponse } from '@/types';

export const articleService = {
  getAll: async (page = 1, perPage = 10) => {
    const { data } = await api.get<PaginatedResponse<Article>>('/api/v1/articles', {
      params: { page, per_page: perPage },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Article>(`/api/v1/articles/${id}`);
    return data;
  },

  create: async (article: CreateArticleDto) => {
    const { data } = await api.post<Article>('/api/v1/articles', article);
    return data;
  },

  update: async (id: number, article: Partial<CreateArticleDto>) => {
    const { data } = await api.put<Article>(`/api/v1/articles/${id}`, article);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/api/v1/articles/${id}`);
  },

  search: async (query: string, page = 1, perPage = 10) => {
    const { data } = await api.get<PaginatedResponse<Article>>('/api/v1/articles/search', {
      params: { q: query, page, per_page: perPage },
    });
    return data;
  },
};
