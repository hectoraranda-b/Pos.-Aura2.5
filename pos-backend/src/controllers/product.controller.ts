import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { productService } from '../services/product.service';

export const productController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, search } = req.query;
    const products = await productService.findAll({
      categoryId: categoryId ? Number(categoryId) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json({ success: true, data: products });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.findById(Number(req.params.id));
    res.json({ success: true, data: product });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    res.status(201).json({ success: true, data: product });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: product });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await productService.remove(Number(req.params.id));
    res.status(204).send();
  }),
};
