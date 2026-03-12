import api from '@/lib/api';

export interface UserCountResponse {
  total: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

export const userService = {
  getUsersCount: async () => {
    const { data } = await api.get<UserCountResponse>('/api/v1/users/count');
    return data;
  },
  listUsers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get<AdminUser[]>('/api/v1/admin/users');
    return data;
  },
  createUser: async (payload: CreateUserPayload): Promise<AdminUser> => {
    const { data } = await api.post<AdminUser>('/api/v1/admin/users', payload);
    return data;
  },
  updateUser: async (id: number, payload: UpdateUserPayload): Promise<AdminUser> => {
    const { data } = await api.put<AdminUser>(`/api/v1/admin/users/${id}`, payload);
    return data;
  },
  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/admin/users/${id}`);
  },
};
