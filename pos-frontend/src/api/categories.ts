import { api } from './client';
import type { ApiEnvelope, Category } from '../types';

export const categoriesApi = {
  async list() {
    const { data } = await api.get<ApiEnvelope<Category[]>>('/categories');
    return data.data;
  },
};
