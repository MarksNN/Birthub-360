import express from 'express';
import {
  createSettingsHandler,
  getSettingsHandler,
  resetSettingsHandler,
  updateSettingsHandler,
} from '../controllers/settings.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/settings', requireTenant, getSettingsHandler);
router.post('/settings', requireTenant, createSettingsHandler);
router.put('/settings', requireTenant, updateSettingsHandler);
router.delete('/settings', requireTenant, resetSettingsHandler);

export default router;
