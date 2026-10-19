/**
 * Contrato Canônico para a Arquitetura Multi-Região e Failover de Workers (Eixo 19)
 * Onda 05 — Evolução 19
 * Responsável: Agente 18 (Contratos) / Agente 10 (SRE) / Agente 16 (Runtime)
 */

export type RegionIdentifier = 'sa-east-1' | 'us-east-1' | 'us-west-2';

export type RegionHealthStatus = 'healthy' | 'degraded' | 'unreachable';

export interface RegionTelemetry {
  region: RegionIdentifier;
  status: RegionHealthStatus;
  latencyMs: number;
  errorRatePercent: number;
  activeWorkersCount: number;
  cacheHitRatio: number;
  lastHealthCheckIso: string;
}

export interface FailoverEvent {
  failoverId: string;
  organizationId?: string; // Se omitido, aplica a todo o cluster
  fromRegion: RegionIdentifier;
  toRegion: RegionIdentifier;
  reason: string;
  initiatedAt: string;
  completedAt?: string;
  durationMs?: number;
  reroutedTrafficPercent: number;
  statePreserved: boolean;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
}

export interface IMultiRegionResiliencePort {
  registerTelemetry(telemetry: RegionTelemetry): Promise<void>;
  getRegionHealth(region: RegionIdentifier): Promise<RegionTelemetry>;
  listAllRegions(): Promise<RegionTelemetry[]>;
  triggerFailover(params: {
    fromRegion: RegionIdentifier;
    toRegion: RegionIdentifier;
    reason: string;
    organizationId?: string;
  }): Promise<FailoverEvent>;
  getFailoverStatus(failoverId: string): Promise<FailoverEvent | null>;
}
