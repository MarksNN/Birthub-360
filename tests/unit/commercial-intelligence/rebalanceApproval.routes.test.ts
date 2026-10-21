import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/queue/domainEventMesh.service.js', () => ({
  domainEventMesh: { publish: vi.fn(async () => undefined) },
}));

import { COMMERCIAL_INTELLIGENCE_ROLES } from '../../../src/lib/auth/authorization.js';
import { requireRole } from '../../../src/shared/middlewares/requireRole.js';
import { createPredictiveRoutes } from '../../../src/features/commercial-intelligence/routes/predictive.routes.js';
import { PredictiveRevenueOracleService } from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { RebalanceApprovalService } from '../../../src/features/commercial-intelligence/services/rebalanceApproval.service.js';
import {
  REBALANCE_DECISION_TTL_DAYS,
  rebalanceRecommendationId,
} from '../../../src/features/commercial-intelligence/services/rebalanceRecommendation.service.js';
import {
  InMemoryOracleReader,
  InMemoryRebalanceApprovalStore,
  ORACLE_FIXED_NOW,
} from './oracleTestDoubles.js';

const URL = '/api/commercial-intelligence/predictive/rebalance/approvals';
const idFor = (org: string, leadId: string, from: string | null, to: string) =>
  rebalanceRecommendationId(org, leadId, from, to);
const body = {
  recommendationId: idFor('org-a', 'lead-a1', 'user-lucas', 'user-juliana'),
  leadId: 'lead-a1',
  fromOwner: 'user-lucas',
  toOwner: 'user-juliana',
  decision: 'APPROVED',
};

function buildApp(store: InMemoryRebalanceApprovalStore, user: { id: string; organizationId: string; role: string }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: typeof user }).user = user;
    next();
  });
  const routes = createPredictiveRoutes({
    oracle: new PredictiveRevenueOracleService({ reader: new InMemoryOracleReader(), now: () => ORACLE_FIXED_NOW }),
    approvals: new RebalanceApprovalService({ store, now: () => ORACLE_FIXED_NOW }),
  });
  // Mesmo guard do mount real (bootstrap/routes.ts + commercialIntelligence.routes.ts)
  app.use('/api/commercial-intelligence', requireRole([...COMMERCIAL_INTELLIGENCE_ROLES]), express.Router().use('/predictive', routes));
  return app;
}

