import { describe, it, expect, vi } from 'vitest';
import { SalesOrchestrationService } from '../../../../src/features/sales-orchestration/server/SalesOrchestrationService.js';

const ORG = 'org-test-123';

function makeDb(opts: { insights?: unknown[]; broadcastCount?: number; cadenceCount?: number } = {}) {
  return {
    playbookInsight: {
      findMany: vi.fn().mockResolvedValue(opts.insights ?? []),
      count: vi.fn().mockResolvedValue(opts.broadcastCount ?? 0),
    },
    cadenceSequence: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(opts.cadenceCount ?? 0),
    },
    qualificationMatrixItem: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

describe('SalesOrchestrationService (P0 #693 — sem seed)', () => {
  it('banco vazio: listas vazias, métricas null, meta.source none e nenhum pb-* seed', async () => {
    const db = makeDb();
    const overview = await new SalesOrchestrationService(db as any, ORG).getOverview();

    expect(overview.playbooks).toEqual([]);
    expect(overview.playbooks.some((p) => p.id.startsWith('pb-'))).toBe(false);
    expect(overview.jornadas).toEqual([]);
    expect(overview.processos).toEqual([]);
    expect(overview.roteiros).toEqual([]);

    expect(overview.kpis.playbooksAtivos).toBe(0);
    expect(overview.kpis.aderenciaPlaybook).toBeNull();
    expect(overview.kpis.speedToLeadMin).toBeNull();
    expect(overview.kpis.cadenciasAtivas).toBe(0); // sem fallback 14

    expect(overview.meta.source).toBe('none');
    expect(overview.meta.unavailableMetrics).toEqual(
      expect.arrayContaining(['kpis.aderenciaPlaybook', 'kpis.speedToLeadMin', 'playbooks.complianceRate']),
    );
    expect(JSON.stringify(overview)).not.toContain('88.4');
  });

  it('com PlaybookInsight reais: mapeia só campos reais, sem campos derivados do índice', async () => {
    const insights = [
      {
        id: 'pi-a',
        patternTitle: 'Follow-up em 24h fecha mais no varejo',
        patternDescription: 'Leads de varejo com retorno em até 24h tiveram mais desfechos positivos.',
        segment: 'Varejo',
        status: 'BROADCAST',
        evidenceCount: 7,
        updatedAt: new Date('2026-10-05T15:00:00Z'),
      },
      {
        id: 'pi-b',
        patternTitle: 'Demo com CFO acelera saúde',
        patternDescription: 'Incluir CFO na demo encurtou o ciclo.',
        segment: 'Saúde',
        status: 'SUGGESTED',
        evidenceCount: 3,
        updatedAt: new Date('2026-10-01T12:00:00Z'),
      },
    ];
    const db = makeDb({ insights, broadcastCount: 1, cadenceCount: 2 });
    const overview = await new SalesOrchestrationService(db as any, ORG).getOverview();

    expect(overview.meta.source).toBe('real');
    expect(overview.playbooks.map((p) => p.title)).toEqual([
      'Follow-up em 24h fecha mais no varejo',
      'Demo com CFO acelera saúde',
    ]);

    const [a, b] = overview.playbooks;
    expect(a).toMatchObject({
      id: 'pi-a',
      segment: 'Varejo',
      evidenceCount: 7,
      insightStatus: 'BROADCAST',
      status: 'Ativo',
      updatedAt: '2026-10-05T15:00:00.000Z',
      lastUpdated: '05/10/2026',
    });
    expect(b.insightStatus).toBe('SUGGESTED');
    expect(b.status).toBe('Em Revisão');

    for (const p of overview.playbooks) {
      expect(p.complianceRate).toBeNull();
      expect(p.category).toBeNull();
      expect(p.targetRole).toBeNull();
      expect(p.stagesCount).toBeNull();
    }

    expect(overview.kpis.playbooksAtivos).toBe(1);
    expect(overview.kpis.cadenciasAtivas).toBe(2);
    expect(overview.kpis.aderenciaPlaybook).toBeNull();
  });

  it('só cadências reais já marcam source real', async () => {
    const db = makeDb({ cadenceCount: 3 });
    const overview = await new SalesOrchestrationService(db as any, ORG).getOverview();
    expect(overview.meta.source).toBe('real');
    expect(overview.kpis.cadenciasAtivas).toBe(3);
    expect(overview.playbooks).toEqual([]);
  });

  it('filtra todas as queries por organizationId e conta só cadências ativas não deletadas', async () => {
    const db = makeDb();
    await new SalesOrchestrationService(db as any, ORG).getOverview();

    expect(db.playbookInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: ORG } }),
    );
    expect(db.playbookInsight.count).toHaveBeenCalledWith({
      where: { organizationId: ORG, status: 'BROADCAST' },
    });
    expect(db.cadenceSequence.count).toHaveBeenCalledWith({
      where: { organizationId: ORG, active: true, deletedAt: null },
    });
    // Query de matriz de qualificação sem organizationId foi removida.
    expect(db.qualificationMatrixItem.findMany).not.toHaveBeenCalled();
  });
});
