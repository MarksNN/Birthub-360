import { prisma } from '../../../lib/prisma.js';
import { validateWebhookUrl } from '../../../lib/security/url-validator.js';
import { getBitrixSettings } from '../../integrations/bitrix/service/settings.js';

export type ConnectorGroup =
  | 'crm_erp'
  | 'email'
  | 'messaging'
  | 'tasks_notes'
  | 'meetings'
  | 'notifications_wearables';

export interface ConnectorFieldSpec {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

export interface ConnectorDefinition {
  provider: string;
  name: string;
  group: ConnectorGroup;
  settingKey: string | null;
  description: string;
  fields: ConnectorFieldSpec[];
}

export const UNIVERSAL_CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  // CRMs & ERPs
  {
    provider: 'bitrix24',
    name: 'Bitrix24 CRM & Tasks',
    group: 'crm_erp',
    settingKey: 'bitrix_webhook_url',
    description: 'Sincronização bidirecional de Leads, Deals, Contatos e Tarefas no Bitrix24.',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL do Bitrix24',
        placeholder: 'https://suaempresa.bitrix24.com.br/rest/1/token/',
        secret: true,
      },
    ],
  },
  {
    provider: 'hubspot',
    name: 'HubSpot CRM',
    group: 'crm_erp',
    settingKey: 'integration.hubspot',
    description: 'Sincronização de contatos, empresas e negócios via Private App Token ou Webhook.',
    fields: [
      { key: 'apiKey', label: 'Private App Access Token', placeholder: 'pat-na1-...', secret: true },
      { key: 'webhookUrl', label: 'Webhook URL (Opcional)', placeholder: 'https://api.hubapi.com/...' },
    ],
  },
  {
    provider: 'pipedrive',
    name: 'Pipedrive CRM',
    group: 'crm_erp',
    settingKey: 'integration.pipedrive',
    description: 'Sincronização de negócios (Deals), organizações e atividades no Pipedrive.',
    fields: [
      { key: 'apiKey', label: 'API Token Pipedrive', placeholder: '40-char API token', secret: true },
      { key: 'companyDomain', label: 'Subdomínio da Empresa', placeholder: 'suaempresa' },
    ],
  },
  {
    provider: 'rdstation',
    name: 'RD Station CRM & Marketing',
    group: 'crm_erp',
    settingKey: 'integration.rdstation',
    description: 'Envio e atualização de oportunidades e conversões no RD Station.',
    fields: [
      { key: 'apiKey', label: 'Token RD Station CRM', placeholder: 'rd-token-...', secret: true },
      { key: 'webhookUrl', label: 'Webhook de Integração (Opcional)', placeholder: 'https://...' },
    ],
  },
  {
    provider: 'omie',
    name: 'Omie ERP',
    group: 'crm_erp',
    settingKey: 'integration.omie',
    description: 'Sincronização de clientes, pedidos de venda e faturamento no Omie ERP.',
    fields: [
      { key: 'appKey', label: 'App Key Omie', placeholder: '123456789' },
      { key: 'appSecret', label: 'App Secret Omie', placeholder: 'secret...', secret: true },
    ],
  },
  // E-mail
  {
    provider: 'microsoft365',
    name: 'Microsoft 365 (Outlook, Teams & OneDrive)',
    group: 'email',
    settingKey: 'integration.microsoft365',
    description: 'Leitura de e-mails no Outlook, agendamento no Microsoft Teams e documentos Office 365 via Graph API.',
    fields: [
      { key: 'accessToken', label: 'Microsoft Graph Access Token', placeholder: 'eyJ0eXAiOiJKV1Qi...', secret: true },
      { key: 'tenantId', label: 'Azure AD Tenant ID (Opcional)', placeholder: 'common ou UUID' },
      { key: 'mailboxEmail', label: 'E-mail Corporativo Principal', placeholder: 'comercial@empresa.com.br' },
    ],
  },
  {
    provider: 'google_workspace',
    name: 'Google Workspace (Gmail, Meet, Docs, Sheets & Slides)',
    group: 'email',
    settingKey: null, // usa GoogleWorkspaceConnection nativa
    description: 'Conexão OAuth nativa com Gmail, Google Calendar/Meet e Google Drive/Docs/Sheets/Slides.',
    fields: [],
  },
  {
    provider: 'unified_imap',
    name: 'Caixa Unificada IMAP / SMTP / Webhooks',
    group: 'email',
    settingKey: 'integration.imap_smtp',
    description: 'Leitura e envio universal para Zoho Mail, Locaweb, Titan, HostGator, SendGrid, Postmark e Mailgun.',
    fields: [
      { key: 'imapHost', label: 'Servidor IMAP / SMTP', placeholder: 'imap.zoho.com' },
      { key: 'emailUser', label: 'Conta de E-mail', placeholder: 'vendas@suaempresa.com.br' },
      { key: 'appPassword', label: 'Senha de Aplicativo / API Key', placeholder: '••••••••', secret: true },
    ],
  },
  // Mensageria & Chat
  {
    provider: 'whatsapp',
    name: 'WhatsApp Business (Z-API / Evolution / Meta Cloud)',
    group: 'messaging',
    settingKey: 'integration.whatsapp',
    description: 'Disparo e leitura de conversas comerciais no WhatsApp com respeito a Opt-Out LGPD.',
    fields: [
      { key: 'webhookUrl', label: 'Endpoint da Instância / Gateway', placeholder: 'https://api.z-api.io/instances/...' },
      { key: 'apiKey', label: 'Token de Segurança', placeholder: 'token...', secret: true },
    ],
  },
  {
    provider: 'telegram',
    name: 'Telegram Bot Corporativo',
    group: 'messaging',
    settingKey: 'integration.telegram',
    description: 'Envio de mensagens para leads, grupos comerciais e alertas via Telegram Bot API.',
    fields: [
      { key: 'botToken', label: 'Telegram Bot Token (@BotFather)', placeholder: '123456:ABC-DEF...', secret: true },
      { key: 'defaultChatId', label: 'Chat ID Padrão', placeholder: '-100123456789' },
    ],
  },
  {
    provider: 'teams',
    name: 'Microsoft Teams (Canais & Chat)',
    group: 'messaging',
    settingKey: 'integration.teams',
    description: 'Publicação de alertas de negócios, resumos de reuniões e mensagens em canais do Microsoft Teams.',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Incoming Webhook URL do Teams',
        placeholder: 'https://suaempresa.webhook.office.com/webhookb2/...',
        secret: true,
      },
    ],
  },
  {
    provider: 'slack',
    name: 'Slack Workspace',
    group: 'messaging',
    settingKey: null, // usa SlackConnection nativa
    description: 'Notificações de negócios quentes, war room de vendas e alertas operacionais no Slack.',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Slack Incoming Webhook URL',
        placeholder: 'https://hooks.slack.com/services/T00/B00/X00',
        secret: true,
      },
      { key: 'channelName', label: 'Canal Padrão', placeholder: '#vendas-swarm' },
    ],
  },
  {
    provider: 'sms',
    name: 'SMS / Mensagem de Texto (Twilio / Zenvia / Webhook)',
    group: 'messaging',
    settingKey: 'integration.sms',
    description: 'Envio de mensagens de texto SMS curtas para confirmação de reuniões e alertas urgentes.',
    fields: [
      { key: 'webhookUrl', label: 'Endpoint do Gateway SMS', placeholder: 'https://...' },
      { key: 'apiKey', label: 'API Key / Auth Token', placeholder: 'token...', secret: true },
      { key: 'senderId', label: 'Remetente / Número', placeholder: '+5511999999999' },
    ],
  },
  // Tarefas, Projetos & Notas
  {
    provider: 'trello',
    name: 'Trello Boards & Cards',
    group: 'tasks_notes',
    settingKey: 'integration.trello',
    description: 'Criação automática de Cards com checklists e prazos em quadros do Trello.',
    fields: [
      { key: 'apiKey', label: 'Trello API Key', placeholder: '32-char key' },
      { key: 'token', label: 'Trello OAuth Token', placeholder: '64-char token', secret: true },
      { key: 'defaultListId', label: 'ID da Lista Padrão (idList)', placeholder: '65a1b2c3d4e5f6...' },
    ],
  },
  {
    provider: 'monday',
    name: 'Monday.com Work OS',
    group: 'tasks_notes',
    settingKey: 'integration.monday',
    description: 'Criação de itens, tarefas e atualizações em Boards do Monday.com via GraphQL v2.',
    fields: [
      { key: 'apiKey', label: 'Monday API v2 Token', placeholder: 'eyJhbGciOiJIUzI1NiJ9...', secret: true },
      { key: 'boardId', label: 'Board ID Padrão', placeholder: '1234567890' },
    ],
  },
  {
    provider: 'clickup',
    name: 'ClickUp Tasks',
    group: 'tasks_notes',
    settingKey: 'integration.clickup',
    description: 'Sincronização de tarefas operacionais e follow-ups comerciais no ClickUp.',
    fields: [
      { key: 'apiKey', label: 'ClickUp Personal Token (pk_...)', placeholder: 'pk_...', secret: true },
      { key: 'listId', label: 'List ID Padrão', placeholder: '901234567' },
    ],
  },
  {
    provider: 'asana',
    name: 'Asana Projects',
    group: 'tasks_notes',
    settingKey: 'integration.asana',
    description: 'Criação de tarefas e subtarefas de onboarding e vendas no Asana.',
    fields: [
      { key: 'accessToken', label: 'Asana Personal Access Token', placeholder: '1/1200...', secret: true },
      { key: 'projectId', label: 'Project GID Padrão', placeholder: '1200123456789' },
    ],
  },
  {
    provider: 'notion',
    name: 'Notion Workspace & Wiki',
    group: 'tasks_notes',
    settingKey: 'integration.notion',
    description: 'Criação automática de páginas, atas de reunião, dossiês de leads e notas no Notion.',
    fields: [
      { key: 'apiKey', label: 'Notion Internal Integration Secret', placeholder: 'secret_...', secret: true },
      { key: 'parentPageId', label: 'ID da Página/Database Pai', placeholder: 'a1b2c3d4-...' },
    ],
  },
  // Reuniões & Agenda
  {
    provider: 'zoom',
    name: 'Zoom Meetings',
    group: 'meetings',
    settingKey: 'integration.zoom',
    description: 'Geração de salas de videoconferência e ingestão de transcrições do Zoom.',
    fields: [
      { key: 'accountId', label: 'Zoom Account ID', placeholder: 'account_id' },
      { key: 'accessToken', label: 'Server-to-Server OAuth Token', placeholder: 'eyJ...', secret: true },
    ],
  },
  {
    provider: 'calendly',
    name: 'Calendly Scheduling',
    group: 'meetings',
    settingKey: 'integration.calendly',
    description: 'Links de agendamento automático para envio pelo SDR/BDR e leitura de eventos agendados.',
    fields: [
      { key: 'schedulingUrl', label: 'Link de Agendamento Calendly', placeholder: 'https://calendly.com/suaempresa/demo' },
      { key: 'apiKey', label: 'Personal Access Token (Opcional)', placeholder: 'eyJ...', secret: true },
    ],
  },
  // Dispositivos Móveis, Relógio & Pop-up
  {
    provider: 'push_wearables',
    name: 'Push Celular (Android/iOS) & Relógio (Apple Watch / WearOS)',
    group: 'notifications_wearables',
    settingKey: 'integration.push_gateway',
    description:
      'Entrega notificações push no celular e alertas compactos de pulso (65 chars + padrão háptico) no Smartwatch.',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Push Gateway URL (FCM / OneSignal / ntfy / Capacitor Push)',
        placeholder: 'https://ntfy.sh/birthhub-alertas ou endpoint FCM',
      },
      { key: 'apiKey', label: 'Chave de Autorização (Opcional)', placeholder: 'Bearer ...', secret: true },
    ],
  },
];

