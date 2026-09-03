import { api } from './client';
import type { ApiEnvelope, Inventory } from '../types';

export const inventoryApi = {
  async list(lowStockOnly = false) {
    const { data } = await api.get<ApiEnvelope<Inventory[]>>('/inventory', {
      params: lowStockOnly ? { lowStock: 'true' } : undefined,
    });
    return data.data;
  },

  // delta positivo = entrada de stock, negativo = salida/merma/ajuste
  async adjust(productId: number, quantity: number) {
    const { data } = await api.post<ApiEnvelope<Inventory>>(`/inventory/${productId}/adjust`, {
      quantity,
    });
    return data.data;
  },
};
