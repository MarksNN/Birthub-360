import express from 'express';
import { initiateOutboundCallHandler } from '../controllers/voiceOutbound.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.post('/voice/outbound', requireTenant, initiateOutboundCallHandler);

export default router;
