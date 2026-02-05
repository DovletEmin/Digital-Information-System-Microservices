import api from '@/lib/api';
import type { Article, Book, Dissertation, PaginatedResponse } from '@/types';

export interface Highlight {
  id: number;
  article_id: number;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface BookHighlight {
  id: number;
  book_id: number;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface DissertationHighlight {
  id: number;
  dissertation_id: number;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedArticle {
  id: number;
  article_id: number;
  created_at: string;
}

export const savedService = {
  // Закладки
  saveArticle: async (articleId: number) => {
    const { data } = await api.post('/api/v1/saved-articles', { article_id: articleId });
    return data;
  },

  unsaveArticle: async (articleId: number) => {
    const { data } = await api.delete(`/api/v1/saved-articles/${articleId}`);
    return data;
  },

  checkIfSaved: async (articleId: number) => {
    const { data } = await api.get<{ is_saved: boolean }>(`/api/v1/saved-articles/check/${articleId}`);
    return data.is_saved;
  },

  getSavedArticles: async (page = 1, perPage = 20) => {
    const { data } = await api.get<PaginatedResponse<Article>>(`/api/v1/saved-articles?page=${page}&per_page=${perPage}`);
    return data;
  },

  getSavedBooks: async (page = 1, perPage = 20) => {
    const { data } = await api.get<PaginatedResponse<Book>>(`/api/v1/saved-books?page=${page}&per_page=${perPage}`);
    return data;
  },

  getSavedDissertations: async (page = 1, perPage = 20) => {
    const { data } = await api.get<PaginatedResponse<Dissertation>>(`/api/v1/saved-dissertations?page=${page}&per_page=${perPage}`);
    return data;
  },

  // Выделения
  createHighlight: async (highlight: {
    article_id: number;
    text: string;
    start_offset: number;
    end_offset: number;
    color?: string;
    note?: string;
  }) => {
    const { data } = await api.post<Highlight>('/api/v1/highlights', highlight);
    return data;
  },

  getHighlights: async (articleId: number) => {
    const { data } = await api.get<Highlight[]>(`/api/v1/highlights/${articleId}`);
    return data;
  },

  updateHighlight: async (highlightId: number, updates: { color?: string; note?: string }) => {
    const { data } = await api.put<Highlight>(`/api/v1/highlights/${highlightId}`, updates);
    return data;
  },

  deleteHighlight: async (highlightId: number) => {
    const { data } = await api.delete(`/api/v1/highlights/${highlightId}`);
    return data;
  },

  // Book saved
  saveBook: async (bookId: number) => {
    const { data } = await api.post('/api/v1/saved-books', { book_id: bookId });
    return data;
  },

  unsaveBook: async (bookId: number) => {
    const { data } = await api.delete(`/api/v1/saved-books/${bookId}`);
    return data;
  },

  checkIfBookSaved: async (bookId: number) => {
    const { data } = await api.get<{ is_saved: boolean }>(`/api/v1/saved-books/check/${bookId}`);
    return data.is_saved;
  },

  // Book highlights
  createBookHighlight: async (highlight: {
    book_id: number;
    text: string;
    start_offset: number;
    end_offset: number;
    color?: string;
    note?: string;
  }) => {
    const { data } = await api.post<BookHighlight>('/api/v1/book-highlights', highlight);
    return data;
  },

  getBookHighlights: async (bookId: number) => {
    const { data } = await api.get<BookHighlight[]>(`/api/v1/book-highlights/${bookId}`);
    return data;
  },

  updateBookHighlight: async (highlightId: number, updates: { color?: string; note?: string }) => {
    const { data } = await api.put<BookHighlight>(`/api/v1/book-highlights/${highlightId}`, updates);
    return data;
  },

  deleteBookHighlight: async (highlightId: number) => {
    const { data } = await api.delete(`/api/v1/book-highlights/${highlightId}`);
    return data;
  },

  // Dissertation saved
  saveDissertation: async (dissertationId: number) => {
    const { data } = await api.post('/api/v1/saved-dissertations', { dissertation_id: dissertationId });
    return data;
  },

  unsaveDissertation: async (dissertationId: number) => {
    const { data } = await api.delete(`/api/v1/saved-dissertations/${dissertationId}`);
    return data;
  },

  checkIfDissertationSaved: async (dissertationId: number) => {
    const { data } = await api.get<{ is_saved: boolean }>(`/api/v1/saved-dissertations/check/${dissertationId}`);
    return data.is_saved;
  },

  // Dissertation highlights
  createDissertationHighlight: async (highlight: {
    dissertation_id: number;
    text: string;
    start_offset: number;
    end_offset: number;
    color?: string;
    note?: string;
  }) => {
    const { data } = await api.post<DissertationHighlight>('/api/v1/dissertation-highlights', highlight);
    return data;
  },

  getDissertationHighlights: async (dissertationId: number) => {
    const { data } = await api.get<DissertationHighlight[]>(`/api/v1/dissertation-highlights/${dissertationId}`);
    return data;
  },

  updateDissertationHighlight: async (highlightId: number, updates: { color?: string; note?: string }) => {
    const { data } = await api.put<DissertationHighlight>(`/api/v1/dissertation-highlights/${highlightId}`, updates);
    return data;
  },

  deleteDissertationHighlight: async (highlightId: number) => {
    const { data } = await api.delete(`/api/v1/dissertation-highlights/${highlightId}`);
    return data;
  },
};
