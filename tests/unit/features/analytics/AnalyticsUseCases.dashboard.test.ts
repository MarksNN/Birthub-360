import { describe, expect, it, vi } from 'vitest';
import { AnalyticsUseCases, buildCohortCsv } from '@/features/analytics/application/AnalyticsUseCases';
import type {
  AnalyticsRepository,
  ClosedLead,
  CohortLeadRow,
  FunnelStageData,
  GroupCount,
} from '@/features/analytics/domain/Analytics';

function buildFakeRepository(overrides: Partial<AnalyticsRepository> = {}): AnalyticsRepository {
  const base: AnalyticsRepository = {
    countCompanies: vi.fn().mockResolvedValue(0),
    countContacts: vi.fn().mockResolvedValue(0),
    countOpenLeads: vi.fn().mockResolvedValue(0),
    countAllLeads: vi.fn().mockResolvedValue(0),
    countActivities: vi.fn().mockResolvedValue(0),
    countPendingActivities: vi.fn().mockResolvedValue(0),
    countOverdueActivities: vi.fn().mockResolvedValue(0),
    countLeadsByStatusSince: vi.fn().mockResolvedValue(0),
    countLeadsByStatus: vi.fn().mockResolvedValue(0),
    averageOpenLeadScore: vi.fn().mockResolvedValue(null),
    sumOpenPipelineValue: vi.fn().mockResolvedValue({ total: 0, count: 0 }),
    sumWonRevenueSince: vi.fn().mockResolvedValue({ total: 0, count: 0 }),
    sumAllWonRevenue: vi.fn().mockResolvedValue({ total: 0, count: 0 }),
    groupLeadsByStatus: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupFunnelWithAmounts: vi.fn().mockResolvedValue([] as FunnelStageData[]),
    findLeadsCreatedSince: vi.fn().mockResolvedValue([]),
    findLeadsClosedSince: vi.fn().mockResolvedValue([] as ClosedLead[]),
    groupLeadsByTemperature: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupLeadsBySource: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupLeadsByOwner: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupWonAmountByOwner: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupQualifiedLeadsByOwner: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupActivitiesByType: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupActivitiesByStatus: vi.fn().mockResolvedValue([] as GroupCount[]),
    groupLostLeadsByReason: vi.fn().mockResolvedValue([] as GroupCount[]),
    findCallActivityTimestamps: vi.fn().mockResolvedValue([]),
    findLeadsForCohort: vi.fn().mockResolvedValue([] as CohortLeadRow[]),
    calculateRealTmq: vi.fn().mockResolvedValue(null),
  };
  return { ...base, ...overrides };
}

const ORG = 'org-1';

describe('AnalyticsUseCases.overview — pipelineValue e vendas reais', () => {
  it('devolve null (não 0) quando nenhum lead em aberto tem amount preenchido', async () => {
    const repo = buildFakeRepository({
      sumOpenPipelineValue: vi.fn().mockResolvedValue({ total: 0, count: 0 }),
    });
    const useCases = new AnalyticsUseCases(repo);

    const overview = await useCases.overview(ORG);

    expect(overview.pipelineValue).toBeNull();
  });

  it('devolve a soma real quando há leads em aberto com amount', async () => {
    const repo = buildFakeRepository({
      sumOpenPipelineValue: vi.fn().mockResolvedValue({ total: 125000, count: 3 }),
    });
    const useCases = new AnalyticsUseCases(repo);

    const overview = await useCases.overview(ORG);

    expect(overview.pipelineValue).toBe(125000);
  });

  it('calcula wonRevenueThisMonth e averageTicketThisMonth com dados reais de vendas', async () => {
    const repo = buildFakeRepository({
      countLeadsByStatusSince: vi.fn().mockResolvedValue(4),
      sumWonRevenueSince: vi.fn().mockResolvedValue({ total: 200000, count: 4 }),
      sumAllWonRevenue: vi.fn().mockResolvedValue({ total: 600000, count: 12 }),
    });
    const useCases = new AnalyticsUseCases(repo);

    const overview = await useCases.overview(ORG);

    expect(overview.closedThisMonth).toBe(4);
    expect(overview.wonRevenueThisMonth).toBe(200000);
    expect(overview.averageTicketThisMonth).toBe(50000);
    expect(overview.totalWonRevenueEver).toBe(600000);
  });
});

