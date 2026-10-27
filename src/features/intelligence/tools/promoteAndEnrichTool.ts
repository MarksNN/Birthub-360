import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { logger } from '../../../lib/logger.js';
import { enrichCompany } from '../../prospecting/services/enrichment.service.js';
import {
  discoverDecisionMakers,
  promoteToCrm,
} from '../../prospecting/services/prospecting.service.js';
import { normalizeCompanyDomain } from '../../prospecting/utils/domain.js';

/**
 * Ferramenta Completa de Promoção para CRM, Busca de Decisores e Enriquecimento em Cascata.
 * Fecha o elo entre `company_discovery` (que apenas lista candidatos) e o CRM/Enriquecimento real.
 */
export const promoteAndEnrichTool = tool(
  async ({
    action,
    tradeName,
    legalName,
    cnpj,
    segment,
    size,
    location,
    website,
    phone,
    source,
    companyId,
    domain,
    autoEnrich,
    contactName,
    contactRole,
    contactEmail,
    contactPhone,
  }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return JSON.stringify(
        { success: false, erro: 'Contexto de organização (tenant) ausente.' },
        null,
        2,
      );
    }

    try {
      if (action === 'promote_candidate') {
        if (!tradeName) {
          return JSON.stringify(
            { success: false, erro: 'tradeName é obrigatório para promover candidato ao CRM.' },
            null,
            2,
          );
        }

        const safeSource =
          source && !/google|places/i.test(source) ? source : 'Swarm Outbound Discovery';

        const promoted = await promoteToCrm({
          organizationId,
          tradeName,
          legalName: legalName || tradeName,
          cnpj,
          segment: segment || 'B2B',
          size: size || 'Médio Porte',
          location,
          website,
          phone,
          source: safeSource,
          autoEnrich: autoEnrich ?? true,
          contact: contactName
            ? {
                name: contactName,
                role: contactRole || 'Decisor',
              }
            : undefined,
        });

        return JSON.stringify(
          {
            success: true,
            action: 'promote_candidate',
            alreadyExists: promoted.alreadyExists,
            leadId: promoted.lead.id,
            companyId: promoted.lead.companyId,
            empresa: promoted.lead.company?.tradeName || tradeName,
            fitScore: promoted.fit ?? promoted.lead.score,
          },
          null,
          2,
        );
      }

      if (action === 'enrich_company') {
        if (!companyId) {
          return JSON.stringify(
            { success: false, erro: 'companyId é obrigatório para enrich_company.' },
            null,
            2,
          );
        }

        const enriched = await enrichCompany(organizationId, companyId, {
          cnpj,
          force: false,
        });

        return JSON.stringify(
          {
            success: true,
            action: 'enrich_company',
            companyId,
            enrichmentStatus: enriched.company.enrichmentStatus,
            fit: enriched.fit,
            empresa: {
              tradeName: enriched.company.tradeName,
              legalName: enriched.company.legalName,
              cnpj: enriched.company.cnpj,
              cnae: enriched.company.cnae,
              situacaoCadastral: enriched.company.situacaoCadastral,
              employeeCount: enriched.company.employeeCount,
              website: enriched.company.website,
              phones: enriched.company.phones,
              emails: enriched.company.emails,
              technologies: enriched.company.technologies,
            },
          },
          null,
          2,
        );
      }

      if (action === 'discover_decision_makers') {
        const rawDomain = domain || website || '';
        const normalizedDomain = normalizeCompanyDomain(rawDomain);
        if (!normalizedDomain) {
          return JSON.stringify(
            {
              success: false,
              erro: 'Informe um domain ou website válido para buscar decisores.',
            },
            null,
            2,
          );
        }

        const decisionMakers = await discoverDecisionMakers(normalizedDomain, {});
        return JSON.stringify(
          {
            success: true,
            action: 'discover_decision_makers',
            domain: normalizedDomain,
            decisionMakers,
          },
          null,
          2,
        );
      }

      return JSON.stringify({ success: false, erro: 'Ação inválida.' }, null, 2);
    } catch (error: any) {
      logger.error({ err: error, action }, '[PromoteAndEnrichTool] Erro na execução');
      return JSON.stringify(
        {
          success: false,
          erro: error.message || 'Falha ao promover ou enriquecer empresa/lead.',
        },
        null,
        2,
      );
    }
  },
  {
    name: 'promote_and_enrich_lead',
    description: `Promove empresas descobertas para o CRM (criando Company + Contact + Lead), executa enriquecimento completo em cascata (BrasilAPI/Receita Federal, Apollo, Hunter, GDELT News, Fit Score) e descobre decisores pelo domínio.
    
    Ações disponíveis (action):
    - 'promote_candidate': Cadastra o candidato no CRM e dispara o enriquecimento automático.
    - 'enrich_company': Executa a cascata completa de enriquecimento em uma empresa já cadastrada (companyId).
    - 'discover_decision_makers': Busca decisores (C-Level, Diretores, Gerentes) a partir do domínio/website da empresa.`,
    schema: z.object({
      action: z
        .enum(['promote_candidate', 'enrich_company', 'discover_decision_makers'])
        .describe('Ação de prospecção/enriquecimento a executar'),
      tradeName: z
        .string()
        .optional()
        .describe('Nome fantasia da empresa (para promote_candidate)'),
      legalName: z.string().optional().describe('Razão social da empresa'),
      cnpj: z.string().optional().describe('CNPJ da empresa'),
      segment: z.string().optional().describe('Segmento de mercado'),
      size: z.string().optional().describe('Porte da empresa'),
      location: z.string().optional().describe('Cidade, UF'),
      website: z.string().optional().describe('Website da empresa'),
      phone: z.string().optional().describe('Telefone da empresa'),
      source: z.string().optional().describe('Fonte da descoberta (ex: Apollo, BrasilAPI)'),
      companyId: z.string().optional().describe('ID da empresa no CRM (para enrich_company)'),
      domain: z.string().optional().describe('Domínio da empresa (para discover_decision_makers)'),
      autoEnrich: z.boolean().optional().describe('Se true, enriquece automaticamente ao promover'),
      contactName: z.string().optional().describe('Nome do decisor principal (opcional)'),
      contactRole: z.string().optional().describe('Cargo do decisor principal (opcional)'),
      contactEmail: z.string().optional().describe('E-mail do decisor principal (opcional)'),
      contactPhone: z.string().optional().describe('Telefone do decisor principal (opcional)'),
    }),
  },
);
