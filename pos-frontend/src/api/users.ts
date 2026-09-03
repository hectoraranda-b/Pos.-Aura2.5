import { api } from './client';
import type { ApiEnvelope, Role, User } from '../types';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export const usersApi = {
  async list() {
    const { data } = await api.get<ApiEnvelope<User[]>>('/users');
    return data.data;
  },

  async create(payload: CreateUserPayload) {
    const { data } = await api.post<ApiEnvelope<User>>('/users', payload);
    return data.data;
  },

  async update(id: number, payload: UpdateUserPayload) {
    const { data } = await api.put<ApiEnvelope<User>>(`/users/${id}`, payload);
    return data.data;
  },

  // El backend hace baja lógica (isActive: false) en vez de borrar el registro
  async deactivate(id: number) {
    await api.delete(`/users/${id}`);
  },
};
