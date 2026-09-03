import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  cost: z.number().nonnegative().default(0),
  categoryId: z.number().int().positive(),
  initialStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
});

export const updateProductSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  price: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  categoryId: z.number().int().positive().optional(),
  minStock: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
