import { api } from './client';
import type { ApiEnvelope, AiInsights } from '../types';

export const aiAnalyticsApi = {
  async getInsights() {
    const { data } = await api.get<ApiEnvelope<AiInsights>>('/ai-analytics');
    return data.data;
  },
};
