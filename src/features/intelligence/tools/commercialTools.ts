import type { LeadStatus } from '@prisma/client';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Ferramenta de Gestão de Pipeline para o CRM Agent do Swarm.
 *
 * Permite consultar estágios reais de leads no pipeline comercial.
 */
export const pipelineManagementTool = tool(
  async ({ organizationId: explicitOrgId, stage, limit }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ organizationId, stage }, '[PipelineManagementTool] Consultando pipeline');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          funnel: 'Negocio',
          ...(stage ? { status: stage as LeadStatus } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit || 20,
        include: {
          company: { select: { tradeName: true, legalName: true, segment: true } },
          pipelineStage: { select: { name: true, probability: true } },
        },
      });

      return JSON.stringify(
        {
          success: true,
          total: leads.length,
          stage: stage || 'Todos',
          leads: leads.map((l) => ({
            id: l.id,
            nome: l.company?.tradeName || l.company?.legalName || 'Sem empresa vinculada',
            segmento: l.company?.segment || null,
            estagio: l.pipelineStage?.name || l.status,
            statusOficial: l.status,
            valor: l.amount ? Number(l.amount) : 0,
            probabilidade: l.probability ?? l.pipelineStage?.probability ?? null,
            fechamentoPrevisto: l.expectedCloseAt,
            responsavel: l.owner,
            criadoEm: l.createdAt,
            atualizadoEm: l.updatedAt,
          })),
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[PipelineManagementTool] Erro ao consultar pipeline');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha ao consultar pipeline',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'pipeline_management',
    description: `Consulta leads no pipeline comercial (funil "Negocio").
    
    Parâmetros:
    - stage: Status/estágio específico para filtrar (opcional, ex: Em_Negociacao, Proposta_Enviada, Reuniao_Agendada)
    - limit: Limite de resultados (padrão: 20)
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      stage: z.string().optional().describe('Status específico para filtrar (opcional)'),
      limit: z.number().optional().describe('Limite de resultados (padrão: 20)'),
    }),
  },
);

/**
 * Ferramenta de Forecast para o CRM Agent do Swarm.
 *
 * Calcula forecast ponderado baseado em probabilidade de estágio real no banco.
 */
export const forecastTool = tool(
  async ({ organizationId: explicitOrgId }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ organizationId }, '[ForecastTool] Calculando forecast');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          funnel: 'Negocio',
          status: { notIn: ['Negocios_Perdidos', 'Negocios_Ganhos', 'Lead_Desqualificado'] },
        },
        include: {
          pipelineStage: true,
        },
      });

      let weightedTotal = 0;
      const byStage: Record<string, { count: number; total: number; weighted: number }> = {};

      for (const lead of leads) {
        const probability = lead.probability ?? lead.pipelineStage?.probability ?? 50;
        const amountNum = lead.amount ? Number(lead.amount) : 0;
        const weighted = amountNum * (probability / 100);
        weightedTotal += weighted;

        const stage = lead.pipelineStage?.name || lead.status || 'Sem estágio';
        if (!byStage[stage]) {
          byStage[stage] = { count: 0, total: 0, weighted: 0 };
        }
        byStage[stage].count++;
        byStage[stage].total += amountNum;
        byStage[stage].weighted += weighted;
      }

      return JSON.stringify(
        {
          success: true,
          forecastPonderado: Math.round(weightedTotal * 100) / 100,
          totalLeads: leads.length,
          porEstagio: byStage,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[ForecastTool] Erro ao calcular forecast');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha ao calcular forecast',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'forecast',
    description: `Calcula forecast ponderado real do pipeline comercial.
    
    Parâmetros:
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
    }),
  },
);

/**
 * Ferramenta de Cadência de Outbound para o Ops/BDR/SDR Agent do Swarm.
 *
 * Registra uma ação real em AIPendingAction para aprovação/execução na fila de cadência.
 */
export const cadenceTool = tool(
  async ({ leadId, organizationId: explicitOrgId, canal, mensagem }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ leadId, organizationId, canal }, '[CadenceTool] Criando ação de cadência');

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          company: { select: { tradeName: true } },
          contact: { select: { name: true, email: true, phone: true, whatsapp: true } },
        },
      });

      if (!lead) {
        return JSON.stringify(
          {
            success: false,
            erro: 'Lead não encontrado nesta organização',
          },
          null,
          2,
        );
      }

      const pendingAction = await prisma.aIPendingAction.create({
        data: {
          organizationId,
          entity: 'Lead',
          action: 'CADENCE_TOUCH',
          agentRole: 'OPS',
          riskLevel: 'medium',
          payload: {
            leadId,
            companyName: lead.company?.tradeName ?? null,
            contactName: lead.contact?.name ?? null,
            channel: canal,
            message: mensagem,
          },
        },
      });

      return JSON.stringify(
        {
          success: true,
          pendingActionId: pendingAction.id,
          mensagem: 'Ação de cadência persistida em AIPendingAction para aprovação/execução',
          leadId,
          canal,
          conteudo: mensagem,
          nota: 'Esta ação aguarda aprovação humana na fila de Autonomia Comercial antes do disparo externo.',
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[CadenceTool] Erro ao criar cadência');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha ao criar cadência',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'cadence',
    description: `Registra uma ação real de cadência de follow-up (email, whatsapp, linkedin, telegram, sms) em AIPendingAction para um lead.
    
    Parâmetros:
    - leadId: ID do lead
    - canal: Canal de comunicação (email, whatsapp, linkedin, telegram, sms)
    - mensagem: Conteúdo da mensagem
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      leadId: z.string().describe('ID do lead'),
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      canal: z
        .enum(['email', 'whatsapp', 'linkedin', 'telegram', 'sms'])
        .describe('Canal de comunicação'),
      mensagem: z.string().describe('Conteúdo da mensagem'),
    }),
  },
);
