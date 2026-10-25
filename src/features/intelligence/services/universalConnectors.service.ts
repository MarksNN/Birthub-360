import {
  type IntegrationListStatus,
  integrationSettingsRepository,
  maskSecretValue,
} from '../../../lib/integrations/integrationSettings.repository.js';
import { prisma } from '../../../lib/prisma.js';
import { validateWebhookUrl } from '../../../lib/security/url-validator.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { getBitrixSettings } from '../../integrations/bitrix/service/settings.js';
import {
  type ConnectorDefinition,
  isIntegrationProvider,
  UNIVERSAL_CONNECTOR_DEFINITIONS,
} from './universalConnectors.catalog.js';

// O catálogo mora em universalConnectors.catalog.ts (sem ciclo com o repositório em
// src/lib/integrations); este módulo continua sendo o ponto de import público.
export {
  type ConnectorDefinition,
  type ConnectorFieldSpec,
  type ConnectorGroup,
  type ConnectorProvider,
  type IntegrationProvider,
  UNIVERSAL_CONNECTOR_DEFINITIONS,
} from './universalConnectors.catalog.js';

function maskValue(val: string | null | undefined): string {
  if (typeof val !== 'string' || !val.trim()) return '';
  return maskSecretValue(val);
}

export interface ListConnectorsOptions {
  /**
   * Só ADMIN/GESTOR (quem pode editar credenciais, ver PUT em universalEcosystem.routes.ts) recebe
   * `maskedConfig` preenchido. Os demais roles recebem só `connected`/`statusDetail` e
   * `maskedConfig: {}`.
   */
  includeMaskedConfig: boolean;
}

export async function listUniversalConnectorsStatus(
  organizationId: string,
  options: ListConnectorsOptions = { includeMaskedConfig: false },
) {
  const [
    statusByProvider,
    bitrixCfg,
    googleConn,
    slackConn,
    emailCount,
    whatsappCount,
    bookingCount,
  ] = await Promise.all([
    integrationSettingsRepository.listStatus(organizationId),
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

  const visible = (masked: Record<string, string>) => (options.includeMaskedConfig ? masked : {});

  return UNIVERSAL_CONNECTOR_DEFINITIONS.map((def: ConnectorDefinition) => {
    if (def.provider === 'bitrix24') {
      const configured = Boolean(bitrixCfg.webhookUrl);
      return {
        ...def,
        connected: configured,
        statusDetail: configured ? 'Webhook REST configurado' : 'Aguardando configuração',
        maskedConfig: visible({ webhookUrl: maskValue(bitrixCfg.webhookUrl) }),
      };
    }

    if (def.provider === 'google_workspace') {
      const connected = Boolean(googleConn);
      return {
        ...def,
        connected,
        statusDetail: connected
          ? `Conectado (${googleConn?.email})`
          : 'Conecte na aba Google Workspace',
        maskedConfig: visible({ email: googleConn?.email ?? '' }),
      };
    }

    if (def.provider === 'slack') {
      const connected = Boolean(slackConn?.webhookUrl);
      return {
        ...def,
        connected,
        statusDetail: connected
          ? `Canal ${slackConn?.channelName || '#geral'}`
          : 'Aguardando Webhook',
        maskedConfig: visible({
          webhookUrl: maskValue(slackConn?.webhookUrl),
          channelName: slackConn?.channelName ?? '',
        }),
      };
    }

    const status: IntegrationListStatus | undefined = isIntegrationProvider(def.provider)
      ? statusByProvider[def.provider]
      : undefined;
    const hasPrimaryCredential = status?.configured ?? false;

    const maskedConfig: Record<string, string> = {};
    for (const field of def.fields) {
      maskedConfig[field.key] = status?.masked[field.key] ?? status?.publicFields[field.key] ?? '';
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
      maskedConfig: visible(maskedConfig),
      updatedAt: status?.updatedAt ?? null,
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
    throw new AppError(`Provedor desconhecido: ${provider}`, 400);
  }

  // Validar URLs de webhook contra SSRF antes de salvar (valores mascarados "••••" não começam
  // com http e são preservados pelo repositório, então não passam por aqui).
  for (const [k, v] of Object.entries(config)) {
    if (k.toLowerCase().includes('url') && typeof v === 'string' && v.trim().startsWith('http')) {
      await validateWebhookUrl(v.trim());
    }
  }

  if (provider === 'slack') {
    const webhookUrl = (config.webhookUrl || '').trim();
    const channelName = (config.channelName || '#vendas-swarm').trim();
    if (!webhookUrl) {
      throw new AppError('Informe a Slack Incoming Webhook URL.', 400);
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

  // Bitrix24: a configuração real mora em BitrixConnection (src/features/integrations/bitrix),
  // lida por getBitrixSettings(). A gravação antiga em Setting `bitrix_webhook_url` (texto puro)
  // nunca era lida por ninguém — removida (Onda 52, Agente 15 + 06).
  if (provider === 'bitrix24') {
    // 422 via AppError (não `Error`): a mensagem amigável chega ao cliente em vez de virar um 500
    // retryable no errorHandler.
    throw new AppError(
      'O Bitrix24 é configurado pela integração dedicada (Configurações → Bitrix24), não pelo Hub Universal.',
      422,
    );
  }

  if (!isIntegrationProvider(provider)) {
    throw new AppError(`O provedor ${provider} utiliza autenticação OAuth dedicada.`, 422);
  }

  // Merge com o valor anterior: campo ausente, vazio ('') ou mascarado ("••••") PRESERVA o valor
  // atual — inclusive segredos. Para remover uma credencial use integrationSettingsRepository.clear.
  // Campos `secret` do catálogo são cifrados por campo (enc:v1) pelo repositório.
  await integrationSettingsRepository.save(organizationId, provider, config);

  return { provider, saved: true };
}