function maskValue(val: unknown, isSecret?: boolean): string {
  if (typeof val !== 'string' || !val.trim()) return '';
  if (!isSecret) return val;
  if (val.length <= 8) return '••••••••';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
}

export async function listUniversalConnectorsStatus(organizationId: string) {
  const settingKeys = UNIVERSAL_CONNECTOR_DEFINITIONS.map((d) => d.settingKey).filter(
    (k): k is string => Boolean(k),
  );

  const [settingsRows, bitrixCfg, googleConn, slackConn, emailCount, whatsappCount, bookingCount] =
    await Promise.all([
      prisma.setting.findMany({
        where: { organizationId, key: { in: settingKeys } },
        select: { key: true, value: true, updatedAt: true },
      }),
      getBitrixSettings(organizationId),
      prisma.googleWorkspaceConnection.findFirst({
        where: { organizationId },
        select: { email: true, scope: true, updatedAt: true },
      }),
      prisma.slackConnection.findFirst({
        where: { organizationId, enabled: true },
        select: { channelName: true, webhookUrl: true, updatedAt: true },
      }),
      prisma.emailMessage.count({ where: { organizationId } }),
      prisma.whatsAppMessage.count({ where: { organizationId } }),
      prisma.publicBookingLink.count({ where: { organizationId, active: true } }),
    ]);

  const settingsMap = new Map(settingsRows.map((r) => [r.key, r]));

  return UNIVERSAL_CONNECTOR_DEFINITIONS.map((def) => {
    if (def.provider === 'bitrix24') {
      const configured = Boolean(bitrixCfg.webhookUrl);
      return {
        ...def,
        connected: configured,
        statusDetail: configured ? 'Webhook REST configurado' : 'Aguardando configuração',
        maskedConfig: {
          webhookUrl: maskValue(bitrixCfg.webhookUrl, true),
        },
      };
    }

    if (def.provider === 'google_workspace') {
      const connected = Boolean(googleConn);
      return {
        ...def,
        connected,
        statusDetail: connected ? `Conectado (${googleConn?.email})` : 'Conecte na aba Google Workspace',
        maskedConfig: { email: googleConn?.email ?? '' },
      };
    }

    if (def.provider === 'slack') {
      const connected = Boolean(slackConn?.webhookUrl);
      return {
        ...def,
        connected,
        statusDetail: connected ? `Canal ${slackConn?.channelName || '#geral'}` : 'Aguardando Webhook',
        maskedConfig: {
          webhookUrl: maskValue(slackConn?.webhookUrl, true),
          channelName: slackConn?.channelName ?? '',
        },
      };
    }

    const row = def.settingKey ? settingsMap.get(def.settingKey) : undefined;
    const rawVal =
      row?.value && typeof row.value === 'object' && !Array.isArray(row.value)
        ? (row.value as Record<string, unknown>)
        : {};

    const maskedConfig: Record<string, string> = {};
    let hasPrimaryCredential = false;
    for (const field of def.fields) {
      const fieldVal = rawVal[field.key];
      if (typeof fieldVal === 'string' && fieldVal.trim().length > 0) {
        hasPrimaryCredential = true;
      }
      maskedConfig[field.key] = maskValue(fieldVal, field.secret);
    }

    // Provedores com dados nativos já ativos na plataforma
    let nativeActive = false;
    let statusDetail = hasPrimaryCredential ? 'Credenciais configuradas' : 'Pronto para conectar';
    if (def.provider === 'unified_imap' && emailCount > 0) {
      nativeActive = true;
      statusDetail = `${emailCount} e-mail(s) sincronizados na Caixa Unificada`;
    } else if (def.provider === 'whatsapp' && whatsappCount > 0) {
      nativeActive = true;
      statusDetail = `${whatsappCount} mensagem(ns) registradas no histórico`;
    } else if (def.provider === 'calendly' && bookingCount > 0 && !hasPrimaryCredential) {
      statusDetail = `${bookingCount} link(s) nativos ativos (adicione Calendly se desejar)`;
    }

    return {
      ...def,
      connected: hasPrimaryCredential || nativeActive,
      statusDetail,
      maskedConfig,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function saveUniversalConnectorConfig(
  organizationId: string,
  provider: string,
  config: Record<string, string>,
) {
  const def = UNIVERSAL_CONNECTOR_DEFINITIONS.find((d) => d.provider === provider);
  if (!def) {
    throw new Error(`Provedor desconhecido: ${provider}`);
  }

  // Validar URLs de webhook contra SSRF antes de salvar
  for (const [k, v] of Object.entries(config)) {
    if (k.toLowerCase().includes('url') && typeof v === 'string' && v.trim().startsWith('http')) {
      await validateWebhookUrl(v.trim());
    }
  }

  if (provider === 'slack') {
    const webhookUrl = (config.webhookUrl || '').trim();
    const channelName = (config.channelName || '#vendas-swarm').trim();
    if (!webhookUrl) {
      throw new Error('Informe a Slack Incoming Webhook URL.');
    }
    const existing = await prisma.slackConnection.findFirst({ where: { organizationId } });
    if (existing) {
      await prisma.slackConnection.update({
        where: { id: existing.id },
        data: { webhookUrl, channelName, enabled: true },
      });
    } else {
      await prisma.slackConnection.create({
        data: { organizationId, webhookUrl, channelName, enabled: true },
      });
    }
    return { provider, saved: true };
  }

  if (provider === 'bitrix24') {
    const webhookUrl = (config.webhookUrl || '').trim();
    const existing = await prisma.setting.findFirst({
      where: { organizationId, key: 'bitrix_webhook_url' },
    });
    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: webhookUrl },
      });
    } else {
      await prisma.setting.create({
        data: { organizationId, key: 'bitrix_webhook_url', value: webhookUrl },
      });
    }
    return { provider, saved: true };
  }

  if (!def.settingKey) {
    throw new Error(`O provedor ${provider} utiliza autenticação OAuth dedicada.`);
  }

  const existing = await prisma.setting.findFirst({
    where: { organizationId, key: def.settingKey },
  });

  const previousValue =
    existing?.value && typeof existing.value === 'object' && !Array.isArray(existing.value)
      ? (existing.value as Record<string, unknown>)
      : {};

  // Preservar segredos existentes caso o usuário envie valor vazio ou mascarado ("••••")
  const mergedValue: Record<string, unknown> = { ...previousValue };
  for (const field of def.fields) {
    const incoming = config[field.key];
    if (typeof incoming === 'string') {
      const trimmed = incoming.trim();
      if (!trimmed.includes('••••')) {
        mergedValue[field.key] = trimmed;
      }
    }
  }

  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: mergedValue as any },
    });
  } else {
    await prisma.setting.create({
      data: {
        organizationId,
        key: def.settingKey,
        value: mergedValue as any,
      },
    });
  }

  return { provider, saved: true };
}
