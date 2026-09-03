import { Router } from 'express';
import { z } from 'zod';
import { userController } from '../controllers/user.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createUserSchema, updateUserSchema, loginSchema } from '../validators/user.validator';

const router = Router();
const idParam = z.object({ id: z.string().regex(/^\d+$/) });

// Rutas públicas
router.post('/login', validate({ body: loginSchema }), userController.login);

// Rutas protegidas
router.use(authenticate);
router.get('/me', userController.me);
router.get('/', authorize('ADMIN', 'MANAGER'), userController.getAll);
router.get('/:id', authorize('ADMIN', 'MANAGER'), validate({ params: idParam }), userController.getById);
router.post('/', authorize('ADMIN'), validate({ body: createUserSchema }), userController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, body: updateUserSchema }),
  userController.update,
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), userController.remove);

export default router;
