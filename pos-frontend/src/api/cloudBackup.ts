import { api } from './client';
import type { ApiEnvelope, CloudProvider, StoreSettings } from '../types';

export interface SyncResult {
  provider: CloudProvider;
  syncedAt: string;
}

export const cloudBackupApi = {
  // Valida el access token contra la API real del proveedor. Si es válido,
  // el backend lo guarda y marca la cuenta como conectada.
  async testConnection(provider: Extract<CloudProvider, 'GOOGLE_DRIVE' | 'DROPBOX'>, accessToken: string) {
    const { data } = await api.post<ApiEnvelope<StoreSettings>>('/backup/cloud/test', {
      provider,
      accessToken,
    });
    return data.data;
  },

  async syncNow() {
    const { data } = await api.post<ApiEnvelope<{ result: SyncResult; settings: StoreSettings }>>(
      '/backup/cloud/sync',
    );
    return data.data;
  },

  async disconnect() {
    const { data } = await api.post<ApiEnvelope<StoreSettings>>('/backup/cloud/disconnect');
    return data.data;
  },
};
