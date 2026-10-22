import { describe, it, expect, beforeEach } from 'vitest';
import { telemetry } from '../../../src/lib/observability/telemetry';

describe('telemetry — Observabilidade e Sanitização de Erros (Passo 88)', () => {
  beforeEach(() => {
    telemetry.clear();
    telemetry.init({ enabled: true, serviceName: 'birthhub-test' });
  });

  it('captura exceção com traceId, spanId e metadados estruturados', () => {
    const error = new Error('Falha de conexão com gateway de telefonia');
    const event = telemetry.captureException(error, { provider: 'twilio', attempt: 3 });

    expect(event.level).toBe('error');
    expect(event.message).toBe('Falha de conexão com gateway de telefonia');
    expect(event.traceId).toBeDefined();
    expect(event.spanId).toBeDefined();
    expect(event.context?.provider).toBe('twilio');
    expect(event.context?.attempt).toBe(3);
  });

  it('sanitiza credenciais sensíveis (senhas, tokens e chaves) do payload', () => {
    const payload = {
      user: 'operator_01',
      password: 'super_secret_password',
      apiKey: 'sk-ant-api03-abcdef',
      nested: {
        token: 'bearer-jwt-token-1234',
        safeProperty: 'normal_data',
      },
    };

    const sanitized = telemetry.sanitizePayload(payload);
    expect(sanitized.user).toBe('operator_01');
    expect(sanitized.password).toBe('[REDACTED_BY_TELEMETRY]');
    expect(sanitized.apiKey).toBe('[REDACTED_BY_TELEMETRY]');
    expect((sanitized.nested as Record<string, unknown>).token).toBe('[REDACTED_BY_TELEMETRY]');
    expect((sanitized.nested as Record<string, unknown>).safeProperty).toBe('normal_data');
  });

  it('sanitiza PII (CPF e cartões) formatados em strings contextuais', () => {
    const payload = {
      obs: 'Cliente titular portador do CPF 123.456.789-00 solicitou proposta',
    };

    const sanitized = telemetry.sanitizePayload(payload);
    expect(sanitized.obs).toBe('Cliente titular portador do CPF [REDACTED_CPF] solicitou proposta');
  });
});
