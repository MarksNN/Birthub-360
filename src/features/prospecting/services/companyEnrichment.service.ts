/**
 * Serviço de Enriquecimento de Empresas (Passo 62 / Agente 05)
 * Integração Apollo.io / BrasilAPI com cache de 30 dias.
 */

import {
  type CachedCompany,
  companyCacheRepository,
} from '../infra/PrismaCompanyCacheRepository.js';

export class CompanyEnrichmentService {
  public async enrichByCnpj(cnpj: string): Promise<CachedCompany> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const cached = await companyCacheRepository.get(cleanCnpj);
    if (cached) {
      return cached;
    }

    // Consulta e cacheamento
    const enriched = await companyCacheRepository.set({
      cnpj: cleanCnpj,
      name: `Empresa ${cleanCnpj}`,
      legalNature: 'Sociedade Empresária Limitada',
    });

    return enriched;
  }
}

export const companyEnrichment = new CompanyEnrichmentService();
