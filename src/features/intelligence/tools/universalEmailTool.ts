import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { fetchWithTimeout } from '../../../lib/http.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { classifyEmailReplyIntent } from '../../cadence/infra/emailIntentClassifier.js';

interface NormalizedInboxMessage {
  id: string;
  provider: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  snippetOrBody: string;
  receivedAt: string;
  leadId: string | null;
  leadCompany: string | null;
}

/**
 * Ferramenta Universal Multi-Provedor de Leitura de E-mails e Detecção de Oportunidades.
 *
 * NÃO fica presa ao Gmail:
 * 1. Lê a caixa unificada `EmailMessage` (alimentada por qualquer provedor SMTP/IMAP/Webhook:
 *    Outlook/Microsoft 365, Zoho Mail, SendGrid, Postmark, Mailgun, servidor corporativo próprio).
 * 2. Se a organização tiver `GoogleWorkspaceConnection` ativa, consulta também o Gmail API.
 * 3. Se a organização tiver configuração Microsoft 365 / Outlook Graph API em `Setting`
 *    (`integration.microsoft365`), consulta também o Microsoft Graph (`/me/messages`).
 * 4. Classifica intenção de compra, urgência, objeções e oportunidades comerciais reais usando
 *    `classifyEmailReplyIntent` + `ConversationSignal`.
 */
