import { z } from 'zod';

export const updateSettingsSchema = z.object({
  businessName: z.string().min(1).max(150).optional(),
  taxId: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  ticketMessage: z.string().max(300).optional(),
  defaultBreakdownTax: z.boolean().optional(),
  integratedTerminalEnabled: z.boolean().optional(),
  salesGoal: z.number().nonnegative().optional(),
  logoDataUrl: z.string().max(2_000_000).nullable().optional(), // data URL base64

  // --- Respaldo en la nube ---
  cloudProvider: z.enum(['LOCAL', 'GOOGLE_DRIVE', 'DROPBOX']).optional(),
  // Si se envía string vacío, se interpreta como "desvincular" (ver settings.service.ts)
  cloudAccessToken: z.string().max(4000).optional(),
  cloudAutoSyncEnabled: z.boolean().optional(),
  cloudSyncFrequency: z.enum(['DAILY', 'WEEKLY']).optional(),
});

export const testCloudConnectionSchema = z.object({
  provider: z.enum(['GOOGLE_DRIVE', 'DROPBOX']),
  accessToken: z.string().min(1, 'El token de acceso es requerido'),
});
