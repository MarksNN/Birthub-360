/**
 * Serviço de Bem-Estar Operacional, Otimização de Carga e Microtreinamentos
 * Onda 05 — Eixo 18: Organização de Agenda, Intervalos Voluntários e Preparação
 * Donos: Agente 02 (UX) & Agente 04 (CRM e BI) & Agente 07 (IA e Automações) & Agente 13 (Swarm)
 * 
 * DIRETRIZES ÉTICAS E DE SEGURANÇA MANDATÓRIAS (AGENTS.md / Seção 2):
 * - ZERO inferências médicas, diagnósticos clínicos, vigilância de estresse ou burnout.
 * - Recomendações 100% voluntárias e explicáveis para apoio operacional ao vendedor.
 * - Proibição de exposição individual a gestores para fins punitivos.
 * - Multi-tenant estrito por organizationId.
 */

import {
  CollectiveAggregatedWorkload,
  MicroTrainingSession,
  WorkloadObjectiveMetrics,
  WorkloadPreferences,
  WorkloadRecommendation,
} from '../../../shared/contracts/workloadWellbeing.contract.js';
import { logger } from '../../../lib/logger.js';

export interface CalendarEventSummary {
  id: string;
  title: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  isCommercialMeeting: boolean;
}

export class WorkloadWellbeingService {
  private preferences = new Map<string, WorkloadPreferences>();
  private recommendations = new Map<string, WorkloadRecommendation[]>();
  private microTrainings = new Map<string, MicroTrainingSession>();

  clear(): void {
    this.preferences.clear();
    this.recommendations.clear();
    this.microTrainings.clear();
  }

  private getPrefKey(orgId: string, sellerId: string): string {
    return `${orgId}:${sellerId}`;
  }

  /**
   * Obtém ou inicializa preferências de bem-estar com opt-in voluntário.
   */
  public getOrCreatePreferences(orgId: string, sellerId: string): WorkloadPreferences {
    const key = this.getPrefKey(orgId, sellerId);
    let pref = this.preferences.get(key);
    if (!pref) {
      pref = {
        sellerId,
        organizationId: orgId,
        enableBreakSuggestions: true,
        minBreakDurationMinutes: 10,
        preferredPrepTimeMinutes: 15,
        dailyMeetingHoursLimit: 5,
        optOutWellbeingFeatures: false,
        notificationsEnabled: true,
        updatedAt: new Date().toISOString(),
      };
      this.preferences.set(key, pref);
    }
    return pref;
  }

  public updatePreferences(
    orgId: string,
    sellerId: string,
    updates: Partial<WorkloadPreferences>,
  ): WorkloadPreferences {
    const current = this.getOrCreatePreferences(orgId, sellerId);
    const updated: WorkloadPreferences = {
      ...current,
      ...updates,
      sellerId,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
    };
    this.preferences.set(this.getPrefKey(orgId, sellerId), updated);
    return updated;
  }

  /**
   * Avalia a carga horária objetiva do dia (duração de reuniões, intervalos, acúmulo).
   */
  public calculateDailyWorkloadMetrics(
    orgId: string,
    sellerId: string,
    date: string,
    events: CalendarEventSummary[],
    pendingTasksCount = 0,
    urgentTasksCount = 0,
  ): WorkloadObjectiveMetrics {
    if (!events || events.length === 0) {
      return {
        sellerId,
        organizationId: orgId,
        date,
        totalMeetingsCount: 0,
        totalMeetingMinutes: 0,
        backToBackMeetingsCount: 0,
        maxConsecutiveMeetingMinutes: 0,
        availablePrepMinutesBeforeKeyMeetings: 60,
        pendingTasksCount,
        urgentTasksCount,
        isOverloadedThresholdMet: false,
      };
    }

    // Ordena por horário de início
    const sorted = [...events].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    let totalMinutes = 0;
    let backToBackCount = 0;
    let consecutiveMinutes = 0;
    let maxConsecutiveMinutes = 0;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const startMs = new Date(current.startTime).getTime();
      const endMs = new Date(current.endTime).getTime();
      const durMinutes = Math.max(0, (endMs - startMs) / (1000 * 60));
      totalMinutes += durMinutes;

      if (i > 0) {
        const prevEndMs = new Date(sorted[i - 1].endTime).getTime();
        const diffBetweenMs = startMs - prevEndMs;
        const diffMinutes = diffBetweenMs / (1000 * 60);

        // Se o intervalo for menor que 5 minutos, considera back-to-back
        if (diffMinutes <= 5) {
          backToBackCount++;
          consecutiveMinutes += durMinutes;
        } else {
          consecutiveMinutes = durMinutes;
        }
      } else {
        consecutiveMinutes = durMinutes;
      }

      if (consecutiveMinutes > maxConsecutiveMinutes) {
        maxConsecutiveMinutes = consecutiveMinutes;
      }
    }

