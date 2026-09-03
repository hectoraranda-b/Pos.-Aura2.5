import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { aiAnalyticsService } from '../services/aiAnalytics.service';

export const aiAnalyticsController = {
  // Endpoint compuesto: trae los tres insights en una sola llamada, ideal
  // para pintar el dashboard del Asistente de una vez.
  getInsights: asyncHandler(async (req: Request, res: Response) => {
    const [stockForecast, deadStock, executiveSummary] = await Promise.all([
      aiAnalyticsService.stockForecast(),
      aiAnalyticsService.deadStock(),
      aiAnalyticsService.executiveSummary(),
    ]);

    res.json({
      success: true,
      data: { stockForecast, deadStock, executiveSummary },
    });
  }),

  getStockForecast: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAnalyticsService.stockForecast();
    res.json({ success: true, data });
  }),

  getDeadStock: asyncHandler(async (req: Request, res: Response) => {
    const data = await aiAnalyticsService.deadStock();
    res.json({ success: true, data });
  }),

  getExecutiveSummary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await aiAnalyticsService.executiveSummary();
    res.json({ success: true, data: { summary } });
  }),
};
