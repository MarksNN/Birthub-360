import { prisma } from '../../../lib/prisma.js';
import type {
  AnalyticsRepository,
  ClosedLead,
  CohortLeadRow,
  FunnelStageData,
  GroupCount,
} from '../domain/Analytics.js';
import { CLOSED_STATUSES } from '../domain/Analytics.js';

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  async countCompanies(organizationId: string): Promise<number> {
    return prisma.company.count({ where: { organizationId, deletedAt: null } });
  }

  async countContacts(organizationId: string): Promise<number> {
    return prisma.contact.count({ where: { organizationId, deletedAt: null } });
  }

  async countOpenLeads(organizationId: string): Promise<number> {
    return prisma.lead.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: CLOSED_STATUSES as unknown as never[] },
      },
    });
  }

  async countAllLeads(organizationId: string): Promise<number> {
    return prisma.lead.count({ where: { organizationId, deletedAt: null } });
  }

  async countActivities(organizationId: string): Promise<number> {
    return prisma.activity.count({ where: { organizationId, deletedAt: null } });
  }

  async countPendingActivities(organizationId: string): Promise<number> {
    return prisma.activity.count({
      where: { organizationId, deletedAt: null, status: 'Pendente' },
    });
  }

  async countOverdueActivities(organizationId: string, now: Date): Promise<number> {
    return prisma.activity.count({
      where: { organizationId, deletedAt: null, status: 'Pendente', date: { lt: now } },
    });
  }

  async countLeadsByStatusSince(
    organizationId: string,
    status: string,
    since: Date,
  ): Promise<number> {
    return prisma.lead.count({
      where: { organizationId, deletedAt: null, status: status as never, closedAt: { gte: since } },
    });
  }

  async countLeadsByStatus(organizationId: string, status: string): Promise<number> {
    return prisma.lead.count({
      where: { organizationId, deletedAt: null, status: status as never },
    });
  }

  async averageOpenLeadScore(organizationId: string): Promise<number | null> {
    const result = await prisma.lead.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: CLOSED_STATUSES as unknown as never[] },
        score: { not: null },
      },
      _avg: { score: true },
    });
    return result._avg?.score ?? null;
  }

  async sumOpenPipelineValue(organizationId: string): Promise<{ total: number; count: number }> {
    const where = {
      organizationId,
      deletedAt: null,
      status: { notIn: CLOSED_STATUSES as unknown as never[] },
      amount: { not: null },
    } as const;
    const [aggregate, count] = await Promise.all([
      prisma.lead.aggregate({ where, _sum: { amount: true } }),
      prisma.lead.count({ where }),
    ]);
    return { total: aggregate._sum?.amount ?? 0, count };
  }

  async sumWonRevenueSince(
    organizationId: string,
    since: Date,
  ): Promise<{ total: number; count: number }> {
    const where = {
      organizationId,
      deletedAt: null,
      status: 'Negocios_Ganhos' as never,
      closedAt: { gte: since },
      amount: { not: null },
    } as const;
    const [aggregate, count] = await Promise.all([
      prisma.lead.aggregate({ where, _sum: { amount: true } }),
      prisma.lead.count({ where }),
    ]);
    return { total: aggregate._sum?.amount ?? 0, count };
  }

  async sumAllWonRevenue(organizationId: string): Promise<{ total: number; count: number }> {
    const where = {
      organizationId,
      deletedAt: null,
      status: 'Negocios_Ganhos' as never,
      amount: { not: null },
    } as const;
    const [aggregate, count] = await Promise.all([
      prisma.lead.aggregate({ where, _sum: { amount: true } }),
      prisma.lead.count({ where }),
    ]);
    return { total: aggregate._sum?.amount ?? 0, count };
  }

  async groupLeadsByStatus(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.status, count: row._count._all }));
  }

  async groupFunnelWithAmounts(organizationId: string): Promise<FunnelStageData[]> {
    const rows = await prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return rows.map((row) => ({
      status: row.status,
      count: row._count._all,
      amount: row._sum?.amount ?? 0,
    }));
  }

  async findLeadsCreatedSince(
    organizationId: string,
    since: Date,
  ): Promise<Array<{ createdAt: Date }>> {
    return prisma.lead.findMany({
      where: { organizationId, deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
    });
  }

  async findLeadsClosedSince(organizationId: string, since: Date): Promise<ClosedLead[]> {
    const rows = await prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: ['Negocios_Ganhos', 'Negocios_Perdidos'] },
        closedAt: { gte: since },
      },
      select: { closedAt: true, status: true },
    });
    return rows.map((row) => ({ closedAt: row.closedAt as Date, status: row.status }));
  }

  async groupLeadsByTemperature(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['temperature'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.temperature, count: row._count._all }));
  }

  async groupLeadsBySource(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.source, count: row._count._all }));
  }

  async groupLeadsByOwner(organizationId: string, status?: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['owner'],
      where: { organizationId, deletedAt: null, ...(status ? { status: status as never } : {}) },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.owner, count: row._count._all }));
  }

  async groupWonAmountByOwner(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['owner'],
      where: {
        organizationId,
        deletedAt: null,
        status: 'Negocios_Ganhos' as never,
        amount: { not: null },
      },
      _sum: { amount: true },
    });
    return rows.map((row) => ({ value: row.owner, count: row._sum?.amount ?? 0 }));
  }

  async groupActivitiesByType(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.activity.groupBy({
      by: ['type'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.type, count: row._count._all }));
  }

  async groupActivitiesByStatus(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.activity.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.status, count: row._count._all }));
  }

  async groupQualifiedLeadsByOwner(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['owner'],
      where: {
        organizationId,
        deletedAt: null,
        status: {
          notIn: [
            'Lead_Recebido',
            'Cadencia_Iniciada',
            'Lead_Desqualificado',
          ] as unknown as never[],
        },
      },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.owner, count: row._count._all }));
  }

  async groupLostLeadsByReason(organizationId: string): Promise<GroupCount[]> {
    const rows = await prisma.lead.groupBy({
      by: ['lossReason'],
      where: {
        organizationId,
        deletedAt: null,
        status: {
          in: [
            'Negocios_Perdidos',
            'Lead_Desqualificado',
            'Piloto_Birthub360_Profile_Cancelado',
            'Piloto_Logistico_Cancelado',
          ] as unknown as never[],
        },
      },
      _count: { _all: true },
    });
    return rows.map((row) => ({ value: row.lossReason, count: row._count._all }));
  }

  async findCallActivityTimestamps(organizationId: string): Promise<Date[]> {
    const rows = await prisma.activity.findMany({
      where: { organizationId, deletedAt: null, type: 'Ligacao' },
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt);
  }

  async findLeadsForCohort(organizationId: string, since: Date): Promise<CohortLeadRow[]> {
    const rows = await prisma.lead.findMany({
      where: { organizationId, deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true, closedAt: true, status: true },
    });
    return rows.map((row) => ({
      createdAt: row.createdAt,
      closedAt: row.closedAt,
      status: row.status,
    }));
  }

  async calculateRealTmq(organizationId: string): Promise<number | null> {
    try {
      const historyRows = await prisma.leadStageHistory.findMany({
        where: {
          organizationId,
          stageName: { in: ['Qualificacao_SDR', 'Reuniao_Agendada', 'Nova_Oportunidade'] },
        },
        select: { leadId: true, enteredAt: true },
        orderBy: { enteredAt: 'asc' },
        take: 200,
      });

      if (historyRows.length === 0) return null;

      const leadIds = [...new Set(historyRows.map((h) => h.leadId))];
      const leads = await prisma.lead.findMany({
        where: { organizationId, id: { in: leadIds }, deletedAt: null },
        select: { id: true, createdAt: true },
      });
      const leadMap = new Map(leads.map((l) => [l.id, l.createdAt]));

      const DAY_MS = 24 * 60 * 60 * 1000;
      const durations: number[] = [];
      for (const h of historyRows) {
        const createdAt = leadMap.get(h.leadId);
        if (createdAt) {
          const diff = (h.enteredAt.getTime() - createdAt.getTime()) / DAY_MS;
          if (diff >= 0 && diff <= 180) durations.push(diff);
        }
      }

      if (durations.length === 0) return null;
      return Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 100) / 100;
    } catch {
      return null;
    }
  }
}
