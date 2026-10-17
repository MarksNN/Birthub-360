import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  getUserId: vi.fn().mockReturnValue('user-test-1'),
}));

import { getLeadContextTool, searchLeadsTool } from '../crmTools.js';

describe('crmTools — Enriched Search and Canonical Context', () => {
  beforeEach(() => {
    prismaFindManyMock.mockReset();
    prismaFindFirstMock.mockReset();
    getTenantIdMock.mockReset();
  });

  describe('search_leads with enrichment filters', () => {
    it('bloqueia busca caso o contexto do tenant esteja ausente', async () => {
      getTenantIdMock.mockReturnValue(undefined);

      const res = await (searchLeadsTool as any).invoke({ query: 'Loggi' });
      expect(res).toContain('Erro: contexto de organização ausente');
    });

    it('busca e formata leads com temperatura e ICP Fit', async () => {
      getTenantIdMock.mockReturnValue('org-crm-test');
      prismaFindManyMock.mockResolvedValueOnce([
        {
          id: 'lead-1',
          status: 'Lead_Recebido',
          temperature: 'Quente',
          score: 88,
          company: { tradeName: 'Viação Alfa', legalName: 'Viação Alfa Ltda' },
          contact: { name: 'Mariana Souza' },
        },
      ]);

      const res = await (searchLeadsTool as any).invoke({
        temperature: 'HOT',
        minScore: 80,
      });

      expect(prismaFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-crm-test',
            temperature: 'Quente',
            score: { gte: 80 },
          }),
        }),
      );

      expect(res).toContain('Viação Alfa');
      expect(res).toContain('Temp: HOT');
      expect(res).toContain('ICP Fit: 88/100');
    });

    it('aplica filtro de pendência de enriquecimento (needsEnrichment)', async () => {
      getTenantIdMock.mockReturnValue('org-crm-test');
      prismaFindManyMock.mockResolvedValueOnce([]);

      await (searchLeadsTool as any).invoke({
        needsEnrichment: true,
      });

      expect(prismaFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-crm-test',
            OR: [{ score: null }, { company: { is: { enrichmentStatus: 'Pendente' } } }],
          }),
        }),
      );
    });
  });

  describe('get_lead_context with canonical enrichment', () => {
    it('bloqueia busca sem tenant ou caso o lead não pertença à organização', async () => {
      getTenantIdMock.mockReturnValue('org-crm-test');
      prismaFindFirstMock.mockResolvedValueOnce(null);

      const res = await (getLeadContextTool as any).invoke({ leadId: 'lead-inexistente' });
      expect(res).toContain('Erro: Lead não encontrado no CRM');
    });

    it('retorna o contexto canônico completo com sanitização de PII', async () => {
      getTenantIdMock.mockReturnValue('org-crm-test');
      prismaFindFirstMock.mockResolvedValueOnce({
        id: 'lead-100',
        organizationId: 'org-crm-test',
        status: 'Em_Negociacao',
        temperature: 'WARM',
        score: 74,
        pic: 'PIC2_Risco',
        lastInteraction: new Date('2026-10-10T10:00:00Z'),
        amount: 30000,
        currency: 'BRL',
        company: {
          tradeName: 'TransGlobal',
          legalName: 'TransGlobal Logística SA',
          cnpj: '22.333.444/0001-55',
          segment: 'Transporte',
          size: 'Médio',
          employeeCount: 150,
          city: 'Curitiba',
          state: 'PR',
          situacaoCadastral: 'Ativa',
          enrichmentStatus: 'Enriquecido',
          enrichmentSource: 'ReceitaFederal+Apollo',
          enrichedAt: new Date('2026-09-15T10:00:00Z'),
          technologies: ['Totvs Protheus', 'Power BI'],
        },
        contact: {
          name: 'Fernando Rocha',
          role: 'Gerente Comercial',
        },
        activities: [],
      });

      const res = await (getLeadContextTool as any).invoke({ leadId: 'lead-100' });

      expect(res).toContain('=== CONTEXTO CANÔNICO DE INTELIGÊNCIA COMERCIAL (v1.0.0) ===');
      expect(res).toContain('• Temperatura: WARM');
      expect(res).toContain('• ICP Fit Score: 74/100');
      expect(res).toContain('• Nome Fantasia / Razão: TransGlobal');
      expect(res).toContain('Totvs Protheus, Power BI');
      // PII do contato foi minimizada para token
      expect(res).toContain('[NOME_DO_CONTATO]');
      expect(res).not.toContain('Fernando Rocha');
    });
  });
});
