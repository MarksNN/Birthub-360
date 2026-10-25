// @vitest-environment node
/**
 * Agente 15 — Hub Universal (service + rota GET): maskedConfig só para ADMIN/GESTOR, nunca com
 * segredo em claro; gravação do Bitrix pelo Hub removida (era escrita morta em texto puro).
 */
import { PrismaClient } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock('../../../src/features/integrations/bitrix/service/settings.js', () => ({
  getBitrixSettings: vi.fn().mockResolvedValue({ webhookUrl: null }),
}));
vi.mock('../../../src/lib/security/url-validator.js', () => ({
  validateWebhookUrl: vi.fn().mockResolvedValue(true),
}));

import { universalEcosystemRoutes as universalEcosystemRouter } from '../../../src/features/intelligence/routes/universalEcosystem.routes.js';
import {
  listUniversalConnectorsStatus,
  saveUniversalConnectorConfig,
} from '../../../src/features/intelligence/services/universalConnectors.service.js';
import { requestContext } from '../../../src/lib/async-context.js';
import { encryptField } from '../../../src/lib/crypto/secretFields.js';
import { prisma } from '../../../src/lib/prisma.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const ORG = 'org-hub-15';
const BOT = '555000:AAF-hub-telegram-secret';
const inTenant = <T>(fn: () => Promise<T>) => requestContext.run({ tenantId: ORG }, fn);

beforeEach(() => {
  mockReset(prismaMock);
  prismaMock.setting.findMany.mockResolvedValue([
    {
      id: 's1',
      key: 'integration.telegram',
      value: { botToken: encryptField(BOT), defaultChatId: '-100123' },
      updatedAt: new Date(),
    } as never,
  ]);
  prismaMock.emailMessage.count.mockResolvedValue(0);
  prismaMock.whatsAppMessage.count.mockResolvedValue(0);
  prismaMock.publicBookingLink.count.mockResolvedValue(0);
});

function telegramOf(list: Array<{ provider: string }>) {
  return list.find((c) => c.provider === 'telegram') as unknown as {
    connected: boolean;
    maskedConfig: Record<string, string>;
  };
}

describe('listUniversalConnectorsStatus', () => {
  it('sem includeMaskedConfig: maskedConfig vazio, connected correto', async () => {
    const list = await inTenant(() => listUniversalConnectorsStatus(ORG));
    const tg = telegramOf(list);
    expect(tg.connected).toBe(true);
    expect(tg.maskedConfig).toEqual({});
    expect(JSON.stringify(list)).not.toContain(BOT);
  });

  it('com includeMaskedConfig: só máscara + campos públicos, nunca o segredo nem o ciphertext', async () => {
    const list = await inTenant(() =>
      listUniversalConnectorsStatus(ORG, { includeMaskedConfig: true }),
    );
    const tg = telegramOf(list);
    expect(tg.maskedConfig).toEqual({ botToken: `••••${BOT.slice(-4)}`, defaultChatId: '-100123' });
    const text = JSON.stringify(list);
    expect(text).not.toContain(BOT);
    expect(text).not.toContain('enc:v1:');
  });
});

describe('saveUniversalConnectorConfig', () => {
  it('bitrix24 pelo Hub lança erro orientando a integração dedicada e não grava Setting', async () => {
    await expect(
      inTenant(() =>
        saveUniversalConnectorConfig(ORG, 'bitrix24', {
          webhookUrl: 'https://acme.bitrix24.com.br/rest/1/abc/',
        }),
      ),
    ).rejects.toThrow(/Bitrix24 é configurado pela integração dedicada/);
    expect(prismaMock.setting.upsert).not.toHaveBeenCalled();
    expect(prismaMock.setting.create).not.toHaveBeenCalled();
    expect(prismaMock.setting.update).not.toHaveBeenCalled();
  });

  it('telegram: grava cifrado via repositório', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(null);
    await inTenant(() => saveUniversalConnectorConfig(ORG, 'telegram', { botToken: BOT }));
    const data = prismaMock.setting.create.mock.calls[0][0].data as { value: Record<string, string> };
    expect(JSON.stringify(data)).not.toContain(BOT);
    expect(data.value.botToken.startsWith('enc:v1:')).toBe(true);
  });
});

describe('GET /ecosystem/connectors — RBAC do maskedConfig', () => {
  function appAs(role: string) {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { user: unknown }).user = { id: 'u1', organizationId: ORG, role };
      requestContext.run({ tenantId: ORG, userId: 'u1', role }, () => next());
    });
    app.use(universalEcosystemRouter);
    return app;
  }

  it.each(['ADMIN', 'GESTOR'])('%s recebe maskedConfig mascarado', async (role) => {
    const res = await request(appAs(role)).get('/ecosystem/connectors');
    expect(res.status).toBe(200);
    expect(telegramOf(res.body.data).maskedConfig.botToken).toBe(`••••${BOT.slice(-4)}`);
    expect(res.text).not.toContain(BOT);
  });

  it.each(['CLOSER', 'SDR'])('%s recebe maskedConfig vazio', async (role) => {
    const res = await request(appAs(role)).get('/ecosystem/connectors');
    expect(res.status).toBe(200);
    expect(telegramOf(res.body.data).maskedConfig).toEqual({});
    for (const c of res.body.data as Array<{ maskedConfig: Record<string, string> }>) {
      expect(c.maskedConfig).toEqual({});
    }
    expect(res.text).not.toContain(`••••${BOT.slice(-4)}`);
    expect(res.text).not.toContain(BOT);
  });
});
