import { randomUUID } from 'node:crypto';
import type {
  BusinessCaseReport,
  IRoiSimulatorPort,
  RoiSimulationInput,
  RoiSimulationResult,
  ScenarioCalculation,
} from '../../../shared/contracts/roiSimulator.contract.js';

export class RoiSimulatorService implements IRoiSimulatorPort {
  /**
   * Executa a simulação econômica determinística em 3 cenários auditáveis.
   */
  async calculateRoi(input: RoiSimulationInput): Promise<RoiSimulationResult> {
    if (!input.organizationId || input.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para a simulação de ROI');
    }

    const simulationId = `sim-${randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();

    const baseScenario = this.computeScenario({
      scenarioName: 'Base',
      input,
      efficiencyMultiplier: 1.0,
      costMultiplier: 1.0,
      assumptions: [
        `Ganhos de eficiência estimados em ${input.expectedEfficiencyGainPercent}% conforme diagnóstico inicial.`,
        `Custo médio hora de R$ ${input.averageHourlyCost.toFixed(2)} sobre ${input.affectedEmployees} colaboradores afetados.`,
        `Mensalidade de software mantida estável em R$ ${input.monthlyRecurringCost.toFixed(2)}.`,
      ],
    });

    const conservativeScenario = this.computeScenario({
      scenarioName: 'Conservador',
      input,
      efficiencyMultiplier: 0.7, // -30% nos ganhos
      costMultiplier: 1.15, // +15% nos custos
      assumptions: [
        `Curva de aprendizado prolongada: captura de apenas ${(input.expectedEfficiencyGainPercent * 0.7).toFixed(1)}% de eficiência.`,
        `Custos adicionais de adaptação operacional estimados em +15%.`,
        `Payback calculado com margem de segurança conservadora.`,
      ],
    });

    const optimisticScenario = this.computeScenario({
      scenarioName: 'Otimista',
      input,
      efficiencyMultiplier: 1.25, // +25% nos ganhos
      costMultiplier: 0.9, // -10% nos custos
      assumptions: [
        `Adoção acelerada pelo time operacional: ${(input.expectedEfficiencyGainPercent * 1.25).toFixed(1)}% de ganho de produtividade.`,
        `Eliminação de custos ocultos e retrabalho além do previsto.`,
        `Rápida transição de setup e integração completa.`,
      ],
    });

    // Análise de sensibilidade em 3 dimensões
    const sensitivityAnalysis = [
      {
        variableName: 'Ganho de Eficiência (+20%)',
        variationPercent: 20,
        resultingRoiPercent: Math.round(baseScenario.roiPercent * 1.18 * 10) / 10,
        resultingPaybackMonths:
          baseScenario.paybackMonths !== null
            ? Math.max(1, Math.round(baseScenario.paybackMonths * 0.85 * 10) / 10)
            : null,
      },
      {
        variableName: 'Ganho de Eficiência (-20%)',
        variationPercent: -20,
        resultingRoiPercent: Math.round(baseScenario.roiPercent * 0.82 * 10) / 10,
        resultingPaybackMonths:
          baseScenario.paybackMonths !== null
            ? Math.round(baseScenario.paybackMonths * 1.2 * 10) / 10
            : null,
      },
      {
        variableName: 'Investimento Inicial (+15%)',
        variationPercent: 15,
        resultingRoiPercent: Math.round(baseScenario.roiPercent * 0.87 * 10) / 10,
        resultingPaybackMonths:
          baseScenario.paybackMonths !== null
            ? Math.round(baseScenario.paybackMonths * 1.15 * 10) / 10
            : null,
      },
    ];

    return {
      simulationId,
      organizationId: input.organizationId,
      prospectName: input.prospectName,
      calculatedAt: now,
      baseScenario,
      scenarios: {
        conservative: conservativeScenario,
        base: baseScenario,
        optimistic: optimisticScenario,
      },
      sensitivityAnalysis,
    };
  }

  /**
   * Gera dossiê executivo completo (Business Case) pronto para exportação Web/PDF.
   */
  async generateBusinessCase(input: RoiSimulationInput): Promise<BusinessCaseReport> {
    const simulationResult = await this.calculateRoi(input);
    const id = `bc-${randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();

    const base = simulationResult.baseScenario;

    return {
      id,
      organizationId: input.organizationId,
      prospectName: input.prospectName,
      executiveDiagnosis: `Diagnóstico executivo realizado para a empresa ${input.prospectName} (Segmento: ${input.segment}, Porte: ${input.companySize.toUpperCase()}). Identificou-se oportunidade de otimização em processos operacionais e gestão comercial que atualmente consomem ${input.hoursSpentPerActivityMonthly} horas/mês por profissional em ${input.affectedEmployees} colaboradores.`,
      economicProblemStatement: `A ineficiência e o tempo gasto em atividades repetitivas representam um custo operacional oculto estimado em R$ ${(input.affectedEmployees * input.hoursSpentPerActivityMonthly * input.averageHourlyCost).toFixed(2)} mensais, limitando a capacidade de expansão da carteira comercial.`,
      inputAssumptions: input,
      simulationResult,
      financialRisksAndMitigations: [
        {
          risk: 'Atraso na adoção pelos usuários finais',
          impact: 'MEDIUM',
          mitigation:
            'Implementar trilha de onboarding gamificada com suporte consultivo dedicado.',
        },
        {
          risk: 'Subutilização de módulos avançados',
          impact: 'LOW',
          mitigation:
            'Check-ins quinzenais de Value Realization com o comitê de sucesso do cliente.',
        },
        {
          risk: 'Oscilação orçamentária no payback',
          impact: 'LOW',
          mitigation: `Estrutura de investimento desenhada com payback conservador de ${simulationResult.scenarios.conservative.paybackMonths ?? 'N/A'} meses.`,
        },
      ],
      dataSourcesAndLimitations: {
        sources: [
          'Dados informados pelo prospect durante diagnóstico comercial.',
          'Benchmarks do setor de telemetria e gestão B2B.',
          'Modelagem de custos horários médios de operação.',
        ],
        limitations: [
          'Valores representam projeções econômicas e não garantia contratual de faturamento.',
          'Ganhos dependem da taxa de adesão aos novos processos recomendados.',
        ],
        isEstimated: true,
      },
      nextStepsProposal: [
        'Aprovação formal da proposta com o patrocinador executivo.',
        'Definição dos indicadores de sucesso (KPIs) para o plano de Value Realization.',
        'Início do setup e integração com cronograma de 30 dias.',
      ],
      generatedAt: now,
    };
  }

  private computeScenario(params: {
    scenarioName: 'Conservador' | 'Base' | 'Otimista';
    input: RoiSimulationInput;
    efficiencyMultiplier: number;
    costMultiplier: number;
    assumptions: string[];
  }): ScenarioCalculation {
    const { scenarioName, input, efficiencyMultiplier, costMultiplier, assumptions } = params;

    const effectiveGainPercent = input.expectedEfficiencyGainPercent * efficiencyMultiplier;
    const monthlyHoursPool = input.affectedEmployees * input.hoursSpentPerActivityMonthly;
    const monthlyHoursSaved = monthlyHoursPool * (effectiveGainPercent / 100);

    const monthlyEstimatedSavings = monthlyHoursSaved * input.averageHourlyCost;
    const adjustedMonthlyRecurringCost = input.monthlyRecurringCost * costMultiplier;
    const monthlyNetBenefit = monthlyEstimatedSavings - adjustedMonthlyRecurringCost;

    const initialInvestment = input.initialInvestment;
    const annualNetBenefit = monthlyNetBenefit * 12 - initialInvestment;

    let roiPercent = 0;
    if (initialInvestment > 0) {
      roiPercent = (annualNetBenefit / initialInvestment) * 100;
    } else if (annualNetBenefit > 0) {
      roiPercent = 999.0; // Sem investimento inicial, retorno puramente positivo
    }

    // Payback simples só é calculável quando benefício mensal líquido é positivo
    let paybackMonths: number | null = null;
    let breakEvenMonth: number | null = null;

    if (monthlyNetBenefit > 0) {
      if (initialInvestment === 0) {
        paybackMonths = 0;
        breakEvenMonth = 1;
      } else {
        const rawPayback = initialInvestment / monthlyNetBenefit;
        paybackMonths = Math.round(rawPayback * 10) / 10;
        breakEvenMonth = Math.ceil(rawPayback);
      }
    }

    return {
      scenarioName,
      assumptions,
      monthlyHoursSaved: Math.round(monthlyHoursSaved * 10) / 10,
      monthlyEstimatedSavings: Math.round(monthlyEstimatedSavings * 100) / 100,
      monthlyNetBenefit: Math.round(monthlyNetBenefit * 100) / 100,
      annualNetBenefit: Math.round(annualNetBenefit * 100) / 100,
      roiPercent: Math.round(roiPercent * 10) / 10,
      paybackMonths,
      breakEvenMonth,
    };
  }
}

export const roiSimulatorService = new RoiSimulatorService();
