// @vitest-environment node
/**
 * Agente 15 — credenciais do Hub Universal em repouso (Setting.value Json, key integration.*).
 * Trava: cifra por campo enc:v1 nos campos `secret` do catálogo, passthrough do legado, máscara,
 * merge que preserva ''/'••••', clear como única remoção, e guard de tenant sem bypassRls.
 */
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

vi.mock('../../../../src/lib/prisma.js', () => ({ prisma: mockDeep<PrismaClient>() }));

import { requestContext } from '../../../../src/lib/async-context.js';
import { decryptField, encryptField } from '../../../../src/lib/crypto/secretFields.js';
import {
  IntegrationSettingsTenantError,
  integrationSettingsRepository as repo,
  maskSecretValue,
  UnknownIntegrationProviderError,
} from '../../../../src/lib/integrations/integrationSettings.repository.js';
import { prisma } from '../../../../src/lib/prisma.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const ORG = 'org-15';
const inTenant = <T>(fn: () => Promise<T>, tenantId = ORG) => requestContext.run({ tenantId }, fn);

const BOT_TOKEN = '123456789:AAH-super-secret-telegram-token';
const updatedAt = new Date('2026-10-25T12:00:00Z');

function row(key: string, value: Record<string, unknown>, id = 'set-1') {
  return { id, key, value, updatedAt } as never;
}

beforeEach(() => {
  mockReset(prismaMock);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('save', () => {
  it('grava os campos secret cifrados (linha crua não contém o segredo) e públicos em claro', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(null);
    const res = await inTenant(() =>
      repo.save(ORG, 'telegram', { botToken: BOT_TOKEN, defaultChatId: '-100200300' }),
    );
    expect(res.updatedFields.sort()).toEqual(['botToken', 'defaultChatId']);
    const data = prismaMock.setting.create.mock.calls[0][0].data as {
      organizationId: string;
      key: string;
      value: Record<string, string>;
    };
    expect(data.organizationId).toBe(ORG);
    expect(data.key).toBe('integration.telegram');
    expect(JSON.stringify(data)).not.toContain(BOT_TOKEN);
    expect(data.value.botToken.startsWith('enc:v1:')).toBe(true);
    expect(decryptField(data.value.botToken)).toBe(BOT_TOKEN);
  });

  it("'' e '••••…' preservam o valor atual; legado em texto puro é recifrado na gravação", async () => {
    prismaMock.setting.findFirst.mockResolvedValue(
      row('integration.teams', { webhookUrl: 'https://legacy.webhook.office.com/abc/def' }),
    );
    await inTenant(() => repo.save(ORG, 'teams', { webhookUrl: '' }));
    await inTenant(() => repo.save(ORG, 'teams', { webhookUrl: '••••/def' }));
    for (const call of prismaMock.setting.update.mock.calls) {
      const value = (call[0].data as { value: Record<string, string> }).value;
      expect(value.webhookUrl.startsWith('enc:v1:')).toBe(true);
      expect(decryptField(value.webhookUrl)).toBe('https://legacy.webhook.office.com/abc/def');
    }
    expect(prismaMock.setting.update).toHaveBeenCalledTimes(2);
  });

  it('mantém o ciphertext existente quando preservado e ignora chaves fora do catálogo', async () => {
    const enc = encryptField(BOT_TOKEN);
    prismaMock.setting.findFirst.mockResolvedValue(row('integration.telegram', { botToken: enc }));
    const res = await inTenant(() =>
      repo.save(ORG, 'telegram', { botToken: '••••oken', evil: 'x' } as Record<string, string>),
    );
    expect(res.updatedFields).toEqual([]);
    const value = (prismaMock.setting.update.mock.calls[0][0].data as { value: Record<string, string> })
      .value;
    expect(value.botToken).toBe(enc);
    expect(value).not.toHaveProperty('evil');
  });
});

describe('get / getMany', () => {
  it('round-trip: devolve o valor decifrado', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(
      row('integration.telegram', { botToken: encryptField(BOT_TOKEN), defaultChatId: '42' }),
    );
    await expect(inTenant(() => repo.get(ORG, 'telegram'))).resolves.toEqual({
      botToken: BOT_TOKEN,
      defaultChatId: '42',
    });
    expect(prismaMock.setting.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORG, userId: null, key: 'integration.telegram' },
      }),
    );
  });

  it('passthrough do legado em texto puro', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(row('integration.telegram', { botToken: BOT_TOKEN }));
    await expect(inTenant(() => repo.get(ORG, 'telegram'))).resolves.toEqual({ botToken: BOT_TOKEN });
  });

  it('fail-closed: ciphertext adulterado → null (não configurado)', async () => {
    const enc = encryptField(BOT_TOKEN);
    const tampered = `${enc.slice(0, -4)}AAAA`;
    prismaMock.setting.findFirst.mockResolvedValue(row('integration.telegram', { botToken: tampered }));
    await expect(inTenant(() => repo.get(ORG, 'telegram'))).resolves.toBeNull();
    const status = await inTenant(() => repo.getStatus(ORG, 'telegram'));
    expect(status.configured).toBe(false);
    expect(status.masked.botToken).toContain('ilegível');
  });

  it('getMany faz UMA query e só devolve os configurados', async () => {
    prismaMock.setting.findMany.mockResolvedValue([
      row('integration.trello', { apiKey: encryptField('trello-key-123456'), token: encryptField('tok-abcdefgh1234') }, 'a'),
      row('integration.notion', { apiKey: encryptField('secret_notion_abcdef') }, 'b'),
    ]);
    const res = await inTenant(() => repo.getMany(ORG, ['trello', 'notion', 'asana'] as const));
    expect(prismaMock.setting.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.setting.findFirst).not.toHaveBeenCalled();
    expect(res.trello?.apiKey).toBe('trello-key-123456');
    expect(res.notion?.apiKey).toBe('secret_notion_abcdef');
    expect(res.asana).toBeUndefined();
  });
});

