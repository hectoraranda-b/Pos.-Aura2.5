import { api } from './client';
import type { ApiEnvelope, ReportPeriod, ReportSummary } from '../types';

export const reportsApi = {
  async summary(period: ReportPeriod) {
    const { data } = await api.get<ApiEnvelope<ReportSummary>>('/reports/summary', {
      params: { period },
    });
    return data.data;
  },
};
