import type { Prisma } from '@prisma/client';
import { withTenantContext } from '../../../lib/async-context.js';
import { prisma } from '../../../lib/prisma.js';
import type { WinLossAutopsyReport } from '../../../shared/contracts/winLossAutopsy.contract.js';

/**
 * REMED-02: persistência da Autópsia Win-Loss. Fonte da verdade = PostgreSQL
 * (WinLossAutopsyReport, tenant-scoped + RLS). Relatório completo em `report` (Json).
 */
export interface WinLossAutopsyRepository {
  save(report: WinLossAutopsyReport): Promise<void>;
  find(organizationId: string, reportId: string): Promise<WinLossAutopsyReport | null>;
}

export class PrismaWinLossAutopsyRepository implements WinLossAutopsyRepository {
  async save(report: WinLossAutopsyReport): Promise<void> {
    const data = {
      dealId: report.dealId,
      outcome: report.outcome,
      humanReviewStatus: report.humanReviewStatus,
      report: report as unknown as Prisma.InputJsonValue,
    };
    await withTenantContext(report.organizationId, () =>
      prisma.winLossAutopsyReport.upsert({
        where: { id: report.id },
        create: {
          id: report.id,
          organizationId: report.organizationId,
          analyzedAt: new Date(report.analyzedAt),
          ...data,
        },
        update: data,
      }),
    );
  }

  async find(organizationId: string, reportId: string): Promise<WinLossAutopsyReport | null> {
    const row = await withTenantContext(organizationId, () =>
      prisma.winLossAutopsyReport.findFirst({ where: { organizationId, id: reportId } }),
    );
    return row ? (row.report as unknown as WinLossAutopsyReport) : null;
  }
}

/** Implementação em memória APENAS para testes unitários (não usada em runtime). */
export class InMemoryWinLossAutopsyRepository implements WinLossAutopsyRepository {
  private rows = new Map<string, WinLossAutopsyReport>();
  async save(r: WinLossAutopsyReport) {
    this.rows.set(`${r.organizationId}:${r.id}`, structuredClone(r));
  }
  async find(org: string, id: string) {
    const r = this.rows.get(`${org}:${id}`);
    return r ? structuredClone(r) : null;
  }
}