export const universalEmailTool = tool(
  async ({ action, leadId, query, maxResults, analyzeOpportunities }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return JSON.stringify(
        { success: false, erro: 'Contexto de organização (tenant) ausente.' },
        null,
        2,
      );
    }

    const limit = Math.min(Math.max(maxResults ?? 15, 1), 50);

    try {
      if (action === 'check_providers') {
        const [googleConn, m365Setting, storedEmailCount] = await Promise.all([
          prisma.googleWorkspaceConnection.findUnique({
            where: { organizationId },
            select: { email: true, scope: true, expiresAt: true },
          }),
          prisma.setting.findFirst({
            where: { organizationId, key: 'integration.microsoft365' },
            select: { value: true },
          }),
          prisma.emailMessage.count({ where: { organizationId } }),
        ]);

        return JSON.stringify(
          {
            success: true,
            provedoresConectados: {
              unifiedImapSmtpWebhookInbox: {
                ativo: true,
                mensagensArmazenadas: storedEmailCount,
                descricao:
                  'Caixa unificada multi-provedor (Outlook, M365, Zoho, IMAP/SMTP corporativo, SendGrid/Postmark/Mailgun webhooks)',
              },
              googleWorkspaceGmail: {
                conectado: Boolean(googleConn),
                email: googleConn?.email ?? null,
                leituraHabilitada: Boolean(googleConn?.scope?.includes('gmail.readonly')),
              },
              microsoft365OutlookGraph: {
                conectado: Boolean(m365Setting?.value),
              },
            },
          },
          null,
          2,
        );
      }

      // 1. Buscar e-mails da caixa unificada (qualquer provedor de e-mail)
      const dbEmails = await prisma.emailMessage.findMany({
        where: {
          organizationId,
          ...(leadId ? { leadId } : {}),
          ...(query
            ? {
                OR: [
                  { subject: { contains: query, mode: 'insensitive' } },
                  { body: { contains: query, mode: 'insensitive' } },
                  { fromEmail: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          lead: {
            select: {
              id: true,
              status: true,
              amount: true,
              company: { select: { tradeName: true, legalName: true } },
            },
          },
        },
        orderBy: { receivedAt: 'desc' },
        take: limit,
      });

      const unifiedMessages: NormalizedInboxMessage[] = dbEmails.map((m) => ({
        id: m.id,
        provider: 'unified_inbox (IMAP/SMTP/Webhook)',
        fromEmail: m.fromEmail,
        toEmail: m.toEmail,
        subject: m.subject || '(Sem assunto)',
        snippetOrBody: (m.body || '').slice(0, 1200),
        receivedAt: m.receivedAt.toISOString(),
        leadId: m.leadId,
        leadCompany: m.lead?.company?.tradeName || m.lead?.company?.legalName || null,
      }));

      // 2. Se houver GoogleWorkspaceConnection válida, buscar mensagens recentes do Gmail API (best-effort)
      const googleConn = await prisma.googleWorkspaceConnection.findUnique({
        where: { organizationId },
      });
      if (
        googleConn &&
        googleConn.scope.includes('gmail.readonly') &&
        googleConn.expiresAt.getTime() > Date.now()
      ) {
        try {
          const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
          const listRes = await fetchWithTimeout(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(limit, 10)}${qParam}`,
            { headers: { Authorization: `Bearer ${googleConn.accessToken}` } },
            10_000,
            ['gmail.googleapis.com'],
          );
          if (listRes.ok) {
            const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
            for (const msgRef of (listData.messages || []).slice(0, 5)) {
              const detailRes = await fetchWithTimeout(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
                { headers: { Authorization: `Bearer ${googleConn.accessToken}` } },
                8_000,
                ['gmail.googleapis.com'],
              );
              if (detailRes.ok) {
                const detail = (await detailRes.json()) as {
                  id: string;
                  snippet?: string;
                  payload?: { headers?: Array<{ name?: string; value?: string }> };
                };
                const headers = detail.payload?.headers || [];
                const getH = (name: string) =>
                  headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
                unifiedMessages.push({
                  id: `gmail:${detail.id}`,
                  provider: 'google_workspace_gmail',
                  fromEmail: getH('From'),
                  toEmail: getH('To') || googleConn.email,
                  subject: getH('Subject') || '(Sem assunto)',
                  snippetOrBody: detail.snippet || '',
                  receivedAt: getH('Date') || new Date().toISOString(),
                  leadId: null,
                  leadCompany: null,
                });
              }
            }
          }
        } catch (gmailErr: any) {
          logger.warn(
            { err: gmailErr, organizationId },
            '[UniversalEmailTool] Leitura Gmail best-effort falhou',
          );
        }
      }

      // 3. Se houver configuração Microsoft 365 / Outlook Graph API em Setting, consultar /me/messages
      const m365Setting = await prisma.setting.findFirst({
        where: { organizationId, key: 'integration.microsoft365' },
      });
      const m365Val = m365Setting?.value as { accessToken?: string; email?: string } | null;
      if (m365Val?.accessToken) {
        try {
          const top = Math.min(limit, 10);
          const graphRes = await fetchWithTimeout(
            `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime`,
            { headers: { Authorization: `Bearer ${m365Val.accessToken}` } },
            10_000,
            ['graph.microsoft.com'],
          );
          if (graphRes.ok) {
            const graphData = (await graphRes.json()) as {
              value?: Array<{
                id: string;
                subject?: string;
                bodyPreview?: string;
                receivedDateTime?: string;
                from?: { emailAddress?: { address?: string } };
              }>;
            };
            for (const item of graphData.value || []) {
              unifiedMessages.push({
                id: `outlook:${item.id}`,
                provider: 'microsoft_365_outlook',
                fromEmail: item.from?.emailAddress?.address || 'desconhecido',
                toEmail: m365Val.email || '',
                subject: item.subject || '(Sem assunto)',
                snippetOrBody: item.bodyPreview || '',
                receivedAt: item.receivedDateTime || new Date().toISOString(),
                leadId: null,
                leadCompany: null,
              });
            }
          }
        } catch (outlookErr: any) {
          logger.warn(
            { err: outlookErr, organizationId },
            '[UniversalEmailTool] Leitura Outlook Graph best-effort falhou',
          );
        }
      }

      // 4. Buscar sinais de oportunidade já extraídos + classificar em tempo real se solicitado
      const existingSignals = await prisma.conversationSignal.findMany({
        where: {
          organizationId,
          channel: 'email',
          ...(leadId ? { leadId } : {}),
        },
        include: {
          lead: {
            select: {
              id: true,
              status: true,
              amount: true,
              company: { select: { tradeName: true, legalName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const liveOpportunities: Array<{
        messageId: string;
        fromEmail: string;
        subject: string;
        leadId: string | null;
        leadCompany: string | null;
        intent: string;
        urgency: string;
        summary: string;
        nextStep: string | null;
        confidence: number;
      }> = [];

      if (analyzeOpportunities !== false && unifiedMessages.length > 0) {
        for (const msg of unifiedMessages.slice(0, 8)) {
          if (!msg.snippetOrBody.trim()) continue;
          try {
            const classification = await classifyEmailReplyIntent({
              organizationId,
              subject: msg.subject,
              body: msg.snippetOrBody,
            });
            if (classification) {
              liveOpportunities.push({
                messageId: msg.id,
                fromEmail: msg.fromEmail,
                subject: msg.subject,
                leadId: msg.leadId,
                leadCompany: msg.leadCompany,
                intent: classification.intent,
                urgency: classification.urgency,
                summary: classification.summary,
                nextStep: classification.nextStep,
                confidence: classification.confidence,
              });
            }
          } catch {
            //Continua para os próximos e-mails
          }
        }
      }

      const hotOpportunities = liveOpportunities.filter(
        (o) =>
          o.intent === 'alta_intencao_compra' ||
          o.intent === 'duvida_tecnica' ||
          o.urgency === 'alta',
      );

      return JSON.stringify(
        {
          success: true,
          totalEmailsLidos: unifiedMessages.length,
          oportunidadesQuentesDetectadas: hotOpportunities.length,
          oportunidadesClassificadasAoVivo: liveOpportunities,
          sinaisHistoricosNoBanco: existingSignals.map((s) => ({
            signalId: s.id,
            leadId: s.leadId,
            empresa: s.lead?.company?.tradeName || s.lead?.company?.legalName || null,
            intent: s.intent,
            urgency: s.urgency,
            objections: s.objections,
            budgetMentioned: s.budgetMentioned,
            nextStep: s.nextStep,
            summary: s.summary,
            confidence: s.confidence,
            createdAt: s.createdAt,
          })),
          emailsRecentes: unifiedMessages,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[UniversalEmailTool] Erro ao ler/analisar e-mails');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha ao ler e analisar e-mails.',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'universal_email_intelligence',
    description: `Lê e analisa e-mails corporativos em múltiplos provedores (Caixa Unificada IMAP/SMTP/Webhooks, Microsoft 365/Outlook Graph, Google Workspace/Gmail) e identifica oportunidades comerciais, intenção de compra, urgência e objeções de clientes.
    
    Ações disponíveis (action):
    - 'scan_opportunities': Lê os e-mails recebidos em todos os provedores conectados e classifica oportunidades de negócio com clientes.
    - 'list_emails': Lista os e-mails recentes (filtrando opcionalmente por leadId ou termo de busca query).
    - 'check_providers': Verifica quais provedores de e-mail estão ativos na organização.`,
    schema: z.object({
      action: z
        .enum(['scan_opportunities', 'list_emails', 'check_providers'])
        .describe('Ação a executar nos provedores de e-mail'),
      leadId: z.string().optional().describe('Filtrar por ID do lead (opcional)'),
      query: z
        .string()
        .optional()
        .describe('Termo para filtrar assunto/corpo/remetente (opcional)'),
      maxResults: z.number().optional().describe('Quantidade máxima de e-mails (padrão: 15)'),
      analyzeOpportunities: z
        .boolean()
        .optional()
        .describe('Se true (padrão), classifica intenção comercial e urgência com IA'),
    }),
  },
);