    const pref = this.getOrCreatePreferences(orgId, sellerId);
    const limitMinutes = pref.dailyMeetingHoursLimit * 60;
    const isOverloaded = totalMinutes >= limitMinutes || backToBackCount >= 3;

    return {
      sellerId,
      organizationId: orgId,
      date,
      totalMeetingsCount: sorted.length,
      totalMeetingMinutes: totalMinutes,
      backToBackMeetingsCount: backToBackCount,
      maxConsecutiveMeetingMinutes: maxConsecutiveMinutes,
      availablePrepMinutesBeforeKeyMeetings: backToBackCount > 0 ? 0 : 20,
      pendingTasksCount,
      urgentTasksCount,
      isOverloadedThresholdMet: isOverloaded,
    };
  }

  /**
   * Gera recomendações voluntárias de organização operacional de agenda.
   */
  public generateRecommendations(
    orgId: string,
    sellerId: string,
    metrics: WorkloadObjectiveMetrics,
    upcomingMeeting?: CalendarEventSummary,
  ): WorkloadRecommendation[] {
    const pref = this.getOrCreatePreferences(orgId, sellerId);

    // Se o vendedor optou por desligar recursos de bem-estar, retorna vazio
    if (pref.optOutWellbeingFeatures || !pref.notificationsEnabled) {
      return [];
    }

    const recs: WorkloadRecommendation[] = [];

    // 1. Sugestão de Intervalo Voluntário (Back-to-back meetings)
    if (pref.enableBreakSuggestions && metrics.backToBackMeetingsCount >= 1) {
      recs.push({
        id: `rec-break-${Date.now()}`,
        organizationId: orgId,
        sellerId,
        type: 'SUGGEST_BREAK',
        title: 'Sugestão de Pausa Voluntária',
        explanation: `Você realizou ${metrics.backToBackMeetingsCount} reuniões consecutivas. Deseja reservar ${pref.minBreakDurationMinutes} minutos para recuperação de foco antes do próximo compromisso?`,
        durationMinutes: pref.minBreakDurationMinutes,
        isVoluntary: true,
        dismissed: false,
        accepted: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Preparação de Reunião Importante
    if (upcomingMeeting && upcomingMeeting.isCommercialMeeting) {
      recs.push({
        id: `rec-prep-${Date.now()}`,
        organizationId: orgId,
        sellerId,
        type: 'PRE_MEETING_PREPARATION',
        title: 'Preparação para Reunião Comercial',
        explanation: `Sua reunião "${upcomingMeeting.title}" inicia em breve. Deseja abrir o briefing resumido e realizar um microtreinamento de 3 minutos?`,
        durationMinutes: 3,
        relatedMeetingId: upcomingMeeting.id,
        isVoluntary: true,
        dismissed: false,
        accepted: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Organização de Tarefas Urgentes Acumuladas
    if (metrics.urgentTasksCount >= 4) {
      recs.push({
        id: `rec-tasks-${Date.now()}`,
        organizationId: orgId,
        sellerId,
        type: 'ORGANIZE_PENDING_TASKS',
        title: 'Organização de Prioridades',
        explanation: `Você tem ${metrics.urgentTasksCount} tarefas prioritárias para hoje. Deseja organizá-las automaticamente por impacto comercial?`,
        isVoluntary: true,
        dismissed: false,
        accepted: false,
        createdAt: new Date().toISOString(),
      });
    }

    const userKey = this.getPrefKey(orgId, sellerId);
    this.recommendations.set(userKey, recs);
    return recs;
  }

  /**
   * Cria uma sessão de microtreinamento pedagógico rápido (alvo de 3 minutos).
   */
  public createMicroTrainingSession(
    orgId: string,
    sellerId: string,
    exerciseType: MicroTrainingSession['exerciseType'],
    targetAccountName?: string,
  ): MicroTrainingSession {
    const trainingId = `mt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const exercisesConfig: Record<
      MicroTrainingSession['exerciseType'],
      { title: string; objective: string; prompts: string[] }
    > = {
      PRE_MEETING_CHECKLIST: {
        title: 'Checklist Rápido Pré-Reunião (3 min)',
        objective: 'Revisar o objetivo primário da chamada, participantes e perguntas de diagnóstico',
        prompts: [
          'Qual a principal meta desta conversa (ex: qualificar dor, alinhar ROI, agendar comitê)?',
          'Qual pergunta de implicação será essencial fazer nos primeiros 10 minutos?',
          'Qual o próximo passo claro que você pretende propor antes do encerramento?',
        ],
      },
      PRICE_OBJECTION_REHEARSAL: {
        title: 'Ensaio Rápido de Objeção de Preço (3 min)',
        objective: 'Treinar o reenquadramento de custo versus retorno financeiro (ROI/TCO)',
        prompts: [
          'Quando o cliente diz "está caro", qual o primeiro retorno empático que você faz?',
          'Como você conecta o custo da solução ao custo da inação (perda de receita atual)?',
        ],
      },
      DISCOVERY_QUESTION_WARMUP: {
        title: 'Aquecimento de Perguntas Abertas (3 min)',
        objective: 'Praticar formulação de perguntas abertas consultivas usando o framework SPIN',
        prompts: [
          'Formule 2 perguntas que comecem com "Como" ou "Qual" para diagnosticar o processo atual.',
          'Formule 1 pergunta para mapear o impacto financeiro de um gargalo relatado.',
        ],
      },
      CLOSING_NEXT_STEPS_PRACTICE: {
        title: 'Ancoragem de Fechamento Consultivo (3 min)',
        objective: 'Garantir que a reunião termine com agenda travada e compromisso mútuo',
        prompts: [
          'Como você propõe a data do próximo passo sem parecer impositivo?',
          'O que você combina que o cliente trará para a próxima reunião para manter engajamento?',
        ],
      },
      VALUE_PROPOSITION_ALIGNMENT: {
        title: 'Alinhamento de Proposta de Valor (3 min)',
        objective: `Sintetizar os diferenciais técnicos para ${targetAccountName || 'o cliente'}`,
        prompts: [
          'Qual o principal diferencial técnico relevante para este segmento específico?',
          'Qual caso de sucesso similar você pode citar em 30 segundos?',
        ],
      },
    };

    const config = exercisesConfig[exerciseType];

    const session: MicroTrainingSession = {
      trainingId,
      organizationId: orgId,
      sellerId,
      title: config.title,
      objective: config.objective,
      targetDurationMinutes: 3,
      exerciseType,
      prompts: config.prompts,
      isCompleted: false,
    };

    this.microTrainings.set(trainingId, session);
    logger.info({ trainingId, orgId, sellerId, exerciseType }, 'Micro-training session initialized');
    return session;
  }

  /**
   * Conclui a sessão de microtreinamento com feedback do vendedor.
   */
  public completeMicroTraining(
    trainingId: string,
    orgId: string,
    sellerRating?: number,
  ): MicroTrainingSession {
    const session = this.microTrainings.get(trainingId);
    if (!session || session.organizationId !== orgId) {
      throw new Error(`Micro-training session ${trainingId} not found for organization`);
    }

    session.isCompleted = true;
    session.completedAt = new Date().toISOString();
    session.sellerRating = sellerRating;

    return session;
  }

  /**
   * Gera relatório agregado anônimo de carga operacional para gestores (Sem scores individuais de bem-estar).
   */
  public getCollectiveAggregatedWorkload(
    orgId: string,
    metricsList: WorkloadObjectiveMetrics[],
  ): CollectiveAggregatedWorkload {
    // Exigência ética: mínimo de 5 participantes para evitar reidentificação
    const sampleSize = metricsList.length;
    if (sampleSize < 5) {
      return {
        organizationId: orgId,
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        anonymizedSampleCount: sampleSize,
        averageDailyMeetingMinutes: 0,
        averageBackToBackOccurrences: 0,
        collectivePrepTimeAvailabilityPercent: 0,
      };
    }

    const totalMinutes = metricsList.reduce((sum, m) => sum + m.totalMeetingMinutes, 0);
    const totalBackToBack = metricsList.reduce((sum, m) => sum + m.backToBackMeetingsCount, 0);
    const prepAvail = metricsList.filter((m) => m.availablePrepMinutesBeforeKeyMeetings > 10).length;

    return {
      organizationId: orgId,
      periodStart: metricsList[0]?.date || new Date().toISOString().split('T')[0],
      periodEnd: metricsList[metricsList.length - 1]?.date || new Date().toISOString().split('T')[0],
      anonymizedSampleCount: sampleSize,
      averageDailyMeetingMinutes: Math.round(totalMinutes / sampleSize),
      averageBackToBackOccurrences: Number((totalBackToBack / sampleSize).toFixed(1)),
      collectivePrepTimeAvailabilityPercent: Math.round((prepAvail / sampleSize) * 100),
    };
  }
}

export const workloadWellbeingService = new WorkloadWellbeingService();
