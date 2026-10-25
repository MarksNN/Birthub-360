import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const lokiHost = process.env.LOKI_HOST;

// Só ativa pino-loki em produção se LOKI_HOST estiver explicitamente configurado (ex: docker-compose local).
// Em ambientes de cloud como Railway / Kubernetes sem Loki dedicado, o pino grava JSON diretamente no stdout,
// evitando crash por erro de resolução de DNS 'ENOTFOUND loki'.
const getTransport = () => {
  if (lokiHost) {
    return {
      target: 'pino-loki',
      options: {
        batching: true,
        interval: 5,
        host: lokiHost,
      },
    };
  }
  if (!isProduction) {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }
  return undefined; // Standard JSON output to stdout in production
};

/**
 * Caminhos redigidos pelo pino (exportado para o teste de redaction usar a config REAL).
 * Cada credencial aparece no topo e na forma `*.campo` (um nível de aninhamento).
 */
export const LOGGER_REDACT_PATHS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'authorization',
  'cookie',
  '*.password',
  '*.token',
  '*.secret',
  '*.authorization',
  '*.cookie',
  '*.apiKey',
  '*.api_key',
  // Credenciais de integração (Setting integration.*, ver
  // src/lib/integrations/integrationSettings.repository.ts) — Onda 52, Agente 15.
  'botToken',
  'appSecret',
  'appPassword',
  'webhookUrl',
  '*.botToken',
  '*.appSecret',
  '*.appPassword',
  '*.webhookUrl',
  '*.accessToken',
  // Credenciais de integração/rotação (parecer 24 do #102): topo + um nível
  // (`refreshToken` no topo já estava acima).
  '*.refreshToken',
  'apiKey',
  'clientSecret',
  '*.clientSecret',
  'webhookSecret',
  '*.webhookSecret',
  'authToken',
  '*.authToken',
  'appKey',
  '*.appKey',
  'cpf',
  '*.cpf',
  'email',
  '*.email',
  'url',
  '*.url',
  'resetUrl',
  '*.resetUrl',
  'verificationUrl',
  '*.verificationUrl',
  'creditCard',
  '*.creditCard',
  'cardNumber',
  '*.cardNumber',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: LOGGER_REDACT_PATHS,
    censor: '[REDACTED]',
  },
  transport: getTransport(),
  base: {
    env: process.env.NODE_ENV,
    service: 'birthhub360-api',
  },
});
