import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { reportsService } from '../services/reports.service';
import { ApiError } from '../utils/ApiError';
import { isValidPeriod } from '../utils/period';

export const reportsController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const period = String(req.query.period ?? 'monthly');
    if (!isValidPeriod(period)) {
      throw ApiError.badRequest(
        'Periodo inválido. Usa: daily, weekly, monthly, quarterly o annual',
      );
    }
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const summary = await reportsService.summary(period, from, to);
    res.json({ success: true, data: summary });
  }),
};
