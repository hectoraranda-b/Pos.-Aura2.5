import { Router } from 'express';
import { z } from 'zod';
import { saleController } from '../controllers/sale.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createSaleSchema } from '../validators/sale.validator';

const router = Router();
const idParam = z.object({ id: z.string().regex(/^\d+$/) });

router.use(authenticate);

router.get('/', saleController.getAll);
router.get('/:id', validate({ params: idParam }), saleController.getById);
router.post('/', validate({ body: createSaleSchema }), saleController.create);
router.post('/:id/cancel', authorize('ADMIN', 'MANAGER'), validate({ params: idParam }), saleController.cancel);

export default router;
