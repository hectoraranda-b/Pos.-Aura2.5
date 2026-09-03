import { Router } from 'express';
import { z } from 'zod';
import { productController } from '../controllers/product.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';

const router = Router();
const idParam = z.object({ id: z.string().regex(/^\d+$/) });

router.use(authenticate);

router.get('/', productController.getAll);
router.get('/:id', validate({ params: idParam }), productController.getById);
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: createProductSchema }),
  productController.create,
);
router.put(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam, body: updateProductSchema }),
  productController.update,
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), productController.remove);

export default router;
