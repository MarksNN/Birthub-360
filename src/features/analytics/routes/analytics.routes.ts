import { Router } from 'express';
import { container } from '../../../shared/di/container.js';
import type { AnalyticsController } from '../presentation/AnalyticsController.js';

const router = Router();

function resolve(): AnalyticsController {
  return container.resolve<AnalyticsController>('AnalyticsController');
}

router.get('/', (req, res, next) => resolve().getMetrics(req, res, next));
router.get('/overview', (req, res, next) => resolve().getOverview(req, res, next));
router.get('/dashboard', (req, res, next) => resolve().getDashboard(req, res, next));
router.get('/sales-summary', (req, res, next) => resolve().getSalesSummary(req, res, next));
router.get('/cohort', (req, res, next) => resolve().getCohort(req, res, next));
router.get('/export/csv', (req, res, next) => resolve().exportCohortCsv(req, res, next));

export const analyticsRoutes = router;
