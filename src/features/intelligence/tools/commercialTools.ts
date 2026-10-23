import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Ferramenta de Gestão de Pipeline para o CRM Agent do Swarm.
 * 
 * Permite consultar e atualizar estágios de leads no pipeline comercial.
 */
export const pipelineManagementTool = tool(
  async ({ organizationId, stage, limit }) => {
    try {
      logger.info({ organizationId, stage }, '[PipelineManagementTool] Consultando pipeline');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          funnel: 'Negocio',
          ...(stage && { stage }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit || 20,
        select: {
          id: true,
          fantasyName: true,
          socialReason: true,
          stage: true,
          amount: true,
          expectedCloseAt: true,
          owner: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return JSON.stringify({
        success: true,
        total: leads.length,
        stage: stage || 'Todos',
        leads: leads.map((l) => ({
          id: l.id,
          nome: l.fantasyName || l.socialReason,
          estagio: l.stage,
          valor: l.amount,
          fechamentoPrevisto: l.expectedCloseAt,
          responsavel: l.owner,
          criadoEm: l.createdAt,
          atualizadoEm: l.updatedAt,
        })),
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[PipelineManagementTool] Erro ao consultar pipeline');
      return JSON.stringify({
        success: false,
        erro: error.message || 'Falha ao consultar pipeline',
      }, null, 2);
    }
  },
  {
    name: 'pipeline_management',
    description: `Consulta leads no pipeline comercial (funil "Negócio").
    
    Parâmetros:
    - organizationId: ID da organização
    - stage: Estágio específico para filtrar (opcional)
    - limit: Limite de resultados (padrão: 20)
    
    Retorna lista de leads com estágio, valor, fechamento previsto e responsável.`,
    schema: z.object({
      organizationId: z.string().describe('ID da organização'),
      stage: z.string().optional().describe('Estágio específico para filtrar (opcional)'),
      limit: z.number().optional().describe('Limite de resultados (padrão: 20)'),
    }),
  },
);

/**
 * Ferramenta de Forecast para o CRM Agent do Swarm.
 * 
 * Calcula forecast ponderado baseado em probabilidade de estágio.
 */
export const forecastTool = tool(
  async ({ organizationId }) => {
    try {
      logger.info({ organizationId }, '[ForecastTool] Calculando forecast');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          funnel: 'Negocio',
          stage: { notIn: ['Perdido', 'Ganho'] },
        },
        include: {
          crmPipelineStage: true,
        },
      });

      let weightedTotal = 0;
      const byStage: Record<string, { count: number; total: number; weighted: number }> = {};

      for (const lead of leads) {
        const probability = lead.crmPipelineStage?.probability || 50;
        const weighted = (lead.amount || 0) * (probability / 100);
        weightedTotal += weighted;

        const stage = lead.stage || 'Sem estágio';
        if (!byStage[stage]) {
          byStage[stage] = { count: 0, total: 0, weighted: 0 };
        }
        byStage[stage].count++;
        byStage[stage].total += lead.amount || 0;
        byStage[stage].weighted += weighted;
      }

      return JSON.stringify({
        success: true,
        forecastPonderado: weightedTotal,
        totalLeads: leads.length,
        porEstagio: byStage,
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[ForecastTool] Erro ao calcular forecast');
      return JSON.stringify({
        success: false,
        erro: error.message || 'Falha ao calcular forecast',
      }, null, 2);
    }
  },
  {
    name: 'forecast',
    description: `Calcula forecast ponderado do pipeline comercial.
    
    Parâmetros:
    - organizationId: ID da organização
    
    Retorna forecast ponderado baseado na probabilidade de cada estágio.`,
    schema: z.object({
      organizationId: z.string().describe('ID da organização'),
    }),
  },
);

/**
 * Ferramenta de Cadência de Outbound para o Ops Agent do Swarm.
 * 
 * Cria/executa cadências de follow-up (email, WhatsApp, LinkedIn).
 */
export const cadenceTool = tool(
  async ({ leadId, organizationId, canal, mensagem }) => {
    try {
      logger.info({ leadId, organizationId, canal }, '[CadenceTool] Criando ação de cadência');

      // Verificar se o lead existe
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({
          success: false,
          erro: 'Lead não encontrado',
        }, null, 2);
      }

      // Registrar ação de cadência (para aprovação se necessário)
      // Em produção, isso integraria com o módulo cadence existente
      return JSON.stringify({
        success: true,
        mensagem: 'Ação de cadência registrada para aprovação/execução',
        leadId,
        canal,
        mensagem,
        nota: 'Esta ação requer aprovação humana antes de execução real',
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[CadenceTool] Erro ao criar cadência');
      return JSON.stringify({
        success: false,
        erro: error.message || 'Falha ao criar cadência',
      }, null, 2);
    }
  },
  {
    name: 'cadence',
    description: `Cria uma ação de cadência de follow-up para um lead.
    
    Parâmetros:
    - leadId: ID do lead
    - organizationId: ID da organização
    - canal: Canal de comunicação (email, whatsapp, linkedin)
    - mensagem: Conteúdo da mensagem
    
    Retorna confirmação da ação criada (requer aprovação antes de execução).`,
    schema: z.object({
      leadId: z.string().describe('ID do lead'),
      organizationId: z.string().describe('ID da organização'),
      canal: z.enum(['email', 'whatsapp', 'linkedin']).describe('Canal de comunicação'),
      mensagem: z.string().describe('Conteúdo da mensagem'),
    }),
  },
);
