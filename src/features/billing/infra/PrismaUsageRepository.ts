import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type {
  UsageByModelRow,
  UsageByPromptRow,
  UsageLogRow,
  UsagePoint,
  UsageRepository,
} from '../domain/Usage.js';

export const MAX_USAGE_LOG_ROWS = 5_000;

export class PrismaUsageRepository implements UsageRepository {
  async findLogsSince(
    organizationId: string,
    since: Date,
    limit: number = MAX_USAGE_LOG_ROWS,
  ): Promise<UsageLogRow[]> {
    return prisma.aILog.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { createdAt: true, tokens: true, cost: true, latencyMs: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async groupByDay(organizationId: string, since: Date): Promise<UsagePoint[]> {
    const rows = await prisma.$queryRaw<
      Array<{ day: string; tokens: number | bigint; cost: number; calls: number | bigint }>
    >(Prisma.sql`
      SELECT
        to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
        COALESCE(SUM("tokens"), 0)::int AS tokens,
        COALESCE(SUM("cost"), 0)::float8 AS cost,
        COUNT(*)::int AS calls
      FROM "AILog"
      WHERE "organizationId" = ${organizationId}
        AND "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((row) => ({
      day: row.day,
      tokens: Number(row.tokens ?? 0),
      cost: Number(row.cost ?? 0),
      calls: Number(row.calls ?? 0),
    }));
  }

  async groupByModel(organizationId: string, since: Date): Promise<UsageByModelRow[]> {
    const rows = await prisma.aILog.groupBy({
      by: ['model'],
      where: { organizationId, createdAt: { gte: since } },
      _sum: { tokens: true, cost: true },
      _avg: { latencyMs: true },
      _count: { _all: true },
    });

    return rows.map((row) => ({
      model: row.model,
      tokens: row._sum.tokens ?? 0,
      cost: row._sum.cost ?? 0,
      calls: row._count._all,
      avgLatencyMs: Math.round(row._avg.latencyMs ?? 0),
    }));
  }

  async groupByPrompt(organizationId: string, since: Date): Promise<UsageByPromptRow[]> {
    const rows = await prisma.aILog.groupBy({
      by: ['promptId'],
      where: { organizationId, createdAt: { gte: since } },
      _sum: { tokens: true, cost: true },
      _count: { _all: true },
    });

    return rows.map((row) => ({
      promptId: row.promptId,
      tokens: row._sum.tokens ?? 0,
      cost: row._sum.cost ?? 0,
      calls: row._count._all,
    }));
  }

  async sumCostSince(organizationId: string, since: Date): Promise<number> {
    const result = await prisma.aILog.aggregate({
      where: { organizationId, createdAt: { gte: since } },
      _sum: { cost: true },
    });
    return result._sum.cost ?? 0;
  }

  async countUnattributed(since: Date): Promise<number> {
    return prisma.aILog.count({ where: { organizationId: null, createdAt: { gte: since } } });
  }
}
