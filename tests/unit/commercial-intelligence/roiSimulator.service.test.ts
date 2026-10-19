import { describe, expect, it } from 'vitest';
import { roiSimulatorService } from '../../../src/features/commercial-intelligence/services/roiSimulator.service.js';

describe('RoiSimulatorService — Eixo 17 (ROI & Value Realization Engine)', () => {
  const orgA = 'org-roi-alpha';

  const sampleInput = {
    organizationId: orgA,
    prospectName: 'Transcontinental Frotas S.A.',
    segment: 'Transporte e Logística',
    companySize: 'enterprise' as const,
    affectedEmployees: 25,
    averageHourlyCost: 45.0, // R$ 45/hora
    hoursSpentPerActivityMonthly: 30, // 30h/mês em gestão manual
    initialInvestment: 35000, // R$ 35k setup
    monthlyRecurringCost: 2800, // R$ 2.8k mensalidade
    expectedEfficiencyGainPercent: 30, // 30% de economia de tempo
  };

  describe('Cálculo Determinístico de ROI e 3 Cenários', () => {
    it('deve calcular corretamente economia mensal, benefício líquido e payback no cenário base', async () => {
      const result = await roiSimulatorService.calculateRoi(sampleInput);

      expect(result.simulationId).toBeDefined();
      expect(result.prospectName).toBe('Transcontinental Frotas S.A.');

      const base = result.baseScenario;
      // 25 colaboradores * 30h = 750h/mês
      // 30% ganho = 225h economizadas/mês
      // 225h * R$ 45 = R$ 10.125,00 economia bruta
      // Benefício líquido = 10.125 - 2.800 = R$ 7.325,00/mês
      // Benefício anual = (7.325 * 12) - 35.000 = 87.900 - 35.000 = R$ 52.900,00
      // ROI anual = (52.900 / 35.000) * 100 = 151.1%
      // Payback = 35.000 / 7.325 = 4.77 ~ 4.8 meses
      expect(base.monthlyHoursSaved).toBe(225);
      expect(base.monthlyEstimatedSavings).toBe(10125);
      expect(base.monthlyNetBenefit).toBe(7325);
      expect(base.annualNetBenefit).toBe(52900);
      expect(base.roiPercent).toBeCloseTo(151.1, 1);
      expect(base.paybackMonths).toBeCloseTo(4.8, 1);
      expect(base.breakEvenMonth).toBe(5);
    });

    it('deve apresentar cenários Conservador e Otimista com premissas transparentes', async () => {
      const result = await roiSimulatorService.calculateRoi(sampleInput);
      const { conservative, base, optimistic } = result.scenarios;

      // Conservador deve ter retorno menor e payback maior
      expect(conservative.monthlyEstimatedSavings).toBeLessThan(base.monthlyEstimatedSavings);
      expect(conservative.annualNetBenefit).toBeLessThan(base.annualNetBenefit);
      expect(conservative.roiPercent).toBeLessThan(base.roiPercent);
      expect(conservative.paybackMonths).toBeGreaterThan(base.paybackMonths!);
      expect(conservative.assumptions.length).toBeGreaterThanOrEqual(2);

      // Otimista deve ter retorno maior e payback menor
      expect(optimistic.monthlyEstimatedSavings).toBeGreaterThan(base.monthlyEstimatedSavings);
      expect(optimistic.annualNetBenefit).toBeGreaterThan(base.annualNetBenefit);
      expect(optimistic.roiPercent).toBeGreaterThan(base.roiPercent);
      expect(optimistic.paybackMonths).toBeLessThan(base.paybackMonths!);
      expect(optimistic.assumptions.length).toBeGreaterThanOrEqual(2);
    });

    it('deve tratar com segurança investimento zero (retorno positivo imediato sem divisão por zero)', async () => {
      const zeroInvestmentInput = {
        ...sampleInput,
        initialInvestment: 0,
      };

      const result = await roiSimulatorService.calculateRoi(zeroInvestmentInput);
      const base = result.baseScenario;

      expect(base.paybackMonths).toBe(0);
      expect(base.breakEvenMonth).toBe(1);
      expect(base.roiPercent).toBe(999.0);
    });

    it('deve retornar payback null se o benefício líquido periódico for negativo', async () => {
      const negativeBenefitInput = {
        ...sampleInput,
        expectedEfficiencyGainPercent: 2, // Ganho insignificante (15h/mês = R$ 675 economia)
        monthlyRecurringCost: 5000, // Custo mensal superior ao ganho (R$ 5.000 > R$ 675)
      };

      const result = await roiSimulatorService.calculateRoi(negativeBenefitInput);
      const base = result.baseScenario;

      expect(base.monthlyNetBenefit).toBeLessThan(0);
      expect(base.paybackMonths).toBeNull();
      expect(base.breakEvenMonth).toBeNull();
    });

    it('deve incluir matriz de análise de sensibilidade', async () => {
      const result = await roiSimulatorService.calculateRoi(sampleInput);

      expect(result.sensitivityAnalysis.length).toBe(3);
      expect(result.sensitivityAnalysis[0].variableName).toContain('Eficiência (+20%)');
      expect(result.sensitivityAnalysis[0].resultingRoiPercent).toBeGreaterThan(
        result.baseScenario.roiPercent,
      );
    });
  });

  describe('Geração de Business Case Interativo (Web & PDF)', () => {
    it('deve estruturar um Business Case completo com diagnóstico, premissas e limitações explícitas', async () => {
      const businessCase = await roiSimulatorService.generateBusinessCase(sampleInput);

      expect(businessCase.id).toBeDefined();
      expect(businessCase.prospectName).toBe('Transcontinental Frotas S.A.');
      expect(businessCase.executiveDiagnosis).toContain('Transcontinental Frotas S.A.');
      expect(businessCase.economicProblemStatement).toContain('custo operacional oculto');
      expect(businessCase.financialRisksAndMitigations.length).toBeGreaterThanOrEqual(3);
      expect(businessCase.dataSourcesAndLimitations.isEstimated).toBe(true);
      expect(businessCase.dataSourcesAndLimitations.limitations).toContain(
        'Valores representam projeções econômicas e não garantia contratual de faturamento.',
      );
      expect(businessCase.nextStepsProposal.length).toBeGreaterThanOrEqual(3);
    });

    it('deve bloquear simulação sem organizationId por garantia de Tenancy', async () => {
      await expect(
        roiSimulatorService.calculateRoi({
          ...sampleInput,
          organizationId: '',
        }),
      ).rejects.toThrow(/Tenancy violation/);
    });
  });
});
