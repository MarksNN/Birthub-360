import express from 'express';
import {
  getBrandColorHandler,
  resetBrandColorHandler,
  saveBrandColorHandler,
} from '../controllers/brandColor.controller.js';
import { attachAuthIfPresent } from '../middlewares/index.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/brand-color', attachAuthIfPresent, getBrandColorHandler);
router.post('/brand-color', requireTenant, saveBrandColorHandler);
router.put('/brand-color', requireTenant, saveBrandColorHandler);
router.delete('/brand-color', requireTenant, resetBrandColorHandler);

export default router;
