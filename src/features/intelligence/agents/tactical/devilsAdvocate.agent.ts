import type {
  DevilsAdvocateAnalysis,
  IDevilsAdvocatePort,
} from '../../../../shared/contracts/tacticalSwarm.contract.js';
import { domainEventMesh } from '../../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../../lib/logger.js';

export class DevilsAdvocateAgent implements IDevilsAdvocatePort {
  /**
   * Questiona previsões comerciais excessivamente otimistas e inconsistências no forecast,
   * cruzando dados de engajamento, objeções, concorrentes e estagnação em pipeline.
   */
  async evaluateDealForecast(
    organizationId: string,
    dealId: string,
    dealData?: {
      dealTitle?: string;
      currentStage?: string;
      currentProbability?: number;
      declaredCloseDate?: string;
      daysInCurrentStage?: number;
      daysSinceLastInteraction?: number;
      unresolvedObjections?: string[];
      competitorsMentioned?: string[];
      stageAverageDays?: number;
    },
  ): Promise<DevilsAdvocateAnalysis> {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para o Advogado do Diabo');
    }

    const title = dealData?.dealTitle || `Oportunidade #${dealId}`;
    const stage = dealData?.currentStage || 'Negociação / Proposta';
    const currentProb = dealData?.currentProbability ?? 80;
    const daysInStage = dealData?.daysInCurrentStage ?? 18;
    const daysNoResponse = dealData?.daysSinceLastInteraction ?? 10;
    const stageAvg = dealData?.stageAverageDays ?? 8;
    const objections = dealData?.unresolvedObjections || [];
    const competitors = dealData?.competitorsMentioned || [];

    const isStagnant = daysInStage > stageAvg * 1.5;
    const hasGhostingRisk = daysNoResponse >= 7;

    const evidences: string[] = [];
    let healthScore = 100;
    let optimismBiasDetected = false;

    if (isStagnant) {
      healthScore -= 30;
      evidences.push(
        `Oportunidade estagnada há ${daysInStage} dias na etapa "${stage}" (média da organização: ${stageAvg} dias).`,
      );
    }

    if (hasGhostingRisk) {
      healthScore -= 25;
      evidences.push(
        `Nenhuma resposta ou atividade registrada do cliente nos últimos ${daysNoResponse} dias.`,
      );
    }

    if (objections.length > 0) {
      healthScore -= 15 * objections.length;
      evidences.push(
        `Existem ${objections.length} objeção(ões) crítica(s) sem resolução documentada: ${objections.join(', ')}.`,
      );
    }

    if (competitors.length > 0) {
      healthScore -= 10 * competitors.length;
      evidences.push(`Concorrente(s) direto(s) atuando na conta: ${competitors.join(', ')}.`);
    }

    healthScore = Math.max(10, Math.min(100, healthScore));

    // Decisão do Advogado do Diabo
    let recommendedProb = currentProb;
    let recommendedAction: DevilsAdvocateAnalysis['forecastRevisionRecommendation']['recommendedAction'] =
      'maintain';
    let rationale =
      'A oportunidade apresenta métricas alinhadas com o estágio comercial declarado.';

    if (currentProb >= 70 && healthScore < 60) {
      optimismBiasDetected = true;
      recommendedProb = Math.min(40, Math.round(currentProb * 0.5));
      recommendedAction = 'downgrade_probability';
      rationale = `Inconsistência de Forecast: Oportunidade com probabilidade otimista de ${currentProb}%, mas saúde real calculada em ${healthScore}/100 devido a estagnação e falta de retorno. Recomenda-se rebaixar para ${recommendedProb}% e acionar follow-up tático.`;
    } else if (isStagnant && !hasGhostingRisk) {
      recommendedAction = 'delay_close_date';
      rationale =
        'Negociação ativa, porém com ciclo superior à média. Sugere-se postergar a data estimada de fechamento.';
    } else if (hasGhostingRisk && currentProb > 50) {
      optimismBiasDetected = true;
      recommendedAction = 'flag_as_at_risk';
      recommendedProb = 30;
      rationale =
        'Risco crítico de perda silenciosa (ghosting). Marcar como "Em Risco" no comitê de forecast.';
    }

