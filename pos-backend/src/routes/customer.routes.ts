import { Router } from 'express';
import { z } from 'zod';
import { customerController } from '../controllers/customer.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';

const router = Router();
const idParam = z.object({ id: z.string().regex(/^\d+$/) });

router.use(authenticate);

router.get('/', customerController.getAll);
router.get('/:id', validate({ params: idParam }), customerController.getById);
router.post('/', validate({ body: createCustomerSchema }), customerController.create);
router.put('/:id', validate({ params: idParam, body: updateCustomerSchema }), customerController.update);
router.delete('/:id', validate({ params: idParam }), customerController.remove);

export default router;
