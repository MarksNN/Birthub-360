import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';
import { discoverCandidates } from '../../prospecting/services/prospecting/discovery.js';
import type { ProspectCriteria } from '../../prospecting/domain/prospectTypes.js';

/**
 * Ferramenta de Discovery de Empresas para o BDR do Swarm.
 * 
 * Permite que o BDR descubra empresas com filtros estruturados usando
 * o sistema de prospecção existente (Apollo, Google Places, OpenStreetMap, BrasilAPI).
 * 
 * Filtros suportados:
 * - segmento: ramo de atuação (ex: "suplementação")
 * - faturamentoMin/faturamentoMax: faturamento anual em USD
 * - porte: faixa de funcionários (ex: "11,50" para 11-50 funcionários)
 * - palavrasChave: termos adicionais (ex: "e-commerce, loja física")
 * - localizacao: região/estado/cidade
 * - quantidade: número de empresas a descobrir
 */
export const companyDiscoveryTool = tool(
  async ({ segmento, faturamentoMin, faturamentoMax, porte, palavrasChave, localizacao, quantidade, estado, cidade }) => {
    try {
      logger.info(
        { segmento, faturamentoMin, faturamentoMax, porte, localizacao, quantidade },
        '[CompanyDiscoveryTool] Iniciando discovery de empresas',
      );

      const criteria: ProspectCriteria = {
        segmento,
        localizacao,
        quantidade: quantidade || 10,
        modoPesquisa: 'equilibrado',
        autorizarPagos: true,
      };

      // Adicionar filtros opcionais
      if (faturamentoMin) criteria.faturamentoMin = faturamentoMin;
      if (faturamentoMax) criteria.faturamentoMax = faturamentoMax;
      if (porte) criteria.porte = porte;
      if (palavrasChave) criteria.palavrasChave = palavrasChave;
      if (estado) criteria.estado = estado;
      if (cidade) criteria.cidade = cidade;

      // Converter faturamento de R$ para USD (aprox 1 USD = 5 R$)
      if (faturamentoMin) criteria.faturamentoMin = faturamentoMin / 5;
      if (faturamentoMax) criteria.faturamentoMax = faturamentoMax / 5;

      const result = await discoverCandidates(criteria);

      logger.info(
        { candidatesCount: result.candidates.length, sources: result.sources },
        '[CompanyDiscoveryTool] Discovery concluído',
      );

      // Formatar resultado para o BDR
      const summary = result.candidates.map((c, idx) => ({
        rank: idx + 1,
        nome: c.tradeName,
        razaoSocial: c.legalNameGuess || 'Não informado',
        cnpj: c.cnpjGuess || 'Não informado',
        segmento: c.segment,
        porte: c.size,
        localizacao: c.location,
        fitScore: c.fitScoreEstimate,
        website: c.website || 'Não informado',
        telefone: c.phone || 'Não informado',
        fonte: c.source,
        justificativa: c.rationale,
        faturamentoEstimado: c.annualRevenue 
          ? `US$ ${c.annualRevenue.toLocaleString()} (~R$ ${(c.annualRevenue * 5).toLocaleString()})`
          : 'Não informado',
        decisores: c.decisionMakers?.length 
          ? `${c.decisionMakers.length} decisores encontrados`
          : 'Não identificados',
      }));

      return JSON.stringify({
        success: true,
        totalEncontrado: result.candidates.length,
        filtrosUsados: criteria,
        empresas: summary,
        fonte: result.sources,
        custoEstimado: result.costSummary,
      }, null, 2);
    } catch (error: any) {
      logger.error({ err: error }, '[CompanyDiscoveryTool] Erro no discovery');
      return JSON.stringify({
        success: false,
        erro: error.message || 'Falha ao descobrir empresas',
      }, null, 2);
    }
  },
  {
    name: 'company_discovery',
    description: `Descobre empresas com filtros estruturados usando Apollo, Google Places e BrasilAPI.
    
    Filtros disponíveis:
    - segmento: ramo de atuação (ex: "suplementação", "logística", "varejo")
    - faturamentoMin: faturamento anual mínimo em R$
    - faturamentoMax: faturamento anual máximo em R$
    - porte: faixa de funcionários no formato "min,max" (ex: "11,50" para 11-50, "51,200" para 51-200)
    - palavrasChave: termos adicionais separados por vírgula (ex: "e-commerce, loja física, delivery")
    - localizacao: região ou estado (ex: "São Paulo", "Rio de Janeiro", "Brasil")
    - estado: estado específico (ex: "São Paulo", "Rio de Janeiro")
    - cidade: cidade específica (ex: "São Paulo", "Rio de Janeiro")
    - quantidade: número de empresas a descobrir (padrão: 10)
    
    Retorna lista de empresas com nome, CNPJ, segmento, porte, localização, fit score, website, telefone e fonte.
    
    Exemplo de uso para o caso solicitado:
    - segmento: "suplementação"
    - faturamentoMin: 1000000 (R$ 1 milhão)
    - porte: "11,50" (mais de 10 funcionários)
    - palavrasChave: "e-commerce, loja física"
    - quantidade: 10`,
    schema: z.object({
      segmento: z.string().describe('Ramo de atuação da empresa (ex: "suplementação", "logística")'),
      faturamentoMin: z.number().optional().describe('Faturamento anual mínimo em R$'),
      faturamentoMax: z.number().optional().describe('Faturamento anual máximo em R$'),
      porte: z.string().optional().describe('Faixa de funcionários no formato "min,max" (ex: "11,50")'),
      palavrasChave: z.string().optional().describe('Termos adicionais separados por vírgula (ex: "e-commerce, loja física")'),
      localizacao: z.string().describe('Região ou estado (ex: "São Paulo", "Rio de Janeiro", "Brasil")'),
      estado: z.string().optional().describe('Estado específico (ex: "São Paulo", "Rio de Janeiro")'),
      cidade: z.string().optional().describe('Cidade específica (ex: "São Paulo", "Rio de Janeiro")'),
      quantidade: z.number().optional().describe('Número de empresas a descobrir (padrão: 10)'),
    }),
  },
);
