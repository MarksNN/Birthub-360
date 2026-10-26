import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { analyzeCompetitors } from '../../../lib/ai/features.js';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { ProposalAiService } from '../../document-editor/services/proposal-ai.service.js';
import { assertPiiExternalConsent } from '../services/guardrails.service.js';

/**
 * Ferramenta de Proposta Comercial Automática para o Closer do Swarm.
 * Gera proposta estruturada baseada em dados reais do deal via ProposalAiService.
 */
export const proposalTool = tool(
  async ({
    leadId,
    organizationId: explicitOrgId,
    tipo,
    duracao,
    doresDiagnosticadas,
    modulosPropostos,
  }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ leadId, organizationId }, '[ProposalTool] Gerando proposta');

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          company: true,
          contact: true,
          internalNotes: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      });

      if (!lead) {
        return JSON.stringify(
          { success: false, erro: 'Lead não encontrado nesta organização' },
          null,
          2,
        );
      }

      const clientName = lead.company?.tradeName || lead.company?.legalName || 'Cliente B2B';
      const amountNum = lead.amount ? Number(lead.amount) : 0;
      const proposalAi = new ProposalAiService();

      let aiSections = null;
      try {
        await assertPiiExternalConsent(organizationId);
        aiSections = await proposalAi.generateProposalSections({
          clientName,
          diagnosedPains: doresDiagnosticadas?.length
            ? doresDiagnosticadas
            : ['Otimização operacional e previsibilidade comercial'],
          proposedModules: modulosPropostos?.length
            ? modulosPropostos
            : ['Core Platform', 'Automações & Integrações', 'Inteligência Comercial'],
          monthlyInvestmentEstimated: amountNum > 0 ? amountNum : undefined,
        });
      } catch (aiErr: any) {
        logger.warn(
          { err: aiErr, leadId },
          '[ProposalTool] Fallback estrutural na geração de seções IA',
        );
      }

      const proposta = {
        cliente: clientName,
        cnpj: lead.company?.cnpj || null,
        contato: lead.contact?.name || null,
        valor: amountNum,
        tipo: tipo || 'Mensal',
        duracaoMeses: duracao || 12,
        data: new Date().toISOString(),
        secoesExecutivas: aiSections,
        condicoes: {
          pagamento: tipo || 'Mensal',
          prazoDias: 30,
          validadePropostaDias: 15,
        },
      };

      return JSON.stringify(
        {
          success: true,
          proposta,
          nota: 'Proposta gerada com base nos dados reais do CRM para revisão humana antes de envio.',
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[ProposalTool] Erro ao gerar proposta');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'generate_proposal',
    description: `Gera proposta comercial executiva estruturada para um deal usando ProposalAiService e os dados reais do CRM.
    
    Parâmetros:
    - leadId: ID do lead
    - tipo: Tipo de proposta (Mensal, Anual, Personalizado)
    - duracao: Duração em meses
    - doresDiagnosticadas: Lista de dores identificadas (opcional)
    - modulosPropostos: Lista de módulos/produtos propostos (opcional)
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      leadId: z.string().describe('ID do lead'),
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      tipo: z.string().optional().describe('Tipo de proposta'),
      duracao: z.number().optional().describe('Duração em meses'),
      doresDiagnosticadas: z.array(z.string()).optional().describe('Dores diagnosticadas'),
      modulosPropostos: z.array(z.string()).optional().describe('Módulos propostos'),
    }),
  },
);

/**
 * Ferramenta de Análise de Concorrência para o BDR/Closer do Swarm.
 * Analisa concorrentes reais do segmento via IA e battlecards da organização.
 */
export const competitorAnalysisTool = tool(
  async ({ segmento, descricaoEmpresa, organizacaoId: explicitOrgId }) => {
    const organizationId = getTenantId() || explicitOrgId;

    try {
      logger.info({ segmento, organizationId }, '[CompetitorAnalysisTool] Analisando concorrência');

      let battlecards: Array<{
        objectionTitle: string;
        responseScript: string;
        keyDifferentiator: string;
      }> = [];
      if (organizationId) {
        battlecards = await prisma.objectionMatrixItem.findMany({
          where: {
            organizationId,
            OR: [
              { segment: { contains: segmento, mode: 'insensitive' } },
              { objectionTitle: { contains: 'concorr', mode: 'insensitive' } },
            ],
          },
          select: {
            objectionTitle: true,
            responseScript: true,
            keyDifferentiator: true,
          },
          take: 5,
        });
      }

      let analiseIa: string | null = null;
      try {
        if (organizationId) {
          await assertPiiExternalConsent(organizationId);
        }
        analiseIa = await analyzeCompetitors(
          `Segmento: ${segmento}. ${descricaoEmpresa ? `Contexto adicional: ${descricaoEmpresa}` : ''}`,
        );
      } catch (aiErr: any) {
        logger.warn(
          { err: aiErr },
          '[CompetitorAnalysisTool] IA indisponível para análise de concorrentes',
        );
      }

      return JSON.stringify(
        {
          success: true,
          segmento,
          analiseCompetitivaIa: analiseIa,
          diferenciaisCadastradosNoPlaybook: battlecards,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[CompetitorAnalysisTool] Erro na análise');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'competitor_analysis',
    description: `Analisa concorrentes reais de um segmento e consulta os diferenciais competitivos cadastrados no Playbook da organização.
    
    Parâmetros:
    - segmento: Segmento de mercado
    - descricaoEmpresa: Descrição opcional da empresa ou cenário competitivo
    - organizacaoId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      segmento: z.string().describe('Segmento de mercado'),
      descricaoEmpresa: z.string().optional().describe('Descrição adicional da empresa ou produto'),
      organizacaoId: z.string().optional().describe('ID da organização (opcional)'),
    }),
  },
);

