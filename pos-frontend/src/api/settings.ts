import { api } from './client';
import type { CloudProvider, StoreSettings, SyncFrequency, ApiEnvelope } from '../types';

// Payload de escritura: omite los campos calculados/de solo lectura del
// backend (id, updatedAt, cloudAccessTokenSet, cloudConnected, cloudAccountLabel,
// cloudLastSyncAt, cloudLastSyncStatus) y permite enviar salesGoal como número
// y un `cloudAccessToken` de escritura (write-only, nunca se lee de vuelta).
export type UpdateSettingsPayload = Partial<
  Omit<
    StoreSettings,
    | 'id'
    | 'updatedAt'
    | 'salesGoal'
    | 'cloudAccessTokenSet'
    | 'cloudConnected'
    | 'cloudAccountLabel'
    | 'cloudLastSyncAt'
    | 'cloudLastSyncStatus'
  >
> & {
  salesGoal?: number;
  cloudProvider?: CloudProvider;
  cloudAutoSyncEnabled?: boolean;
  cloudSyncFrequency?: SyncFrequency;
};

export const settingsApi = {
  async get() {
    const { data } = await api.get<ApiEnvelope<StoreSettings>>('/settings');
    return data.data;
  },

  async update(payload: UpdateSettingsPayload) {
    const { data } = await api.put<ApiEnvelope<StoreSettings>>('/settings', payload);
    return data.data;
  },
};
