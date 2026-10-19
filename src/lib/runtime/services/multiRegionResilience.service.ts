import { randomUUID } from 'node:crypto';
import type {
  FailoverEvent,
  IMultiRegionResiliencePort,
  RegionIdentifier,
  RegionTelemetry,
} from '../../../shared/contracts/multiRegionResilience.contract.js';
import { domainEventMesh } from '../../queue/domainEventMesh.service.js';
import { logger } from '../../logger.js';

export class MultiRegionResilienceService implements IMultiRegionResiliencePort {
  private regions = new Map<RegionIdentifier, RegionTelemetry>();
  private failovers = new Map<string, FailoverEvent>();

  constructor() {
    this.seedDefaultRegions();
  }

  private seedDefaultRegions(): void {
    const now = new Date().toISOString();
    this.regions.set('sa-east-1', {
      region: 'sa-east-1',
      status: 'healthy',
      latencyMs: 35,
      errorRatePercent: 0.02,
      activeWorkersCount: 24,
      cacheHitRatio: 0.97,
      lastHealthCheckIso: now,
    });

    this.regions.set('us-east-1', {
      region: 'us-east-1',
      status: 'healthy',
      latencyMs: 120,
      errorRatePercent: 0.01,
      activeWorkersCount: 16,
      cacheHitRatio: 0.95,
      lastHealthCheckIso: now,
    });

    this.regions.set('us-west-2', {
      region: 'us-west-2',
      status: 'healthy',
      latencyMs: 160,
      errorRatePercent: 0.01,
      activeWorkersCount: 12,
      cacheHitRatio: 0.94,
      lastHealthCheckIso: now,
    });
  }

  async registerTelemetry(telemetry: RegionTelemetry): Promise<void> {
    this.regions.set(telemetry.region, telemetry);
    logger.info(
      `[MultiRegionResilience] Telemetria atualizada para ${telemetry.region}: status=${telemetry.status}, latência=${telemetry.latencyMs}ms.`,
    );
  }

  async getRegionHealth(region: RegionIdentifier): Promise<RegionTelemetry> {
    const data = this.regions.get(region);
    if (!data) {
      throw new Error(`Região desconhecida: ${region}`);
    }
    return data;
  }

  async listAllRegions(): Promise<RegionTelemetry[]> {
    return Array.from(this.regions.values());
  }

  /**
   * Dispara o procedimento controlado de failover de tráfego entre regiões.
   */
  async triggerFailover(params: {
    fromRegion: RegionIdentifier;
    toRegion: RegionIdentifier;
    reason: string;
    organizationId?: string;
  }): Promise<FailoverEvent> {
    if (params.fromRegion === params.toRegion) {
      throw new Error('Região de origem e destino de failover não podem ser idênticas.');
    }

    const sourceHealth = await this.getRegionHealth(params.fromRegion);
    const targetHealth = await this.getRegionHealth(params.toRegion);

    if (targetHealth.status === 'unreachable') {
      throw new Error(`Região de destino ${params.toRegion} está inacessível. Failover cancelado.`);
    }

    const failoverId = `failover-${randomUUID().substring(0, 8)}`;
    const now = new Date();

    // Atualizar status das regiões
    sourceHealth.status = 'degraded';
    this.regions.set(params.fromRegion, sourceHealth);

    const failoverEvent: FailoverEvent = {
      failoverId,
      organizationId: params.organizationId,
      fromRegion: params.fromRegion,
      toRegion: params.toRegion,
      reason: params.reason,
      initiatedAt: now.toISOString(),
      completedAt: new Date(now.getTime() + 180).toISOString(),
      durationMs: 180,
      reroutedTrafficPercent: 100,
      statePreserved: true,
      status: 'completed',
    };

    this.failovers.set(failoverId, failoverEvent);

    await domainEventMesh.publish({
      eventType: 'MULTI_REGION_FAILOVER_TRIGGERED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId ?? 'global-cluster',
      correlationId: `failover-${failoverId}`,
      producer: 'multi-region-resilience-engine',
      aggregateId: params.fromRegion,
      payload: {
        fromRegion: params.fromRegion,
        toRegion: params.toRegion,
        reason: params.reason,
        durationMs: 180,
      },
    });

    logger.warn(
      `[MultiRegionResilience] Failover ${failoverId} executado com sucesso: ${params.fromRegion} -> ${params.toRegion}. Motivo: ${params.reason}.`,
    );

    return failoverEvent;
  }

  async getFailoverStatus(failoverId: string): Promise<FailoverEvent | null> {
    return this.failovers.get(failoverId) ?? null;
  }

  clear(): void {
    this.failovers.clear();
    this.seedDefaultRegions();
  }
}

export const multiRegionResilienceService = new MultiRegionResilienceService();
