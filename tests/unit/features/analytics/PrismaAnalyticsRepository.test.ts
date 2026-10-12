import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
    leadStageHistory: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma.js';
import { PrismaAnalyticsRepository } from '@/features/analytics/infra/PrismaAnalyticsRepository.js';

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };
const lead = prisma.lead as unknown as Mocked<typeof prisma.lead>;
const activity = prisma.activity as unknown as Mocked<typeof prisma.activity>;
const stageHistory = prisma.leadStageHistory as unknown as Mocked<typeof prisma.leadStageHistory>;

const repo = new PrismaAnalyticsRepository();
const ORG = 'org-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PrismaAnalyticsRepository.sumOpenPipelineValue', () => {
  it('count vem da mesma condição usada para a soma — permite a camada de aplicação decidir null vs. valor real', async () => {
    lead.aggregate.mockResolvedValue({ _sum: { amount: 50000 } });
    lead.count.mockResolvedValue(2);

    const result = await repo.sumOpenPipelineValue(ORG);

    expect(result).toEqual({ total: 50000, count: 2 });
    const aggregateWhere = lead.aggregate.mock.calls[0][0].where;
    const countWhere = lead.count.mock.calls[0][0].where;
    expect(aggregateWhere.amount).toEqual({ not: null });
    expect(countWhere.amount).toEqual({ not: null });
    expect(aggregateWhere.status.notIn).toEqual(
      expect.arrayContaining([
        'Negocios_Ganhos',
        'Negocios_Perdidos',
        'Lead_Desqualificado',
        'Piloto_Birthub360_Profile_Cancelado',
        'Piloto_Logistico_Cancelado',
      ]),
    );
  });
});

describe('PrismaAnalyticsRepository.sumWonRevenueSince', () => {
  it('soma amount de leads ganhos fechados desde since', async () => {
    lead.aggregate.mockResolvedValue({ _sum: { amount: 350000 } });
    lead.count.mockResolvedValue(5);

    const result = await repo.sumWonRevenueSince(ORG, new Date('2026-08-01'));

    expect(result).toEqual({ total: 350000, count: 5 });
    const where = lead.aggregate.mock.calls[0][0].where;
    expect(where.status).toBe('Negocios_Ganhos');
    expect(where.amount).toEqual({ not: null });
  });
});

describe('PrismaAnalyticsRepository.groupFunnelWithAmounts', () => {
  it('agrupa por status obtendo count e soma de amount', async () => {
    lead.groupBy.mockResolvedValue([
      { status: 'Lead_Recebido', _count: { _all: 10 }, _sum: { amount: 50000 } },
    ]);

    const result = await repo.groupFunnelWithAmounts(ORG);

    expect(result).toEqual([{ status: 'Lead_Recebido', count: 10, amount: 50000 }]);
  });
});

describe('PrismaAnalyticsRepository.countOpenLeads — exclui desqualificado e piloto cancelado, não só ganho/perdido', () => {
  it('a cláusula notIn cobre os 5 status terminais', async () => {
    lead.count.mockResolvedValue(0);

    await repo.countOpenLeads(ORG);

    const where = lead.count.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(
      expect.arrayContaining([
        'Negocios_Ganhos',
        'Negocios_Perdidos',
        'Lead_Desqualificado',
        'Piloto_Birthub360_Profile_Cancelado',
        'Piloto_Logistico_Cancelado',
      ]),
    );
  });
});

describe('PrismaAnalyticsRepository.findCallActivityTimestamps', () => {
  it('filtra pelo valor real do enum Prisma ("Ligacao"), não pelo literal "call" (bug legado)', async () => {
    activity.findMany.mockResolvedValue([{ createdAt: new Date('2026-08-12T14:00:00') }]);

    const result = await repo.findCallActivityTimestamps(ORG);

    expect(activity.findMany.mock.calls[0][0].where.type).toBe('Ligacao');
    expect(result).toHaveLength(1);
  });
});

describe('PrismaAnalyticsRepository.groupLostLeadsByReason', () => {
  it('agrupa por lossReason restrito a leads fechados sem venda', async () => {
    lead.groupBy.mockResolvedValue([{ lossReason: 'Preço', _count: { _all: 3 } }]);

    const result = await repo.groupLostLeadsByReason(ORG);

    expect(result).toEqual([{ value: 'Preço', count: 3 }]);
    const where = lead.groupBy.mock.calls[0][0].where;
    expect(where.status.in).toEqual(
      expect.arrayContaining([
        'Negocios_Perdidos',
        'Lead_Desqualificado',
        'Piloto_Birthub360_Profile_Cancelado',
        'Piloto_Logistico_Cancelado',
      ]),
    );
  });
});

describe('PrismaAnalyticsRepository.groupQualifiedLeadsByOwner', () => {
  it('exclui as duas primeiras etapas e o desqualificado', async () => {
    lead.groupBy.mockResolvedValue([{ owner: 'user-1', _count: { _all: 2 } }]);

    const result = await repo.groupQualifiedLeadsByOwner(ORG);

    expect(result).toEqual([{ value: 'user-1', count: 2 }]);
    const where = lead.groupBy.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(['Lead_Recebido', 'Cadencia_Iniciada', 'Lead_Desqualificado']),
    );
  });
});
