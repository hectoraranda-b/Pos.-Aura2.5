import { z } from 'zod';

export const createSaleSchema = z.object({
  customerId: z.number().int().positive().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).default('CASH'),
  // Solo aplica cuando paymentMethod = CARD
  cardReference: z.string().max(100).optional(),
  cardPaymentType: z.enum(['INTEGRATED', 'MANUAL']).optional(),
  taxRate: z.number().min(0).max(1).default(0), // ej. 0.16 = 16% IVA
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, 'La venta debe tener al menos un producto'),
});
