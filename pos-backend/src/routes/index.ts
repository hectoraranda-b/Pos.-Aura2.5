import { Router } from 'express';
import userRoutes from './user.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import inventoryRoutes from './inventory.routes';
import saleRoutes from './sale.routes';
import customerRoutes from './customer.routes';
import settingsRoutes from './settings.routes';
import reportsRoutes from './reports.routes';
import aiAnalyticsRoutes from './aiAnalytics.routes';
import backupRoutes from './backup.routes';
import cloudBackupRoutes from './cloudBackup.routes';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', saleRoutes);
router.use('/customers', customerRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportsRoutes);
router.use('/ai-analytics', aiAnalyticsRoutes);
router.use('/backup', backupRoutes);
router.use('/backup/cloud', cloudBackupRoutes);

export default router;
