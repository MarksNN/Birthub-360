import express from 'express';
import {
  getChecklistHandler,
  resetChecklistHandler,
  saveChecklistHandler,
} from '../controllers/onboarding.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/onboarding', requireTenant, getChecklistHandler);
router.post('/onboarding', requireTenant, saveChecklistHandler);
router.put('/onboarding', requireTenant, saveChecklistHandler);
router.delete('/onboarding', requireTenant, resetChecklistHandler);

export default router;
