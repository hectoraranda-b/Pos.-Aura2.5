import { z } from 'zod';

export const adjustStockSchema = z.object({
  quantity: z.number().int(), // puede ser positivo (entrada) o negativo (salida/ajuste)
  reason: z.string().min(2).max(255).optional(),
});
