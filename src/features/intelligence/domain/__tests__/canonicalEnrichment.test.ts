import { describe, expect, it } from 'vitest';
import {
  buildCanonicalEnrichmentContext,
  calculateCompleteness,
  evaluateStagnation,
  formatCanonicalEnrichmentForAgent,
} from '../canonicalEnrichment.js';

describe('canonicalEnrichment domain service', () => {
  describe('calculateCompleteness', () => {
    it('retorna 0 para empresa e lead vazios', () => {
      expect(calculateCompleteness(null, null)).toBe(0);
    });

    it('calcula porcentagem correta quando campos firmográficos e de contato estão presentes', () => {
      const company = {
        tradeName: 'Logística Expresso',
        cnpj: '12.345.678/0001-90',
        segment: 'Logística',
        size: 'Médio',
        city: 'São Paulo',
        state: 'SP',
        website: 'https://expresso.com.br',
      };
      const lead = {
        score: 85,
        contact: {
          name: 'Carlos Oliveira',
          email: 'carlos@expresso.com.br',
        },
      };

      const percent = calculateCompleteness(company, lead);
      expect(percent).toBe(100);
    });

    it('calcula valor parcial quando faltam campos opcionais', () => {
      const company = {
        tradeName: 'Distribuidora Silva',
        cnpj: '98.765.432/0001-10',
      };
      const lead = {
        score: null,
        contact: { name: 'João Silva' },
      };

      const percent = calculateCompleteness(company, lead);
      expect(percent).toBeGreaterThan(0);
      expect(percent).toBeLessThan(100);
    });
  });

  describe('evaluateStagnation', () => {
    const now = new Date('2026-10-16T12:00:00Z');

    it('marca lead em estágio terminal como não-estagnado', () => {
      const stagWon = evaluateStagnation(new Date('2026-01-01'), 'Negocios_Ganhos', now);
      expect(stagWon.isStagnant).toBe(false);
      expect(stagWon.riskLevel).toBe('LOW');

      const stagLost = evaluateStagnation(new Date('2026-01-01'), 'Negocios_Perdidos', now);
      expect(stagLost.isStagnant).toBe(false);
      expect(stagLost.riskLevel).toBe('LOW');
    });

    it('sinaliza risco ALTO se nunca houve interação registrada', () => {
      const stag = evaluateStagnation(null, 'Em_Negociacao', now);
      expect(stag.isStagnant).toBe(true);
      expect(stag.riskLevel).toBe('HIGH');
      expect(stag.reason).toContain('Nenhuma interação');
    });

    it('sinaliza risco ALTO se última interação ocorreu há 14 ou mais dias', () => {
      const pastDate = new Date('2026-10-01T12:00:00Z'); // 15 dias atrás
      const stag = evaluateStagnation(pastDate, 'Em_Negociacao', now);
      expect(stag.isStagnant).toBe(true);
      expect(stag.riskLevel).toBe('HIGH');
      expect(stag.daysSinceLastInteraction).toBe(15);
    });

    it('sinaliza risco MÉDIO se última interação ocorreu entre 7 e 13 dias', () => {
      const pastDate = new Date('2026-10-08T12:00:00Z'); // 8 dias atrás
      const stag = evaluateStagnation(pastDate, 'Em_Negociacao', now);
      expect(stag.isStagnant).toBe(true);
      expect(stag.riskLevel).toBe('MEDIUM');
      expect(stag.daysSinceLastInteraction).toBe(8);
    });

    it('marca como saudável se houve interação recente (<= 6 dias)', () => {
      const pastDate = new Date('2026-10-14T12:00:00Z'); // 2 dias atrás
      const stag = evaluateStagnation(pastDate, 'Em_Negociacao', now);
      expect(stag.isStagnant).toBe(false);
      expect(stag.riskLevel).toBe('LOW');
      expect(stag.daysSinceLastInteraction).toBe(2);
    });
  });

  describe('buildCanonicalEnrichmentContext & formatCanonicalEnrichmentForAgent', () => {
    it('monta o contexto canônico estruturado completo com flags de completude e staleness', () => {
      const now = new Date('2026-10-16T12:00:00Z');
      const lead = {
        id: 'lead-canon-1',
        organizationId: 'org-canon-1',
        companyId: 'comp-canon-1',
        contactId: 'cont-canon-1',
        status: 'Em_Negociacao',
        temperature: 'HOT',
        score: 92,
        pic: 'PIC1_Expansao',
        lastInteraction: new Date('2026-10-14T12:00:00Z'),
        nextAction: new Date('2026-10-18T14:00:00Z'),
        amount: 45000,
        currency: 'BRL',
        company: {
          id: 'comp-canon-1',
          tradeName: 'Norte Cargas',
          legalName: 'Norte Cargas e Logística S/A',
          cnpj: '11.222.333/0001-44',
          segment: 'Transporte Rodoviário',
          size: 'Grande',
          employeeCount: 450,
          capitalSocial: 12000000,
          city: 'Manaus',
          state: 'AM',
          situacaoCadastral: 'Ativa',
          enrichmentStatus: 'Enriquecido',
          enrichmentSource: 'ReceitaFederal+Apollo',
          enrichedAt: new Date('2026-09-01T10:00:00Z'), // ~45 dias atrás (recente)
          technologies: ['SAP S/4HANA', 'Bitrix24', 'Totvs'],
          keywords: ['Frota própria', 'Carga refrigerada'],
        },
        contact: {
          name: 'Renata Vasconcelos',
          role: 'Diretora de Operações',
          email: 'renata@nortecargas.com.br',
          phone: '+55 92 98123-4567',
        },
        activities: [
          { id: 'act-1', status: 'Pendente', type: 'Reunião' },
          { id: 'act-2', status: 'Concluído', type: 'Ligação' },
        ],
      };

      const ctx = buildCanonicalEnrichmentContext(lead, now);
      expect(ctx.version).toBe('1.0.0');
      expect(ctx.leadId).toBe('lead-canon-1');
      expect(ctx.icpFitScore).toBe(92);
      expect(ctx.temperature).toBe('HOT');
      expect(ctx.pic).toBe('PIC1_Expansao');
      expect(ctx.stagnation.isStagnant).toBe(false);
      expect(ctx.dataFreshness.isStale).toBe(false);
      expect(ctx.commercialHistory.openActivitiesCount).toBe(1);

      const formatted = formatCanonicalEnrichmentForAgent(ctx);
      expect(formatted).toContain('=== CONTEXTO CANÔNICO DE INTELIGÊNCIA COMERCIAL (v1.0.0) ===');
      expect(formatted).toContain('ICP Fit Score: 92/100');
      expect(formatted).toContain('Temperatura: HOT');
      expect(formatted).toContain('Norte Cargas');
      expect(formatted).toContain('SAP S/4HANA');
      expect(formatted).toContain('Diretora de Operações');
    });

    it('utiliza estados explícitos PENDING e UNKNOWN para dados ausentes', () => {
      const now = new Date('2026-10-16T12:00:00Z');
      const lead = {
        id: 'lead-empty-1',
        organizationId: 'org-empty-1',
        status: 'Lead_Recebido',
        temperature: null,
        score: null,
        pic: null,
        lastInteraction: null,
        company: null,
        contact: null,
        activities: [],
      };

      const ctx = buildCanonicalEnrichmentContext(lead, now);
      expect(ctx.temperature).toBe('UNKNOWN');
      expect(ctx.icpFitScore).toBeNull();
      expect(ctx.firmographics.tradeName).toBeNull();

      const formatted = formatCanonicalEnrichmentForAgent(ctx);
      expect(formatted).toContain('ICP Fit Score: PENDING (Não calculado)');
      expect(formatted).toContain('Temperatura: UNKNOWN');
      expect(formatted).toContain('Nome Fantasia / Razão: UNKNOWN');
      expect(formatted).toContain('CNPJ: UNAVAILABLE');
    });
  });
});
