/**
 * finopsTelemetry.ts (Passo 051)
 * Telemetria FinOps nas inferências preditivas e de IA (latência, custo de tokens e cotas).
 */

import { estimateCostUsd } from './pricing.js';
import type { AiTokenUsage } from './types.js';

export interface FinOpsTelemetryRecord {
  organizationId: string;
  model: string;
  promptId: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  timestamp: Date;
}

export interface OrganizationFinOpsSummary {
  organizationId: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  averageLatencyMs: number;
}

export class FinOpsTelemetryService {
  private records: FinOpsTelemetryRecord[] = [];

  recordInference(params: {
    organizationId: string;
    model: string;
    promptId: string;
    latencyMs: number;
    usage: AiTokenUsage;
  }): FinOpsTelemetryRecord {
    const { organizationId, model, promptId, latencyMs, usage } = params;

    const costUsd = Number(estimateCostUsd(model, usage).toFixed(6));

    const record: FinOpsTelemetryRecord = {
      organizationId,
      model,
      promptId,
      latencyMs,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd,
      timestamp: new Date(),
    };

    this.records.push(record);
    return record;
  }

  getOrganizationSummary(organizationId: string): OrganizationFinOpsSummary {
    const orgRecords = this.records.filter((r) => r.organizationId === organizationId);
    if (orgRecords.length === 0) {
      return {
        organizationId,
        totalCalls: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        averageLatencyMs: 0,
      };
    }

    const totalCalls = orgRecords.length;
    const totalTokens = orgRecords.reduce((acc, r) => acc + r.totalTokens, 0);
    const totalCostUsd = Number(
      orgRecords.reduce((acc, r) => acc + r.costUsd, 0).toFixed(6),
    );
    const averageLatencyMs = Math.round(
      orgRecords.reduce((acc, r) => acc + r.latencyMs, 0) / totalCalls,
    );

    return {
      organizationId,
      totalCalls,
      totalTokens,
      totalCostUsd,
      averageLatencyMs,
    };
  }

  clear(): void {
    this.records = [];
  }
}

export const finopsTelemetryService = new FinOpsTelemetryService();
