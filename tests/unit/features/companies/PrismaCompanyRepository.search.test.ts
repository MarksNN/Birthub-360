import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    ENABLE_SEARCH: true,
  },
}));

vi.mock('@/lib/search/index', () => ({
  searchCompaniesPage: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { env } from '@/config/env';
import { searchCompaniesPage } from '@/lib/search/index';
import { PrismaCompanyRepository } from '@/features/companies/infra/PrismaCompanyRepository';

describe('PrismaCompanyRepository — Full-Text Search e Paginação (DEBT-UX-002)', () => {
  const repository = new PrismaCompanyRepository();
  const ORG = 'org-tenant-1';

  beforeEach(() => {
    vi.clearAllMocks();
    (env as any).ENABLE_SEARCH = true;
  });

  it('busca com 45 resultados e limite 20: pagina corretamente páginas 1, 2 e 3 sem truncar página 2', async () => {
    // 45 IDs gerados
    const allIds = Array.from({ length: 45 }, (_, i) => `comp-${i + 1}`);

    // Mock searchCompaniesPage para página 1 (offset 0, limit 20)
    (searchCompaniesPage as any).mockImplementation(
      async (_orgId: string, _query: string, limit: number, offset: number) => {
        const slice = allIds.slice(offset, offset + limit);
        return {
          ids: slice,
          total: allIds.length,
        };
      },
    );

    // Mock prisma.company.findMany para devolver registros com os IDs solicitados
    (prisma.company.findMany as any).mockImplementation(async ({ where }: any) => {
      const ids: string[] = where.id.in;
      return ids.map((id) => ({
        id,
        organizationId: ORG,
        legalName: `Empresa ${id}`,
        tradeName: `Trade ${id}`,
        cnpj: '12345678000199',
        status: 'ACTIVE',
        contacts: [],
        leads: [],
      }));
    });

    // Página 1 (skip = 0, limit = 20)
    const page1 = await repository.findAllWithFilters(ORG, 'Empresa', 1, 20);

    expect(searchCompaniesPage).toHaveBeenCalledWith(ORG, 'Empresa', 20, 0);
    expect(page1.data).toHaveLength(20);
    expect(page1.data[0].id).toBe('comp-1');
    expect(page1.data[19].id).toBe('comp-20');
    expect(page1.meta).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });

    // Página 2 (skip = 20, limit = 20) — NÃO deve retornar vazio!
    const page2 = await repository.findAllWithFilters(ORG, 'Empresa', 2, 20);

    expect(searchCompaniesPage).toHaveBeenCalledWith(ORG, 'Empresa', 20, 20);
    expect(page2.data).toHaveLength(20);
    expect(page2.data[0].id).toBe('comp-21');
    expect(page2.data[19].id).toBe('comp-40');
    expect(page2.meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });

    // Página 3 (skip = 40, limit = 20)
    const page3 = await repository.findAllWithFilters(ORG, 'Empresa', 3, 20);

    expect(searchCompaniesPage).toHaveBeenCalledWith(ORG, 'Empresa', 20, 40);
    expect(page3.data).toHaveLength(5);
    expect(page3.data[0].id).toBe('comp-41');
    expect(page3.data[4].id).toBe('comp-45');
    expect(page3.meta).toEqual({
      page: 3,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('preserva a ordem de relevância retornada pelo Meilisearch mesmo que o banco retorne em ordem arbitrária', async () => {
    const meiliIds = ['comp-3', 'comp-1', 'comp-2'];
    (searchCompaniesPage as any).mockResolvedValueOnce({
      ids: meiliIds,
      total: 3,
    });

    // Banco devolve em ordem diferente (ex: ordenada por createdAt ou id)
    (prisma.company.findMany as any).mockResolvedValueOnce([
      { id: 'comp-1', organizationId: ORG, legalName: 'Comp 1', contacts: [], leads: [] },
      { id: 'comp-2', organizationId: ORG, legalName: 'Comp 2', contacts: [], leads: [] },
      { id: 'comp-3', organizationId: ORG, legalName: 'Comp 3', contacts: [], leads: [] },
    ]);

    const result = await repository.findAllWithFilters(ORG, 'software', 1, 10);

    // Ordem deve seguir a de meiliIds: comp-3, comp-1, comp-2
    expect(result.data.map((c) => c.id)).toEqual(['comp-3', 'comp-1', 'comp-2']);
  });

  it('retorna array vazio e total 0 quando o Meilisearch não encontra nenhum resultado, sem chamar o banco', async () => {
    (searchCompaniesPage as any).mockResolvedValueOnce({
      ids: [],
      total: 0,
    });

    const result = await repository.findAllWithFilters(ORG, 'termo-inexistente', 1, 20);

    expect(result.data).toEqual([]);
    expect((result.meta as any).total).toBe(0);
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });

  it('quando o Meilisearch está indisponível (retorna null), faz fallback seguro para consulta SQL no Postgres', async () => {
    (searchCompaniesPage as any).mockResolvedValueOnce(null);

    const mockRows = [
      { id: 'comp-fb-1', organizationId: ORG, legalName: 'Fallback Ltda', contacts: [], leads: [] },
    ];
    (prisma.$transaction as any).mockResolvedValueOnce([mockRows, 1]);

    const result = await repository.findAllWithFilters(ORG, 'Fallback 12.345.678/0001-99', 1, 20);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('comp-fb-1');
    expect((result.meta as any).total).toBe(1);
  });
});
