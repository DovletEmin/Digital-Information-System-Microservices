import api from '@/lib/api';

export interface UserCountResponse {
  total: number;
}

export const userService = {
  getUsersCount: async () => {
    const { data } = await api.get<UserCountResponse>('/api/v1/users/count');
    return data;
  }
};
