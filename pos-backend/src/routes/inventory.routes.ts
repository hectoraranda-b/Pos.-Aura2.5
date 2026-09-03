import { Router } from 'express';
import { z } from 'zod';
import { inventoryController } from '../controllers/inventory.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { adjustStockSchema } from '../validators/inventory.validator';

const router = Router();
const productIdParam = z.object({ productId: z.string().regex(/^\d+$/) });

router.use(authenticate);

router.get('/', inventoryController.getAll);
router.get('/:productId', validate({ params: productIdParam }), inventoryController.getByProduct);
router.post(
  '/:productId/adjust',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: productIdParam, body: adjustStockSchema }),
  inventoryController.adjust,
);

export default router;
