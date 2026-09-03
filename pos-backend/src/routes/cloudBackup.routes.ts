import { Router } from 'express';
import { cloudBackupController } from '../controllers/cloudBackup.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { testCloudConnectionSchema } from '../validators/settings.validator';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.post('/test', validate({ body: testCloudConnectionSchema }), cloudBackupController.testConnection);
router.post('/sync', cloudBackupController.syncNow);
router.post('/disconnect', cloudBackupController.disconnect);

export default router;
