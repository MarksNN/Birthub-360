// @vitest-environment node
import { PrismaClient } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

const createNotification = vi.hoisted(() => vi.fn());
const ingestEcosystemEvent = vi.hoisted(() => vi.fn());

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock('../../../src/features/integrations/bitrix/service/settings.js', () => ({
  getBitrixSettings: vi.fn().mockResolvedValue({ webhookUrl: null }),
}));
vi.mock('../../../src/lib/security/url-validator.js', () => ({
  validateWebhookUrl: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../../src/features/notifications/notification.service.js', () => ({
  notificationService: { create: createNotification },
}));
vi.mock('../../../src/features/intelligence/services/ecosystemPlaybooks.service.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../src/features/intelligence/services/ecosystemPlaybooks.service.js')
    >();
  return { ...actual, ingestEcosystemEvent };
});

import { universalEcosystemRoutes as universalEcosystemRouter } from '../../../src/features/intelligence/routes/universalEcosystem.routes.js';
import { testUniversalConnector } from '../../../src/features/intelligence/services/universalConnectors.service.js';
import { requestContext } from '../../../src/lib/async-context.js';
import { errorHandler } from '../../../src/shared/middlewares/errorHandler.js';
import { prisma } from '../../../src/lib/prisma.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const ORG = 'org-ping';

const inTenant = <T>(fn: () => Promise<T>) => requestContext.run({ tenantId: ORG }, fn);

function appAs(role: string | null) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (role) {
      (req as unknown as { user: unknown }).user = { id: 'u-ping', organizationId: ORG, role };
      requestContext.run({ tenantId: ORG, userId: 'u-ping', role }, () => next());
      return;
    }
    next();
  });
  app.use(universalEcosystemRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  mockReset(prismaMock);
  createNotification.mockReset();
  ingestEcosystemEvent.mockReset();
  prismaMock.setting.findMany.mockResolvedValue([] as never);
  prismaMock.emailMessage.count.mockResolvedValue(0);
  prismaMock.whatsAppMessage.count.mockResolvedValue(0);
  prismaMock.publicBookingLink.count.mockResolvedValue(0);
  prismaMock.slackConnection.findFirst.mockResolvedValue({
    channelName: '#vendas',
    webhookUrl: 'https://hooks.slack.com/services/T00/B00/secret',
    updatedAt: new Date(),
  } as never);
});

describe('testUniversalConnector', () => {
  it('recusa provedor fora do catálogo', async () => {
    await expect(inTenant(() => testUniversalConnector(ORG, 'u-ping', 'nao-existe'))).rejects.toThrow(
      /Provedor desconhecido/,
    );
  });

  it('dispara o ping de wearables e reflete a ausência de id', async () => {
    createNotification.mockResolvedValueOnce({ id: 'note-1' });
    const ok = await inTenant(() => testUniversalConnector(ORG, 'u-ping', 'push_wearables'));
    expect(ok.ok).toBe(true);
    expect(ok.provider).toBe('push_wearables');
    expect(ok.message).toMatch(/Pop-up/);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG,
        userId: 'u-ping',
        kind: 'Sucesso',
        entity: 'swarm',
      }),
    );

    createNotification.mockResolvedValueOnce(null);
    const missed = await inTenant(() => testUniversalConnector(ORG, 'u-ping', 'push_wearables'));
    expect(missed.ok).toBe(false);
  });

  it('pede credenciais quando o conector ainda não está ligado e confirma o que já está', async () => {
    const bitrix = await inTenant(() => testUniversalConnector(ORG, 'u-ping', 'bitrix24'));
    expect(bitrix.ok).toBe(false);
    expect(bitrix.message).toMatch(/ainda não possui credenciais/);

    const slack = await inTenant(() => testUniversalConnector(ORG, 'u-ping', 'slack'));
    expect(slack.ok).toBe(true);
    expect(slack.message).toMatch(/Slack Workspace/);
    expect(slack.message).toMatch(/#vendas/);
    expect(slack.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('POST /ecosystem/connectors/:provider/test e /ecosystem/events/ingest', () => {
  it('nega anônimo e papel sem permissão', async () => {
    const anon = await request(appAs(null)).post('/ecosystem/connectors/slack/test').send({});
    expect(anon.status).toBe(401);

    const viewer = await request(appAs('VISUALIZADOR')).post('/ecosystem/connectors/slack/test').send({});
    expect(viewer.status).toBe(403);
  });

  it('testa o conector pelo papel comercial e devolve o erro do provedor desconhecido', async () => {
    const ok = await request(appAs('SDR')).post('/ecosystem/connectors/slack/test').send({});
    expect(ok.status).toBe(200);
    expect(ok.body.data.ok).toBe(true);
    expect(ok.body.data.provider).toBe('slack');

    const missing = await request(appAs('GESTOR')).post('/ecosystem/connectors/nao-existe/test').send({});
    expect(missing.status).toBe(500);
    expect(missing.body.error).toMatch(/Provedor desconhecido/);
  });

  it('ingere o evento válido e rejeita corpo inválido ou falha do motor', async () => {
    ingestEcosystemEvent.mockResolvedValueOnce({
      sourcePlatform: 'gmail',
      eventType: 'inbound_message',
      processedAt: '2026-11-01T00:00:00.000Z',
      durationMs: 4,
      actionsTriggered: [],
    });

    const ok = await request(appAs('CLOSER')).post('/ecosystem/events/ingest').send({
      sourcePlatform: 'gmail',
      eventType: 'inbound_message',
      subjectOrTitle: 'Proposta',
      content: 'Quero avançar.',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data.sourcePlatform).toBe('gmail');
    expect(ingestEcosystemEvent).toHaveBeenCalledWith(
      ORG,
      'u-ping',
      expect.objectContaining({ sourcePlatform: 'gmail', content: 'Quero avançar.' }),
    );

    const invalid = await request(appAs('ADMIN')).post('/ecosystem/events/ingest').send({});
    expect(invalid.status).toBe(400);

    ingestEcosystemEvent.mockRejectedValueOnce(new Error('fila indisponível'));
    const failed = await request(appAs('ADMIN')).post('/ecosystem/events/ingest').send({
      sourcePlatform: 'zoom',
      eventType: 'meeting_completed',
      subjectOrTitle: 'Ata',
      content: 'Reunião encerrada.',
    });
    expect(failed.status).toBe(500);
    expect(failed.body.error).toMatch(/fila indisponível/);
  });
});
