import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/queue/domainEventMesh.service.js', () => ({
  domainEventMesh: { publish: vi.fn(async () => undefined) },
}));

import { createPredictiveRoutes } from '../../../src/features/commercial-intelligence/routes/predictive.routes.js';
import { PredictiveRevenueOracleService } from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { RebalanceApprovalService } from '../../../src/features/commercial-intelligence/services/rebalanceApproval.service.js';
import {
  InMemoryOracleReader,
  InMemoryRebalanceApprovalStore,
  ORACLE_FIXED_NOW,
  seedRealHistory,
} from './oracleTestDoubles.js';

function buildApp(reader: InMemoryOracleReader, user: { id: string; organizationId: string; role: string }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: typeof user }).user = user;
    next();
  });
  const routes = createPredictiveRoutes({
    oracle: new PredictiveRevenueOracleService({ reader, now: () => ORACLE_FIXED_NOW }),
    approvals: new RebalanceApprovalService({ store: new InMemoryRebalanceApprovalStore(), now: () => ORACLE_FIXED_NOW }),
  });
  app.use('/commercial-intelligence/predictive', routes);
  return app;
}

describe('GET /commercial-intelligence/predictive/cockpit (Passo 049)', () => {
  let reader: InMemoryOracleReader;
  const user = { id: 'u-admin', organizationId: 'org-cockpit-alpha', role: 'ADMIN' };

  beforeEach(() => {
    reader = new InMemoryOracleReader();
  });

  it('deve retornar HTTP 200 com payload completo e tempo de resposta rápido (< 100ms)', async () => {
    seedRealHistory(reader, user.organizationId);
    const app = buildApp(reader, user);

    const start = Date.now();
    const res = await request(app).get('/commercial-intelligence/predictive/cockpit');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data).toBeDefined();
    expect(data.projections).toBeDefined();
    expect(data.projections.days30).toBeDefined();
    expect(data.projections.days90).toBeDefined();
    expect(data.projections.days180).toBeDefined();
    expect(data.modelConfidence).toBeDefined();

    // Tempo de resposta em memória deve ser inferior a 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it('deve retornar status honesto de histórico insuficiente quando não houver dados', async () => {
    // reader sem dados semeados
    const app = buildApp(reader, user);
    const res = await request(app).get('/commercial-intelligence/predictive/cockpit');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('insufficient_data');
    expect(res.body.data.projections.days30.expectedRevenue).toBeNull();
    expect(res.body.data.projections.days30.status).toBe('insufficient_data');
  });
});
