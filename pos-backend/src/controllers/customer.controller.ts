import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { customerService } from '../services/customer.service';

export const customerController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const customers = await customerService.findAll(req.query.search ? String(req.query.search) : undefined);
    res.json({ success: true, data: customers });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.findById(Number(req.params.id));
    res.json({ success: true, data: customer });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.create(req.body);
    res.status(201).json({ success: true, data: customer });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: customer });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await customerService.remove(Number(req.params.id));
    res.status(204).send();
  }),
};
