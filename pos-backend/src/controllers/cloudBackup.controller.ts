import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { cloudBackupService } from '../services/cloudBackup.service';
import { settingsService } from '../services/settings.service';

export const cloudBackupController = {
  testConnection: asyncHandler(async (req: Request, res: Response) => {
    const { provider, accessToken } = req.body;
    const { accountLabel } = await cloudBackupService.testConnection(provider, accessToken);

    // Conexión válida: guarda el token y marca la cuenta como conectada
    await settingsService.patchInternal({
      cloudProvider: provider,
      cloudAccessToken: accessToken,
      cloudConnected: true,
      cloudAccountLabel: accountLabel,
    });

    res.json({ success: true, data: await settingsService.get() });
  }),

  syncNow: asyncHandler(async (req: Request, res: Response) => {
    const result = await cloudBackupService.syncNow();
    res.json({ success: true, data: { result, settings: await settingsService.get() } });
  }),

  disconnect: asyncHandler(async (req: Request, res: Response) => {
    await settingsService.patchInternal({
      cloudAccessToken: null,
      cloudConnected: false,
      cloudAccountLabel: null,
    });
    res.json({ success: true, data: await settingsService.get() });
  }),
};
