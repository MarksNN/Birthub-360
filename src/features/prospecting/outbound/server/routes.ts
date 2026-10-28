import { Router } from 'express';
import { attachUser } from './auth.js';
// Modular child routers
import {
  authRouter,
  hashPassword,
  normalizeCompany,
  SCRYPT_PREFIX,
  verifyHashedPassword,
} from './routes/auth.routes.js';
import { campaignsRouter } from './routes/campaigns.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { integrationsRouter } from './routes/integrations.routes.js';
import { leadsRouter } from './routes/leads.routes.js';
import { systemRouter } from './routes/system.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import {
  APOLLO_PREFERRED_TITLES,
  cleanDomain,
  cleanDomainForCache,
  enrichLeadWithApollo,
  findLeads,
  normalizeLinkedInUrl,
  resolveCnpjWithResilience,
  slugify,
} from './services/leadSearch.service.js';
// Utilities & Services
import {
  formatLeadRow,
  upsertMessageWithVersioning,
  validateChangedLeadFields,
} from './utils/formatLead.js';

// Re-exports for backwards compatibility
export {
  APOLLO_PREFERRED_TITLES,
  cleanDomain,
  cleanDomainForCache,
  enrichLeadWithApollo,
  findLeads,
  formatLeadRow,
  hashPassword,
  normalizeCompany,
  normalizeLinkedInUrl,
  resolveCnpjWithResilience,
  SCRYPT_PREFIX,
  slugify,
  upsertMessageWithVersioning,
  validateChangedLeadFields,
  verifyHashedPassword,
};

export const apiRouter = Router();

// Auth & RBAC: popula req.outboundUser a partir do cookie de sessão assinado
apiRouter.use(attachUser);

// Mount modular sub-routers
apiRouter.use(authRouter);
apiRouter.use(systemRouter);
apiRouter.use(campaignsRouter);
apiRouter.use(tasksRouter);
apiRouter.use(chatRouter);
apiRouter.use(integrationsRouter);
apiRouter.use(leadsRouter);
