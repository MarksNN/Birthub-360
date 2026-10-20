import { describe, expect, it } from 'vitest';
import {
  REBALANCE_MAX_MOVES_PER_OWNER,
  type RebalanceClosedDeal,
  type RebalanceOpenDeal,
  type RebalanceOrgUser,
  RebalanceRecommendationService,
  type RebalanceRecommendationReader,
  rebalanceRecommendationId,
} from '../../../src/features/commercial-intelligence/services/rebalanceRecommendation.service.js';
import type { RebalanceApprovalRecord } from '../../../src/shared/contracts/predictiveRevenueOracle.contract.js';
import { ORACLE_FIXED_NOW } from './oracleTestDoubles.js';

const DAY = 86_400_000;
class Reader implements RebalanceRecommendationReader {
  open = new Map<string, RebalanceOpenDeal[]>();
  closed = new Map<string, RebalanceClosedDeal[]>();
  users = new Map<string, RebalanceOrgUser[]>();
  decisions: RebalanceApprovalRecord[] = [];
  async listOpenDeals(org: string) {
    return this.open.get(org) ?? [];
  }
  async listClosedDeals(org: string, since: Date) {
    return (this.closed.get(org) ?? []).filter((c) => c.closedAt >= since);
  }
  async listOrgUsers(org: string) {
    return this.users.get(org) ?? [];
  }
  async listDecisions(org: string, ids: string[]) {
    return this.decisions.filter((d) => d.organizationId === org && ids.includes(d.recommendationId));
  }
}

function deals(owner: string | null, n: number, prefix: string): RebalanceOpenDeal[] {
  return Array.from({ length: n }, (_, i) => ({
    leadId: `${prefix}-${i}`,
    title: `Negócio ${prefix}-${i}`,
    owner,
    companyId: `co-${prefix}-${i}`,
    companyName: `Conta ${prefix}-${i}`,
    amount: 1000,
    createdAt: new Date(ORACLE_FIXED_NOW.getTime() - (100 - i) * DAY),
  }));
}
function closed(owner: string, n: number): RebalanceClosedDeal[] {
  return Array.from({ length: n }, (_, i) => ({ owner, closedAt: new Date(ORACLE_FIXED_NOW.getTime() - (i + 1) * DAY) }));
}

/** ana: 12 abertos / 3 encerrados (360d); bia: 2/6 (30d); caio: 3/6 (45d). mediana 45d. */
function seed(r: Reader, org: string) {
  r.users.set(org, [
    { id: 'u-ana', name: 'Ana' },
    { id: 'u-bia', name: 'Bia' },
    { id: 'u-caio', name: 'Caio' },
  ]);
  r.open.set(org, [
    ...deals('u-ana', 12, 'a'),
    ...deals('u-bia', 2, 'b'),
    ...deals('u-caio', 3, 'c'),
    ...deals(null, 1, 'x'),
    ...deals('Fulano (nome livre)', 1, 'y'),
  ]);
  r.closed.set(org, [...closed('u-ana', 3), ...closed('u-bia', 6), ...closed('u-caio', 6)]);
}

describe('RebalanceRecommendationService — dados reais, regra declarada', () => {
  const svc = (r: Reader) => new RebalanceRecommendationService({ reader: r, now: () => ORACLE_FIXED_NOW });

  it('sem owners suficientes → insufficient_data e lista vazia', async () => {
    const r = new Reader();
    r.users.set('org-a', [{ id: 'u-ana', name: 'Ana' }]);
    r.open.set('org-a', deals('u-ana', 10, 'a'));
    r.closed.set('org-a', closed('u-ana', 5));
    const out = await svc(r).list('org-a');
    expect(out.status).toBe('insufficient_data');
    expect(out.recommendations).toEqual([]);
    expect(out.teamMedianBacklogDays).toBeNull();
    expect(out.insufficientDataReason).toMatch(/há 1/);
  });

  it('move os negócios mais antigos do sobrecarregado para quem tem folga, com ids reais', async () => {
    const r = new Reader();
    seed(r, 'org-a');
    const out = await svc(r).list('org-a');
    expect(out.status).toBe('ok');
    expect(out.teamMedianBacklogDays).toBe(45);
    expect(out.diagnostics).toEqual({ openDealsTotal: 19, unassignedOpenDeals: 1, unresolvedOwnerOpenDeals: 1 });
    const recs = out.recommendations;
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(REBALANCE_MAX_MOVES_PER_OWNER);
    expect(recs.every((x) => x.fromOwner.id === 'u-ana')).toBe(true);
    expect(recs.every((x) => ['u-bia', 'u-caio'].includes(x.toOwner.id))).toBe(true);
    expect(recs[0].leadId).toBe('a-0'); // mais antigo
    expect(recs[0].toOwner).toEqual({ id: 'u-bia', name: 'Bia' }); // menor backlog
    expect(recs[0].account).toEqual({ companyId: 'co-a-0', name: 'Conta a-0' });
    expect(recs[0].evidence.from).toMatchObject({ openDeals: 12, closedInWindow: 3, backlogDays: 360 });
    expect(recs[0].recommendationId).toBe(rebalanceRecommendationId('org-a', 'a-0', 'u-ana', 'u-bia'));
    expect(recs.every((x) => x.approvalStatus === 'PENDING_HUMAN_REVIEW' && x.decision === null)).toBe(true);
  });

  it('determinístico: mesmos dados → mesmos recommendationIds', async () => {
    const r = new Reader();
    seed(r, 'org-a');
    const a = await svc(r).list('org-a');
    const b = await svc(r).list('org-a');
    expect(a.recommendations.map((x) => x.recommendationId)).toEqual(b.recommendations.map((x) => x.recommendationId));
  });

  it('marca decisão existente (AuditLog) e isola tenant', async () => {
    const r = new Reader();
    seed(r, 'org-a');
    seed(r, 'org-b');
    const first = (await svc(r).list('org-a')).recommendations[0];
    r.decisions.push({
      approvalId: 'ap-1',
      organizationId: 'org-a',
      recommendationId: first.recommendationId,
      leadId: first.leadId,
      fromOwner: first.fromOwner.id,
      toOwner: first.toOwner.id,
      decision: 'REJECTED',
      decidedBy: 'u-gestor',
      decidedAt: ORACLE_FIXED_NOW.toISOString(),
      appliedToCrm: false,
    });
    const a = (await svc(r).list('org-a')).recommendations[0];
    expect(a.approvalStatus).toBe('REJECTED');
    expect(a.decision?.approvalId).toBe('ap-1');
    const b = (await svc(r).list('org-b')).recommendations;
    expect(b.every((x) => x.decision === null)).toBe(true);
    expect(b[0].recommendationId).not.toBe(first.recommendationId);
  });

  it('equipe equilibrada → ok sem recomendações', async () => {
    const r = new Reader();
    r.users.set('org-a', [
      { id: 'u1', name: 'U1' },
      { id: 'u2', name: 'U2' },
    ]);
    r.open.set('org-a', [...deals('u1', 5, 'a'), ...deals('u2', 5, 'b')]);
    r.closed.set('org-a', [...closed('u1', 5), ...closed('u2', 5)]);
    const out = await svc(r).list('org-a');
    expect(out.status).toBe('ok');
    expect(out.recommendations).toEqual([]);
  });
});
