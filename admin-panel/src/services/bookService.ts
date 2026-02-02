import api from '@/lib/api';
import { Book, CreateBookDto, PaginatedResponse } from '@/types';

export const bookService = {
  getAll: async (page = 1, perPage = 10) => {
    const { data } = await api.get<PaginatedResponse<Book>>('/content/books', {
      params: { page, per_page: perPage },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Book>(`/content/books/${id}`);
    return data;
  },

  create: async (book: CreateBookDto) => {
    const { data } = await api.post<Book>('/content/books', book);
    return data;
  },

  update: async (id: number, book: Partial<CreateBookDto>) => {
    const { data } = await api.put<Book>(`/content/books/${id}`, book);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/content/books/${id}`);
  },

  search: async (query: string, page = 1, perPage = 10) => {
    const { data } = await api.get<PaginatedResponse<Book>>('/content/books/search', {
      params: { q: query, page, per_page: perPage },
    });
    return data;
  },
};
