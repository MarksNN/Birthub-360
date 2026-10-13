import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma, withRlsContext } from '../../src/lib/prisma';
import { requestContext } from '../../src/lib/async-context';
import {
  SearchExecutionTracker,
  findSearchExecution,
} from '../../src/features/prospecting/services/searchExecution.service';

/**
 * Onda 42 (dossiê CPI, DEC-13): prova, contra Postgres real (RLS incluída), que
 * `ProspectingSearchExecution` — a tabela nova que sustenta o Search-ID rastreável — respeita
 * isolamento de tenant de verdade (FORCE ROW LEVEL SECURITY, não só um WHERE aplicado na
 * aplicação), e que `SearchExecutionTracker`/`findSearchExecution` gravam e leem um registro real
 * quando chamados dentro de um contexto de tenant autenticado.
 */
const ORG_A = 'test-org-search-exec-a';
const ORG_B = 'test-org-search-exec-b';

const asTenant = (org: string) => requestContext.enterWith({ tenantId: org });
const asBypass = () => requestContext.enterWith({ bypassRls: true });

async function cleanup() {
  for (const org of [ORG_A, ORG_B]) {
    asTenant(org);
    await prisma.prospectingSearchExecution.deleteMany({ where: { organizationId: org } });
    await prisma.savedSearch.deleteMany({ where: { organizationId: org } });
  }
  asBypass();
  await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
}

describe('ProspectingSearchExecution — Search-ID rastreável (Postgres real, RLS incluída)', () => {
  beforeAll(async () => {
    await cleanup();
    asBypass();
    await prisma.organization.create({ data: { id: ORG_A, name: 'Test Org Search Exec A' } });
    await prisma.organization.create({ data: { id: ORG_B, name: 'Test Org Search Exec B' } });
  });

  afterAll(cleanup);

  it('SearchExecutionTracker grava um registro real com providers/custo/status, e findSearchExecution lê de volta', async () => {
    asTenant(ORG_A);
    const tracker = new SearchExecutionTracker({
      organizationId: ORG_A,
      savedSearchId: null,
      criteria: { segmento: 'Transportadora', localizacao: 'São Paulo', quantidade: 10 },
      providerMode: 'hybrid',
    });
    tracker.recordProviderCall({ provider: 'apollo', resultCount: 5, status: 'ok' });
    tracker.recordProviderCall({ provider: 'google_places', resultCount: 3, status: 'ok' });
    await tracker.finish({ status: 'success', totalResults: 8 });

    const record = await findSearchExecution(tracker.searchId, ORG_A);
    expect(record).not.toBeNull();
    expect(record!.organizationId).toBe(ORG_A);
    expect(record!.status).toBe('success');
    expect(record!.totalResults).toBe(8);
    expect(record!.providersCalled).toHaveLength(2);
  });

  it('RLS real: execução gravada pelo tenant A nunca aparece numa leitura escopada ao tenant B', async () => {
    asTenant(ORG_A);
    const tracker = new SearchExecutionTracker({
      organizationId: ORG_A,
      savedSearchId: null,
      criteria: { segmento: 'Logística', localizacao: 'Rio de Janeiro', quantidade: 5 },
      providerMode: 'free',
    });
    await tracker.finish({ status: 'success', totalResults: 0 });

    const crossTenantRead = await findSearchExecution(tracker.searchId, ORG_B);
    expect(crossTenantRead).toBeNull();

    const ownTenantRead = await findSearchExecution(tracker.searchId, ORG_A);
    expect(ownTenantRead).not.toBeNull();
  });

  it('preserva filtros Turbo e proveniência da busca salva após releitura, com falha parcial', async () => {
    asTenant(ORG_A);
    const criteria = {
      segmento: 'Engenharia', localizacao: 'São Paulo', quantidade: 10,
      modoPesquisa: 'economico', autorizarPagos: false,
      segmentoDetalhes: { produtos: ['projetos'], palavrasExcluir: ['residencial'] },
      personas: [{ cargoPrincipal: 'Diretor', cargosEquivalentes: ['Head'], departamentos: ['Compras'] }],
    };
    const saved = await prisma.savedSearch.create({data: {name: 'Turbo RLS fixture', criteria, organizationId: ORG_A}});
    const tracker = new SearchExecutionTracker({organizationId: ORG_A, savedSearchId: saved.id, criteria, providerMode: 'free'});
    tracker.recordProviderCall({provider: 'nominatim', resultCount: 1, status: 'ok'});
    tracker.recordProviderCall({provider: 'brasilapi', resultCount: 0, status: 'error', errorMessage: 'Consulta temporariamente indisponível'});
    await tracker.finish({status: 'partial', totalResults: 1});

    const persistedSaved = await prisma.savedSearch.findFirst({where: {id: saved.id, organizationId: ORG_A}});
    const persisted = await findSearchExecution(tracker.searchId, ORG_A);
    expect(persistedSaved?.criteria).toEqual(criteria);
    expect(persisted?.criteria).toEqual(criteria);
    expect(persisted?.savedSearchId).toBe(saved.id);
    expect(persisted?.status).toBe('partial');
    expect(persisted?.totalResults).toBe(1);
    expect(Number(persisted?.costUsd)).toBe(0);
    expect(persisted?.providersCalled).toEqual([
      expect.objectContaining({provider: 'nominatim', status: 'ok', resultCount: 1}),
      expect.objectContaining({provider: 'brasilapi', status: 'error', resultCount: 0}),
    ]);

    asTenant(ORG_B);
    expect(await prisma.savedSearch.findFirst({where: {id: saved.id}})).toBeNull();
    const raw = await withRlsContext((tx) => tx.$queryRaw<Array<{id: string}>>`SELECT id FROM "ProspectingSearchExecution" WHERE id = ${tracker.searchId}`);
    expect(raw).toEqual([]);
    expect(await findSearchExecution(tracker.searchId, ORG_B)).toBeNull();
  });
});
