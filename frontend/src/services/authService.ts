import api from '@/lib/api';
import { AuthResponse, User } from '@/types';

export const authService = {
  register: async (payload: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const { data } = await api.post<AuthResponse>('/api/v1/auth/register', payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.tokens.access_token);
      localStorage.setItem('refresh_token', data.tokens.refresh_token);
      window.dispatchEvent(new Event('auth-change'));
    }
    return data;
  },

  login: async (payload: { username: string; password: string }) => {
    const { data } = await api.post<AuthResponse>('/api/v1/auth/login', payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.tokens.access_token);
      localStorage.setItem('refresh_token', data.tokens.refresh_token);
      window.dispatchEvent(new Event('auth-change'));
    }
    return data;
  },

  me: async () => {
    const { data } = await api.get<User>('/api/v1/auth/me');
    return data;
  },

  logout: async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth-change'));
      }
    }
  },
};
