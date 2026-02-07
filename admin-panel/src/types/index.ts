export interface Category {
  id: number;
  name: string;
  parent_id?: number;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  content: string;
  publication_date?: string;
  language: 'tm' | 'ru' | 'en';
  type: 'local' | 'foreign';
  views: number;
  rating: number;
  average_rating: number;
  rating_count: number;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  description?: string;
  content?: string;
  pdf_file_url?: string;
  epub_file_url?: string;
  publication_date?: string;
  language: 'tm' | 'ru' | 'en';
  type: 'local' | 'foreign';
  views: number;
  rating: number;
  average_rating: number;
  rating_count: number;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface Dissertation {
  id: number;
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  content: string;
  publication_date?: string;
  language: 'tm' | 'ru' | 'en';
  type: 'local' | 'foreign';
  views: number;
  rating: number;
  average_rating: number;
  rating_count: number;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface CreateArticleDto {
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  content: string;
  publication_date?: string;
  language: 'tm' | 'ru' | 'en';
  type: 'local' | 'foreign';
  category_ids: number[];
}

export interface CreateBookDto {
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  description?: string;
  content?: string;
  pdf_file_url?: string;
  epub_file_url?: string;
  publication_date?: string;
  language: 'tm' | 'ru' | 'en';
  type: 'local' | 'foreign';
  category_ids: number[];
}

export interface CreateDissertationDto {
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  content: string;
  publication_date?: string;
  language: 'tm' | 'ru' | 'en';
  type: 'local' | 'foreign';
  category_ids: number[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