/**
 * Ferramenta de Cross-Sell/Up-Sell para o CRM Agent.
 * Identifica oportunidades reais de expansão com clientes ganhos no CRM.
 */
export const crossSellTool = tool(
  async ({ organizationId: explicitOrgId, clienteId }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ organizationId, clienteId }, '[CrossSellTool] Analisando oportunidades');

      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          status: 'Negocios_Ganhos',
          ...(clienteId ? { OR: [{ id: clienteId }, { companyId: clienteId }] } : {}),
        },
        include: {
          company: true,
          contact: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      const oportunidades = leads.map((l) => ({
        leadId: l.id,
        companyId: l.companyId,
        cliente: l.company?.tradeName || l.company?.legalName || 'Cliente sem nome',
        segmento: l.company?.segment || null,
        porte: l.company?.size || null,
        valorAtual: l.amount ? Number(l.amount) : 0,
        tecnologiasDetectadas: l.company?.technologies || [],
        contatoPrincipal: l.contact?.name || null,
        sugestoesExpansao: [
          'Expansão de licenças/módulos para novas filiais ou áreas',
          'Ativação de automações multicanal e integrações de CRM/ERP',
          'Upgrade para pacote Enterprise com Enxame Autônomo 24x7',
        ],
      }));

      return JSON.stringify(
        {
          success: true,
          totalClientesGanhosAnalisados: oportunidades.length,
          oportunidades,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[CrossSellTool] Erro na análise');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'cross_sell_analysis',
    description: `Identifica oportunidades reais de cross-sell/up-sell na base de negócios ganhos (status Negocios_Ganhos).
    
    Parâmetros:
    - clienteId: ID específico do lead ou empresa (opcional)
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      clienteId: z.string().optional().describe('ID específico do cliente/lead (opcional)'),
    }),
  },
);

/**
 * Ferramenta de Análise de Churn e Estagnação para o CRM Agent.
 * Identifica negociações ou clientes sem interação recente.
 */
export const churnAnalysisTool = tool(
  async ({ organizationId: explicitOrgId, diasInatividadeMinimo }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify({ success: false, erro: 'Contexto de organização ausente' }, null, 2);
    }

    try {
      logger.info({ organizationId }, '[ChurnAnalysisTool] Analisando risco de churn/estagnação');

      const minDays = diasInatividadeMinimo ?? 14;
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          status: {
            in: [
              'Proposta_Enviada',
              'Reuniao_Agendada',
              'Nova_Oportunidade',
              'Call_Visita_Agendada',
            ],
          },
        },
        include: {
          company: { select: { tradeName: true, legalName: true, segment: true } },
          copilotoDealHealthSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'asc' },
        take: 25,
      });

      const emRisco = leads
        .map((l) => {
          const refDate = l.lastInteraction || l.updatedAt;
          const diasParado = refDate
            ? Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          const latestHealth = l.copilotoDealHealthSnapshots?.[0];
          return {
            leadId: l.id,
            nome: l.company?.tradeName || l.company?.legalName || 'Empresa sem nome',
            estagio: l.status,
            valor: l.amount ? Number(l.amount) : 0,
            diasParado,
            churnRiskScore: latestHealth?.churnRiskScore ?? null,
            healthScore: latestHealth?.score ?? null,
            acaoSugerida:
              diasParado > 21
                ? 'Intervenção executiva imediata (Risco Alto)'
                : 'Follow-up consultivo de destravamento',
          };
        })
        .filter(
          (item) =>
            item.diasParado >= minDays ||
            (item.churnRiskScore !== null && item.churnRiskScore >= 60),
        );

      return JSON.stringify(
        {
          success: true,
          totalAnalisado: leads.length,
          emRiscoCount: emRisco.length,
          clientesEmRisco: emRisco,
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[ChurnAnalysisTool] Erro na análise');
      return JSON.stringify({ success: false, erro: error.message }, null, 2);
    }
  },
  {
    name: 'churn_analysis',
    description: `Identifica negociações e clientes em risco de churn ou estagnação com base em dias sem interação e CopilotoDealHealthSnapshot.
    
    Parâmetros:
    - diasInatividadeMinimo: Dias mínimos sem interação (padrão: 14)
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
      diasInatividadeMinimo: z
        .number()
        .optional()
        .describe('Dias mínimos sem interação (padrão: 14)'),
    }),
  },
);
