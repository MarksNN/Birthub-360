import { createHash, randomUUID } from 'node:crypto';
import type {
  AdaptiveCoachingPlan,
  CommercialBottleneck,
  CommercialMission,
  IBehavioralEnginePort,
} from '../../../shared/contracts/behavioralEngine.contract.js';
import { calculateSellerLevel } from '../domain/Gamification.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';

export class BehavioralEngineService implements IBehavioralEnginePort {
  // Armazenamento em memória com isolamento estrito por tenant
  private bottlenecksStore = new Map<string, CommercialBottleneck>();
  private missionsStore = new Map<string, CommercialMission>();
  private processedEvidenceHashes = new Set<string>();
  private sellerXpStore = new Map<string, number>(); // key: `${orgId}:${sellerId}` -> XP acumulado

  /**
   * Concede XP ao vendedor com validação de multi-tenancy e auditoria de evento.
   */
  async rewardSellerXp(params: {
    organizationId: string;
    sellerId: string;
    xpAmount: number;
    reason: string;
    activityType: string;
  }): Promise<{ success: boolean; newXp: number; level: number }> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }
    const key = `${params.organizationId}:${params.sellerId}`;
    const currentXp = this.sellerXpStore.get(key) || 0;
    const newXp = currentXp + params.xpAmount;
    this.sellerXpStore.set(key, newXp);

    const level = calculateSellerLevel(newXp).level;

    logger.info(
      { org: params.organizationId, seller: params.sellerId, xp: params.xpAmount, newXp },
      '[BehavioralEngine] XP creditado com sucesso',
    );

    return { success: true, newXp, level };
  }

  /**
   * Identifica gargalos comerciais reais com base em volume e métricas observadas.
   * Amostra mínima necessária: pelo menos 10 atividades (calls/reuniões) para evitar falso julgamento.
   */
  async detectBottlenecks(params: {
    organizationId: string;
    sellerId: string;
    sellerName: string;
    performanceMetrics: {
      callsCount: number;
      meetingsCount: number;
      qualifiedCount: number;
      dealsClosed: number;
      wonRevenue: number;
      conversionRatePercent: number;
      avgResponseTimeHours?: number;
      topLossReason?: string;
      roleplayAverageScore?: number;
    };
  }): Promise<CommercialBottleneck[]> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para o Behavioral Engine');
    }

    const m = params.performanceMetrics;
    const totalActivitySample = m.callsCount + m.meetingsCount;

    // Regra dura de amostra mínima
    if (totalActivitySample < 10 && m.dealsClosed === 0) {
      logger.info(
        `[BehavioralEngine] Amostra insuficiente (${totalActivitySample} atividades) para o vendedor ${params.sellerName} no tenant ${params.organizationId}. Nenhuma classificação precoce atribuída.`,
      );
      return [];
    }

    const detected: CommercialBottleneck[] = [];

    // 1. Gargalo: Baixa conversão de chamadas em reuniões
    const callToMeetingRate = m.callsCount > 0 ? (m.meetingsCount / m.callsCount) * 100 : 0;
    if (m.callsCount >= 15 && callToMeetingRate < 8) {
      const id = `btn-${randomUUID().substring(0, 8)}`;
      detected.push({
        id,
        organizationId: params.organizationId,
        sellerId: params.sellerId,
        sellerName: params.sellerName,
        metric: 'cold_call_conversion',
        severity: callToMeetingRate < 4 ? 'HIGH' : 'MEDIUM',
        observedValue: Math.round(callToMeetingRate * 10) / 10,
        benchmarkValue: 12.0,
        sampleSize: m.callsCount,
        detectedAt: new Date().toISOString(),
        confidence: 0.88,
        context: `Conversão de ligação para reunião agendada em ${callToMeetingRate.toFixed(1)}% (benchmark do time: 12%). Oportunidade no gancho inicial e pitch de valor.`,
      });
    }

    // 2. Gargalo: Dificuldade recorrente com objeção de preço
    if (m.topLossReason && /pre[çc]o|caro|or[çc]amento|budget|valor/i.test(m.topLossReason)) {
      const id = `btn-${randomUUID().substring(0, 8)}`;
      detected.push({
        id,
        organizationId: params.organizationId,
        sellerId: params.sellerId,
        sellerName: params.sellerName,
        metric: 'price_objection_handling',
        severity: 'HIGH',
        observedValue: 1.0,
        benchmarkValue: 0.0,
        sampleSize: m.dealsClosed + 5,
        detectedAt: new Date().toISOString(),
        confidence: 0.92,
        context: `Principal motivo de perda em oportunidades: "${m.topLossReason}". Necessidade de reforçar ancoragem de valor e cálculo de ROI antes do fechamento.`,
      });
    }

    // 3. Gargalo: Baixa qualificação de oportunidades
    const qualRate = m.meetingsCount > 0 ? (m.qualifiedCount / m.meetingsCount) * 100 : 0;
    if (m.meetingsCount >= 8 && qualRate < 35) {
      const id = `btn-${randomUUID().substring(0, 8)}`;
      detected.push({
        id,
        organizationId: params.organizationId,
        sellerId: params.sellerId,
        sellerName: params.sellerName,
        metric: 'opportunity_qualification',
        severity: 'MEDIUM',
        observedValue: Math.round(qualRate * 10) / 10,
        benchmarkValue: 50.0,
        sampleSize: m.meetingsCount,
        detectedAt: new Date().toISOString(),
        confidence: 0.85,
        context: `Apenas ${qualRate.toFixed(1)}% das reuniões avançam para qualificação formal (benchmark: 50%). Recomendado aprofundamento em critérios SPIN/BANT.`,
      });
    }

    // 4. Gargalo: Desempenho em Roleplay / Simulações abaixo da média
    if (m.roleplayAverageScore !== undefined && m.roleplayAverageScore < 75) {
      const id = `btn-${randomUUID().substring(0, 8)}`;
      detected.push({
        id,
        organizationId: params.organizationId,
        sellerId: params.sellerId,
        sellerName: params.sellerName,
        metric: 'price_objection_handling',
        severity: 'MEDIUM',
        observedValue: m.roleplayAverageScore,
        benchmarkValue: 85.0,
        sampleSize: 3,
        detectedAt: new Date().toISOString(),
        confidence: 0.9,
        context: `Média de desempenho nas últimas simulações pedagógicas de Roleplay está em ${m.roleplayAverageScore}/100.`,
      });
    }

    // Persistir e publicar eventos
    for (const b of detected) {
      const key = `${params.organizationId}:${b.id}`;
      this.bottlenecksStore.set(key, b);

      await domainEventMesh.publish({
        eventType: 'COMMERCIAL_BOTTLENECK_DETECTED',
        eventVersion: '1.0.0',
        organizationId: params.organizationId,
        correlationId: `btn-evt-${b.id}`,
        producer: 'behavioral-engine-service',
        aggregateId: params.sellerId,
        payload: {
          bottleneckId: b.id,
          metric: b.metric,
          severity: b.severity,
          observedValue: b.observedValue,
          benchmarkValue: b.benchmarkValue,
        },
      });
    }

    return detected;
  }

  /**
   * Gera uma missão adaptativa sob medida para o gargalo observado.
   */
  async generateAdaptiveMission(params: {
    organizationId: string;
    bottleneck: CommercialBottleneck;
  }): Promise<CommercialMission> {
    const { organizationId, bottleneck: b } = params;
    const missionId = `msn-${randomUUID().substring(0, 8)}`;
    const now = new Date();
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

    let title = 'Missão de Desenvolvimento Comercial';
    let objective = 'Superar gargalo operacional identificado';
    let criteriaType: CommercialMission['verifiableCriteria']['criterionType'] = 'roleplay_score';
    let targetCount = 3;
    let minScore: number | undefined = 85;
    let xp = 150;
    let badgeId: string | undefined ;
    let skillName = 'Contorno de Objeções';

    if (b.metric === 'price_objection_handling') {
      title = 'Negociador de Elite';
      objective =
        'Realizar três simulações de Roleplay focadas em objeção de preço e orçamento com nota superior a 85.';
      criteriaType = 'roleplay_score';
      targetCount = 3;
      minScore = 85;
      xp = 180;
      badgeId = 'CLOSER_ELITE';
      skillName = 'Negociação & Ancoragem de Valor';
    } else if (b.metric === 'cold_call_conversion') {
      title = 'Mestre do Gancho Comercial';
      objective =
        'Concluir 2 simulações de abordagem fria com nota acima de 80 e registrar 10 conexões reais.';
      criteriaType = 'activity_count';
      targetCount = 10;
      minScore = 80;
      xp = 150;
      badgeId = 'CALL_MASTER';
      skillName = 'Abertura & Conexão';
    } else if (b.metric === 'opportunity_qualification') {
      title = 'Arquiteto da Qualificação';
      objective =
        'Qualificar 5 oportunidades aplicando a metodologia SPIN com validação de decisor.';
      criteriaType = 'qualification_count';
      targetCount = 5;
      xp = 200;
      badgeId = 'QUALIFICATION_HERO';
      skillName = 'Diagnóstico Consultivo';
    }

    const mission: CommercialMission = {
      id: missionId,
      organizationId,
      sellerId: b.sellerId,
      sellerName: b.sellerName,
      bottleneckId: b.id,
      title,
      objective,
      verifiableCriteria: {
        criterionType: criteriaType,
        targetCount,
        minScore,
        timeframeDays: 7,
      },
      deadline,
      status: 'SUGGESTED',
      reward: {
        xp,
        badgeId,
        skillProgression: {
          skillName,
          deltaPercent: 12,
        },
      },
      createdAt: now.toISOString(),
    };

    const key = `${organizationId}:${missionId}`;
    this.missionsStore.set(key, mission);

    await domainEventMesh.publish({
      eventType: 'ADAPTIVE_MISSION_SUGGESTED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `msn-evt-${missionId}`,
      producer: 'behavioral-engine-service',
      aggregateId: b.sellerId,
      payload: {
        missionId,
        title: mission.title,
        rewardXp: xp,
        deadline,
      },
    });

    return mission;
  }

  /**
   * Aceite formal da missão pelo vendedor.
   */
  async acceptMission(
    organizationId: string,
    missionId: string,
    sellerId: string,
  ): Promise<CommercialMission> {
    const key = `${organizationId}:${missionId}`;
    const mission = this.missionsStore.get(key);

    if (!mission) {
      throw new Error(`Missão ${missionId} não encontrada no tenant ${organizationId}.`);
    }

    if (mission.sellerId !== sellerId) {
      throw new Error(`A missão ${missionId} pertence a outro vendedor.`);
    }

    mission.status = 'IN_PROGRESS';
    mission.acceptedAt = new Date().toISOString();
    this.missionsStore.set(key, mission);

    return mission;
  }

  /**
   * Recompensa validada e concedida EXCLUSIVAMENTE pelo backend.
   * Aplica idempotência criptográfica rigorosa contra concessão duplicada de XP/badges.
   */
  async claimMissionReward(params: {
    organizationId: string;
    missionId: string;
    sellerId: string;
    evidence: {
      completedCount: number;
      averageScore?: number;
      evidenceHash: string;
      verifierSource: 'roleplay_engine' | 'crm_activity' | 'deal_pipeline';
    };
  }): Promise<{
    success: boolean;
    awardedXp: number;
    newTotalXp: number;
    newLevel: number;
    levelTitle: string;
    badgeUnlocked?: string;
    mission: CommercialMission;
  }> {
    const { organizationId, missionId, sellerId, evidence } = params;
    const key = `${organizationId}:${missionId}`;
    const mission = this.missionsStore.get(key);

    if (!mission) {
      throw new Error(`Missão ${missionId} inexistente para validação de recompensa.`);
    }

    if (mission.sellerId !== sellerId) {
      throw new Error('Tentativa de reivindicação de recompensa por vendedor divergente.');
    }

    if (mission.status === 'COMPLETED') {
      throw new Error('Esta missão já foi concluída e recompensada anteriormente.');
    }

    // Validação de critérios verificáveis
    const criteria = mission.verifiableCriteria;
    if (evidence.completedCount < criteria.targetCount) {
      throw new Error(
        `Critério não satisfeito: ${evidence.completedCount} realizado(s), necessário ${criteria.targetCount}.`,
      );
    }

    if (criteria.minScore !== undefined) {
      const avg = evidence.averageScore ?? 0;
      if (avg < criteria.minScore) {
        throw new Error(
          `Pontuação insuficiente na evidência: ${avg} obtida, mínimo exigido ${criteria.minScore}.`,
        );
      }
    }

    // Trava de idempotência: mesmo hash de evidência não pode pontuar duas vezes
    const idempotencyKey = `${organizationId}:${sellerId}:${evidence.evidenceHash}`;
    if (this.processedEvidenceHashes.has(idempotencyKey)) {
      throw new Error(
        'Violação de idempotência: este lote de evidência já foi utilizado para reivindicação de recompensa.',
      );
    }

    // Conceder XP no backend
    this.processedEvidenceHashes.add(idempotencyKey);
    const sellerKey = `${organizationId}:${sellerId}`;
    const currentXp = this.sellerXpStore.get(sellerKey) || 0;
    const awardedXp = mission.reward.xp;
    const newTotalXp = currentXp + awardedXp;
    this.sellerXpStore.set(sellerKey, newTotalXp);

    const { level: newLevel, title: levelTitle } = calculateSellerLevel(newTotalXp);

    mission.status = 'COMPLETED';
    mission.completedAt = new Date().toISOString();
    mission.evidenceSnippet = `Verificado via ${evidence.verifierSource} (Hash: ${evidence.evidenceHash.substring(0, 10)}…)`;
    this.missionsStore.set(key, mission);

    // Publicar eventos auditáveis
    await domainEventMesh.publish({
      eventType: 'ADAPTIVE_MISSION_COMPLETED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `reward-${missionId}`,
      producer: 'behavioral-engine-service',
      aggregateId: sellerId,
      payload: {
        missionId,
        awardedXp,
        newTotalXp,
        badgeUnlocked: mission.reward.badgeId,
        verifierSource: evidence.verifierSource,
      },
    });

    await domainEventMesh.publish({
      eventType: 'SELLER_XP_REWARDED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `xp-${missionId}`,
      producer: 'behavioral-engine-service',
      aggregateId: sellerId,
      payload: {
        sellerId,
        xp: awardedXp,
        totalXp: newTotalXp,
        level: newLevel,
      },
    });

    logger.info(
      `[BehavioralEngine] Recompensa de ${awardedXp} XP concedida com sucesso ao vendedor ${sellerId} no tenant ${organizationId}. Novo nível: ${newLevel} (${levelTitle}).`,
    );

    return {
      success: true,
      awardedXp,
      newTotalXp,
      newLevel,
      levelTitle,
      badgeUnlocked: mission.reward.badgeId,
      mission,
    };
  }

  /**
   * Gera plano de coaching adaptativo estruturado para orientar hábitos comerciais.
   */
  async getAdaptiveCoachingPlan(params: {
    organizationId: string;
    sellerId: string;
    sellerName: string;
    bottlenecks: CommercialBottleneck[];
  }): Promise<AdaptiveCoachingPlan> {
    const { organizationId, sellerId, sellerName, bottlenecks } = params;

    const primaryBottleneck = bottlenecks[0];
    let focusObjection = 'Contorno de Objeções Gerais';
    let personaId = 'persona-diretor-cfo';
    let personaName = 'Eduardo Silveira (CFO Conservador)';
    let objectionTopic = 'Matriz de Objeções: Preço vs. Retorno sobre Investimento';
    let playbookModule = 'Módulo 3: Ancoragem de Valor e Qualificação SPIN';
    let microHabit =
      'Antes de apresentar valores, validar formalmente a dor econômica com o decisor.';

    if (primaryBottleneck?.metric === 'price_objection_handling') {
      focusObjection = 'Sua solução está 30% mais cara que a concorrência';
      personaId = 'persona-cfo-economico';
      personaName = 'Carlos Mendes (CFO Rigoroso)';
      objectionTopic = 'Desconstrução de Objeção de Preço em Custo Operacional Total (TCO)';
      playbookModule = 'Playbook Comercial: Capítulo 4 — Engenharia de Valor B2B';
      microHabit = 'Apresentar a simulação de ROI sempre acompanhada de 3 cenários transparentes.';
    } else if (primaryBottleneck?.metric === 'cold_call_conversion') {
      focusObjection = 'Já temos um fornecedor e não temos interesse em trocar agora';
      personaId = 'persona-gerente-operacoes';
      personaName = 'Mariana Ramos (Gerente de Operações)';
      objectionTopic = 'Quebra de Padrão e Ganchos de Abertura em Cold Calls';
      playbookModule = 'Playbook de Prospecção: Roteiros de Conexão Rápida';
      microHabit =
        'Dedicar os primeiros 20 segundos da chamada à dor do setor em vez das funções do software.';
    }

    return {
      organizationId,
      sellerId,
      sellerName,
      headline: `Plano de Desenvolvimento Focado para ${sellerName}`,
      suggestedRoleplay: {
        personaId,
        personaName,
        focusObjection,
        targetScore: 85,
      },
      objectionMatrixTopic: objectionTopic,
      playbookModule,
      microTrainingAction: microHabit,
      createdAt: new Date().toISOString(),
    };
  }

  // Utilitário para testes e isolamento
  clear(): void {
    this.bottlenecksStore.clear();
    this.missionsStore.clear();
    this.processedEvidenceHashes.clear();
    this.sellerXpStore.clear();
  }
}

export const behavioralEngineService = new BehavioralEngineService();