describe('AnalyticsUseCases.funnel — agregações com valores monetários', () => {
  it('calcula conversão e volume financeiro real acumulado em cada etapa', async () => {
    const repo = buildFakeRepository({
      groupFunnelWithAmounts: vi.fn().mockResolvedValue([
        { status: 'Lead_Recebido', count: 10, amount: 100000 },
        { status: 'Qualificacao_SDR', count: 5, amount: 60000 },
        { status: 'Negocios_Ganhos', count: 2, amount: 40000 },
      ] as FunnelStageData[]),
    });
    const useCases = new AnalyticsUseCases(repo);

    const funnel = await useCases.funnel(ORG);

    expect(funnel.length).toBeGreaterThan(0);
    const firstStage = funnel[0];
    expect(firstStage.count).toBe(17);
    expect(firstStage.amount).toBe(200000);
  });
});

describe('AnalyticsUseCases.dashboard — tmqMetric e vendas reais', () => {
  it('tmqMetric é null quando não há histórico de transição registrado', async () => {
    const repo = buildFakeRepository();
    const useCases = new AnalyticsUseCases(repo);

    const dashboard = await useCases.dashboard(ORG);

    expect(dashboard.tmqMetric).toBeNull();
  });

  it('tmqMetric reflete a média real de dias calculada pelo repositório', async () => {
    const repo = buildFakeRepository({
      calculateRealTmq: vi.fn().mockResolvedValue(4.5),
    });
    const useCases = new AnalyticsUseCases(repo);

    const dashboard = await useCases.dashboard(ORG);

    expect(dashboard.tmqMetric).toBe(4.5);
    expect(dashboard.salesSummary?.salesVelocityDays).toBe(4.5);
  });
});

describe('AnalyticsUseCases.dashboard — widgets antes hardcoded para vazio agora usam dado real', () => {
  it('lostReasons reflete o agrupamento real do repositório, com rótulo de ausência explícito', async () => {
    const repo = buildFakeRepository({
      groupLostLeadsByReason: vi.fn().mockResolvedValue([
        { value: 'Preço', count: 4 },
        { value: null, count: 2 },
      ]),
    });
    const useCases = new AnalyticsUseCases(repo);

    const dashboard = await useCases.dashboard(ORG);

    expect(dashboard.lostReasons).toEqual([
      { label: 'Preço', count: 4 },
      { label: 'Sem motivo registrado', count: 2 },
    ]);
  });

  it('callHeatmap agrupa os timestamps reais de ligação em (dia da semana, hora)', async () => {
    const wednesday14h = new Date('2026-08-12T14:30:00');
    const repo = buildFakeRepository({
      findCallActivityTimestamps: vi.fn().mockResolvedValue([wednesday14h, wednesday14h]),
    });
    const useCases = new AnalyticsUseCases(repo);

    const dashboard = await useCases.dashboard(ORG);

    expect(dashboard.callHeatmap).toEqual([
      { dayOfWeek: wednesday14h.getDay(), hour: 14, count: 2 },
    ]);
  });

  it('performanceReport calcula leadsQualified/conversionRate a partir de dois agrupamentos reais (atribuídos x qualificados)', async () => {
    const repo = buildFakeRepository({
      groupLeadsByOwner: vi.fn((_org: string, status?: string) => {
        if (status) return Promise.resolve([]);
        return Promise.resolve([{ value: 'user-1', count: 10 }] as GroupCount[]);
      }),
      groupQualifiedLeadsByOwner: vi.fn().mockResolvedValue([{ value: 'user-1', count: 4 }] as GroupCount[]),
      groupWonAmountByOwner: vi.fn().mockResolvedValue([{ value: 'user-1', count: 50000 }] as GroupCount[]),
    });
    const useCases = new AnalyticsUseCases(repo);

    const dashboard = await useCases.dashboard(ORG);

    expect(dashboard.performanceReport).toEqual([
      {
        agent: 'user-1',
        isAi: false,
        leadsAssigned: 10,
        leadsQualified: 4,
        conversionRate: 40,
        wonAmount: 50000,
      },
    ]);
  });

  it('owner vazio no relatório de performance vira "Sem Dono", nunca um nome inventado', async () => {
    const repo = buildFakeRepository({
      groupLeadsByOwner: vi.fn((_org: string, status?: string) => {
        if (status) return Promise.resolve([]);
        return Promise.resolve([{ value: null, count: 5 }] as GroupCount[]);
      }),
    });
    const useCases = new AnalyticsUseCases(repo);

    const dashboard = await useCases.dashboard(ORG);

    expect(dashboard.performanceReport[0].agent).toBe('Sem Dono');
  });
});

