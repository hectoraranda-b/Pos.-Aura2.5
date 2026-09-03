import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { userService } from '../services/user.service';

export const userController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.findAll();
    res.json({ success: true, data: users });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(Number(req.params.id));
    res.json({ success: true, data: user });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: user });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await userService.remove(Number(req.params.id));
    res.status(204).send();
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    res.json({ success: true, data: result });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(req.user!.id);
    res.json({ success: true, data: user });
  }),
};
