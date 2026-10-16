import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../../../lib/prisma.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { brazilMonthKey, brazilMonthRange } from '../../../shared/time/brazilCalendar.js';
import type {
  AgentCenterTrace,
  SellerWorkspaceOverview,
  NextBestAction,
} from '../agents/triad/triad.types.js';

const router = Router();

/**
 * GET /api/commercial-agent/workspace
 * Retorna visão executiva do vendedor com base em dados reais do CRM.
 */
router.get('/workspace', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const now = new Date();
    const currentPeriod = brazilMonthKey(now);
    const { start: monthStart, end: monthEnd } = brazilMonthRange(currentPeriod);

    const [leads, goalRecord] = await Promise.all([
      prisma.lead.findMany({
        where: { organizationId, deletedAt: null },
        include: {
          company: true,
          contact: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.commercialGoal.findUnique({
        where: {
          organizationId_period_metric: {
            organizationId,
            period: currentPeriod,
            metric: 'NEW_MRR',
          },
        },
      }),
    ]);

    const wonLeads = leads.filter((l) => {
      if (l.status !== 'Negocios_Ganhos') return false;
      const closedInstant = l.closedAt ?? l.updatedAt;
      return closedInstant >= monthStart && closedInstant < monthEnd;
    });

    const openLeads = leads.filter(
      (l) =>
        l.status !== 'Negocios_Ganhos' &&
        l.status !== 'Negocios_Perdidos' &&
        l.status !== 'Lead_Desqualificado',
    );

    const targetConfigured = goalRecord !== null;
    const monthTarget = goalRecord ? Number(goalRecord.amount ?? 0) : 0;
    const closedWon = wonLeads.reduce((sum, l) => sum + Number(l.amount ?? 0), 0);
    const gap = targetConfigured ? Math.max(0, monthTarget - closedWon) : 0;
    const influencablePipeline = openLeads.reduce((sum, l) => sum + Number(l.amount ?? 0), 0);
    const commitForecast = Math.round(
      openLeads.reduce(
        (sum, l) =>
          sum + Number(l.amount ?? 0) * (Math.min(100, Math.max(0, l.probability ?? 0)) / 100),
        0,
      ),
    );
    const aiForecast = Math.round(
      openLeads.reduce(
        (sum, l) =>
          sum +
          Number(l.amount ?? 0) * (Math.min(100, Math.max(0, l.score ?? l.probability ?? 0)) / 100),
        0,
      ),
    );
    const targetCompletionPercent =
      monthTarget > 0 ? Math.round((closedWon / monthTarget) * 100) : 0;

    // Next Best Action gerada a partir do lead elegível mais recente (respeitando adiamentos)
    const eligibleOpenLeads = openLeads.filter(
      (l) => !l.nextAction || l.nextAction.getTime() <= now.getTime(),
    );
    const priorityLead = eligibleOpenLeads[0] || openLeads[0] || leads[0];

    const nextBestAction: NextBestAction = priorityLead
      ? {
          actionId: `nba-${priorityLead.id}`,
          title: `📞 Contatar ${priorityLead.contact?.name || priorityLead.company?.tradeName || priorityLead.company?.legalName || 'Lead Prioritário'}`,
          type: 'CALL',
          accountName:
            priorityLead.company?.tradeName ||
            priorityLead.company?.legalName ||
            priorityLead.contact?.name ||
            'Conta Comercial',
          opportunityScore: {
            score: priorityLead.score ?? 0,
            reason: `Lead em estágio ${priorityLead.status} aguardando contato consultivo.`,
            evidence: [
              `Estágio no pipeline: ${priorityLead.status}`,
              priorityLead.contact?.email
                ? `E-mail corporativo: ${priorityLead.contact.email}`
                : 'Contato sem e-mail direto',
              priorityLead.company?.segment
                ? `Setor: ${priorityLead.company.segment}`
                : 'Setor B2B',
            ],
            confidence: priorityLead.score !== null && priorityLead.score !== undefined ? 0.9 : 0.5,
          },
          contactName: priorityLead.contact?.name || 'Decisor Comercial',
          contactRole: priorityLead.contact?.role || 'Responsável',
          contactPhone: priorityLead.contact?.phone || undefined,
          contactEmail: priorityLead.contact?.email || undefined,
          windowRecommendation: 'Hoje no horário comercial',
          reasons: [
            `Lead cadastrado no pipeline com score ${priorityLead.score ?? 0}`,
            priorityLead.lastInteraction
              ? `Última interação em ${priorityLead.lastInteraction.toISOString()}`
              : 'Sem interações registradas',
            'Oportunidade ativa para avanço de qualificação BANT',
          ],
          battlecardHints: ['Destacar proposta de valor personalizada para a operação da empresa.'],
          suggestedQuestions: [
            'Como vocês têm estruturado o processo comercial atualmente?',
            'Quais são os principais desafios de conversão identificados pela diretoria?',
          ],
        }
      : {
          actionId: 'nba-none',
          title: 'Nenhum lead com ação pendente',
          type: 'EMAIL',
          accountName: 'Sem contas ativas',
          opportunityScore: {
            score: 0,
            reason: 'Nenhuma oportunidade cadastrada no funil atual.',
            evidence: ['Banco de dados sem leads abertos na organização.'],
            confidence: 1,
          },
          contactName: 'N/A',
          contactRole: 'N/A',
          windowRecommendation: 'Aguardando novos leads',
          reasons: ['Cadastre novos leads no CRM para gerar ações recomendadas.'],
        };

    const overview: SellerWorkspaceOverview = {
      metrics: {
        monthTarget,
        targetConfigured,
        closedWon,
        gap,
        influencablePipeline,
        commitForecast,
        aiForecast,
        targetCompletionPercent,
      },
      nextBestAction,
      recentMissions: leads.slice(0, 5).map((l) => ({
        missionId: `mission-${l.id}`,
        accountName:
          l.company?.tradeName || l.company?.legalName || l.contact?.name || 'Conta sem nome',
        opportunityScore: l.score ?? 0,
        status: l.status,
        lastUpdated: l.updatedAt.toISOString(),
      })),
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/commercial-agent/mission/:id/trace
 * Retorna o trace de execução do Agent Center da Tríade para uma missão real da organização.
 */
router.get(
  '/mission/:id/trace',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const rawId = typeof req.params.id === 'string' ? req.params.id.trim() : '';

      if (!rawId) {
        res.status(404).json({
          success: false,
          error: 'Missão não encontrada para esta organização.',
        });
        return;
      }

      const lead =
        rawId === 'default'
          ? await prisma.lead.findFirst({
              where: { organizationId, deletedAt: null },
              include: { company: true, contact: true },
              orderBy: { updatedAt: 'desc' },
            })
          : await prisma.lead.findFirst({
              where: {
                id: rawId.replace(/^mission-/, ''),
                organizationId,
                deletedAt: null,
              },
              include: { company: true, contact: true },
            });

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Missão não encontrada para esta organização.',
        });
        return;
      }

      const optOutConditions: Array<Record<string, unknown>> = [{ leadId: lead.id }];
      if (lead.contact?.email) {
        optOutConditions.push({ email: lead.contact.email });
      }
      if (lead.contact?.phone) {
        optOutConditions.push({ phoneE164: lead.contact.phone });
      }

      const [optOutRecord, latestActivity] = await Promise.all([
        prisma.optOutRecord.findFirst({
          where: {
            organizationId,
            OR: optOutConditions,
          },
        }),
        prisma.activity.findFirst({
          where: {
            organizationId,
            leadId: lead.id,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const accountName =
        lead.company?.tradeName ||
        lead.company?.legalName ||
        lead.contact?.name ||
        lead.title ||
        'Conta Comercial';
      const traceTimestamp = (latestActivity?.updatedAt ?? lead.updatedAt).toISOString();
      const hasOptOut = optOutRecord !== null;

      const trace: AgentCenterTrace = {
        missionId: `mission-${lead.id}`,
        title: `Orquestração Tríade: ${accountName}`,
        accountName,
        status: hasOptOut ? 'WAITING_HUMAN_ACTION' : latestActivity ? 'COMPLETED' : 'IN_PROGRESS',
        root: 'Tagarela (Supervisor Geral)',
        directors: {
          giselle: {
            status: lead.score !== null && lead.score !== undefined ? 'COMPLETED' : 'PENDING',
            specialists: [
              {
                id: `sp-giselle-${lead.id}`,
                agentCode: 'GISELLE_STRATEGY',
                agentName: 'Giselle (Inteligência & ICP)',
                roleLabel: 'Pesquisa Firmográfica & Matriz de Dores',
                director: 'GISELLE',
                status: lead.score !== null && lead.score !== undefined ? 'COMPLETED' : 'PENDING',
                resultSummary:
                  lead.score !== null && lead.score !== undefined
                    ? `Score registrado no CRM: ${lead.score}. Estágio atual: ${lead.status}.`
                    : `Aguardando cálculo de score para o estágio ${lead.status}.`,
                timestamp: lead.updatedAt.toISOString(),
              },
            ],
          },
          patricia: {
            status: latestActivity ? 'COMPLETED' : 'PENDING',
            specialists: [
              {
                id: `sp-patricia-${lead.id}`,
                agentCode: 'PATRICIA_EXECUTION',
                agentName: 'Patrícia (Execução & NBA)',
                roleLabel: 'Geração de Roteiro & Cadência Multicanal',
                director: 'PATRICIA',
                status: latestActivity ? 'COMPLETED' : 'PENDING',
                resultSummary: latestActivity
                  ? `Atividade registrada (${latestActivity.type} - ${latestActivity.status}): ${latestActivity.observations || 'Sem observações'}.`
                  : 'Nenhuma atividade de cadência executada para este lead até o momento.',
                timestamp: traceTimestamp,
              },
            ],
          },
          guardiao: {
            status: hasOptOut ? 'PENDING' : 'COMPLETED',
            specialists: [
              {
                id: `sp-guardiao-${lead.id}`,
                agentCode: 'GUARDIAO_GOVERNANCE',
                agentName: 'Guardião (Governança & Risco)',
                roleLabel: 'Verificação de Opt-Out & Restrições de Abordagem',
                director: 'GUARDIAO',
                status: hasOptOut ? 'BLOCKED' : 'COMPLETED',
                resultSummary: hasOptOut
                  ? `Restrição de contato (OptOutRecord) ativa pelo canal ${optOutRecord.originChannel}. Abordagem bloqueada.`
                  : 'Nenhum registro de opt-out localizado em OptOutRecord para este lead.',
                timestamp: traceTimestamp,
              },
            ],
          },
        },
      };

      res.json({ success: true, data: trace });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/commercial-agent/nba/:id/execute
 */
router.post(
  '/nba/:id/execute',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      const { organizationId } = user;
      const rawId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      const leadId = rawId.replace(/^nba-/, '');

      if (!leadId || leadId === 'none') {
        res.status(404).json({
          success: false,
          error: 'Nenhuma oportunidade elegível encontrada para executar ação comercial.',
        });
        return;
      }

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId, deletedAt: null },
      });

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Oportunidade não encontrada para esta organização.',
        });
        return;
      }

      const { actionType, accountName } = (req.body ?? {}) as {
        actionType?: string;
        accountName?: string;
      };
      const now = new Date();
      const mappedType =
        actionType === 'EMAIL'
          ? 'Email'
          : actionType === 'WHATSAPP'
            ? 'WhatsApp'
            : actionType === 'MEETING_PROPOSE'
              ? 'Reuniao'
              : 'Ligacao';

      const [activity] = await Promise.all([
        prisma.activity.create({
          data: {
            organizationId,
            leadId: lead.id,
            type: mappedType,
            owner: user.email || user.id || 'commercial-agent',
            date: now,
            status: 'Em_andamento',
            observations: `NBA executada (${actionType || 'CALL'}) para ${accountName || lead.title || lead.id}`,
          },
        }),
        prisma.lead.update({
          where: { id: lead.id },
          data: { lastInteraction: now },
        }),
      ]);

      res.json({
        success: true,
        data: {
          activityId: activity.id,
          leadId: lead.id,
          status: activity.status,
        },
        message: `Ação "${actionType || 'CALL'}" para ${accountName || lead.id} registrada com sucesso.`,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/commercial-agent/nba/:id/feedback
 */
router.post(
  '/nba/:id/feedback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      const { organizationId } = user;
      const rawId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      const leadId = rawId.replace(/^nba-/, '');

      if (!leadId || leadId === 'none') {
        res.status(404).json({
          success: false,
          error: 'Nenhuma oportunidade elegível encontrada para registrar feedback.',
        });
        return;
      }

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId, deletedAt: null },
      });

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Oportunidade não encontrada para esta organização.',
        });
        return;
      }

      const { decision, feedbackType, reason } = (req.body ?? {}) as {
        decision?: 'POSTPONED' | 'REJECTED' | string;
        feedbackType?: string;
        reason?: string;
      };
      const resolvedDecision = decision || feedbackType || 'POSTPONED';
      const now = new Date();
      const nextActionDate =
        resolvedDecision === 'POSTPONED' ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null;

      const [activity] = await Promise.all([
        prisma.activity.create({
          data: {
            organizationId,
            leadId: lead.id,
            type: 'Follow_up',
            owner: user.email || user.id || 'commercial-agent',
            date: nextActionDate ?? now,
            status: resolvedDecision === 'REJECTED' ? 'Cancelada' : 'Pendente',
            observations: `Feedback NBA (${resolvedDecision}): ${reason || 'N/A'}`,
          },
        }),
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            lastInteraction: now,
            ...(nextActionDate ? { nextAction: nextActionDate } : {}),
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          activityId: activity.id,
          leadId: lead.id,
          decision: resolvedDecision,
          status: activity.status,
          nextAction: nextActionDate ? nextActionDate.toISOString() : null,
        },
        message: `Feedback "${resolvedDecision}" registrado para ação ${rawId}. Motivo: ${reason || 'N/A'}.`,
      });
    } catch (error) {
      next(error);
    }
  },
);

export const commercialAgentRoutes = router;
