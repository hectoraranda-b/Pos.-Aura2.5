import { api } from './client';
import type { ApiEnvelope, CardPaymentType, PaymentMethod, Sale } from '../types';

export interface CreateSalePayload {
  paymentMethod: PaymentMethod;
  taxRate: number;
  customerId?: number;
  cardReference?: string;
  cardPaymentType?: CardPaymentType;
  items: { productId: number; quantity: number }[];
}

export interface SaleFilters {
  userId?: number;
  customerId?: number;
  from?: string;
  to?: string;
  cancelled?: boolean;
}

export const salesApi = {
  async create(payload: CreateSalePayload) {
    const { data } = await api.post<ApiEnvelope<Sale>>('/sales', payload);
    return data.data;
  },

  async list(filters: SaleFilters = {}) {
    const { data } = await api.get<ApiEnvelope<Sale[]>>('/sales', { params: filters });
    return data.data;
  },

  async getById(id: number) {
    const { data } = await api.get<ApiEnvelope<Sale>>(`/sales/${id}`);
    return data.data;
  },

  async cancel(id: number) {
    const { data } = await api.post<ApiEnvelope<Sale>>(`/sales/${id}/cancel`);
    return data.data;
  },
};
