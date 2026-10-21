import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/queue/domainEventMesh.service.js', () => ({
  domainEventMesh: { publish: vi.fn(async () => undefined) },
}));

import { COMMERCIAL_INTELLIGENCE_ROLES } from '../../../src/lib/auth/authorization.js';
import { requireRole } from '../../../src/shared/middlewares/requireRole.js';
import { createPredictiveRoutes } from '../../../src/features/commercial-intelligence/routes/predictive.routes.js';
import { PredictiveRevenueOracleService } from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { RebalanceApprovalService } from '../../../src/features/commercial-intelligence/services/rebalanceApproval.service.js';
import { RebalanceRecommendationService } from '../../../src/features/commercial-intelligence/services/rebalanceRecommendation.service.js';
import { WhatIfSimulationService } from '../../../src/features/commercial-intelligence/services/whatIfSimulation.service.js';
import { InMemoryOracleReader, InMemoryRebalanceApprovalStore, ORACLE_FIXED_NOW, seedRealHistory } from './oracleTestDoubles.js';

const DAY = 86_400_000;
const BASE = '/api/commercial-intelligence/predictive';

function buildApp(user: { id: string; organizationId: string; role: string }) {
  const oracleReader = new InMemoryOracleReader();
  seedRealHistory(oracleReader, 'org-a');
  const oracle = new PredictiveRevenueOracleService({ reader: oracleReader, now: () => ORACLE_FIXED_NOW });
  const store = new InMemoryRebalanceApprovalStore();
  const open = [
    ...Array.from({ length: 12 }, (_, i) => ({ leadId: `a-${i}`, owner: 'u-ana' })),
    ...Array.from({ length: 2 }, (_, i) => ({ leadId: `b-${i}`, owner: 'u-bia' })),
  ].map((d, i) => ({ ...d, title: null, companyId: null, companyName: null, amount: 1000, createdAt: new Date(ORACLE_FIXED_NOW.getTime() - (50 - i) * DAY) }));
  for (const d of open) store.addLead('org-a', d.leadId, d.owner);
  store.addUser('org-a', 'u-ana');
  store.addUser('org-a', 'u-bia');
  const closed = [
    ...Array.from({ length: 3 }, () => ({ owner: 'u-ana', closedAt: new Date(ORACLE_FIXED_NOW.getTime() - 5 * DAY) })),
    ...Array.from({ length: 6 }, () => ({ owner: 'u-bia', closedAt: new Date(ORACLE_FIXED_NOW.getTime() - 5 * DAY) })),
  ];
  const recommendations = new RebalanceRecommendationService({
    now: () => ORACLE_FIXED_NOW,
    reader: {
      listOpenDeals: async (org) => (org === 'org-a' ? open : []),
      listClosedDeals: async (org) => (org === 'org-a' ? closed : []),
      listOrgUsers: async (org) => (org === 'org-a' ? [{ id: 'u-ana', name: 'Ana' }, { id: 'u-bia', name: 'Bia' }] : []),
      listDecisions: async (org, ids) =>
        store.records.map((r) => r.record).filter((r) => r.organizationId === org && ids.includes(r.recommendationId)),
    },
  });
  const whatIf = new WhatIfSimulationService({
    oracle,
    now: () => ORACLE_FIXED_NOW,
    reader: {
      listClosedDeals: async (org) =>
        org === 'org-a'
          ? Array.from({ length: 20 }, (_, i) => ({ won: i < 8, amount: i < 8 ? 10_000 : 0, closedAt: new Date(ORACLE_FIXED_NOW.getTime() - (i + 1) * 10 * DAY) }))
          : [],
    },
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: typeof user }).user = user;
    next();
  });
  const routes = createPredictiveRoutes({
    oracle,
    approvals: new RebalanceApprovalService({ store, now: () => ORACLE_FIXED_NOW }),
    recommendations,
    whatIf,
  });
  app.use('/api/commercial-intelligence', requireRole([...COMMERCIAL_INTELLIGENCE_ROLES]), express.Router().use('/predictive', routes));
  return { app, store };
}

const gestorA = { id: 'u-gestor-a', organizationId: 'org-a', role: 'GESTOR' };

describe('GET /predictive/rebalance/recommendations', () => {
  it('lista com ids reais; POST aceita exatamente esses ids; GET marca a decisão', async () => {
    const { app, store } = buildApp(gestorA);
    const res = await request(app).get(`${BASE}/rebalance/recommendations`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    const rec = res.body.data.recommendations[0];
    expect(rec.fromOwner.id).toBe('u-ana');
    expect(rec.toOwner.id).toBe('u-bia');
    const post = await request(app).post(`${BASE}/rebalance/approvals`).send({
      recommendationId: rec.recommendationId,
      leadId: rec.leadId,
      fromOwner: rec.fromOwner.id,
      toOwner: rec.toOwner.id,
      decision: 'APPROVED',
    });
    expect(post.status).toBe(201);
    expect(store.records).toHaveLength(1);
    const again = await request(app).get(`${BASE}/rebalance/recommendations`);
    const same = again.body.data.recommendations.find((x: { recommendationId: string }) => x.recommendationId === rec.recommendationId);
    expect(same.approvalStatus).toBe('APPROVED');
    expect(same.decision.decidedBy).toBe('u-gestor-a');
  });

  it('outro tenant sem dados → insufficient_data e []', async () => {
    const { app } = buildApp({ ...gestorA, organizationId: 'org-b', role: 'ADMIN' });
    const res = await request(app).get(`${BASE}/rebalance/recommendations`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('insufficient_data');
    expect(res.body.data.recommendations).toEqual([]);
  });

  it.each(['SDR', 'CLOSER', 'VISUALIZADOR'])('papel %s → 403', async (role) => {
    const { app } = buildApp({ ...gestorA, role });
    expect((await request(app).get(`${BASE}/rebalance/recommendations`)).status).toBe(403);
    expect((await request(app).post(`${BASE}/what-if`).send({ horizonDays: 30, levers: {} })).status).toBe(403);
  });
});

describe('POST /predictive/what-if', () => {
  it('simula sobre a baseline real do Oracle', async () => {
    const { app } = buildApp(gestorA);
    const res = await request(app).post(`${BASE}/what-if`).send({ horizonDays: 30, levers: { avgTicketDeltaPercent: 10 } });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    const base = res.body.data.baseline.revenue;
    expect(base).toBeGreaterThan(0);
    expect(res.body.data.result.simulatedRevenue).toBeCloseTo(base * 1.1, 1);
  });

  it('sem histórico → insufficient_data', async () => {
    const { app } = buildApp({ ...gestorA, organizationId: 'org-b' });
    const res = await request(app).post(`${BASE}/what-if`).send({ horizonDays: 90, levers: { winRateDeltaPp: 5 } });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('insufficient_data');
    expect(res.body.data.result).toBeNull();
  });

  it('422: campo extra, horizonte inválido, alavanca fora da faixa, winRate resultante > 100%', async () => {
    const { app } = buildApp(gestorA);
    const post = (b: unknown) => request(app).post(`${BASE}/what-if`).send(b as object);
    expect((await post({ horizonDays: 30, levers: {}, hack: 1 })).status).toBe(422);
    expect((await post({ horizonDays: 45, levers: {} })).status).toBe(422);
    expect((await post({ horizonDays: 30, levers: { avgTicketDeltaPercent: 900 } })).status).toBe(422);
    expect((await post({ horizonDays: 30, levers: { elasticity: 2 } })).status).toBe(422);
    expect((await post({ horizonDays: 30, levers: { winRateDeltaPp: 90 } })).status).toBe(422);
  });
});