    const analysis: DevilsAdvocateAnalysis = {
      dealId,
      dealTitle: title,
      organizationId,
      currentStage: stage,
      currentForecastCategory: currentProb >= 80 ? 'Comprometido' : 'Provável',
      declaredCloseDate:
        dealData?.declaredCloseDate || new Date(Date.now() + 15 * 86400000).toISOString(),
      analysisDate: new Date().toISOString(),
      optimismBiasDetected,
      overallHealthScore: healthScore,
      criticalObjectionsUnresolved: objections,
      competitorThreats: competitors.map((c) => ({
        competitor: c,
        threatLevel: 'high',
        notes: 'Mencionado pelo cliente durante a fase de negociação de valores.',
      })),
      stagnationMetrics: {
        daysInCurrentStage: daysInStage,
        daysSinceLastInteraction: daysNoResponse,
        stageAverageDays: stageAvg,
        isStagnant,
      },
      forecastRevisionRecommendation: {
        recommendedAction,
        currentProbability: currentProb,
        recommendedProbability: recommendedProb,
        rationale,
        evidence: evidences,
        uncertaintyLevel: evidences.length > 2 ? 'low' : 'medium',
      },
    };

    // Se detectado viés de otimismo, publicar alerta no DomainEventMesh
    if (optimismBiasDetected) {
      await domainEventMesh.publish({
        eventType: 'DEVILS_ADVOCATE_ALERT',
        eventVersion: '1.0.0',
        organizationId,
        correlationId: `devils-deal-${dealId}`,
        producer: 'devils-advocate-agent',
        aggregateId: dealId,
        payload: {
          dealId,
          dealTitle: title,
          currentProbability: currentProb,
          recommendedProbability: recommendedProb,
          rationale,
          evidences,
        },
      });
    }

    logger.info(
      `[DevilsAdvocate] Avaliação de forecast concluída para deal ${dealId} no tenant ${organizationId}. Viés otimista: ${optimismBiasDetected}. Ação recomendada: ${recommendedAction}.`,
    );

    return analysis;
  }

  /**
   * Alias de conveniência para revisão preventiva de forecast comercial.
   */
  async reviewDealForecast(params: {
    organizationId: string;
    dealId: string;
    dealTitle?: string;
    companyName?: string;
    currentForecastStage?: string;
    currentStage?: string;
    currentProbabilityPercent?: number;
    currentProbability?: number;
    daysInCurrentStage?: number;
    unresolvedObjections?: string[];
    competitorsMentioned?: string[];
    lastCustomerInteractionDaysAgo?: number;
    daysSinceLastInteraction?: number;
  }): Promise<{
    isFlaggedForReview: boolean;
    optimismRiskSeverity: 'high' | 'medium' | 'low';
    recommendedProbabilityPercent: number;
    detectedRedFlags: string[];
    actionableRecommendations: string[];
    analysis: DevilsAdvocateAnalysis;
  }> {
    const analysis = await this.evaluateDealForecast(params.organizationId, params.dealId, {
      dealTitle: params.dealTitle,
      currentStage: params.currentForecastStage || params.currentStage,
      currentProbability: params.currentProbabilityPercent ?? params.currentProbability,
      daysInCurrentStage: params.daysInCurrentStage,
      daysSinceLastInteraction:
        params.lastCustomerInteractionDaysAgo ?? params.daysSinceLastInteraction,
      unresolvedObjections: params.unresolvedObjections,
      competitorsMentioned: params.competitorsMentioned,
    });

    return {
      isFlaggedForReview: analysis.optimismBiasDetected || analysis.stagnationMetrics.isStagnant,
      optimismRiskSeverity: analysis.optimismBiasDetected ? 'high' : 'medium',
      recommendedProbabilityPercent: analysis.forecastRevisionRecommendation.recommendedProbability,
      detectedRedFlags: analysis.forecastRevisionRecommendation.evidence,
      actionableRecommendations: [analysis.forecastRevisionRecommendation.rationale],
      analysis,
    };
  }
}

export const devilsAdvocateAgent = new DevilsAdvocateAgent();