describe('REMED-04 — POST /predictive/rebalance/approvals', () => {
  let store: InMemoryRebalanceApprovalStore;
  const gestorA = { id: 'u-gestor-a', organizationId: 'org-a', role: 'GESTOR' };

  beforeEach(() => {
    store = new InMemoryRebalanceApprovalStore();
    store.addLead('org-a', 'lead-a1', 'user-lucas');
    store.addLead('org-b', 'lead-b1', 'user-lucas');
    store.addUser('org-a', 'user-juliana');
    store.addUser('org-b', 'user-juliana');
  });

  it('happy path: 201, persiste e registra trilha (decidedBy/tenant/ip)', async () => {
    const res = await request(buildApp(store, gestorA)).post(URL).send(body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alreadyRecorded).toBe(false);
    expect(res.body.data.approval).toMatchObject({
      ...body,
      organizationId: 'org-a',
      decidedBy: 'u-gestor-a',
      decidedAt: ORACLE_FIXED_NOW.toISOString(),
      appliedToCrm: false,
    });
    expect(store.records).toHaveLength(1);
  });

  it('idempotente: replay idêntico → 200 alreadyRecorded, sem nova escrita', async () => {
    const app = buildApp(store, gestorA);
    const first = await request(app).post(URL).send(body);
    const second = await request(app).post(URL).send(body);
    expect(second.status).toBe(200);
    expect(second.body.data.alreadyRecorded).toBe(true);
    expect(second.body.data.approval.approvalId).toBe(first.body.data.approval.approvalId);
    expect(store.records).toHaveLength(1);
  });

  it('conflito: mesma recomendação com decisão diferente → 409', async () => {
    const app = buildApp(store, gestorA);
    await request(app).post(URL).send(body);
    const res = await request(app).post(URL).send({ ...body, decision: 'REJECTED' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.data.existing.decision).toBe('APPROVED');
    expect(store.records).toHaveLength(1);
  });

  it('isolamento de tenant: lead de outra org → 404; decisão de A não é vista por B', async () => {
    await request(buildApp(store, gestorA)).post(URL).send(body);
    const gestorB = { id: 'u-gestor-b', organizationId: 'org-b', role: 'ADMIN' };
    // lead-a1 é de A: com id recalculado para B → 404; com o id de A → 422 (hash não bate)
    const crossId = idFor('org-b', 'lead-a1', 'user-lucas', 'user-juliana');
    const cross = await request(buildApp(store, gestorB)).post(URL).send({ ...body, recommendationId: crossId });
    expect(cross.status).toBe(404);
    expect((await request(buildApp(store, gestorB)).post(URL).send(body)).status).toBe(422);
    const own = await request(buildApp(store, gestorB))
      .post(URL)
      .send({ ...body, leadId: 'lead-b1', recommendationId: idFor('org-b', 'lead-b1', 'user-lucas', 'user-juliana') });
    expect(own.status).toBe(201);
    expect(own.body.data.approval.organizationId).toBe('org-b');
  });

  it('toOwner que não é User do tenant → 422 e nada gravado', async () => {
    store.addUser('org-b', 'user-only-b');
    const res = await request(buildApp(store, gestorA))
      .post(URL)
      .send({ ...body, toOwner: 'user-only-b', recommendationId: idFor('org-a', 'lead-a1', 'user-lucas', 'user-only-b') });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(store.records).toHaveLength(0);
  });

  it('recommendationId forjado/obsoleto (hash não bate) → 422 RECOMMENDATION_MISMATCH', async () => {
    const res = await request(buildApp(store, gestorA)).post(URL).send({ ...body, recommendationId: 'rec-forjado' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('RECOMMENDATION_MISMATCH');
    expect(store.records).toHaveLength(0);
  });

  it('fromOwner diferente do owner atual do lead → 409 STALE_OWNER', async () => {
    store.addLead('org-a', 'lead-a1', 'user-outro');
    const res = await request(buildApp(store, gestorA)).post(URL).send(body);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STALE_OWNER');
    expect(store.records).toHaveLength(0);
  });

  it(`decisão expirada (> ${REBALANCE_DECISION_TTL_DAYS}d) não bloqueia nova decisão`, async () => {
    const old = new Date(ORACLE_FIXED_NOW.getTime() - (REBALANCE_DECISION_TTL_DAYS + 1) * 86_400_000);
    store.records.push({
      record: { ...body, decision: 'REJECTED', approvalId: 'old', organizationId: 'org-a', decidedBy: 'x', decidedAt: old.toISOString(), appliedToCrm: false },
    });
    const res = await request(buildApp(store, gestorA)).post(URL).send(body);
    expect(res.status).toBe(201);
    expect(store.records).toHaveLength(2);
  });

  it.each(['SDR', 'CLOSER', 'VISUALIZADOR'])('papel %s → 403 e nada gravado', async (role) => {
    const res = await request(buildApp(store, { ...gestorA, role })).post(URL).send(body);
    expect(res.status).toBe(403);
    expect(store.records).toHaveLength(0);
  });

  it('validação zod → 422 (campo faltando, campo extra, from == to)', async () => {
    const app = buildApp(store, gestorA);
    expect((await request(app).post(URL).send({ ...body, toOwner: undefined })).status).toBe(422);
    expect((await request(app).post(URL).send({ ...body, hack: 1 })).status).toBe(422);
    expect((await request(app).post(URL).send({ ...body, toOwner: 'user-lucas' })).status).toBe(422); // from == to
    expect(store.records).toHaveLength(0);
  });

  it('GET /predictive/cockpit devolve insufficient_data sem histórico (envelope success/data)', async () => {
    const res = await request(buildApp(store, gestorA)).get('/api/commercial-intelligence/predictive/cockpit');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('insufficient_data');
    expect(res.body.data.projections.days30.expectedRevenue).toBeNull();
  });
});
