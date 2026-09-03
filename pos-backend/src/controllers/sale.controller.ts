import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { saleService } from '../services/sale.service';
import { ApiError } from '../utils/ApiError';

export const saleController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { userId, customerId, from, to, cancelled } = req.query;
    const sales = await saleService.findAll({
      userId: userId ? Number(userId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      from: from ? new Date(String(from)) : undefined,
      to: to ? new Date(String(to)) : undefined,
      cancelled: cancelled !== undefined ? cancelled === 'true' : undefined,
    });
    res.json({ success: true, data: sales });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const sale = await saleService.findById(Number(req.params.id));
    res.json({ success: true, data: sale });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const sale = await saleService.create({
      userId: req.user.id,
      customerId: req.body.customerId,
      paymentMethod: req.body.paymentMethod,
      cardReference: req.body.cardReference,
      cardPaymentType: req.body.cardPaymentType,
      taxRate: req.body.taxRate,
      items: req.body.items,
    });
    res.status(201).json({ success: true, data: sale });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const sale = await saleService.cancel(Number(req.params.id));
    res.json({ success: true, data: sale });
  }),
};