describe('getStatus / listStatus', () => {
  it('máscara: nunca devolve segredo; campos públicos em claro', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(
      row('integration.telegram', { botToken: encryptField(BOT_TOKEN), defaultChatId: '-100200300' }),
    );
    const status = await inTenant(() => repo.getStatus(ORG, 'telegram'));
    expect(status.configured).toBe(true);
    expect(status.masked).toEqual({ botToken: `••••${BOT_TOKEN.slice(-4)}` });
    expect(JSON.stringify(status)).not.toContain(BOT_TOKEN);
  });

  it('maskSecretValue esconde valores curtos por inteiro', () => {
    expect(maskSecretValue('abc')).toBe('••••••••');
    expect(maskSecretValue('abcdefghijkl')).toBe('••••ijkl');
  });

  it('listStatus cobre todos os providers integration.* numa única query', async () => {
    prismaMock.setting.findMany.mockResolvedValue([
      row('integration.sms', { webhookUrl: encryptField('https://sms.example.com/hook/secret') }),
    ]);
    const all = await inTenant(() => repo.listStatus(ORG));
    expect(prismaMock.setting.findMany).toHaveBeenCalledTimes(1);
    expect(all.sms.configured).toBe(true);
    expect(all.sms.updatedAt).toEqual(updatedAt);
    expect(all.telegram.configured).toBe(false);
    expect(all.telegram.updatedAt).toBeNull();
    expect(JSON.stringify(all)).not.toContain('hook/secret');
  });
});

describe('clear', () => {
  it('sem fields apaga a linha', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(row('integration.telegram', { botToken: 'x' }));
    await inTenant(() => repo.clear(ORG, 'telegram'));
    expect(prismaMock.setting.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: ORG, userId: null, key: 'integration.telegram' },
    });
  });

  it('com fields remove só as chaves; apaga a linha se ficar vazia', async () => {
    prismaMock.setting.findFirst.mockResolvedValue(
      row('integration.telegram', { botToken: 'x', defaultChatId: '1' }),
    );
    await inTenant(() => repo.clear(ORG, 'telegram', ['botToken']));
    expect(prismaMock.setting.update).toHaveBeenCalledWith({
      where: { id: 'set-1' },
      data: { value: { defaultChatId: '1' } },
    });
    prismaMock.setting.findFirst.mockResolvedValue(row('integration.telegram', { defaultChatId: '1' }));
    await inTenant(() => repo.clear(ORG, 'telegram', ['defaultChatId']));
    expect(prismaMock.setting.deleteMany).toHaveBeenCalledTimes(1);
  });
});

describe('tenant guard (sem bypassRls)', () => {
  it('orgId divergente do requestContext lança antes de qualquer query', async () => {
    await expect(inTenant(() => repo.get('outra-org', 'telegram'))).rejects.toBeInstanceOf(
      IntegrationSettingsTenantError,
    );
    await expect(
      inTenant(() => repo.save('outra-org', 'telegram', { botToken: BOT_TOKEN })),
    ).rejects.toBeInstanceOf(IntegrationSettingsTenantError);
    expect(prismaMock.setting.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.setting.create).not.toHaveBeenCalled();
  });

  it('sem requestContext lança', async () => {
    await expect(repo.getStatus(ORG, 'telegram')).rejects.toBeInstanceOf(
      IntegrationSettingsTenantError,
    );
    expect(prismaMock.setting.findFirst).not.toHaveBeenCalled();
  });

  it('provider desconhecido / sem Setting (OAuth) lança', async () => {
    await expect(
      inTenant(() => repo.get(ORG, 'google_workspace' as never)),
    ).rejects.toBeInstanceOf(UnknownIntegrationProviderError);
  });
});
