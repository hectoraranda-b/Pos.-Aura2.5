import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { z } from 'zod';

const router = Router();
const idParam = z.object({ id: z.string().regex(/^\d+$/) });

router.use(authenticate);

router.get('/', categoryController.getAll);
router.get('/:id', validate({ params: idParam }), categoryController.getById);
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate({ body: createCategorySchema }),
  categoryController.create,
);
router.put(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate({ params: idParam, body: updateCategorySchema }),
  categoryController.update,
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), categoryController.remove);

export default router;
