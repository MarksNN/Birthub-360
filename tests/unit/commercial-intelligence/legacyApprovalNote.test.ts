import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LEGACY_NOTE = 'Cliente joao@x.com tel (11) 98765-4321 pediu troca';
const db = vi.hoisted(() => ({
  details: '',
  auditLog: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  lead: { findFirst: vi.fn() },
  user: { count: vi.fn() },
}));
vi.mock('../../../src/lib/prisma.js', () => ({ prisma: db }));
vi.mock('../../../src/lib/queue/domainEventMesh.service.js', () => ({
  domainEventMesh: { publish: vi.fn(async () => undefined) },
}));

import { PrismaRebalanceApprovalStore } from '../../../src/features/commercial-intelligence/infra/PrismaRebalanceApprovalStore.js';
import {
  PrismaRebalanceRecommendationReader,
  parseApprovalRecord,
} from '../../../src/features/commercial-intelligence/infra/PrismaRebalanceRecommendationReader.js';
import { createPredictiveRoutes } from '../../../src/features/commercial-intelligence/routes/predictive.routes.js';
import { PredictiveRevenueOracleService } from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { RebalanceApprovalService } from '../../../src/features/commercial-intelligence/services/rebalanceApproval.service.js';
import { rebalanceRecommendationId } from '../../../src/features/commercial-intelligence/services/rebalanceRecommendation.service.js';
import { InMemoryOracleReader, ORACLE_FIXED_NOW } from './oracleTestDoubles.js';

const recId = rebalanceRecommendationId('org-a', 'lead-a1', 'user-lucas', 'user-juliana');
/** Registro gravado pelo #15 (main antes do #23): `note` em texto claro + campo extra. */
const legacy = {
  approvalId: 'ap-legacy',
  organizationId: 'org-a',
  recommendationId: recId,
  leadId: 'lead-a1',
  fromOwner: 'user-lucas',
  toOwner: 'user-juliana',
  decision: 'APPROVED',
  note: LEGACY_NOTE,
  extra: { note: LEGACY_NOTE },
  decidedBy: 'u-gestor-a',
  decidedAt: ORACLE_FIXED_NOW.toISOString(),
  appliedToCrm: false,
};
const row = () => ({ id: 'al-1', entityId: recId, details: JSON.stringify(legacy) });
const leaks = (o: unknown) => {
  const s = JSON.stringify(o);
  return ['joao@x.com', '98765-4321', 'pediu troca', '"note"', '"extra"'].filter((x) => s.includes(x));
};

describe('LGPD (parecer 24 P3-1) — note legada em texto claro no AuditLog não reaparece', () => {
  beforeEach(() => {
    db.auditLog.findFirst.mockResolvedValue(row());
    db.auditLog.findMany.mockResolvedValue([row()]);
    db.lead.findFirst.mockResolvedValue({ owner: 'user-lucas' });
    db.user.count.mockResolvedValue(1);
  });

  it('parseApprovalRecord monta por allowlist (sem note/extra)', () => {
    const rec = parseApprovalRecord(JSON.stringify(legacy));
    expect(rec).not.toBeNull();
    expect(Object.keys(rec!).sort()).toEqual(
      [
        'appliedToCrm', 'approvalId', 'decidedAt', 'decidedBy', 'decision', 'fromOwner', 'leadId',
        'noteHash', 'noteLength', 'noteRef', 'organizationId', 'recommendationId', 'toOwner',
      ].sort(),
    );
    expect(leaks(rec)).toEqual([]);
    expect(rec).toMatchObject({ noteLength: null, noteHash: null, noteRef: null });
  });

  it('GET (listDecisions) não devolve a note legada', async () => {
    const out = await new PrismaRebalanceRecommendationReader().listDecisions('org-a', [recId]);
    expect(out).toHaveLength(1);
    expect(leaks(out)).toEqual([]);
  });

  it('replay do POST (alreadyRecorded) não devolve a note legada', async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { user: unknown }).user = { id: 'u-gestor-a', organizationId: 'org-a', role: 'GESTOR' };
      next();
    });
    app.use(
      '/p',
      createPredictiveRoutes({
        oracle: new PredictiveRevenueOracleService({ reader: new InMemoryOracleReader(), now: () => ORACLE_FIXED_NOW }),
        approvals: new RebalanceApprovalService({
          store: new PrismaRebalanceApprovalStore(),
          now: () => ORACLE_FIXED_NOW,
        }),
      }),
    );
    const res = await request(app).post('/p/rebalance/approvals').send({
      recommendationId: recId,
      leadId: 'lead-a1',
      fromOwner: 'user-lucas',
      toOwner: 'user-juliana',
      decision: 'APPROVED',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.alreadyRecorded).toBe(true);
    expect(leaks(res.body)).toEqual([]);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});
