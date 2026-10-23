import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { CommercialAIService } from '../services/CommercialAIService.js';

/**
 * Ferramenta de Enriquecimento de Leads para o SDR do Swarm.
 * 
 * Usa o CommercialAIService existente para:
 * - Lead Score (aderência ao ICP)
 * - Análise SWOT
 * - Matrizes BANT e GPCT
 * - Matriz de objeções prováveis
 */
export const leadEnrichmentTool = tool(
  async ({ leadId, organizationId }) => {
    try {
      logger.info({ leadId, organizationId }, '[LeadEnrichmentTool] Iniciando enriquecimento');

      // Buscar lead no CRM
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          customFields: true,
        },
      });

      if (!lead) {
        return JSON.stringify({
          success: false,
          erro: 'Lead não encontrado',
        }, null, 2);
      }

      // Converter para formato esperado pelo CommercialAIService
      const enrichedLead = {
        fantasyName: lead.fantasyName || lead.socialReason,
        socialReason: lead.socialReason,
        cnaeMain: lead.cnae || null,
        size: lead.size || null,
        cadastralSituation: lead.situacaoCadastral || null,
        city: lead.city || null,
        state: lead.state || null,
        employeesCount: lead.employeesCount || null,
        estimatedRevenue: lead.estimatedRevenue || null,
        technologies: lead.technologies || [],
        description: lead.description || null,
      };

      const commercialAI = new CommercialAIService();

      const [score, swot, qualifications, objections] = await Promise.all([
        commercialAI.generateLeadScore(enrichedLead),
        commercialAI.generateSWOT(enrichedLead),
        commercialAI.generateQualifications(enrichedLead),
        commercialAI.generateObjectionsMatrix(enrichedLead),
      ]);

      logger.info({ leadId, score }, '[LeadEnrichmentTool] Enriquecimento concluído');

      return JSON.stringify({
        success: true,
        leadId,
        leadScore: score,
        swot,
        qualifications,
        objections,
        dadosOriginais: {
          nome: lead.fantasyName || lead.socialReason,
          segmento: lead.segment,
          porte: lead.size,
          localizacao: [lead.city, lead.state].filter(Boolean).join(', '),
        },
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[LeadEnrichmentTool] Erro no enriquecimento');
      return JSON.stringify({
        success: false,
        erro: error.message || 'Falha ao enriquecer lead',
      }, null, 2);
    }
  },
  {
    name: 'lead_enrichment',
    description: `Enriquece um lead com análise de ICP, SWOT, BANT/GPCT e objeções probáveis.
    
    Usa o CommercialAIService para gerar:
    - Lead Score (0-1000) baseado em porte, CNAE, maturidade tecnológica
    - Análise SWOT (strengths, weaknesses, opportunities, threats)
    - Matrizes BANT (Budget, Authority, Need, Timeframe) e GPCT (Goals, Plans, Challenges, Timeline)
    - Matriz de objeções prováveis com respostas em múltiplos frameworks (consultiva, challenger, SPIN)
    
    Parâmetros:
    - leadId: ID do lead no CRM
    - organizationId: ID da organização (para escopo)`,
    schema: z.object({
      leadId: z.string().describe('ID do lead no CRM'),
      organizationId: z.string().describe('ID da organização'),
    }),
  },
);
