import { beforeEach, describe, expect, it } from 'vitest';
import {
  PrometheusExporter,
} from '../../../src/lib/metrics/prometheusExporter.js';

describe('PrometheusExporter (Passo 065)', () => {
  let exporter: PrometheusExporter;

  beforeEach(() => {
    exporter = new PrometheusExporter();
  });

  it('deve formatar métricas de integrações no padrão OpenMetrics/Prometheus', () => {
    exporter.recordRequest({ provider: 'bitrix24', status: 'success' }, 0.45);
    exporter.recordRequest({ provider: 'bitrix24', status: 'success' }, 0.55);
    exporter.recordRequest(
      { provider: 'twilio', status: 'error', errorType: 'timeout' },
      3.0,
    );

    const output = exporter.exportMetrics();

    expect(output).toContain('# TYPE integration_requests_total counter');
    expect(output).toContain('integration_requests_total{provider="bitrix24",status="success"} 2');
    expect(output).toContain(
      'integration_requests_total{provider="twilio",status="error",error_type="timeout"} 1',
    );
    expect(output).toContain('integration_latency_seconds_sum{provider="bitrix24"} 1.000');
    expect(output).toContain('integration_latency_seconds_count{provider="bitrix24"} 2');
  });

  it('deve incrementar contadores corretamente com múltiplas requisições', () => {
    for (let i = 0; i < 5; i++) {
      exporter.recordRequest({ provider: 'whatsapp', status: 'success' }, 0.1);
    }

    const output = exporter.exportMetrics();
    expect(output).toContain('integration_requests_total{provider="whatsapp",status="success"} 5');
    expect(output).toContain('integration_latency_seconds_count{provider="whatsapp"} 5');
  });
});
