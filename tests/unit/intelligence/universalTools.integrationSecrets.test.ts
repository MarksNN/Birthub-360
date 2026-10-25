// @vitest-environment node
/**
 * Agente 15 — Fase B: as tools do Hub Universal leem credenciais SÓ via
 * integrationSettingsRepository. Cada caso semeia a linha crua do Setting CIFRADA no mock do
 * Prisma (como ficará no banco após a Fase A/backfill) e verifica que:
 *  1. a chamada externa (fetch) recebe o valor DECIFRADO;
 *  2. o JSON devolvido ao LLM não contém o segredo (nem o ciphertext).
 */
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock('../../../src/lib/http.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/lib/http.js')>()),
  fetchWithTimeout: vi.fn(),
}));
vi.mock('../../../src/lib/security/url-validator.js', () => ({
  validateWebhookUrl: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../../src/features/integrations/bitrix/service/settings.js', () => ({
  getBitrixSettings: vi.fn().mockResolvedValue({ webhookUrl: null }),
}));
vi.mock('../../../src/shared/security/urlGuard.js', () => ({
  assertSafeExternalUrl: vi.fn().mockResolvedValue(undefined),
  safeFetch: vi.fn(),
}));
vi.mock('../../../src/features/knowledge/ingestion.service.js', () => ({
  IngestionService: class {
    ingestText = vi.fn().mockResolvedValue({ document: { id: 'doc-1' } });
  },
}));

import { executeAction } from '../../../src/features/intelligence/services/aiPendingAction.service.js';
import { universalEmailTool } from '../../../src/features/intelligence/tools/universalEmailTool.js';
import { universalMeetingsTool } from '../../../src/features/intelligence/tools/universalMeetingsTool.js';
import { universalMessagingTool } from '../../../src/features/intelligence/tools/universalMessagingTool.js';
import { universalNotificationsTool } from '../../../src/features/intelligence/tools/universalNotificationsTool.js';
import { universalOfficeDocsTool } from '../../../src/features/intelligence/tools/universalOfficeDocsTool.js';
import { universalTasksAndNotesTool } from '../../../src/features/intelligence/tools/universalTasksAndNotesTool.js';
import { requestContext } from '../../../src/lib/async-context.js';
import { encryptField } from '../../../src/lib/crypto/secretFields.js';
import { fetchWithTimeout } from '../../../src/lib/http.js';
import { prisma } from '../../../src/lib/prisma.js';
import { safeFetch } from '../../../src/shared/security/urlGuard.js';
import { encryptWithKey } from '../../../scripts/security/reencrypt-credentials.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const fetchWithTimeoutMock = vi.mocked(fetchWithTimeout);
const safeFetchMock = vi.mocked(safeFetch);
/** Valor `enc:v1:` válido no formato, mas cifrado com OUTRA chave — decifra falha (ilegível). */
const unreadable = (plain: string) => encryptWithKey(plain, randomBytes(32));
/** Hostname de uma URL (comparação exata — nunca `includes` em URL; CodeQL js/incomplete-url-substring-sanitization). */
const hostOf = (u: unknown) => {
  try {
    return new URL(String(u)).hostname;
  } catch {
    return '';
  }
};
const ORG = 'org-tools-15';
const inTenant = <T>(fn: () => Promise<T>) => requestContext.run({ tenantId: ORG }, fn);

type RawRows = Record<string, Record<string, string>>;
/** Linhas cruas por settingKey; cada valor secreto já vem CIFRADO (enc:v1:...). */
function seedSettings(rows: RawRows) {
  const toRow = (key: string) =>
    rows[key] ? ({ id: `id-${key}`, key, value: rows[key], updatedAt: new Date() } as never) : null;
  prismaMock.setting.findFirst.mockImplementation(((args: { where: { key: string } }) =>
    Promise.resolve(toRow(args.where.key))) as never);
  prismaMock.setting.findMany.mockImplementation(((args: { where: { key: { in: string[] } } }) =>
    Promise.resolve(args.where.key.in.map(toRow).filter(Boolean))) as never);
}

