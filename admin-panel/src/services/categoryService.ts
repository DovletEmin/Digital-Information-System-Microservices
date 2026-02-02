import api from '@/lib/api';
import { Category } from '@/types';

export const categoryService = {
  // Article Categories
  getArticleCategories: async () => {
    const { data } = await api.get<Category[]>('/content/categories/articles');
    return data;
  },

  createArticleCategory: async (name: string) => {
    const { data } = await api.post<Category>('/content/categories/articles', { name });
    return data;
  },

  updateArticleCategory: async (id: number, name: string) => {
    const { data } = await api.put<Category>(`/content/categories/articles/${id}`, { name });
    return data;
  },

  deleteArticleCategory: async (id: number) => {
    await api.delete(`/content/categories/articles/${id}`);
  },

  // Book Categories
  getBookCategories: async () => {
    const { data } = await api.get<Category[]>('/content/categories/books');
    return data;
  },

  createBookCategory: async (name: string, parent_id?: number) => {
    const { data } = await api.post<Category>('/content/categories/books', { name, parent_id });
    return data;
  },

  updateBookCategory: async (id: number, name: string, parent_id?: number) => {
    const { data } = await api.put<Category>(`/content/categories/books/${id}`, { name, parent_id });
    return data;
  },

  deleteBookCategory: async (id: number) => {
    await api.delete(`/content/categories/books/${id}`);
  },

  // Dissertation Categories
  getDissertationCategories: async () => {
    const { data } = await api.get<Category[]>('/content/categories/dissertations');
    return data;
  },

  createDissertationCategory: async (name: string, parent_id?: number) => {
    const { data } = await api.post<Category>('/content/categories/dissertations', { name, parent_id });
    return data;
  },

  updateDissertationCategory: async (id: number, name: string, parent_id?: number) => {
    const { data } = await api.put<Category>(`/content/categories/dissertations/${id}`, { name, parent_id });
    return data;
  },

  deleteDissertationCategory: async (id: number) => {
    await api.delete(`/content/categories/dissertations/${id}`);
  },
};
