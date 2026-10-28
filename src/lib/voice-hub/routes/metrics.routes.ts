import express from 'express';
import {
  clearMetricsHandler,
  createMetricHandler,
  listMetricsHandler,
  updateMetricsHandler,
} from '../controllers/metrics.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/metrics', requireTenant, listMetricsHandler);
router.post('/metrics', requireTenant, createMetricHandler);
router.put('/metrics', requireTenant, updateMetricsHandler);
router.delete('/metrics', requireTenant, clearMetricsHandler);

export default router;