describe('AnalyticsUseCases.cohortAnalysis — nunca fabricado', () => {
  const NOW = new Date('2026-08-15T12:00:00Z');

  it('conta um lead ganho em até 30 dias em won30d e won60d; um ganho em 45 dias só em won60d', async () => {
    const rows: CohortLeadRow[] = [
      {
        createdAt: new Date('2026-07-01T00:00:00Z'),
        closedAt: new Date('2026-07-20T00:00:00Z'),
        status: 'Negocios_Ganhos',
      },
      {
        createdAt: new Date('2026-07-01T00:00:00Z'),
        closedAt: new Date('2026-08-15T00:00:00Z'),
        status: 'Negocios_Ganhos',
      },
      { createdAt: new Date('2026-07-01T00:00:00Z'), closedAt: null, status: 'Negocios_Perdidos' },
    ];
    const repo = buildFakeRepository({ findLeadsForCohort: vi.fn().mockResolvedValue(rows) });
    const useCases = new AnalyticsUseCases(repo);

    const cohorts = await useCases.cohortAnalysis(ORG, 3, NOW);
    const july = cohorts.find((c) => c.month === '2026-07');

    expect(july).toEqual({ month: '2026-07', total: 3, won30d: 1, won60d: 2 });
  });

  it('mês sem nenhum lead criado é omitido — nunca aparece como 0 fabricado', async () => {
    const repo = buildFakeRepository({ findLeadsForCohort: vi.fn().mockResolvedValue([]) });
    const useCases = new AnalyticsUseCases(repo);

    const cohorts = await useCases.cohortAnalysis(ORG, 3, NOW);

    expect(cohorts).toEqual([]);
  });

  it('busca só desde o início da janela de meses pedida', async () => {
    const findLeadsForCohort = vi.fn().mockResolvedValue([]);
    const repo = buildFakeRepository({ findLeadsForCohort });
    const useCases = new AnalyticsUseCases(repo);

    await useCases.cohortAnalysis(ORG, 3, NOW);

    expect(findLeadsForCohort).toHaveBeenCalledWith(ORG, new Date('2026-06-01T00:00:00Z'));
  });
});

describe('buildCohortCsv', () => {
  it('serializa as linhas já calculadas, sem recalcular nada', () => {
    const csv = buildCohortCsv([{ month: '2026-07', total: 3, won30d: 1, won60d: 2 }]);

    expect(csv).toBe('Mes,Total de Leads,Ganhos em 30 dias,Ganhos em 60 dias\n2026-07,3,1,2');
  });

  it('sem nenhuma linha, devolve só o cabeçalho', () => {
    expect(buildCohortCsv([])).toBe('Mes,Total de Leads,Ganhos em 30 dias,Ganhos em 60 dias');
  });
});

describe('AnalyticsUseCases.getMetrics — agregação defensiva', () => {
  it('retorna { metrics: [], total: 0 } quando o banco está vazio', async () => {
    const repo = buildFakeRepository({
      countAllLeads: vi.fn().mockResolvedValue(0),
      groupFunnelWithAmounts: vi.fn().mockResolvedValue([]),
    });
    const useCases = new AnalyticsUseCases(repo);

    const result = await useCases.getMetrics(ORG);

    expect(result).toEqual({ metrics: [], total: 0 });
  });

  it('retorna { metrics: [], total: 0 } defensivamente quando o repositório lança erro', async () => {
    const repo = buildFakeRepository({
      countAllLeads: vi.fn().mockRejectedValue(new Error('Database empty or unavailable')),
    });
    const useCases = new AnalyticsUseCases(repo);

    const result = await useCases.getMetrics(ORG);

    expect(result).toEqual({ metrics: [], total: 0 });
  });

  it('retorna métricas agregadas e total quando existem leads', async () => {
    const repo = buildFakeRepository({
      countAllLeads: vi.fn().mockResolvedValue(10),
      groupFunnelWithAmounts: vi.fn().mockResolvedValue([
        { status: 'Lead_Recebido', count: 6, amount: 12000 },
        { status: 'Negocios_Ganhos', count: 4, amount: 48000 },
      ]),
    });
    const useCases = new AnalyticsUseCases(repo);

    const result = await useCases.getMetrics(ORG);

    expect(result.total).toBe(10);
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics[0]).toEqual({ name: 'Lead_Recebido', value: 6, amount: 12000 });
  });
});
