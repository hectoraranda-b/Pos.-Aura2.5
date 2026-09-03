import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { inventoryService } from '../services/inventory.service';

export const inventoryController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const lowStockOnly = req.query.lowStock === 'true';
    const inventory = await inventoryService.findAll(lowStockOnly);
    res.json({ success: true, data: inventory });
  }),

  getByProduct: asyncHandler(async (req: Request, res: Response) => {
    const inventory = await inventoryService.findByProduct(Number(req.params.productId));
    res.json({ success: true, data: inventory });
  }),

  adjust: asyncHandler(async (req: Request, res: Response) => {
    const inventory = await inventoryService.adjustStock(
      Number(req.params.productId),
      req.body.quantity,
    );
    res.json({ success: true, data: inventory });
  }),
};
