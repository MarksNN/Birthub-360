/**
 * Health Score composto — agrega em pilares NOMEADOS métricas que já existem e já são testadas em
 * outros lugares do módulo (nunca um cálculo paralelo/duplicado): Pipeline (coverage), Conversão
 * (win rate), Produtividade (leading indicators), Qualidade de CRM (`crmQualityReport`/
 * `dataReadiness`), Follow-up (aging) e Confiabilidade de Forecast (erro histórico,
 * `forecastAccuracy.ts`).
 *
 * Cada fórmula é uma agregação simples e documentada — não é ML, é rastreabilidade (mesmo
 * princípio de `dataReadiness.ts`/`FORECAST_RULES`). Arquivo deliberadamente separado de
 * `forecastEngine.ts` (ver AGENTS.md deste módulo): compõe SOBRE outros relatórios, não é parte do
 * motor de forecast em si.
 *
 * Puro e testável em isolamento — recebe os relatórios já calculados (`ExecutiveOverview`,
 * `PerformanceMetrics`, `AgingReport`, `LeadingIndicatorsReport`, `CrmQualityIndex`,
 * `ForecastAccuracySummary`), sem I/O próprio.
 */
import type {
  AgingReport,
  CrmQualityIndex,
  ExecutiveOverview,
  ForecastAccuracySummary,
  HealthPillarKey,
  HealthPillarScore,
  HealthScoreResult,
  LeadingIndicatorsReport,
  LiveCallInsight,
  LiveCallInsightsSummary,
  PerformanceMetrics,
} from '../domain/CommercialIntelligence.js';
import {
  COVERAGE_PROTECTION_FALLBACK_HEALTHY,
  classifyCoverageProtection,
} from './coverageProtection.js';
import { roundMoney } from './shared/mathUtils.js';

export interface HealthScoreInput {
  overview: ExecutiveOverview;
  performance: PerformanceMetrics;
  aging: AgingReport;
  leadingIndicators: LeadingIndicatorsReport;
  crmQuality: CrmQualityIndex;
  forecastAccuracy: ForecastAccuracySummary;
  /** Insights de chamadas em tempo real recebidos para atualização reativa (Onda 15). */
  liveInsights?: LiveCallInsight[];
}

