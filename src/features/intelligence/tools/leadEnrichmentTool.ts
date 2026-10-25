import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { enrichCompany } from '../../prospecting/services/enrichment.service.js';
import { CommercialAIService } from '../services/CommercialAIService.js';

/**
 * Ferramenta de Enriquecimento de Leads para o SDR/BDR do Swarm e Agentes Autônomos.
 *
 * Usa o pipeline real de enriquecimento (BrasilAPI/Receita Federal, Apollo, Hunter, GDELT)
 * quando solicitado (`runExternalProviders: true`) e o CommercialAIService para:
 * - Lead Score (aderência ao ICP)
 * - Análise SWOT
 * - Matrizes BANT e GPCT
 * - Matriz de objeções prováveis
 */
export const leadEnrichmentTool = tool(
  async ({ leadId, organizationId: explicitOrgId, runExternalProviders }) => {
    const organizationId = getTenantId() || explicitOrgId;
    if (!organizationId) {
      return JSON.stringify(
        {
          success: false,
          erro: 'Contexto de organização (tenant) ausente.',
        },
        null,
        2,
      );
    }

    try {
      logger.info({ leadId, organizationId }, '[LeadEnrichmentTool] Iniciando enriquecimento');

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: {
          company: true,
          contact: true,
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

      let externalEnrichmentResult: unknown = null;
      if (runExternalProviders && lead.companyId) {
        try {
          externalEnrichmentResult = await enrichCompany(organizationId, lead.companyId);
        } catch (enrichErr: any) {
          logger.warn(
            { err: enrichErr, leadId, companyId: lead.companyId },
            '[LeadEnrichmentTool] Enriquecimento externo parcial/indisponível; seguindo com dados atuais do CRM',
          );
        }
      }

      const company = lead.company;
      const enrichedLead = {
        fantasyName: company?.tradeName || company?.legalName || 'Empresa sem nome',
        socialReason: company?.legalName || company?.tradeName || 'Empresa sem razão social',
        cnaeMain: company?.cnae || undefined,
        size: company?.size || undefined,
        cadastralSituation: company?.situacaoCadastral || undefined,
        city: company?.city || undefined,
        state: company?.state || undefined,
        employeesCount: company?.employeeCount ? String(company.employeeCount) : undefined,
        estimatedRevenue: company?.estimatedRevenue ? String(company.estimatedRevenue) : undefined,
        technologies: company?.technologies || [],
        description: company?.observations || undefined,
        cnpj: company?.cnpj || '',
        decisionMakers: [],
        sources: [],
        status: (company?.status as any) || 'Active',
      };

      const commercialAI = new CommercialAIService();

      const [score, swot, qualifications, objections] = await Promise.all([
        commercialAI.generateLeadScore(enrichedLead),
        commercialAI.generateSWOT(enrichedLead),
        commercialAI.generateQualifications(enrichedLead),
        commercialAI.generateObjectionsMatrix(enrichedLead),
      ]);

      logger.info({ leadId, score }, '[LeadEnrichmentTool] Enriquecimento concluído');

      return JSON.stringify(
        {
          success: true,
          leadId,
          companyId: lead.companyId,
          leadScore: score,
          swot,
          qualifications,
          objections,
          externalEnrichmentTriggered: Boolean(externalEnrichmentResult),
          dadosOriginais: {
            nome: company?.tradeName || company?.legalName || null,
            cnpj: company?.cnpj || null,
            segmento: company?.segment || null,
            porte: company?.size || null,
            localizacao: [company?.city, company?.state].filter(Boolean).join(', '),
            website: company?.website || null,
            decisor: lead.contact
              ? {
                  nome: lead.contact.name,
                  cargo: lead.contact.role,
                  email: lead.contact.email,
                  telefone: lead.contact.phone || lead.contact.whatsapp,
                }
              : null,
          },
        },
        null,
        2,
      );
    } catch (error: any) {
      logger.error({ err: error }, '[LeadEnrichmentTool] Erro no enriquecimento');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha ao enriquecer lead',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'lead_enrichment',
    description: `Enriquece um lead do CRM com dados da Receita Federal/BrasilAPI/Apollo/Hunter (opcional) e gera análise comercial de ICP, SWOT, BANT/GPCT e matriz de objeções.
    
    Parâmetros:
    - leadId: ID do lead no CRM
    - runExternalProviders: (opcional) se true, executa também o enriquecimento externo da empresa (CNPJ, Apollo, Hunter, Notícias)
    - organizationId: (opcional, resolvido automaticamente do contexto do tenant)`,
    schema: z.object({
      leadId: z.string().describe('ID do lead no CRM'),
      runExternalProviders: z
        .boolean()
        .optional()
        .describe('Se true, consulta também BrasilAPI/Apollo/Hunter para atualizar a empresa'),
      organizationId: z.string().optional().describe('ID da organização (opcional)'),
    }),
  },
);
