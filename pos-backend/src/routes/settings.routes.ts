import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { updateSettingsSchema } from '../validators/settings.validator';

const router = Router();

router.use(authenticate);

// Cualquier usuario autenticado puede leer la configuración (el POS la necesita
// para saber si la terminal es integrada, el IVA por defecto, etc.)
router.get('/', settingsController.get);

// Solo un administrador puede modificarla
router.put('/', authorize('ADMIN'), validate({ body: updateSettingsSchema }), settingsController.update);

export default router;
