import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  document: z.string().max(30).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
