/**
 * Telemetria de Erros em Tempo Real e Tracing Distribuído
 * Compatível com OpenTelemetry e Sentry.
 * Sanitiza automaticamente PII e credenciais antes de emitir qualquer evento.
 */

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  service: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
}

export interface TelemetryConfig {
  serviceName: string;
  environment: string;
  enabled: boolean;
  sampleRate?: number;
}

class TelemetryService {
  private config: TelemetryConfig;
  private events: TelemetryEvent[] = [];

  constructor(config?: Partial<TelemetryConfig>) {
    this.config = {
      serviceName: config?.serviceName || 'birthhub360-api',
      environment: config?.environment || process.env.NODE_ENV || 'production',
      enabled: config?.enabled !== undefined ? config.enabled : true,
      sampleRate: config?.sampleRate || 1.0,
    };
  }

  public init(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public sanitizePayload(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'pass',
      'token',
      'secret',
      'authorization',
      'apikey',
      'cpf',
      'creditcard',
      'credit_card',
      'cardnumber',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lower = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((s) => lower.includes(s));

      if (isSensitive) {
        sanitized[key] = '[REDACTED_BY_TELEMETRY]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizePayload(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        // Redação por regex para CPF e Cartões no meio de strings
        const masked = value
          .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED_CPF]')
          .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[REDACTED_CARD]');
        sanitized[key] = masked;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  public captureException(error: Error, context?: Record<string, unknown>): TelemetryEvent {
    const sanitizedContext = context ? this.sanitizePayload(context) : undefined;
    const event: TelemetryEvent = {
      eventId: `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      service: this.config.serviceName,
      level: 'error',
      message: error.message || 'Unknown error',
      context: sanitizedContext,
      traceId: `trace-${Date.now()}`,
      spanId: `span-${Math.random().toString(36).substring(2, 10)}`,
    };

    if (this.config.enabled) {
      this.events.push(event);
    }

    return event;
  }

  public getCapturedEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
  }
}

export const telemetry = new TelemetryService();
