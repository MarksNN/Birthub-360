/**
 * Repositório em Memória / Prisma de Cache de Empresas (Passo 62 / Agente 05)
 * TTL de 30 dias para evitar requisições redundantes a provedores externos.
 */

export interface CachedCompany {
  cnpj: string;
  name: string;
  legalNature?: string;
  cachedAt: number;
}

export class PrismaCompanyCacheRepository {
  private cache = new Map<string, CachedCompany>();
  private readonly TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

  public async get(cnpj: string): Promise<CachedCompany | null> {
    const item = this.cache.get(cnpj);
    if (!item) return null;
    if (Date.now() - item.cachedAt > this.TTL_MS) {
      this.cache.delete(cnpj);
      return null;
    }
    return item;
  }

  public async set(company: Omit<CachedCompany, 'cachedAt'>): Promise<CachedCompany> {
    const record: CachedCompany = {
      ...company,
      cachedAt: Date.now(),
    };
    this.cache.set(company.cnpj, record);
    return record;
  }
}

export const companyCacheRepository = new PrismaCompanyCacheRepository();
