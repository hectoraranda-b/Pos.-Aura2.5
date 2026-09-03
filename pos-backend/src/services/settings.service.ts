import { prisma } from '../config/prisma';
import type { StoreSettings } from '@prisma/client';

// StoreSettings es un registro único (singleton): siempre se opera sobre id = 1.
// upsert garantiza que exista incluso si nunca se ha guardado configuración.
const SETTINGS_ID = 1;

type SanitizedSettings = Omit<StoreSettings, 'cloudAccessToken'> & {
  cloudAccessTokenSet: boolean;
};

// El token de acceso NUNCA se devuelve al frontend una vez guardado — ni
// siquiera parcialmente. El frontend solo necesita saber SI hay uno guardado
// (`cloudAccessTokenSet`) para decidir si mostrar "conectado" o pedir uno
// nuevo. Esto evita que el token quede expuesto en el Network tab del
// navegador o en un `console.log` accidental del cliente.
function sanitize(settings: StoreSettings): SanitizedSettings {
  const { cloudAccessToken, ...rest } = settings;
  return { ...rest, cloudAccessTokenSet: Boolean(cloudAccessToken) };
}

interface UpdateSettingsInput {
  businessName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  ticketMessage?: string;
  defaultBreakdownTax?: boolean;
  integratedTerminalEnabled?: boolean;
  salesGoal?: number;
  logoDataUrl?: string | null;
  cloudProvider?: 'LOCAL' | 'GOOGLE_DRIVE' | 'DROPBOX';
  cloudAccessToken?: string;
  cloudAutoSyncEnabled?: boolean;
  cloudSyncFrequency?: 'DAILY' | 'WEEKLY';
}

export const settingsService = {
  async get(): Promise<SanitizedSettings> {
    const settings = await prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
    return sanitize(settings);
  },

  // Variante interna que SÍ incluye el token, solo para uso de otros services
  // del backend (p. ej. cloudBackup.service.ts necesita el token real para
  // llamar a la API del proveedor). Nunca se expone por una ruta HTTP.
  async getInternal() {
    return prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
  },

  async update(data: UpdateSettingsInput): Promise<SanitizedSettings> {
    const payload: Record<string, unknown> = { ...data };

    // Cambiar (o borrar) el token invalida la conexión previa: hay que
    // volver a probarla con /backup/cloud/test antes de confiar en ella.
    if ('cloudAccessToken' in data) {
      const token = data.cloudAccessToken?.trim();
      payload.cloudAccessToken = token || null;
      payload.cloudConnected = false;
      payload.cloudAccountLabel = null;
    }

    const settings = await prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: payload,
      create: { id: SETTINGS_ID, ...payload },
    });
    return sanitize(settings);
  },

  // Usado por cloudBackup.service.ts tras una prueba de conexión exitosa o
  // una sincronización, para persistir el resultado sin pasar por el
  // sanitizador (aquí sí queremos guardar campos internos como el estado).
  async patchInternal(data: Partial<StoreSettings>) {
    return prisma.storeSettings.update({ where: { id: SETTINGS_ID }, data });
  },
};
