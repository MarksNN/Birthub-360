import { beforeEach, describe, expect, it } from 'vitest';
import { valueRealizationService } from '../../../src/features/commercial-intelligence/services/valueRealization.service.js';

describe('ValueRealizationService — Eixo 17 (Continuidade Comercial Pós-Venda)', () => {
  const orgA = 'org-value-alpha';
  const orgB = 'org-value-beta';

  beforeEach(() => {
    valueRealizationService.clear();
  });

  describe('Criação de Rastreadores a partir de Promessas Comerciais', () => {
    it('deve converter uma promessa comercial em um rastreador formal de valor entregue', async () => {
      const tracker = await valueRealizationService.createTrackerFromPromise({
        organizationId: orgA,
        commitmentId: 'prom-789-proposal',
        customerCompanyName: 'Transportadora Continental',
        dealId: 'deal-999',
        metricType: 'operational_time_reduction',
        indicatorName: 'Redução do tempo de despacho de rotas',
        baselineValue: 120, // 120 minutos
        targetValue: 45, // Meta: 45 minutos
        unit: 'minutos',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        responsibleOwnerName: 'Gestor de Implantação e CS',
      });

      expect(tracker.id).toBeDefined();
      expect(tracker.customerCompanyName).toBe('Transportadora Continental');
      expect(tracker.status).toBe('ONBOARDING_ACTIVE');
      expect(tracker.baselineValue).toBe(120);
      expect(tracker.targetValue).toBe(45);
      expect(tracker.history).toEqual([]);
    });

    it('deve bloquear criação sem organizationId por garantia de Tenancy', async () => {
      await expect(
        valueRealizationService.createTrackerFromPromise({
          organizationId: '',
          commitmentId: 'prom-1',
          customerCompanyName: 'Empresa',
          metricType: 'cost_reduction',
          indicatorName: 'Redução de custo',
          baselineValue: 1000,
          targetValue: 500,
          unit: 'R$',
          deadline: new Date().toISOString(),
          responsibleOwnerName: 'Owner',
        }),
      ).rejects.toThrow(/Tenancy violation/);
    });
  });

  describe('Medição de Indicadores e Atualização de Status', () => {
    it('deve registrar valor observado e classificar como MEASURED_ON_TRACK quando o progresso for satisfatório', async () => {
      const tracker = await valueRealizationService.createTrackerFromPromise({
        organizationId: orgA,
        commitmentId: 'prom-01',
        customerCompanyName: 'AgroLog Transportes',
        metricType: 'productivity_gain',
        indicatorName: 'Aumento na taxa de entregas dentro da janela SLA',
        baselineValue: 70, // 70%
        targetValue: 95, // 95% (+25 pp)
        unit: '%',
        deadline: new Date().toISOString(),
        responsibleOwnerName: 'Juliana CS',
      });

      // Medição intermediária: 88% (+18 pp de 25 pp = 72% do progresso esperado)
      const updated = await valueRealizationService.recordObservedValue({
        organizationId: orgA,
        trackerId: tracker.id,
        observedValue: 88,
        evidence: 'Relatório de telemetria do 1º mês pós-onboarding comprovando SLA em 88%.',
        measuredBy: 'Juliana CS',
      });

      expect(updated.status).toBe('MEASURED_ON_TRACK');
      expect(updated.observedValue).toBe(88);
      expect(updated.history.length).toBe(1);
      expect(updated.history[0].measuredBy).toBe('Juliana CS');
    });

    it('deve classificar como ACHIEVED quando a meta de valor for plenamente alcançada', async () => {
      const tracker = await valueRealizationService.createTrackerFromPromise({
        organizationId: orgA,
        commitmentId: 'prom-02',
        customerCompanyName: 'Viação Estrela',
        metricType: 'conversion_increase',
        indicatorName: 'Taxa de ocupação de frotas',
        baselineValue: 60,
        targetValue: 85,
        unit: '%',
        deadline: new Date().toISOString(),
        responsibleOwnerName: 'Marcos CS',
      });

      const updated = await valueRealizationService.recordObservedValue({
        organizationId: orgA,
        trackerId: tracker.id,
        observedValue: 87, // Superou a meta (87% >= 85%)
        evidence: 'Auditoria de ocupação mensal consolidada comprovando 87%.',
        measuredBy: 'Marcos CS',
      });

      expect(updated.status).toBe('ACHIEVED');
      expect(updated.fulfillmentEvidence).toContain('Auditoria de ocupação');
    });

    it('deve classificar como MEASURED_GAP e registrar notas de divergência quando houver desvio relevante', async () => {
      const tracker = await valueRealizationService.createTrackerFromPromise({
        organizationId: orgA,
        commitmentId: 'prom-03',
        customerCompanyName: 'LogBrasil Express',
        metricType: 'operational_time_reduction',
        indicatorName: 'Redução de tempo de cadastro de motoristas',
        baselineValue: 60,
        targetValue: 15, // Meta: reduzir 45 minutos
        unit: 'minutos',
        deadline: new Date().toISOString(),
        responsibleOwnerName: 'Juliana CS',
      });

      // Medição: 52 minutos (reduziu apenas 8 min de 45 min = 17% de progresso)
      const updated = await valueRealizationService.recordObservedValue({
        organizationId: orgA,
        trackerId: tracker.id,
        observedValue: 52,
        evidence: 'Tempo médio observado no sistema de 52 minutos.',
        measuredBy: 'Juliana CS',
      });

      expect(updated.status).toBe('MEASURED_GAP');
      expect(updated.divergenceNotes).toContain('Desvio detectado');
    });

    it('deve consolidar sumário executivo de realização de valor do tenant', async () => {
      // Criar 3 trackers com estados distintos
      const t1 = await valueRealizationService.createTrackerFromPromise({
        organizationId: orgA,
        commitmentId: 'p1',
        customerCompanyName: 'Empresa A',
        metricType: 'productivity_gain',
        indicatorName: 'Produtividade',
        baselineValue: 50,
        targetValue: 100,
        unit: '%',
        deadline: new Date().toISOString(),
        responsibleOwnerName: 'Owner',
      });
      await valueRealizationService.recordObservedValue({
        organizationId: orgA,
        trackerId: t1.id,
        observedValue: 100,
        evidence: 'Meta atingida',
        measuredBy: 'Owner',
      });

      const t2 = await valueRealizationService.createTrackerFromPromise({
        organizationId: orgA,
        commitmentId: 'p2',
        customerCompanyName: 'Empresa B',
        metricType: 'cost_reduction',
        indicatorName: 'Custo',
        baselineValue: 100,
        targetValue: 50,
        unit: '%',
        deadline: new Date().toISOString(),
        responsibleOwnerName: 'Owner',
      });
      await valueRealizationService.recordObservedValue({
        organizationId: orgA,
        trackerId: t2.id,
        observedValue: 60,
        evidence: 'Em progresso',
        measuredBy: 'Owner',
      });

      const summary = await valueRealizationService.getRealizationSummary(orgA);

      expect(summary.totalTrackers).toBe(2);
      expect(summary.achievedCount).toBe(1);
      expect(summary.onTrackCount).toBe(1);
      expect(summary.gapCount).toBe(0);
      expect(summary.averageAchievementRatePercent).toBeGreaterThan(80);
    });
  });
});
