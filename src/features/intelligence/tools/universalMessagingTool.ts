import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { fetchWithTimeout } from '../../../lib/http.js';
import { integrationSettingsRepository } from '../../../lib/integrations/integrationSettings.repository.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { assertSafeExternalUrl, safeFetch } from '../../../shared/security/urlGuard.js';
import { sendSlackMessage } from '../../integrations/slack/slack.service.js';
import { reconfigurationRequired } from './integrationConfigState.js';

/**
 * Ferramenta Universal de Mensageria Corporativa e Instantânea:
 * - WhatsApp (leitura de mensagens reais + sinais de intenção + proposta de envio governada)
 * - Telegram (Bot API via Setting `integration.telegram` ou env `TELEGRAM_BOT_TOKEN`)
 * - Microsoft Teams (Incoming Webhook / Workflows via Setting `integration.teams`)
 * - Slack (via `SlackConnection` — Webhook ou Bot Token)
 * - SMS / Mensagem de Texto (via Setting `integration.sms` + fila de aprovação `AIPendingAction`)
 */
export const universalMessagingTool = tool(
  async ({ action, platform, leadId, recipientOrChannel, message, limit }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return JSON.stringify(
        { success: false, erro: 'Contexto de organização (tenant) ausente.' },
        null,
        2,
      );
    }

    const take = Math.min(Math.max(limit ?? 20, 1), 50);

    try {
      if (action === 'read_messages') {
        const [whatsappMessages, whatsappSignals] = await Promise.all([
          prisma.whatsAppMessage.findMany({
            where: {
              organizationId,
              ...(leadId ? { leadId } : {}),
              ...(recipientOrChannel ? { phoneE164: { contains: recipientOrChannel } } : {}),
            },
            include: {
              lead: {
                select: {
                  id: true,
                  status: true,
                  company: { select: { tradeName: true, legalName: true } },
                },
              },
              contact: { select: { name: true, role: true } },
            },
            orderBy: { receivedAt: 'desc' },
            take,
          }),
          prisma.conversationSignal.findMany({
            where: {
              organizationId,
              channel: 'whatsapp',
              ...(leadId ? { leadId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);

        return JSON.stringify(
          {
            success: true,
            platform: platform || 'whatsapp',
            totalMensagens: whatsappMessages.length,
            mensagens: whatsappMessages.map((m) => ({
              id: m.id,
              direction: m.direction,
              phoneE164: m.phoneE164,
              body: m.body,
              receivedAt: m.receivedAt,
              leadId: m.leadId,
              empresa: m.lead?.company?.tradeName || m.lead?.company?.legalName || null,
              contato: m.contact?.name || null,
            })),
            sinaisOportunidadeWhatsApp: whatsappSignals.map((s) => ({
              id: s.id,
              leadId: s.leadId,
              intent: s.intent,
              urgency: s.urgency,
              objections: s.objections,
              budgetMentioned: s.budgetMentioned,
              nextStep: s.nextStep,
              summary: s.summary,
              confidence: s.confidence,
            })),
          },
          null,
          2,
        );
      }

      if (!message?.trim()) {
        return JSON.stringify(
          {
            success: false,
            erro: 'O parâmetro message é obrigatório para enviar/propor mensagem.',
          },
          null,
          2,
        );
      }

      // Canais internos de equipe (Slack, Microsoft Teams, Telegram de alertas internos)
      if (platform === 'slack') {
        const conn = await prisma.slackConnection.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        });
        if (!conn) {
          return JSON.stringify(
            { success: false, erro: 'Nenhuma conexão Slack configurada para esta organização.' },
            null,
            2,
          );
        }
        const res = await sendSlackMessage(organizationId, conn.id, message, recipientOrChannel);
        return JSON.stringify({ platform: 'slack', ...res }, null, 2);
      }

      if (platform === 'teams') {
        // Fallback para TEAMS_WEBHOOK_URL (credencial da PLATAFORMA) mantido de propósito —
        // decisão de produto pendente, ver handoff 15-para-24-integration-secrets-at-rest.md.
        // FALHA FECHADA: credencial do tenant ILEGÍVEL nunca cai no fallback da plataforma.
        const teams = await integrationSettingsRepository.lookup(organizationId, 'teams');
        if (teams.state === 'unreadable') return reconfigurationRequired('teams', teams.message);
        const teamsConfig = teams.state === 'configured' ? teams.values : null;
        const webhookUrl = teamsConfig?.webhookUrl || process.env.TEAMS_WEBHOOK_URL;

        if (!webhookUrl) {
          const pending = await prisma.aIPendingAction.create({
            data: {
              organizationId,
              entity: leadId ? 'Lead' : 'Organization',
              action: 'SEND_TEAMS_MESSAGE',
              agentRole: 'OPS',
              riskLevel: 'low',
              payload: { channel: recipientOrChannel || 'Geral', message, leadId: leadId ?? null },
            },
          });
          return JSON.stringify(
            {
              success: true,
              platform: 'teams',
              status: 'queued_for_approval',
              pendingActionId: pending.id,
              nota: 'Webhook do Microsoft Teams ainda não configurado em Setting (integration.teams); mensagem registrada em AIPendingAction.',
            },
            null,
            2,
          );
        }

        await assertSafeExternalUrl(webhookUrl);
        const res = await safeFetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: 'Birth Hub 360 — Alerta do Enxame',
            themeColor: '0076D7',
            title: 'Birth Hub 360 — Inteligência Comercial',
            text: message,
          }),
        });

        return JSON.stringify(
          {
            success: res.ok,
            platform: 'teams',
            statusCode: res.status,
            mensagem: res.ok
              ? 'Mensagem enviada ao canal do Microsoft Teams com sucesso.'
              : `Microsoft Teams respondeu HTTP ${res.status}`,
          },
          null,
          2,
        );
      }

      if (platform === 'telegram') {
        // Fallback para TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID (bot da PLATAFORMA) mantido de
        // propósito — decisão de produto pendente, ver handoff 15-para-24.
        // FALHA FECHADA: credencial do tenant ILEGÍVEL nunca cai no bot da plataforma.
        const tg = await integrationSettingsRepository.lookup(organizationId, 'telegram');
        if (tg.state === 'unreadable') return reconfigurationRequired('telegram', tg.message);
        const tgConfig = tg.state === 'configured' ? tg.values : null;
        const botToken = tgConfig?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        const chatId =
          recipientOrChannel || tgConfig?.defaultChatId || process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId && !leadId) {
          const res = await fetchWithTimeout(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
              }),
            },
            10_000,
            ['api.telegram.org'],
          );
          if (res.ok) {
            return JSON.stringify(
              {
                success: true,
                platform: 'telegram',
                chatId,
                mensagem: 'Mensagem enviada via Telegram Bot API com sucesso.',
              },
              null,
              2,
            );
          }
        }

        const pending = await prisma.aIPendingAction.create({
          data: {
            organizationId,
            entity: leadId ? 'Lead' : 'Organization',
            action: 'SEND_TELEGRAM_MESSAGE',
            agentRole: 'OPS',
            riskLevel: 'medium',
            payload: {
              leadId: leadId ?? null,
              chatId: chatId ?? recipientOrChannel ?? null,
              message,
            },
          },
        });

        return JSON.stringify(
          {
            success: true,
            platform: 'telegram',
            status: 'queued_for_approval',
            pendingActionId: pending.id,
            nota: 'Mensagem do Telegram registrada em AIPendingAction para aprovação/envio.',
          },
          null,
          2,
        );
      }

      // Para WhatsApp e SMS voltados a Leads/Clientes: verificar OptOutRecord e registrar AIPendingAction (governança LGPD)
      if (leadId) {
        const optOut = await prisma.optOutRecord.findFirst({
          where: {
            organizationId,
            leadId,
            scope: { in: ['Global', 'WhatsApp'] },
          },
        });
        if (optOut) {
          return JSON.stringify(
            {
              success: false,
              platform,
              erro: `Envio bloqueado por LGPD/Opt-Out ativo para o lead ${leadId} (escopo: ${optOut.scope}).`,
            },
            null,
            2,
          );
        }
      }

      const pendingAction = await prisma.aIPendingAction.create({
        data: {
          organizationId,
          entity: leadId ? 'Lead' : 'Contact',
          action: platform === 'sms' ? 'SEND_SMS_MESSAGE' : 'SEND_WHATSAPP_MESSAGE',
          agentRole: 'SDR',
          riskLevel: 'medium',
          payload: {
            leadId: leadId ?? null,
            recipient: recipientOrChannel ?? null,
            platform,
            message,
          },
        },
      });

      return JSON.stringify(
        {
          success: true,
          platform,
          status: 'pending_human_approval',
          pendingActionId: pendingAction.id,
          leadId: leadId ?? null,
          recipient: recipientOrChannel ?? null,
          mensagemProposta: message,
          nota: `Mensagem (${platform.toUpperCase()}) registrada em AIPendingAction respeitando LGPD e governança de autonomia.`,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error, platform, action }, '[UniversalMessagingTool] Erro na execução');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha na operação de mensageria.',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'universal_messaging_hub',
    description: `Lê histórico/sinais de conversas e envia ou propõe mensagens em múltiplas plataformas: WhatsApp, Telegram, Microsoft Teams, Slack e SMS (Mensagem de Texto).
    
    Ações (action):
    - 'read_messages': Lê mensagens e sinais de oportunidade do WhatsApp no CRM.
    - 'send_or_propose_message': Envia notificações para canais de equipe (Slack, Microsoft Teams, Telegram) ou registra propostas de mensagens para clientes (WhatsApp, Telegram, SMS) respeitando Opt-Out/LGPD.`,
    schema: z.object({
      action: z
        .enum(['read_messages', 'send_or_propose_message'])
        .describe('Ação de leitura ou envio/proposta de mensagem'),
      platform: z
        .enum(['whatsapp', 'telegram', 'teams', 'slack', 'sms'])
        .describe('Plataforma de mensageria alvo'),
      leadId: z.string().optional().describe('ID do lead no CRM (opcional)'),
      recipientOrChannel: z
        .string()
        .optional()
        .describe('Telefone E.164, @username, chat_id ou nome do canal (#vendas)'),
      message: z.string().optional().describe('Conteúdo da mensagem (obrigatório para envio)'),
      limit: z.number().optional().describe('Limite de mensagens na leitura (padrão: 20)'),
    }),
  },
);
