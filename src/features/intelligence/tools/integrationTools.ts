import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Ferramenta de Slack para enviar notificações do swarm.
 */
export const slackNotificationTool = tool(
  async ({ organizationId, channel, message }) => {
    try {
      logger.info({ organizationId, channel }, '[SlackTool] Enviando notificação');

      const connection = await prisma.slackConnection.findFirst({
        where: { organizationId },
      });

      if (!connection || !connection.webhookUrl) {
        return JSON.stringify({
          success: false,
          erro: 'Conexão Slack não configurada',
        }, null, 2);
      }

      const response = await fetch(connection.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          channel: channel || connection.defaultChannel || '#general',
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      return JSON.stringify({
        success: true,
        mensagem: 'Notificação enviada para Slack',
        channel: channel || connection.defaultChannel,
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[SlackTool] Erro ao enviar notificação');
      return JSON.stringify({
        success: false,
        erro: error.message,
      }, null, 2);
    }
  },
  {
    name: 'slack_notification',
    description: `Envia notificação para canal do Slack.
    
    Parâmetros:
    - organizationId: ID da organização
    - channel: Canal do Slack (opcional, usa default se não informado)
    - message: Mensagem a enviar`,
    schema: z.object({
      organizationId: z.string().describe('ID da organização'),
      channel: z.string().optional().describe('Canal do Slack'),
      message: z.string().describe('Mensagem a enviar'),
    }),
  },
);

/**
 * Ferramenta de Pipedrive para sincronizar com CRM externo.
 */
export const pipedriveSyncTool = tool(
  async ({ organizationId, leadId, action }) => {
    try {
      logger.info({ organizationId, leadId, action }, '[PipedriveTool] Sincronizando');

      const connection = await prisma.pipedriveConnection.findFirst({
        where: { organizationId },
      });

      if (!connection) {
        return JSON.stringify({
          success: false,
          erro: 'Conexão Pipedrive não configurada',
        }, null, 2);
      }

      // Em produção, chamaria a API real do Pipedrive
      return JSON.stringify({
        success: true,
        mensagem: `Ação ${action} registrada para sincronização com Pipedrive`,
        nota: 'Sincronização real requer implementação de API Pipedrive',
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[PipedriveTool] Erro na sincronização');
      return JSON.stringify({
        success: false,
        erro: error.message,
      }, null, 2);
    }
  },
  {
    name: 'pipedrive_sync',
    description: `Sincroniza lead com Pipedrive CRM.
    
    Parâmetros:
    - organizationId: ID da organização
    - leadId: ID do lead
    - action: Ação (create, update, delete)`,
    schema: z.object({
      organizationId: z.string().describe('ID da organização'),
      leadId: z.string().describe('ID do lead'),
      action: z.enum(['create', 'update', 'delete']).describe('Ação'),
    }),
  },
);
