import { api } from './client';
import type { ApiEnvelope, Product } from '../types';

export interface UpsertProductPayload {
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  categoryId: number;
  initialStock?: number; // solo se usa al crear
  minStock: number;
}

export const productsApi = {
  // `search` funciona tanto para tipeo manual como para el lector de código de barras
  // (el lector "escribe" el SKU/código y envía Enter, ver ProductSearch.tsx)
  async search(query: string) {
    const { data } = await api.get<ApiEnvelope<Product[]>>('/products', {
      params: query ? { search: query } : undefined,
    });
    return data.data;
  },

  async list(params: { categoryId?: number; search?: string } = {}) {
    const { data } = await api.get<ApiEnvelope<Product[]>>('/products', { params });
    return data.data;
  },

  async create(payload: UpsertProductPayload) {
    const { data } = await api.post<ApiEnvelope<Product>>('/products', payload);
    return data.data;
  },

  async update(id: number, payload: Partial<UpsertProductPayload>) {
    const { data } = await api.put<ApiEnvelope<Product>>(`/products/${id}`, payload);
    return data.data;
  },

  // Baja lógica (isActive: false)
  async remove(id: number) {
    await api.delete(`/products/${id}`);
  },
};
