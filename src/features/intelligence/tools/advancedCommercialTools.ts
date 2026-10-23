import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Ferramenta de Proposta Comercial Automática para o Closer do Swarm.
 * Gera proposta estruturada baseada em dados do deal.
 */
export const proposalTool = tool(
  async ({ leadId, organizationId, tipo, duracao }) => {
    try {
      logger.info({ leadId, organizationId }, '[ProposalTool] Gerando proposta');

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
      });

      if (!lead) {
        return JSON.stringify({ success: false, erro: 'Lead não encontrado' }, null, 2);
      }

      const proposta = {
        cliente: lead.fantasyName || lead.socialReason,
        valor: lead.amount || 0,
        tipo: tipo || 'Mensal',
        duracao: duracao || 12,
        data: new Date().toISOString(),
        itens: [
          { descricao: 'Plano Elite', valor: lead.amount || 0 },
          { descricao: 'Suporte Premium', valor: 0 },
          { descricao: 'Integrações', valor: 0 },
        ],
        condicoes: {
          pagamento: 'Mensal',
          prazo: 30,
          garantia: '30 dias',
        },
      };

      return JSON.stringify({
        success: true,
        proposta,
        nota: 'Proposta gerada para revisão humana antes de envio',
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[ProposalTool] Erro ao gerar proposta');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'generate_proposal',
    description: `Gera proposta comercial estruturada para um deal.
    
    Parâmetros:
    - leadId: ID do lead
    - organizationId: ID da organização
    - tipo: Tipo de proposta (Mensal, Anual, Personalizado)
    - duracao: Duração em meses`,
    schema: z.object({
      leadId: z.string().describe('ID do lead'),
      organizationId: z.string().describe('ID da organização'),
      tipo: z.string().optional().describe('Tipo de proposta'),
      duracao: z.number().optional().describe('Duração em meses'),
    }),
  },
);

/**
 * Ferramenta de Análise de Concorrência para o BDR do Swarm.
 * Analisa concorrentes do segmento e posicionamento.
 */
export const competitorAnalysisTool = tool(
  async ({ segmento, organizacaoId }) => {
    try {
      logger.info({ segmento }, '[CompetitorAnalysisTool] Analisando concorrência');

      // Em produção, integraria com módulo Market Intelligence
      const concorrentes = [
        { nome: 'Concorrente A', forca: 'Alta', diferencial: 'Preço baixo' },
        { nome: 'Concorrente B', forca: 'Média', diferencial: 'Suporte 24/7' },
        { nome: 'Concorrente C', forca: 'Baixa', diferencial: 'Niche local' },
      ];

      return JSON.stringify({
        success: true,
        segmento,
        concorrentes,
        posicionamento: 'Birth Hub se diferencia por IA + CRM + Automação',
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[CompetitorAnalysisTool] Erro na análise');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'competitor_analysis',
    description: `Analisa concorrentes de um segmento e posicionamento.
    
    Parâmetros:
    - segmento: Segmento de mercado
    - organizacaoId: ID da organização`,
    schema: z.object({
      segmento: z.string().describe('Segmento de mercado'),
      organizacaoId: z.string().describe('ID da organização'),
    }),
  },
);

/**
 * Ferramenta de Cross-Sell/Up-Sell para o CRM Agent.
 * Identifica oportunidades de expansão com clientes existentes.
 */
export const crossSellTool = tool(
  async ({ organizationId, clienteId }) => {
    try {
      logger.info({ organizationId, clienteId }, '[CrossSellTool] Analisando oportunidades');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          funnel: 'Negocio',
          stage: 'Ganho',
        },
        take: 5,
      });

      const oportunidades = leads.map((l) => ({
        cliente: l.fantasyName || l.socialReason,
        produtosAtuais: ['Plano Básico'],
        sugestoes: ['Upgrade para Elite', 'Adicionar integrações', 'Consultoria de IA'],
        razao: 'Cliente já usa core, tem fit para expansão',
      }));

      return JSON.stringify({
        success: true,
        oportunidades,
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[CrossSellTool] Erro na análise');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'cross_sell_analysis',
    description: `Identifica oportunidades de cross-sell/up-sell.
    
    Parâmetros:
    - organizationId: ID da organização
    - clienteId: ID específico do cliente (opcional)`,
    schema: z.object({
      organizationId: z.string().describe('ID da organização'),
      clienteId: z.string().optional().describe('ID específico do cliente'),
    }),
  },
);

/**
 * Ferramenta de Análise de Churn para o CRM Agent.
 * Identifica clientes em risco de cancelamento.
 */
export const churnAnalysisTool = tool(
  async ({ organizationId }) => {
    try {
      logger.info({ organizationId }, '[ChurnAnalysisTool] Analisando risco de churn');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          funnel: 'Negocio',
          stage: { in: ['Negociacao', 'Proposta'] },
        },
        take: 10,
      });

      const emRisco = leads.filter((l) => {
        const diasParado = l.updatedAt 
          ? Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return diasParado > 14;
      });

      return JSON.stringify({
        success: true,
        totalAnalisado: leads.length,
        emRisco: emRisco.length,
        clientes: emRisco.map((l) => ({
          nome: l.fantasyName || l.socialReason,
          estagio: l.stage,
          diasParado: l.updatedAt 
            ? Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          acaoSugerida: 'Reengajamento urgente',
        })),
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[ChurnAnalysisTool] Erro na análise');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'churn_analysis',
    description: `Identifica clientes em risco de churn (cancelamento).
    
    Parâmetros:
    - organizationId: ID da organização`,
    schema: z.object({
      organizationId: z.string().describe('ID da organização'),
    }),
  },
);
