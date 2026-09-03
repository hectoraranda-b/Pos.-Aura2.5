import { api } from './client';
import type { ApiEnvelope, AuthResponse, User } from '../types';

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>('/users/login', { email, password });
    return data.data;
  },

  async me() {
    const { data } = await api.get<ApiEnvelope<User>>('/users/me');
    return data.data;
  },
};
