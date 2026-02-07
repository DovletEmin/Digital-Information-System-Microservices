export interface Category {
  id: number;
  name: string;
  parent_id?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  authors_workplace?: string;
  thumbnail?: string;
  content: string;
  publication_date?: string;
  language: string;
  type: string;
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
  language: string;
  type: string;
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
  language: string;
  type: string;
  views: number;
  rating: number;
  average_rating: number;
  rating_count: number;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
