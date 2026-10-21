import type {
  OracleClosedWonDeal,
  OracleForecastSnapshot,
  OracleHistoryReader,
  OracleOpenDeal,
} from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import type { RebalanceApprovalRecord } from '../../../src/shared/contracts/predictiveRevenueOracle.contract.js';
import type { RebalanceApprovalStore } from '../../../src/features/commercial-intelligence/services/rebalanceApproval.service.js';

export const ORACLE_FIXED_NOW = new Date('2026-10-15T12:00:00.000Z');

/** Reader em memória, isolado por organizationId (simula o filtro tenant do Prisma). */
export class InMemoryOracleReader implements OracleHistoryReader {
  won = new Map<string, OracleClosedWonDeal[]>();
  open = new Map<string, OracleOpenDeal[]>();
  snapshots = new Map<string, OracleForecastSnapshot[]>();
  async listClosedWonDeals(org: string, since: Date) {
    return (this.won.get(org) ?? []).filter((d) => d.closedAt >= since);
  }
  async listOpenDeals(org: string) {
    return this.open.get(org) ?? [];
  }
  async listForecastSnapshots(org: string) {
    return this.snapshots.get(org) ?? [];
  }
}

/** 12 meses encerrados (2025-10 a 2026-09), 2 ganhos/mês: 10k + (i × 1k) e 5k. */
export function seedRealHistory(reader: InMemoryOracleReader, org: string): void {
  const won: OracleClosedWonDeal[] = [];
  for (let i = 0; i < 12; i++) {
    const month = new Date(Date.UTC(2025, 9 + i, 10));
    won.push({ amount: 10_000 + i * 1_000, closedAt: month });
    won.push({ amount: 5_000, closedAt: new Date(month.getTime() + 86_400_000) });
  }
  won.push({ amount: 7_000, closedAt: new Date('2026-10-05T00:00:00.000Z') }); // mês corrente
  reader.won.set(org, won);
  reader.open.set(org, [
    { amount: 20_000, probability: 50, expectedCloseAt: new Date('2026-10-30T00:00:00.000Z') },
    { amount: 40_000, probability: 25, expectedCloseAt: new Date('2027-01-10T00:00:00.000Z') },
  ]);
  // realizado: 2026-07 → 24k, 2026-08 → 25k, 2026-09 → 26k
  reader.snapshots.set(org, [
    { period: '2026-07', snapshotAt: new Date('2026-07-01T00:00:00Z'), forecastAmount: 26_000 },
    { period: '2026-07', snapshotAt: new Date('2026-07-20T00:00:00Z'), forecastAmount: 99_999 },
    { period: '2026-08', snapshotAt: new Date('2026-08-01T00:00:00Z'), forecastAmount: 24_000 },
    { period: '2026-09', snapshotAt: new Date('2026-09-01T00:00:00Z'), forecastAmount: 27_000 },
  ]);
}

export class InMemoryRebalanceApprovalStore implements RebalanceApprovalStore {
  /** org → (leadId → owner atual) */
  leads = new Map<string, Map<string, string | null>>();
  users = new Map<string, Set<string>>();
  addUser(org: string, userId: string) {
    if (!this.users.has(org)) this.users.set(org, new Set());
    this.users.get(org)!.add(userId);
  }
  async ownerIsOrgUser(org: string, userId: string) {
    return this.users.get(org)?.has(userId) ?? false;
  }
  records: Array<{ record: RebalanceApprovalRecord; ipAddress?: string }> = [];
  addLead(org: string, leadId: string, owner: string | null = null) {
    if (!this.leads.has(org)) this.leads.set(org, new Map());
    this.leads.get(org)!.set(leadId, owner);
  }
  async findLead(org: string, leadId: string) {
    const m = this.leads.get(org);
    return m?.has(leadId) ? { owner: m.get(leadId) ?? null } : null;
  }
  async findByRecommendation(org: string, recommendationId: string) {
    const all = this.records.filter(
      (r) => r.record.organizationId === org && r.record.recommendationId === recommendationId,
    );
    return all.length ? all[all.length - 1].record : null;
  }
  async save(record: RebalanceApprovalRecord, ipAddress?: string) {
    this.records.push({ record, ipAddress });
  }
}
