import api from '@/lib/api';
import { Book } from '@/types';

interface PaginatedResponse {
  items: Book[];
  total: number;
  page: number;
  pages: number;
}

export const bookService = {
  getAll: async (page = 1, limit = 20, filters?: Record<string, any>): Promise<PaginatedResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: limit.toString(),
      ...filters,
    });
    const response = await api.get(`/api/v1/books?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Book> => {
    const response = await api.get(`/api/v1/books/${id}`);
    return response.data;
  },

  getLatest: async (limit = 10): Promise<Book[]> => {
    const response = await api.get(`/api/v1/books?page=1&per_page=${limit}`);
    return response.data.items;
  },

  getMostViewed: async (limit = 10): Promise<Book[]> => {
    const response = await api.get(`/api/v1/books?page=1&per_page=${limit}`);
    return response.data.items.sort((a: Book, b: Book) => b.views - a.views);
  },
};
