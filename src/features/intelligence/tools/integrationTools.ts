import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { queueLeadPushToBitrix } from '../../../lib/queue/bitrixOutbound.queue.js';
import { ExternalCrmService } from '../../integrations/shared/ExternalCrmService.js';
import { sendSlackMessage } from '../../integrations/slack/slack.service.js';

/**
 * Ferramenta de Slack segura (usa sendSlackMessage com proteção SSRF e BotToken/Webhook).
 */
export const slackNotificationTool = tool(
  async ({ organizationId: explicitOrgId, channel, message }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ organizationId, channel }, '[SlackTool] Enviando notificação');

      const connection = await prisma.slackConnection.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      if (!connection) {
        return JSON.stringify(
          {
            success: false,
            erro: 'Nenhuma conexão Slack configurada para esta organização.',
          },
          null,
          2,
        );
      }

      const result = await sendSlackMessage(organizationId, connection.id, message, channel);

      return JSON.stringify(
        {
          success: true,
          mensagem: 'Notificação enviada para Slack com sucesso',
          channel: result.channel || connection.defaultChannel,
          messageId: result.messageId,
          timestamp: result.timestamp,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[SlackTool] Erro ao enviar notificação');
      return JSON.stringify(
        {
          success: false,
          erro: error.message,
        },
        null,
        2,
      );
    }
  },
  {
    name: 'slack_notification',
    description: `Envia notificação real para canal do Slack da organização (suporta Webhook e Bot Token).
    
    Parâmetros:
    - message: Mensagem a enviar
    - channel: Canal do Slack (opcional, usa default se não informado)
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      channel: z.string().optional().describe('Canal do Slack (opcional)'),
      message: z.string().describe('Mensagem a enviar'),
    }),
  },
);

/**
 * Ferramenta Universal de Sincronização Multi-CRM (Bitrix24, HubSpot, Pipedrive, RD Station, Monday, Omie).
 * Mantém também o export `pipedriveSyncTool` por retrocompatibilidade.
 */
export const multiCrmSyncTool = tool(
  async ({ organizationId: explicitOrgId, leadId, provider, action }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info(
        { organizationId, leadId, provider, action },
        '[MultiCrmSyncTool] Sincronizando CRM',
      );

      if (action === 'list_connections') {
        const [externalConnections, bitrixConnections, omieConnections] = await Promise.all([
          ExternalCrmService.listConnections(organizationId),
          prisma.bitrixConnection.findMany({
            where: { organizationId },
            select: { id: true, label: true, lastImportedAt: true, inboundEventsEnabled: true },
          }),
          prisma.omieConnection.findMany({
            where: { organizationId },
            select: { id: true, label: true, createdAt: true },
          }),
        ]);

        return JSON.stringify(
          {
            success: true,
            conexoesAtivas: {
              bitrix24: bitrixConnections,
              crmsExternos: externalConnections,
              omieErp: omieConnections,
              provedoresSuportados: [
                'bitrix24',
                'hubspot',
                'pipedrive',
                'rdstation',
                'monday',
                'omie',
              ],
            },
          },
          null,
          2,
        );
      }

      if (!leadId) {
        return JSON.stringify(
          { success: false, erro: 'leadId é obrigatório para sincronizar um lead.' },
          null,
          2,
        );
      }

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: { company: true, pipelineStage: true },
      });

      if (!lead) {
        return JSON.stringify(
          { success: false, erro: 'Lead não encontrado no CRM interno.' },
          null,
          2,
        );
      }

      const targetProvider = (provider || 'all').toLowerCase();
      const syncSummary: Record<string, unknown> = {};

      if (
        targetProvider === 'all' ||
        targetProvider === 'bitrix24' ||
        targetProvider === 'bitrix'
      ) {
        const bitrixCount = await prisma.bitrixConnection.count({ where: { organizationId } });
        if (bitrixCount > 0) {
          await queueLeadPushToBitrix(organizationId, lead.id);
          syncSummary.bitrix24 = 'Enfileirado para sincronização outbound com Bitrix24';
        } else {
          syncSummary.bitrix24 = 'Nenhuma conexão Bitrix24 ativa';
        }
      }

      if (
        targetProvider === 'all' ||
        ['hubspot', 'pipedrive', 'rdstation', 'monday'].includes(targetProvider)
      ) {
        const pushResults = await ExternalCrmService.pushLeadToAllConnections(
          organizationId,
          lead.id,
          {
            name: lead.company?.tradeName || lead.company?.legalName || `Lead ${lead.id}`,
            amount: lead.amount ? Number(lead.amount) : undefined,
            stageLabel: lead.pipelineStage?.name || lead.status,
          },
        );
        syncSummary.externalCrms = pushResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { status: 'rejected', reason: String(r.reason) },
        );
      }

      return JSON.stringify(
        {
          success: true,
          leadId: lead.id,
          empresa: lead.company?.tradeName || lead.company?.legalName,
          action,
          provider: targetProvider,
          resultadoSincronizacao: syncSummary,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[MultiCrmSyncTool] Erro na sincronização');
      return JSON.stringify(
        {
          success: false,
          erro: error.message,
        },
        null,
        2,
      );
    }
  },
  {
    name: 'pipedrive_sync',
    description: `Sincroniza leads ou lista conexões em múltiplos CRMs corporativos (Bitrix24, HubSpot, Pipedrive, RD Station, Monday.com e Omie ERP).
    
    Parâmetros:
    - action: 'create' | 'update' | 'delete' | 'list_connections'
    - leadId: ID do lead no CRM (obrigatório para create/update)
    - provider: 'all' | 'bitrix24' | 'hubspot' | 'pipedrive' | 'rdstation' | 'monday' (opcional, padrão: 'all')
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      leadId: z.string().optional().describe('ID do lead (obrigatório para create/update)'),
      provider: z
        .enum(['all', 'bitrix24', 'hubspot', 'pipedrive', 'rdstation', 'monday'])
        .optional()
        .describe('Provedor de CRM alvo (padrão: all)'),
      action: z
        .enum(['create', 'update', 'delete', 'list_connections'])
        .describe('Ação a executar'),
    }),
  },
);

export const pipedriveSyncTool = multiCrmSyncTool;

import { fetchCnpjData } from '../../prospecting/services/enrichment/cnpjLookup.js';

export const cnpjLookupTool = tool(
  async ({ cnpj }: { cnpj: string }) => {
    try {
      const data = await fetchCnpjData(cnpj);
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
    }
  },
  {
    name: 'cnpj_lookup',
    description: 'Consulta dados cadastrais oficiais e enriquecimento de uma empresa pelo CNPJ.',
    schema: z.object({
      cnpj: z.string().describe('CNPJ da empresa com ou sem formatação.'),
    }),
  },
);
