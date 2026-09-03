import { Router } from 'express';
import { aiAnalyticsController } from '../controllers/aiAnalytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/', aiAnalyticsController.getInsights);
router.get('/stock-forecast', aiAnalyticsController.getStockForecast);
router.get('/dead-stock', aiAnalyticsController.getDeadStock);
router.get('/executive-summary', aiAnalyticsController.getExecutiveSummary);

export default router;