function okResponse(body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function expectNoSecret(output: unknown, ...secrets: string[]) {
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  for (const s of secrets) expect(text).not.toContain(s);
  expect(text).not.toContain('enc:v1:');
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mockReset(prismaMock);
  fetchWithTimeoutMock.mockReset();
  safeFetchMock.mockReset();
  fetchMock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('universalMessagingTool', () => {
  it('telegram: usa o botToken decifrado na URL da Bot API e não o devolve ao LLM', async () => {
    const BOT = '987654:AAE-telegram-secret-zzz';
    seedSettings({
      'integration.telegram': { botToken: encryptField(BOT), defaultChatId: '-100777' },
    });
    fetchWithTimeoutMock.mockResolvedValue(okResponse({ ok: true }));
    const out = await inTenant(() =>
      universalMessagingTool.invoke({
        action: 'send_or_propose_message',
        platform: 'telegram',
        message: 'alerta interno',
      }),
    );
    expect(fetchWithTimeoutMock.mock.calls[0][0]).toBe(
      `https://api.telegram.org/bot${BOT}/sendMessage`,
    );
    expect(JSON.parse(out as string)).toMatchObject({ success: true, platform: 'telegram' });
    expectNoSecret(out, BOT);
  });
});

describe('universalEmailTool', () => {
  const M365_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOi-m365-access-token';

  it('check_providers: só o booleano, nunca o token', async () => {
    seedSettings({ 'integration.microsoft365': { accessToken: encryptField(M365_TOKEN) } });
    prismaMock.googleWorkspaceConnection.findUnique.mockResolvedValue(null);
    prismaMock.emailMessage.count.mockResolvedValue(0);
    const out = await inTenant(() => universalEmailTool.invoke({ action: 'check_providers' }));
    expect(JSON.parse(out as string).provedoresConectados.microsoft365OutlookGraph.conectado).toBe(true);
    expectNoSecret(out, M365_TOKEN);
  });

  it('list_emails: Graph recebe Bearer decifrado; saída sem o token', async () => {
    seedSettings({ 'integration.microsoft365': { accessToken: encryptField(M365_TOKEN) } });
    prismaMock.emailMessage.findMany.mockResolvedValue([]);
    prismaMock.googleWorkspaceConnection.findUnique.mockResolvedValue(null);
    prismaMock.conversationSignal.findMany.mockResolvedValue([]);
    fetchWithTimeoutMock.mockResolvedValue(okResponse({ value: [] }));
    const out = await inTenant(() =>
      universalEmailTool.invoke({ action: 'list_emails', analyzeOpportunities: false }),
    );
    const init = fetchWithTimeoutMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe(`Bearer ${M365_TOKEN}`);
    expectNoSecret(out, M365_TOKEN);
  });
});

describe('universalOfficeDocsTool', () => {
  it('sync microsoft_365: status via getStatus, sem token na saída', async () => {
    const TOKEN = 'm365-office-docs-secret-token-123';
    seedSettings({ 'integration.microsoft365': { accessToken: encryptField(TOKEN) } });
    const out = await inTenant(() =>
      universalOfficeDocsTool.invoke({
        docType: 'word_or_gdoc',
        title: 'Proposta',
        syncCloud: 'microsoft_365',
      }),
    );
    expect(JSON.parse(out as string).cloudSyncStatus).toEqual({
      provider: 'microsoft_365',
      synced: true,
    });
    expectNoSecret(out, TOKEN);
  });
});

describe('universalTasksAndNotesTool', () => {
  it('list_platforms: uma query (getMany), só booleanos', async () => {
    const TRELLO_KEY = 'trello-api-key-0123456789';
    const TRELLO_TOKEN = 'trello-token-abcdefghijkl';
    const NOTION = 'secret_notion_integration_xyz';
    seedSettings({
      'integration.trello': { apiKey: encryptField(TRELLO_KEY), token: encryptField(TRELLO_TOKEN) },
      'integration.notion': { apiKey: encryptField(NOTION) },
    });
    const out = await inTenant(() =>
      universalTasksAndNotesTool.invoke({ action: 'list_platforms' }),
    );
    expect(prismaMock.setting.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.setting.findFirst).not.toHaveBeenCalled();
    const p = JSON.parse(out as string).plataformasSuportadas;
    expect(p.trello.conectado).toBe(true);
    expect(p.notion.conectado).toBe(true);
    expect(p.monday.conectado).toBe(false);
    expectNoSecret(out, TRELLO_KEY, TRELLO_TOKEN, NOTION);
  });

  it('create_task trello: API recebe key/token decifrados; saída sem eles', async () => {
    const TRELLO_KEY = 'trello-api-key-0123456789';
    const TRELLO_TOKEN = 'trello-token-abcdefghijkl';
    seedSettings({
      'integration.trello': {
        apiKey: encryptField(TRELLO_KEY),
        token: encryptField(TRELLO_TOKEN),
        defaultListId: 'list-1',
      },
    });
    prismaMock.activity.create.mockResolvedValue({ id: 'act-1' } as never);
    fetchMock.mockResolvedValue(okResponse({ id: 'card-1', shortUrl: 'https://trello.com/c/x' }));
    const out = await inTenant(() =>
      universalTasksAndNotesTool.invoke({
        action: 'create_task',
        platform: 'trello',
        title: 'Follow-up',
      }),
    );
    const calledUrls = [...fetchMock.mock.calls, ...fetchWithTimeoutMock.mock.calls].map((c) =>
      String(c[0]),
    );
    const trelloCall = calledUrls.find((u) => hostOf(u) === 'api.trello.com');
    expect(trelloCall).toBeDefined();
    expect(trelloCall).toContain(TRELLO_KEY);
    expect(trelloCall).toContain(TRELLO_TOKEN);
    expectNoSecret(out, TRELLO_KEY, TRELLO_TOKEN);
  });
});

describe('universalMeetingsTool', () => {
  it('get_booking_links: schedulingUrl (público) sim, apiKey do Calendly/Zoom não', async () => {
    const CAL_KEY = 'eyJcalendly-personal-access-token';
    const ZOOM_SECRET = 'zoom-client-secret-abcdef';
    seedSettings({
      'integration.calendly': {
        schedulingUrl: 'https://calendly.com/acme/demo',
        apiKey: encryptField(CAL_KEY),
      },
      'integration.zoom': { accountId: 'acc-1', accessToken: encryptField(ZOOM_SECRET) },
    });
    prismaMock.publicBookingLink.findMany.mockResolvedValue([]);
    prismaMock.googleWorkspaceConnection.findFirst.mockResolvedValue(null);
    const out = await inTenant(() => universalMeetingsTool.invoke({ action: 'get_booking_links' }));
    const prov = JSON.parse(out as string).provedores;
    expect(prov.calendly).toEqual({ conectado: true, schedulingUrl: 'https://calendly.com/acme/demo' });
    expect(prov.microsoftTeamsCalendar.conectado).toBe(false);
    expectNoSecret(out, CAL_KEY, ZOOM_SECRET);
  });

  it('schedule_meeting microsoft_teams: Graph recebe Bearer decifrado', async () => {
    const TOKEN = 'm365-meetings-access-token-xyz';
    seedSettings({ 'integration.microsoft365': { accessToken: encryptField(TOKEN) } });
    prismaMock.activity.create.mockResolvedValue({ id: 'act-1' } as never);
    fetchMock.mockResolvedValue(okResponse({ id: 'evt-1', onlineMeeting: { joinUrl: 'https://teams/x' } }));
    const out = await inTenant(() =>
      universalMeetingsTool.invoke({
        action: 'schedule_meeting',
        provider: 'microsoft_teams',
        title: 'Demo',
        startTime: '2026-11-01T14:00:00.000Z',
      }),
    );
    const graphCall = fetchMock.mock.calls.find((c) => hostOf(c[0]) === 'graph.microsoft.com');
    expect(graphCall).toBeDefined();
    expect((graphCall?.[1] as { headers: Record<string, string> }).headers.Authorization).toBe(
      `Bearer ${TOKEN}`,
    );
    expectNoSecret(out, TOKEN);
  });
});

describe('universalNotificationsTool', () => {
  it('push: POST no webhookUrl decifrado; deliveries não expõem a URL', async () => {
    const PUSH_URL = 'https://ntfy.sh/birthub-secret-topic-9f8e7d';
    const SMS_URL = 'https://sms-gw.example.com/hook/secret-sms-path';
    seedSettings({
      'integration.push_gateway': { webhookUrl: encryptField(PUSH_URL) },
      'integration.sms': { webhookUrl: encryptField(SMS_URL) },
    });
    const out = await inTenant(() =>
      universalNotificationsTool.invoke({
        channels: ['mobile_push', 'sms_alert'],
        title: 'Lead quente',
        message: 'Responder agora',
        kind: 'Alert',
      }),
    );
    expect(fetchMock.mock.calls[0][0]).toBe(PUSH_URL);
    const parsed = JSON.parse(out as string);
    expect(parsed.deliveries.mobile_push.remotePushGatewayDispatched).toBe(true);
    expect(parsed.deliveries.sms_alert.gatewayConfigured).toBe(true);
    expectNoSecret(out, PUSH_URL, SMS_URL, 'birthub-secret-topic');
  });
});

describe('aiPendingAction.executeAction send_sms', () => {
  it('POST no webhookUrl decifrado do integration.sms', async () => {
    const SMS_URL = 'https://sms-gw.example.com/hook/secret-sms-path';
    seedSettings({ 'integration.sms': { webhookUrl: encryptField(SMS_URL) } });
    const res = await inTenant(() =>
      executeAction({
        id: 'pa-1',
        organizationId: ORG,
        action: 'send_sms',
        entity: 'Lead',
        payload: { recipient: '+5511999990000', message: 'oi' },
      } as never),
    );
    expect(res).toEqual({ sent: true });
    expect(fetchMock.mock.calls[0][0]).toBe(SMS_URL);
  });

  it('orgId da ação divergente do tenant → falha fechada (send_failed), sem query nem fetch', async () => {
    seedSettings({ 'integration.sms': { webhookUrl: encryptField('https://x.example.com/h') } });
    const res = await inTenant(() =>
      executeAction({
        id: 'pa-2',
        organizationId: 'outra-org',
        action: 'send_sms',
        entity: 'Lead',
        payload: { recipient: '+5511999990000', message: 'oi' },
      } as never),
    );
    expect(res).toEqual({ sent: false, reason: 'send_failed' });
    expect(prismaMock.setting.findFirst).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('guard: tools (e aiPendingAction.service) não acessam prisma.setting direto', () => {
  const usesSettingDirectly = (full: string) =>
    /prisma\s*\.\s*setting\b/.test(readFileSync(full, 'utf8'));

  it('nenhum arquivo em src/features/intelligence/tools/** usa prisma.setting', () => {
    const root = join(process.cwd(), 'src/features/intelligence/tools');
    const offenders: string[] = [];
    // Dirent (withFileTypes) em vez de stat + read: sem janela TOCTOU (CodeQL js/file-system-race).
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name) && usesSettingDirectly(full))
          offenders.push(relative(process.cwd(), full));
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });

  it('aiPendingAction.service.ts não usa prisma.setting (credenciais só via repositório)', () => {
    const full = join(process.cwd(), 'src/features/intelligence/services/aiPendingAction.service.ts');
    expect(usesSettingDirectly(full)).toBe(false);
  });
});

describe('falha fechada: credencial ILEGÍVEL ≠ não configurada (sem fallback de plataforma)', () => {
  const PLATFORM_TEAMS = 'https://acme.webhook.office.com/webhookb2/PLATFORM-teams-hook';
  const PLATFORM_TG_TOKEN = '111111:PLATFORM-telegram-bot-token';

  it('teams ilegível + TEAMS_WEBHOOK_URL na env: nenhum envio, pede reconfiguração', async () => {
    vi.stubEnv('TEAMS_WEBHOOK_URL', PLATFORM_TEAMS);
    seedSettings({ 'integration.teams': { webhookUrl: unreadable('https://tenant/hook') } });
    const out = await inTenant(() =>
      universalMessagingTool.invoke({
        action: 'send_or_propose_message',
        platform: 'teams',
        message: 'oi',
      }),
    );
    expect(safeFetchMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.aIPendingAction.create).not.toHaveBeenCalled();
    expect(JSON.parse(out as string)).toMatchObject({
      success: false,
      platform: 'teams',
      status: 'reconfiguration_required',
    });
    expectNoSecret(out, PLATFORM_TEAMS);
  });

  it('teams SEM configuração: fallback TEAMS_WEBHOOK_URL continua como antes', async () => {
    vi.stubEnv('TEAMS_WEBHOOK_URL', PLATFORM_TEAMS);
    seedSettings({});
    safeFetchMock.mockResolvedValue(okResponse());
    await inTenant(() =>
      universalMessagingTool.invoke({
        action: 'send_or_propose_message',
        platform: 'teams',
        message: 'oi',
      }),
    );
    expect(safeFetchMock).toHaveBeenCalledTimes(1);
    expect(safeFetchMock.mock.calls[0][0]).toBe(PLATFORM_TEAMS);
  });

  it('telegram ilegível + bot da plataforma na env: nenhum fetch à Bot API', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', PLATFORM_TG_TOKEN);
    vi.stubEnv('TELEGRAM_CHAT_ID', '-100platform');
    seedSettings({ 'integration.telegram': { botToken: unreadable('999:tenant-bot') } });
    const out = await inTenant(() =>
      universalMessagingTool.invoke({
        action: 'send_or_propose_message',
        platform: 'telegram',
        message: 'oi',
      }),
    );
    const hosts = [...fetchMock.mock.calls, ...fetchWithTimeoutMock.mock.calls].map((c) =>
      hostOf(c[0]),
    );
    expect(hosts).not.toContain('api.telegram.org');
    expect(prismaMock.aIPendingAction.create).not.toHaveBeenCalled();
    expect(JSON.parse(out as string)).toMatchObject({
      success: false,
      status: 'reconfiguration_required',
    });
    expectNoSecret(out, PLATFORM_TG_TOKEN);
  });

  it('telegram SEM configuração: fallback do bot da plataforma continua como antes', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', PLATFORM_TG_TOKEN);
    vi.stubEnv('TELEGRAM_CHAT_ID', '-100platform');
    seedSettings({});
    fetchWithTimeoutMock.mockResolvedValue(okResponse({ ok: true }));
    await inTenant(() =>
      universalMessagingTool.invoke({
        action: 'send_or_propose_message',
        platform: 'telegram',
        message: 'oi',
      }),
    );
    expect(fetchWithTimeoutMock.mock.calls[0][0]).toBe(
      `https://api.telegram.org/bot${PLATFORM_TG_TOKEN}/sendMessage`,
    );
  });

  it('create_task clickup com apiKey ilegível: configured false (não usa masked)', async () => {
    seedSettings({ 'integration.clickup': { apiKey: unreadable('pk_clickup_tenant') } });
    prismaMock.activity.create.mockResolvedValue({ id: 'act-1' } as never);
    const out = await inTenant(() =>
      universalTasksAndNotesTool.invoke({ action: 'create_task', platform: 'clickup', title: 'X' }),
    );
    expect(JSON.parse(out as string).externalSync.clickup).toMatchObject({
      configured: false,
      status: 'reconfiguration_required',
    });
  });

  it('create_task trello com token ilegível: nenhum fetch ao Trello', async () => {
    seedSettings({
      'integration.trello': {
        apiKey: encryptField('trello-key-ok-000000'),
        token: unreadable('trello-token-tenant'),
        defaultListId: 'list-1',
      },
    });
    prismaMock.activity.create.mockResolvedValue({ id: 'act-1' } as never);
    const out = await inTenant(() =>
      universalTasksAndNotesTool.invoke({ action: 'create_task', platform: 'trello', title: 'X' }),
    );
    expect(fetchMock.mock.calls.map((c) => hostOf(c[0]))).not.toContain('api.trello.com');
    expect(JSON.parse(out as string).externalSync.trello.status).toBe('reconfiguration_required');
    expectNoSecret(out, 'trello-key-ok-000000');
  });

  it('list_platforms: provider ilegível → conectado false + ilegivel', async () => {
    seedSettings({
      'integration.trello': { apiKey: unreadable('k'), token: unreadable('t') },
      'integration.notion': { apiKey: encryptField('secret_notion_ok_123') },
    });
    const out = await inTenant(() =>
      universalTasksAndNotesTool.invoke({ action: 'list_platforms' }),
    );
    const p = JSON.parse(out as string).plataformasSuportadas;
    expect(p.trello).toMatchObject({ conectado: false, ilegivel: true });
    expect(p.notion.conectado).toBe(true);
  });

  it('notifications: push ilegível sem fetch; sms ilegível → gatewayConfigured false', async () => {
    seedSettings({
      'integration.push_gateway': { webhookUrl: unreadable('https://ntfy.sh/tenant-topic') },
      'integration.sms': { webhookUrl: unreadable('https://sms/tenant') },
    });
    const out = await inTenant(() =>
      universalNotificationsTool.invoke({
        channels: ['mobile_push', 'sms_alert'],
        title: 'Lead quente',
        message: 'Responder agora',
        kind: 'Alert',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    const d = JSON.parse(out as string).deliveries;
    expect(d.mobile_push.remotePushGatewayDispatched).toBe(false);
    expect(d.mobile_push.remotePushGateway.status).toBe('reconfiguration_required');
    expect(d.sms_alert.gatewayConfigured).toBe(false);
    expect(d.sms_alert.gatewayUnreadable).toBe(true);
  });

  it('list_emails: M365 ilegível → sem chamada ao Graph, com aviso', async () => {
    seedSettings({ 'integration.microsoft365': { accessToken: unreadable('m365-tok') } });
    prismaMock.emailMessage.findMany.mockResolvedValue([]);
    prismaMock.googleWorkspaceConnection.findUnique.mockResolvedValue(null);
    prismaMock.conversationSignal.findMany.mockResolvedValue([]);
    const out = await inTenant(() =>
      universalEmailTool.invoke({ action: 'list_emails', analyzeOpportunities: false }),
    );
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
    expect(JSON.parse(out as string).integrationWarnings[0].status).toBe('reconfiguration_required');
  });

  it('send_sms (aiPendingAction): ilegível → credentials_unreadable, sem fetch', async () => {
    seedSettings({ 'integration.sms': { webhookUrl: unreadable('https://sms/tenant') } });
    const res = await inTenant(() =>
      executeAction({
        id: 'pa-3',
        organizationId: ORG,
        action: 'send_sms',
        entity: 'Lead',
        payload: { recipient: '+5511999990000', message: 'oi' },
      } as never),
    );
    expect(res).toEqual({ sent: false, reason: 'credentials_unreadable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
