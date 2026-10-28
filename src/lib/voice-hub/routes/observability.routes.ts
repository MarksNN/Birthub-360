import express from 'express';
import { observabilityMetricsHandler } from '../controllers/observability.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/observability/metrics', requireTenant, observabilityMetricsHandler);

export default router;
