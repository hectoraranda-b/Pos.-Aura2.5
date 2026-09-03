import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Reportes financieros: visibles para administradores y gerentes
router.get('/summary', authorize('ADMIN', 'MANAGER'), reportsController.summary);

export default router;