/** Limiares de classificação por pilar — política documentada, não medição (mesmo espírito de `FORECAST_RULES`/`STAGE_AGING_CRITICAL_DAYS`). */
export const HEALTH_SCORE_RULES = {
  /** Win Rate (%) considerado saudável/em atenção para o pilar Conversão. */
  WIN_RATE_HEALTHY_PCT: 30,
  WIN_RATE_WARNING_PCT: 15,
  /** Razão (atividade da semana atual / média móvel de 4 semanas) para o pilar Produtividade. */
  PRODUCTIVITY_HEALTHY_RATIO: 1.0,
  PRODUCTIVITY_WARNING_RATIO: 0.7,
  /** % do pipeline aberto DENTRO do aging crítico (não passou de `STAGE_AGING_CRITICAL_DAYS`) para o pilar Follow-up. */
  FOLLOWUP_HEALTHY_PCT: 80,
  FOLLOWUP_WARNING_PCT: 50,
  /** Erro percentual absoluto médio do forecast para o pilar Confiabilidade de Forecast (menor = melhor, por isso os limiares são invertidos em relação aos demais). */
  FORECAST_RELIABILITY_HEALTHY_ERROR_PCT: 15,
  FORECAST_RELIABILITY_WARNING_ERROR_PCT: 30,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** saudável quando `score >= healthyMin`; atenção quando `score >= warningMin`; crítico abaixo disso. */
function classifyAscending(
  score: number,
  healthyMin: number,
  warningMin: number,
): HealthPillarScore['classification'] {
  if (score >= healthyMin) return 'saudavel';
  if (score >= warningMin) return 'atencao';
  return 'critico';
}

/** saudável quando `value <= healthyMax` (usado para métricas onde MENOR é melhor, como erro percentual). */
function classifyDescending(
  value: number,
  healthyMax: number,
  warningMax: number,
): HealthPillarScore['classification'] {
  if (value <= healthyMax) return 'saudavel';
  if (value <= warningMax) return 'atencao';
  return 'critico';
}

function pillarPipeline(overview: ExecutiveOverview): HealthPillarScore {
  const { coverage, coverageRecommended } = overview.coverageMonth;
  const hasGoal = !!overview.goal;
  const explanation =
    'Coverage do mês corrente (Pipeline Elegível / Meta restante) em relação ao Coverage recomendado (1 / Win Rate histórico, ou 3x como piso-padrão sem Win Rate calculável ainda).';
  if (!hasGoal || coverage == null) {
    return {
      pillar: 'pipeline',
      label: 'Pipeline',
      score: null,
      classification: null,
      explanation,
      metricsUsed: ['ExecutiveOverview.coverageMonth', 'ExecutiveOverview.goal'],
      unavailableReason: !hasGoal ? 'sem_meta_cadastrada' : 'coverage_nao_calculavel',
    };
  }
  const denominator =
    coverageRecommended && coverageRecommended > 0
      ? coverageRecommended
      : COVERAGE_PROTECTION_FALLBACK_HEALTHY;
  const score = roundMoney(clamp((coverage / denominator) * 100, 0, 100));
  const classification = classifyCoverageProtection(hasGoal, coverage, coverageRecommended);
  return {
    pillar: 'pipeline',
    label: 'Pipeline',
    score,
    classification: classification === 'sem_dados' ? null : classification,
    explanation,
    metricsUsed: [
      'ExecutiveOverview.coverageMonth.coverage',
      'ExecutiveOverview.coverageMonth.coverageRecommended',
    ],
    unavailableReason: null,
  };
}

function pillarConversao(performance: PerformanceMetrics): HealthPillarScore {
  const explanation = `Win Rate do período (Ganhos / (Ganhos + Perdidos)). Saudável ≥ ${HEALTH_SCORE_RULES.WIN_RATE_HEALTHY_PCT}%, atenção ≥ ${HEALTH_SCORE_RULES.WIN_RATE_WARNING_PCT}%, crítico abaixo disso.`;
  if (performance.winRate == null) {
    return {
      pillar: 'conversao',
      label: 'Conversão',
      score: null,
      classification: null,
      explanation,
      metricsUsed: ['PerformanceMetrics.winRate'],
      unavailableReason: 'sem_negocios_fechados_no_periodo',
    };
  }
  return {
    pillar: 'conversao',
    label: 'Conversão',
    score: performance.winRate,
    classification: classifyAscending(
      performance.winRate,
      HEALTH_SCORE_RULES.WIN_RATE_HEALTHY_PCT,
      HEALTH_SCORE_RULES.WIN_RATE_WARNING_PCT,
    ),
    explanation,
    metricsUsed: ['PerformanceMetrics.winRate'],
    unavailableReason: null,
  };
}

function pillarProdutividade(leadingIndicators: LeadingIndicatorsReport): HealthPillarScore {
  const explanation = `Média, entre os 6 Leading Indicators, da razão (semana atual / média móvel de 4 semanas). ${roundMoney(HEALTH_SCORE_RULES.PRODUCTIVITY_HEALTHY_RATIO * 100)}%+ da média histórica = saudável, ${roundMoney(HEALTH_SCORE_RULES.PRODUCTIVITY_WARNING_RATIO * 100)}%+ = atenção.`;
  const withBaseline = leadingIndicators.indicators.filter((i) => i.movingAverage4w > 0);
  if (withBaseline.length === 0) {
    return {
      pillar: 'produtividade',
      label: 'Produtividade',
      score: null,
      classification: null,
      explanation,
      metricsUsed: ['LeadingIndicatorsReport.indicators'],
      unavailableReason: 'sem_media_movel_calculavel',
    };
  }
  const ratios = withBaseline.map((i) => i.current / i.movingAverage4w);
  const averageRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  const score = roundMoney(clamp(averageRatio * 100, 0, 100));
  return {
    pillar: 'produtividade',
    label: 'Produtividade',
    score,
    classification: classifyAscending(
      averageRatio,
      HEALTH_SCORE_RULES.PRODUCTIVITY_HEALTHY_RATIO,
      HEALTH_SCORE_RULES.PRODUCTIVITY_WARNING_RATIO,
    ),
    explanation,
    metricsUsed: [
      'LeadingIndicatorsReport.indicators[].current',
      'LeadingIndicatorsReport.indicators[].movingAverage4w',
    ],
    unavailableReason: null,
  };
}

function pillarQualidadeCrm(crmQuality: CrmQualityIndex): HealthPillarScore {
  const explanation =
    'Confiabilidade dos Dados (application/dataReadiness.ts) — completude ponderada por impacto real no Forecast, reaproveitada sem recálculo. Saudável ≥80%, atenção ≥50%, crítico abaixo.';
  const score = crmQuality.dataReadiness.overallScore;
  if (score == null) {
    return {
      pillar: 'qualidadeCrm',
      label: 'Qualidade do CRM',
      score: null,
      classification: null,
      explanation,
      metricsUsed: ['CrmQualityIndex.dataReadiness.overallScore'],
      unavailableReason: 'sem_negocios_avaliaveis',
    };
  }
  return {
    pillar: 'qualidadeCrm',
    label: 'Qualidade do CRM',
    score,
    classification: crmQuality.dataReadiness.classification,
    explanation,
    metricsUsed: ['CrmQualityIndex.dataReadiness.overallScore'],
    unavailableReason: null,
  };
}

function pillarFollowUp(aging: AgingReport): HealthPillarScore {
  const explanation = `% do valor de pipeline aberto que NÃO está acima do aging crítico da etapa (${aging.criticalThresholdDays} dias) — 100% menos a fração em risco de estagnação. Saudável ≥ ${HEALTH_SCORE_RULES.FOLLOWUP_HEALTHY_PCT}%, atenção ≥ ${HEALTH_SCORE_RULES.FOLLOWUP_WARNING_PCT}%.`;
  const totalOpenAmount = aging.buckets.reduce((sum, b) => sum + b.amount, 0);
  if (totalOpenAmount <= 0) {
    return {
      pillar: 'followUp',
      label: 'Follow-up',
      score: null,
      classification: null,
      explanation,
      metricsUsed: ['AgingReport.buckets', 'AgingReport.byStage'],
      unavailableReason: 'sem_negocios_abertos',
    };
  }
  const overdueAmount = aging.byStage.reduce((sum, s) => sum + s.amountOverThreshold, 0);
  const score = roundMoney(clamp(100 - (overdueAmount / totalOpenAmount) * 100, 0, 100));
  return {
    pillar: 'followUp',
    label: 'Follow-up',
    score,
    classification: classifyAscending(
      score,
      HEALTH_SCORE_RULES.FOLLOWUP_HEALTHY_PCT,
      HEALTH_SCORE_RULES.FOLLOWUP_WARNING_PCT,
    ),
    explanation,
    metricsUsed: ['AgingReport.buckets[].amount', 'AgingReport.byStage[].amountOverThreshold'],
    unavailableReason: null,
  };
}

function pillarConfiabilidadeForecast(
  forecastAccuracy: ForecastAccuracySummary,
): HealthPillarScore {
  const explanation = `100 − Erro Percentual Absoluto Médio do Forecast entre os períodos já fechados com snapshot registrado (application/forecastAccuracy.ts). Saudável quando o erro médio ≤ ${HEALTH_SCORE_RULES.FORECAST_RELIABILITY_HEALTHY_ERROR_PCT}%, atenção ≤ ${HEALTH_SCORE_RULES.FORECAST_RELIABILITY_WARNING_ERROR_PCT}%.`;
  if (!forecastAccuracy.available || forecastAccuracy.meanAbsoluteErrorPercent == null) {
    return {
      pillar: 'confiabilidadeForecast',
      label: 'Confiabilidade de Forecast',
      score: null,
      classification: null,
      explanation,
      metricsUsed: ['ForecastAccuracySummary.meanAbsoluteErrorPercent'],
      unavailableReason: forecastAccuracy.reason ?? 'sem_historico_suficiente',
    };
  }
  const score = roundMoney(clamp(100 - forecastAccuracy.meanAbsoluteErrorPercent, 0, 100));
  return {
    pillar: 'confiabilidadeForecast',
    label: 'Confiabilidade de Forecast',
    score,
    classification: classifyDescending(
      forecastAccuracy.meanAbsoluteErrorPercent,
      HEALTH_SCORE_RULES.FORECAST_RELIABILITY_HEALTHY_ERROR_PCT,
      HEALTH_SCORE_RULES.FORECAST_RELIABILITY_WARNING_ERROR_PCT,
    ),
    explanation,
    metricsUsed: [
      'ForecastAccuracySummary.meanAbsoluteErrorPercent',
      'ForecastAccuracySummary.sampleSize',
    ],
    unavailableReason: null,
  };
}

const PILLAR_BUILDERS: Record<HealthPillarKey, (input: HealthScoreInput) => HealthPillarScore> = {
  pipeline: (i) => pillarPipeline(i.overview),
  conversao: (i) => pillarConversao(i.performance),
  produtividade: (i) => pillarProdutividade(i.leadingIndicators),
  qualidadeCrm: (i) => pillarQualidadeCrm(i.crmQuality),
  followUp: (i) => pillarFollowUp(i.aging),
  confiabilidadeForecast: (i) => pillarConfiabilidadeForecast(i.forecastAccuracy),
};

/** Ordem de exibição fixa dos 6 pilares — sempre as mesmas 6 chaves, mesmo quando `score` é `null`. */
export const HEALTH_PILLAR_ORDER: HealthPillarKey[] = [
  'pipeline',
  'conversao',
  'produtividade',
  'qualidadeCrm',
  'followUp',
  'confiabilidadeForecast',
];

/**
 * Consolida insights de chamadas ao vivo em métricas agregadas (Onda 15).
 */
export function summarizeLiveCallInsights(insights: LiveCallInsight[]): LiveCallInsightsSummary {
  if (!insights || insights.length === 0) {
    return {
      totalCalls: 0,
      averageSentimentScore: null,
      activeObjectionsCount: 0,
      topObjections: [],
      detectedCompetitors: [],
    };
  }

  let totalSentiment = 0;
  let activeObjectionsCount = 0;
  const objectionCounts: Record<string, number> = {};
  const competitorsSet = new Set<string>();

  for (const item of insights) {
    totalSentiment += item.sentimentScore;
    if (item.objectionCategory) {
      activeObjectionsCount++;
      objectionCounts[item.objectionCategory] = (objectionCounts[item.objectionCategory] || 0) + 1;
    }
    if (item.competitorMentioned) {
      competitorsSet.add(item.competitorMentioned);
    }
  }

  const avgSentiment = roundMoney(totalSentiment / insights.length);
  const topObjections = Object.entries(objectionCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCalls: insights.length,
    averageSentimentScore: avgSentiment,
    activeObjectionsCount,
    topObjections,
    detectedCompetitors: Array.from(competitorsSet),
  };
}

export interface DealHealthScoreInput {
  dealId: string;
  stageProbability: number;
  daysInCurrentStage?: number | null;
  stageAverageDurationDays?: number | null;
  lastInteractionDays?: number | null;
  hasOverdueNextAction?: boolean;
  liveInsights?: LiveCallInsight[];
}

export interface DealHealthScoreFactors {
  baseProbability: number;
  stagnationPenalty: number;
  activityPenalty: number;
  liveInsightAdjustment: number;
  recentSentiment: number | null;
  activeObjectionsCount: number;
}

export interface DealHealthScoreResult {
  dealId: string;
  score: number;
  classification: 'saudavel' | 'atencao' | 'critico';
  factors: DealHealthScoreFactors;
  reasons: string[];
}

/**
 * Calcula o score de saúde de uma oportunidade/negócio individual (Deal Health Score),
 * reagindo instantaneamente a sinais de pipeline e a insights de chamadas ao vivo (`LiveCallInsight`).
 */
export function computeDealHealthScore(
  input: DealHealthScoreInput,
  _now: Date = new Date(),
): DealHealthScoreResult {
  const reasons: string[] = [];
  let score = clamp(input.stageProbability, 0, 100);

  // 1. Estagnação na etapa
  let stagnationPenalty = 0;
  if (
    input.daysInCurrentStage != null &&
    input.stageAverageDurationDays != null &&
    input.stageAverageDurationDays > 0
  ) {
    if (input.daysInCurrentStage > input.stageAverageDurationDays * 1.5) {
      stagnationPenalty = 15;
      score -= stagnationPenalty;
      reasons.push(
        `Estagnação na etapa: ${input.daysInCurrentStage} dias (média: ${Math.round(input.stageAverageDurationDays)} dias)`,
      );
    }
  }

  // 2. Acompanhamento/atividades
  let activityPenalty = 0;
  if (input.hasOverdueNextAction) {
    activityPenalty += 10;
    reasons.push('Próxima ação de acompanhamento vencida');
  }
  if (input.lastInteractionDays != null && input.lastInteractionDays > 14) {
    activityPenalty += 10;
    reasons.push(`Sem contato há ${input.lastInteractionDays} dias`);
  }
  score -= activityPenalty;

  // 3. Ajuste reativo com LiveCallInsight(s)
  let liveInsightAdjustment = 0;
  let recentSentiment: number | null = null;
  let activeObjectionsCount = 0;

  if (input.liveInsights && input.liveInsights.length > 0) {
    const insights = input.liveInsights;
    const sentimentSum = insights.reduce((sum, item) => {
      const normalized =
        item.sentimentScore > 1 ? (item.sentimentScore - 50) / 50 : item.sentimentScore;
      return sum + normalized;
    }, 0);
    const avgSentiment = sentimentSum / insights.length;
    recentSentiment = roundMoney(avgSentiment);

    if (avgSentiment < -0.15) {
      const penalty = Math.min(25, Math.round(Math.abs(avgSentiment) * 25));
      liveInsightAdjustment -= penalty;
      reasons.push(`Sentimento negativo em chamada recente (índice ${recentSentiment})`);
    } else if (avgSentiment > 0.3) {
      const bonus = Math.min(15, Math.round(avgSentiment * 15));
      liveInsightAdjustment += bonus;
      reasons.push(
        `Sentimento positivo e receptivo em chamada recente (índice ${recentSentiment})`,
      );
    }

    const unresolvedObjections = insights.filter(
      (i) => i.objectionCategory && !i.suggestedRebuttal,
    );
    const resolvedWithRebuttal = insights.filter((i) => i.objectionCategory && i.suggestedRebuttal);
    activeObjectionsCount = unresolvedObjections.length;

    if (activeObjectionsCount > 0) {
      const objectionPenalty = Math.min(20, activeObjectionsCount * 10);
      liveInsightAdjustment -= objectionPenalty;
      reasons.push(
        `${activeObjectionsCount} objeção(ões) crítica(s) em chamada sem contorno registrado`,
      );
    }
    if (resolvedWithRebuttal.length > 0) {
      reasons.push(
        `${resolvedWithRebuttal.length} objeção(ões) com argumento de contorno preparado`,
      );
    }

    const competitorMentions = insights.filter((i) => i.competitorMentioned);
    if (competitorMentions.length > 0) {
      liveInsightAdjustment -= 10;
      reasons.push('Concorrente ativo mencionado durante a chamada');
    }
  }

  score += liveInsightAdjustment;
  const finalScore = clamp(roundMoney(score), 0, 100);

  const classification: 'saudavel' | 'atencao' | 'critico' =
    finalScore >= 70 ? 'saudavel' : finalScore >= 40 ? 'atencao' : 'critico';

  return {
    dealId: input.dealId,
    score: finalScore,
    classification,
    factors: {
      baseProbability: input.stageProbability,
      stagnationPenalty,
      activityPenalty,
      liveInsightAdjustment,
      recentSentiment,
      activeObjectionsCount,
    },
    reasons,
  };
}

/**
 * Agrega os 6 pilares. `overallScore` é a média simples dos pilares disponíveis.
 * Quando `input.liveInsights` estiver presente, consolida os insights e reflete
 * reativamente o sentimento médio das chamadas no score geral.
 */
export function computeHealthScore(input: HealthScoreInput, now: Date): HealthScoreResult {
  const pillars = HEALTH_PILLAR_ORDER.map((key) => PILLAR_BUILDERS[key](input));
  const available = pillars.filter(
    (p): p is HealthPillarScore & { score: number } => p.score != null,
  );
  let overallScore =
    available.length > 0
      ? roundMoney(available.reduce((sum, p) => sum + p.score, 0) / available.length)
      : null;

  let liveInsightsSummary: LiveCallInsightsSummary | null = null;
  if (input.liveInsights && input.liveInsights.length > 0) {
    liveInsightsSummary = summarizeLiveCallInsights(input.liveInsights);
    if (overallScore != null && liveInsightsSummary.averageSentimentScore != null) {
      const sentimentScore100 =
        liveInsightsSummary.averageSentimentScore > 1
          ? liveInsightsSummary.averageSentimentScore
          : (liveInsightsSummary.averageSentimentScore + 1) * 50;
      // Ponderação reativa: 85% pilares consolidados + 15% sentimento das chamadas ao vivo
      overallScore = roundMoney(clamp(overallScore * 0.85 + sentimentScore100 * 0.15, 0, 100));
    }
  }

  return {
    period: input.overview.period,
    pillars,
    overallScore,
    generatedAt: now.toISOString(),
    liveInsightsSummary,
  };
}

/**
 * Ingestão reativa de um LiveCallInsight atualizando um HealthScoreResult existente.
 */
export function applyLiveCallInsightToHealthScore(
  currentResult: HealthScoreResult,
  insight: LiveCallInsight,
  existingInsights: LiveCallInsight[] = [],
): HealthScoreResult {
  const updatedInsights = [...existingInsights, insight];
  const summary = summarizeLiveCallInsights(updatedInsights);

  let newOverallScore = currentResult.overallScore;
  if (newOverallScore != null && summary.averageSentimentScore != null) {
    const sentimentScore100 =
      summary.averageSentimentScore > 1
        ? summary.averageSentimentScore
        : (summary.averageSentimentScore + 1) * 50;
    newOverallScore = roundMoney(clamp(newOverallScore * 0.85 + sentimentScore100 * 0.15, 0, 100));
  }

  return {
    ...currentResult,
    overallScore: newOverallScore,
    liveInsightsSummary: summary,
    generatedAt: new Date().toISOString(),
  };
}
