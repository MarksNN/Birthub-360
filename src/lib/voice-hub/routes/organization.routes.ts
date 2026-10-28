import express from 'express';
import { listOrganizationsHandler } from '../controllers/organization.controller.js';
import { requireTenant } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/organizations', requireTenant, listOrganizationsHandler);

export default router;
