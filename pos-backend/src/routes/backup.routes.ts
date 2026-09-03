import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/export', backupController.export);

export default router;
