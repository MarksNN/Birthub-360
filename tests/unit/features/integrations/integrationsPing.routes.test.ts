import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mocks
const mockValidateConnection = vi.fn();
vi.mock('../../../../src/features/integrations/shared/CrmProvider.js', () => ({
  getCrmProvider: vi.fn((key: string) => ({
    providerKey: key,
    displayName: key.toUpperCase(),
    validateConnection: mockValidateConnection,
  })),
  registerCrmProvider: vi.fn(),
  listCrmProviders: vi.fn(() => []),
}));

const mockTestWebhook = vi.fn();
vi.mock('../../../../src/features/integrations/bitrix/service/client.js', () => ({
  testWebhook: (...args: unknown[]) => mockTestWebhook(...args),
  normalizeWebhookUrl: (url: string) => (url.endsWith('/') ? url : `${url}/`),
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockPrisma = {
  externalCrmConnection: {
    findFirst: vi.fn(),
  },
  bitrixConnection: {
    findFirst: vi.fn(),
  },
};
vi.mock('../../../../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../../src/shared/middlewares/requireRole.js', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const { integrationsPingRoutes } = await import(
  '../../../../src/features/integrations/routes/integrationsPing.routes.js'
);

function buildApp(user = { id: 'usr-1', organizationId: 'org-test', role: 'ADMIN' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = user;
    next();
  });
  app.use('/api/integrations', integrationsPingRoutes);
  return app;
}

describe('POST /api/integrations/:id/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve validar com sucesso credenciais do HubSpot em tempo real', async () => {
    mockValidateConnection.mockResolvedValueOnce(true);

    const app = buildApp();
    const res = await request(app)
      .post('/api/integrations/hubspot/ping')
      .send({
        token: 'pat-na1-1234567890',
        domain: 'app.hubspot.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.valid).toBe(true);
    expect(res.body.provider).toBe('hubspot');
    expect(mockValidateConnection).toHaveBeenCalledWith({
      apiKey: 'pat-na1-1234567890',
      accessToken: 'pat-na1-1234567890',
      domain: 'app.hubspot.com',
      boardId: undefined,
    });
  });

  it('deve rejeitar credenciais inválidas com erro 400', async () => {
    mockValidateConnection.mockResolvedValueOnce(false);

    const app = buildApp();
    const res = await request(app)
      .post('/api/integrations/pipedrive/ping')
      .send({
        token: 'token-invalido',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain('PIPEDRIVE');
  });

  it('deve validar webhook do Bitrix24 em tempo real', async () => {
    mockTestWebhook.mockResolvedValueOnce({ portalDomain: 'test.bitrix24.com.br' });

    const app = buildApp();
    const res = await request(app)
      .post('/api/integrations/bitrix/ping')
      .send({
        webhookUrl: 'https://test.bitrix24.com.br/rest/1/abc12345/',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.valid).toBe(true);
    expect(res.body.portalDomain).toBe('test.bitrix24.com.br');
  });

  it('deve retornar 400 se webhook do Bitrix24 não for informado', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/integrations/bitrix/ping')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Bitrix24');
  });

  it('deve validar conexão persistida existente pelo id do banco', async () => {
    mockValidateConnection.mockResolvedValueOnce(true);
    mockPrisma.externalCrmConnection.findFirst.mockResolvedValueOnce({
      id: 'conn-uuid-123',
      provider: 'monday',
      label: 'Monday Vendas',
      config: JSON.stringify({ boardId: '98765' }),
      organizationId: 'org-test',
    });

    const app = buildApp();
    const res = await request(app)
      .post('/api/integrations/conn-uuid-123/ping')
      .send({
        token: 'token-monday-novo',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.valid).toBe(true);
    expect(res.body.message).toContain('Monday Vendas');
  });
});
