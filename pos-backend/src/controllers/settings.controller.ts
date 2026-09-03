import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { settingsService } from '../services/settings.service';

export const settingsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.get();
    res.json({ success: true, data: settings });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.update(req.body);
    res.json({ success: true, data: settings });
  }),
};
