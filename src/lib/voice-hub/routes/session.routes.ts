import express from 'express';
import {
  createSessionHandler,
  deleteSessionHandler,
  listSessionsHandler,
  updateSessionHandler,
} from '../controllers/session.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/sessions', requireTenant, listSessionsHandler);
router.post('/sessions', requireTenant, createSessionHandler);
router.put('/sessions/:id', requireTenant, updateSessionHandler);
router.delete('/sessions/:id', requireTenant, deleteSessionHandler);

export default router;
