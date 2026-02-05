import api from '@/lib/api';
import { Category } from '@/types';

export const categoryService = {
  getArticleCategories: async () => {
    const { data } = await api.get<Category[]>('/api/v1/article-categories');
    return data;
  },

  getBookCategories: async () => {
    const { data } = await api.get<Category[]>('/api/v1/book-categories');
    return data;
  },

  getDissertationCategories: async () => {
    const { data } = await api.get<Category[]>('/api/v1/dissertation-categories');
    return data;
  },
};
