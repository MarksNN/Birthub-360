import { randomUUID } from 'node:crypto';
import type {
  IValueRealizationPort,
  ValueMetricType,
  ValueObservationHistoryEntry,
  ValueRealizationStatus,
  ValueRealizationSummary,
  ValueRealizationTracker,
} from '../../../shared/contracts/valueRealization.contract.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';

export class ValueRealizationService implements IValueRealizationPort {
  private trackersStore = new Map<string, ValueRealizationTracker>(); // key: `${orgId}:${trackerId}`

  /**
   * Converte uma promessa comercial aprovada em um rastreador formal de valor entregue.
   */
  async createTrackerFromPromise(params: {
    organizationId: string;
    commitmentId: string;
    customerCompanyName: string;
    dealId?: string;
    metricType: ValueMetricType;
    indicatorName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
    deadline: string;
    responsibleOwnerName: string;
  }): Promise<ValueRealizationTracker> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para Value Realization');
    }

    const id = `val-${randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();

    const tracker: ValueRealizationTracker = {
      id,
      organizationId: params.organizationId,
      customerCompanyName: params.customerCompanyName,
      dealId: params.dealId,
      promiseCommitmentId: params.commitmentId,
      metricType: params.metricType,
      indicatorName: params.indicatorName,
      baselineValue: params.baselineValue,
      targetValue: params.targetValue,
      unit: params.unit,
      deadline: params.deadline,
      responsibleOwnerName: params.responsibleOwnerName,
      status: 'ONBOARDING_ACTIVE',
      history: [],
      createdAt: now,
    };

    const key = `${params.organizationId}:${id}`;
    this.trackersStore.set(key, tracker);

    logger.info(
      `[ValueRealization] Rastreador ${id} criado para "${params.indicatorName}" na empresa ${params.customerCompanyName} (Tenant: ${params.organizationId}).`,
    );

    return tracker;
  }

  /**
   * Registra a medição real de um indicador de valor pós-venda.
   */
  async recordObservedValue(params: {
    organizationId: string;
    trackerId: string;
    observedValue: number;
    evidence: string;
    measuredBy: string;
  }): Promise<ValueRealizationTracker> {
    const { organizationId, trackerId, observedValue, evidence, measuredBy } = params;
    const key = `${organizationId}:${trackerId}`;
    const tracker = this.trackersStore.get(key);

    if (!tracker) {
      throw new Error(
        `Rastreador de valor ${trackerId} não encontrado no tenant ${organizationId}.`,
      );
    }

    const now = new Date().toISOString();

    // Avaliação de status com base na direção e proximidade da meta
    const isReduction = tracker.targetValue < tracker.baselineValue;
    const totalDeltaTarget = Math.abs(tracker.targetValue - tracker.baselineValue);
    let isTargetMet = false;
    let progressRatio = 1.0;

    if (isReduction) {
      isTargetMet = observedValue <= tracker.targetValue;
      if (totalDeltaTarget > 0) {
        const achieved = tracker.baselineValue - observedValue;
        progressRatio = Math.max(0, achieved / totalDeltaTarget);
      }
    } else {
      isTargetMet = observedValue >= tracker.targetValue;
      if (totalDeltaTarget > 0) {
        const achieved = observedValue - tracker.baselineValue;
        progressRatio = Math.max(0, achieved / totalDeltaTarget);
      }
    }

    let newStatus: ValueRealizationStatus = 'MEASURED_ON_TRACK';
    let divergenceNotes: string | undefined;

    if (isTargetMet) {
      newStatus = 'ACHIEVED';
    } else if (progressRatio < 0.6) {
      newStatus = 'MEASURED_GAP';
      divergenceNotes = `Desvio detectado: progresso atual de ${(progressRatio * 100).toFixed(1)}% abaixo do esperado para a janela contratada.`;
    } else {
      newStatus = 'MEASURED_ON_TRACK';
    }

    const historyEntry: ValueObservationHistoryEntry = {
      timestamp: now,
      observedValue,
      measuredBy,
      evidenceSnippet: evidence,
      divergencePercent: Math.round((1 - progressRatio) * 100),
    };

    tracker.observedValue = observedValue;
    tracker.status = newStatus;
    tracker.fulfillmentEvidence = evidence;
    tracker.divergenceNotes = divergenceNotes;
    tracker.history.push(historyEntry);
    tracker.lastEvaluatedAt = now;

    this.trackersStore.set(key, tracker);

    await domainEventMesh.publish({
      eventType: 'VALUE_REALIZATION_MEASURED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `val-evt-${trackerId}`,
      producer: 'value-realization-service',
      aggregateId: trackerId,
      payload: {
        trackerId,
        customerCompanyName: tracker.customerCompanyName,
        indicatorName: tracker.indicatorName,
        observedValue,
        targetValue: tracker.targetValue,
        status: newStatus,
      },
    });

    logger.info(
      `[ValueRealization] Medição de valor registrada para o tracker ${trackerId}: ${observedValue} ${tracker.unit} (Status: ${newStatus}).`,
    );

    return tracker;
  }

  /**
   * Lista todos os rastreadores do tenant com filtros opcionais.
   */
  async listTrackers(
    organizationId: string,
    filters?: { customerCompanyName?: string; status?: ValueRealizationStatus },
  ): Promise<ValueRealizationTracker[]> {
    return Array.from(this.trackersStore.values()).filter((t) => {
      if (t.organizationId !== organizationId) return false;
      if (filters?.customerCompanyName && t.customerCompanyName !== filters.customerCompanyName) {
        return false;
      }
      if (filters?.status && t.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

  /**
   * Consolida métricas executivas de realização de valor do tenant.
   */
  async getRealizationSummary(organizationId: string): Promise<ValueRealizationSummary> {
    const all = await this.listTrackers(organizationId);

    const achievedCount = all.filter((t) => t.status === 'ACHIEVED').length;
    const onTrackCount = all.filter((t) => t.status === 'MEASURED_ON_TRACK').length;
    const gapCount = all.filter((t) => t.status === 'MEASURED_GAP').length;
    const pendingValidationCount = all.filter(
      (t) => t.status === 'PROMISED' || t.status === 'ONBOARDING_ACTIVE',
    ).length;

    let totalProgressSum = 0;
    let evaluatedCount = 0;

    for (const t of all) {
      if (t.observedValue !== undefined) {
        evaluatedCount++;
        const isReduction = t.targetValue < t.baselineValue;
        const deltaTarget = Math.abs(t.targetValue - t.baselineValue);
        let ratio = 1;
        if (deltaTarget > 0) {
          const achieved = isReduction
            ? t.baselineValue - t.observedValue
            : t.observedValue - t.baselineValue;
          ratio = Math.max(0, Math.min(1.2, achieved / deltaTarget));
        }
        totalProgressSum += ratio;
      }
    }

    const averageAchievementRatePercent =
      evaluatedCount > 0 ? Math.round((totalProgressSum / evaluatedCount) * 1000) / 10 : 0;

    return {
      organizationId,
      totalTrackers: all.length,
      achievedCount,
      onTrackCount,
      gapCount,
      pendingValidationCount,
      averageAchievementRatePercent,
      calculatedAt: new Date().toISOString(),
    };
  }

  clear(): void {
    this.trackersStore.clear();
  }
}

export const valueRealizationService = new ValueRealizationService();
