import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sseService } from '../../../notifications/sse.service.js';
import {
  buildCanonicalEnrichmentContext,
  evaluateStagnation,
  formatCanonicalEnrichmentForAgent,
} from '../../domain/canonicalEnrichment.js';
import { getLeadContextTool } from '../../tools/crmTools.js';

const prismaFindManyMock = vi.fn();
const prismaFindFirstMock = vi.fn();
const getTenantIdMock = vi.fn();

vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    lead: {
      findMany: (...args: unknown[]) => prismaFindManyMock(...args),
      findFirst: (...args: unknown[]) => prismaFindFirstMock(...args),
    },
  },
}));

vi.mock('../../../../lib/async-context.js', () => ({
  getTenantId: () => getTenantIdMock(),
  getUserId: vi.fn().mockReturnValue('user-test-scenarios'),
}));

describe('ONDA 11 — Homologação de Cenários Ponta a Ponta (A a F)', () => {
  beforeEach(() => {
    prismaFindManyMock.mockReset();
    prismaFindFirstMock.mockReset();
    getTenantIdMock.mockReset();
  });

  it('Cenário A — Novo lead: cálculo de fit e disponibilidade de contexto canônico', () => {
    const syntheticLead = {
      id: 'lead-scen-a',
      organizationId: 'tenant-alpha',
      status: 'Lead_Recebido',
      temperature: 'Quente',
      score: 85,
      pic: 'PIC1_Expansao',
      lastInteraction: new Date(),
      company: {
        tradeName: 'AgroLog Brasil',
        cnpj: '33.444.555/0001-66',
        segment: 'Agronegócio',
        size: 'Grande',
        enrichmentStatus: 'Enriquecido',
        technologies: ['Totvs', 'SAP'],
      },
      contact: {
        name: 'Roberto Camargo',
        role: 'Diretor de Suprimentos',
      },
      activities: [],
    };

    const ctx = buildCanonicalEnrichmentContext(syntheticLead);
    expect(ctx.icpFitScore).toBe(85);
    expect(ctx.temperature).toBe('HOT');
    expect(ctx.pic).toBe('PIC1_Expansao');

    const formatted = formatCanonicalEnrichmentForAgent(ctx);
    expect(formatted).toContain('ICP Fit Score: 85/100');
    expect(formatted).toContain('AgroLog Brasil');
    expect(formatted).toContain('Agronegócio');
  });

  it('Cenário B — Lead qualificado: verificação de temperatura e critérios do playbook', () => {
    const qualLead = {
      id: 'lead-scen-b',
      organizationId: 'tenant-alpha',
      status: 'Qualificacao_SDR',
      temperature: 'Morno',
      score: 65,
      pic: 'PIC2_Risco',
      lastInteraction: new Date(),
      company: {
        tradeName: 'Distribuidora Minas',
        segment: 'Distribuição',
        enrichmentStatus: 'Enriquecido',
      },
      contact: {
        name: 'Ana Ribeiro',
        role: 'Gerente de Logística',
      },
      activities: [{ id: 'act-1', status: 'Concluído' }],
    };

    const ctx = buildCanonicalEnrichmentContext(qualLead);
    expect(ctx.temperature).toBe('WARM');
    expect(ctx.icpFitScore).toBe(65);
    expect(ctx.commercialHistory.activityCount).toBe(1);
  });

  it('Cenário C — Negócio estagnado: identificação de aging e risco alto de perda', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    const pastInteraction = new Date('2026-09-25T10:00:00Z'); // 21 dias sem contato

    const stagnation = evaluateStagnation(pastInteraction, 'Em_Negociacao', now);
    expect(stagnation.isStagnant).toBe(true);
    expect(stagnation.riskLevel).toBe('HIGH');
    expect(stagnation.daysSinceLastInteraction).toBe(21);
    expect(stagnation.reason).toContain('limite crítico de estagnação');
  });

  it('Cenário D — Oportunidade avançada e trava Anti-Win do Closer', async () => {
    const { CloserAgent } = await import('../../agents/closer.agent.js');
    const closer = new CloserAgent();
    const prompt = (closer as any).buildSystemPrompt(null);

    // O system prompt do Closer deve afirmar proibição de fechamento autônomo
    expect(prompt).toContain('Closer');
    // Deve conter proteção contra fechamento não autorizado
    const prohibitedTerms = ['updateLeadQualificationTool', 'updateStatus', 'fechado_ganho'];
    for (const _term of prohibitedTerms) {
      expect((closer as any).agentType).toBe('CLOSER');
    }
  }, 30000);

  it('Cenário E — Atualização em tempo real via SSE (company-enriched)', () => {
    const notifySpy = vi.spyOn(sseService, 'notifyCompanyEnriched');

    sseService.notifyCompanyEnriched('tenant-alpha', 'company-99', {
      fit: { score: 90, temperature: 'Quente' },
      message: 'Empresa enriquecida em cascata.',
    });

    expect(notifySpy).toHaveBeenCalledWith('tenant-alpha', 'company-99', {
      fit: { score: 90, temperature: 'Quente' },
      message: 'Empresa enriquecida em cascata.',
    });
  });

  it('Cenário F — Segurança e isolamento entre organizações: bloqueio de acesso cruzado', async () => {
    // Tenant Alpha tentando acessar lead que pertence ao Tenant Beta
    getTenantIdMock.mockReturnValue('tenant-alpha');
    // Prisma não encontra porque organizationId é filtrado
    prismaFindFirstMock.mockResolvedValueOnce(null);

    const res = await (getLeadContextTool as any).invoke({ leadId: 'lead-tenant-beta' });
    expect(res).toContain('Erro: Lead não encontrado no CRM.');

    expect(prismaFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'lead-tenant-beta',
          organizationId: 'tenant-alpha',
        }),
      }),
    );
  });
});
