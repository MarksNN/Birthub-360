import express from 'express';
import {
  createCallLogHandler,
  deleteCallLogHandler,
  listCallLogsHandler,
  updateCallLogHandler,
} from '../controllers/callLog.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/call-logs', requireTenant, listCallLogsHandler);
router.post('/call-logs', requireTenant, createCallLogHandler);
router.put('/call-logs/:id', requireTenant, updateCallLogHandler);
router.delete('/call-logs/:id', requireTenant, deleteCallLogHandler);

export default router;
