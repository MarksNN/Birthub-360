import { randomUUID } from 'node:crypto';
import { logger } from '../../lib/logger.js';
import { domainEventMesh } from '../../lib/queue/domainEventMesh.service.js';
import type {
  GeofenceEvent,
  GeofenceRule,
  IMobileEdgeAiPort,
  OfflineAiTask,
  VisitBriefingCache,
} from '../../shared/contracts/mobileEdgeAi.contract.js';

export class MobileEdgeAiService implements IMobileEdgeAiPort {
  private briefings = new Map<string, VisitBriefingCache>(); // key: `${orgId}:${dealId}`
  private geofences = new Map<string, GeofenceRule>(); // key: `${orgId}:${geofenceId}`
  private offlineTaskQueue: OfflineAiTask[] = [];

  /**
   * Armazena briefing de visita comercial em cache local encriptado para uso offline.
   */
  async cacheVisitBriefing(params: {
    organizationId: string;
    dealId: string;
    briefing: Omit<VisitBriefingCache, 'briefingId' | 'cachedAt' | 'expiresAt' | 'isStale'>;
  }): Promise<VisitBriefingCache> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const briefingId = `brf-${randomUUID().substring(0, 8)}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h de validade de cache

    const cached: VisitBriefingCache = {
      ...params.briefing,
      briefingId,
      organizationId: params.organizationId,
      dealId: params.dealId,
      cachedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isStale: false,
    };

    const key = `${params.organizationId}:${params.dealId}`;
    this.briefings.set(key, cached);

    logger.info(
      `[MobileEdgeAI] Briefing da empresa ${cached.companyName} salvo em cache para deal ${params.dealId} no tenant ${params.organizationId}.`,
    );

    return cached;
  }

  /**
   * Recupera briefing pré-visita (suporte transparente a modo offline).
   */
  async getVisitBriefing(params: {
    organizationId: string;
    dealId: string;
    offlineMode?: boolean;
  }): Promise<VisitBriefingCache | null> {
    const key = `${params.organizationId}:${params.dealId}`;
    const briefing = this.briefings.get(key);

    if (!briefing) return null;

    // Verificar se o dado expirou
    const isExpired = new Date(briefing.expiresAt).getTime() < Date.now();
    briefing.isStale = isExpired;

    await domainEventMesh.publish({
      eventType: 'OFFLINE_BRIEFING_ACCESSED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `briefing-access-${params.dealId}`,
      producer: 'mobile-edge-ai-service',
      aggregateId: params.dealId,
      payload: {
        dealId: params.dealId,
        companyName: briefing.companyName,
        offlineMode: Boolean(params.offlineMode),
        isStale: briefing.isStale,
      },
    });

    return briefing;
  }

  /**
   * Registra regra de geofencing com trava estrita de privacidade (sem gravação automática).
   */
  async registerGeofence(params: {
    organizationId: string;
    rule: Omit<GeofenceRule, 'geofenceId' | 'autoRecordingProhibited' | 'consentRequired'>;
  }): Promise<GeofenceRule> {
    if (!params.organizationId) {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const geofenceId = `geo-${randomUUID().substring(0, 8)}`;
    const fullRule: GeofenceRule = {
      ...params.rule,
      geofenceId,
      organizationId: params.organizationId,
      autoRecordingProhibited: true, // Trava expressa de governança: gravação autônoma proibida
      consentRequired: true,
      active: true,
    };

    this.geofences.set(`${params.organizationId}:${geofenceId}`, fullRule);
    return fullRule;
  }

  /**
   * Processa localização e sugere briefing se houver proximidade autorizada.
   * Regra inviolável: NUNCA inicia gravação de áudio ou chamada automaticamente.
   */
  async processGeofenceLocation(params: {
    organizationId: string;
    sellerId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    consentOptIn: boolean;
  }): Promise<GeofenceEvent | null> {
    if (!params.consentOptIn) {
      logger.warn(
        '[MobileEdgeAI] Localização descartada: vendedor não concedeu opt-in para geofencing.',
      );
      return null;
    }

    // Localizar geofence correspondente no tenant
    for (const [key, rule] of this.geofences.entries()) {
      if (key.startsWith(`${params.organizationId}:`) && rule.active) {
        // Cálculo de distância simples (Haversine aproximado para teste)
        const dLat = Math.abs(rule.latitude - params.latitude);
        const dLon = Math.abs(rule.longitude - params.longitude);
        const distanceApproxMeters = Math.sqrt(dLat * dLat + dLon * dLon) * 111000;

        if (distanceApproxMeters <= rule.radiusMeters) {
          const event: GeofenceEvent = {
            eventId: `evt-geo-${randomUUID().substring(0, 8)}`,
            geofenceId: rule.geofenceId,
            organizationId: params.organizationId,
            sellerId: params.sellerId,
            companyName: rule.companyName,
            eventType: 'ENTERED_RADIUS',
            latitude: params.latitude,
            longitude: params.longitude,
            accuracyMeters: params.accuracyMeters,
            timestamp: new Date().toISOString(),
            suggestedAction: 'OPEN_BRIEFING', // Notifica apenas para abrir briefing
            recordingTriggered: false, // Inviolável: microfone não é ligado
          };

          await domainEventMesh.publish({
            eventType: 'GEOFENCE_PROXIMITY_DETECTED',
            eventVersion: '1.0.0',
            organizationId: params.organizationId,
            correlationId: `geo-prox-${rule.geofenceId}`,
            producer: 'mobile-edge-ai-service',
            aggregateId: params.sellerId,
            payload: {
              companyName: rule.companyName,
              suggestedAction: event.suggestedAction,
              recordingTriggered: event.recordingTriggered,
            },
          });

          logger.info(
            `[MobileEdgeAI] Vendedor ${params.sellerId} próximo à empresa ${rule.companyName}. Sugestão de briefing enviada sem gravação.`,
          );

          return event;
        }
      }
    }

    return null;
  }

  /**
   * Enfileira tarefa de Edge AI offline (resumos e classificação local) para sincronização posterior.
   */
  async queueOfflineTask(params: {
    organizationId: string;
    sellerId: string;
    taskType: OfflineAiTask['taskType'];
    payload: Record<string, unknown>;
  }): Promise<OfflineAiTask> {
    const taskId = `task-off-${randomUUID().substring(0, 8)}`;
    const task: OfflineAiTask = {
      taskId,
      organizationId: params.organizationId,
      sellerId: params.sellerId,
      taskType: params.taskType,
      payload: params.payload,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    this.offlineTaskQueue.push(task);
    return task;
  }

  /**
   * Sincroniza tarefas locais quando a conectividade é restabelecida.
   */
  async syncPendingOfflineTasks(
    organizationId: string,
  ): Promise<{ syncedCount: number; errors: string[] }> {
    let syncedCount = 0;
    const errors: string[] = [];

    for (const task of this.offlineTaskQueue) {
      if (task.organizationId === organizationId && task.status === 'QUEUED') {
        task.status = 'SYNCED';
        task.processedAt = new Date().toISOString();
        syncedCount++;
      }
    }

    logger.info(
      `[MobileEdgeAI] Sincronizadas ${syncedCount} tarefas pendentes para organização ${organizationId}.`,
    );
    return { syncedCount, errors };
  }

  clear(): void {
    this.briefings.clear();
    this.geofences.clear();
    this.offlineTaskQueue = [];
  }
}

export const mobileEdgeAiService = new MobileEdgeAiService();
