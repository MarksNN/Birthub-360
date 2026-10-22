/**
 * prometheusExporter.ts (Passo 065)
 * Exportador de métricas Prometheus para saúde, erros e latência de integrações externas.
 */

export interface IntegrationMetricLabels {
  provider: string;
  status: 'success' | 'error';
  errorType?: string;
}

export class PrometheusExporter {
  private requestCounts = new Map<string, number>();
  private latencySums = new Map<string, number>();
  private latencyCounts = new Map<string, number>();

  private formatLabels(labels: Record<string, string>): string {
    const parts = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${parts}}`;
  }

  recordRequest(labels: IntegrationMetricLabels, durationSeconds: number): void {
    const countKey = this.formatLabels({
      provider: labels.provider,
      status: labels.status,
      ...(labels.errorType ? { error_type: labels.errorType } : {}),
    });

    const currentCount = this.requestCounts.get(countKey) || 0;
    this.requestCounts.set(countKey, currentCount + 1);

    const latencyKey = this.formatLabels({ provider: labels.provider });
    const currentLatencySum = this.latencySums.get(latencyKey) || 0;
    const currentLatencyCount = this.latencyCounts.get(latencyKey) || 0;

    this.latencySums.set(latencyKey, currentLatencySum + durationSeconds);
    this.latencyCounts.set(latencyKey, currentLatencyCount + 1);
  }

  exportMetrics(): string {
    const lines: string[] = [
      '# HELP integration_requests_total Total de chamadas a integrações externas',
      '# TYPE integration_requests_total counter',
    ];

    for (const [labels, count] of this.requestCounts.entries()) {
      lines.push(`integration_requests_total${labels} ${count}`);
    }

    lines.push(
      '# HELP integration_latency_seconds_sum Soma da latência das chamadas a integrações',
      '# TYPE integration_latency_seconds_sum counter',
    );
    for (const [labels, sum] of this.latencySums.entries()) {
      lines.push(`integration_latency_seconds_sum${labels} ${sum.toFixed(3)}`);
    }

    lines.push(
      '# HELP integration_latency_seconds_count Contagem de chamadas com latência medida',
      '# TYPE integration_latency_seconds_count counter',
    );
    for (const [labels, count] of this.latencyCounts.entries()) {
      lines.push(`integration_latency_seconds_count${labels} ${count}`);
    }

    return lines.join('\n');
  }

  clear(): void {
    this.requestCounts.clear();
    this.latencySums.clear();
    this.latencyCounts.clear();
  }
}

export const prometheusExporter = new PrometheusExporter();
