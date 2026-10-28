import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apollo: vi.fn(),
  places: vi.fn(),
  nominatim: vi.fn(),
  cnpj: vi.fn(),
  catalog: vi.fn(),
  company: vi.fn(),
  rejections: vi.fn(),
  enrich: vi.fn(),
  finish: vi.fn(),
}));
vi.mock('../../../../config/prospecting-integrations.js', () => ({
  getProspectingProviderMode: () => 'hybrid',
}));
vi.mock('../../../../lib/prisma.js', () => ({
  prisma: {
    company: { findMany: mocks.company },
    prospectRejection: { findMany: mocks.rejections },
  },
}));
vi.mock('../../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('../apollo.service.js', () => ({ fetchApolloCandidates: mocks.apollo }));
vi.mock('../places.service.js', () => ({ searchGooglePlacesCandidates: mocks.places }));
vi.mock('../nominatim.service.js', () => ({ searchNominatimCandidates: mocks.nominatim }));
vi.mock('../companyCatalogDiscovery.service.js', () => ({
  discoverViaCompanyCatalog: mocks.catalog,
}));
vi.mock('../enrichment/cnpjLookup.js', () => ({ fetchCnpjData: mocks.cnpj }));
vi.mock('../prospecting/qualityEnrichment.js', () => ({
  enrichCandidatesWithQualityData: mocks.enrich,
}));
vi.mock('../providerCostMetrics.js', () => ({ getCostPerCallUsd: () => 0 }));
vi.mock('../providerRateLimit.js', () => ({ getRateLimitPerMinute: () => 30 }));
vi.mock('../searchExecution.service.js', () => ({
  SearchExecutionTracker: class {
    searchId = 'search-test';
    providerCalls: Array<Record<string, unknown>> = [];
    recordProviderCall(call: Record<string, unknown>) {
      this.providerCalls.push({ ...call, costUsd: 0 });
    }
    finish = mocks.finish;
  },
}));

import { discoverCandidates } from '../prospecting/discovery.js';

const criteria = { segmento: 'Tecnologia', localizacao: 'Brasil', quantidade: 10 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.company.mockResolvedValue([]);
  mocks.rejections.mockResolvedValue([]);
  mocks.nominatim.mockResolvedValue([]);
  mocks.apollo.mockResolvedValue({ candidates: [] });
  mocks.places.mockResolvedValue([]);
  mocks.enrich.mockResolvedValue(undefined);
  mocks.finish.mockResolvedValue(undefined);
});
describe('Turbo: execução multiprovedor segura', () => {
  it('sem consentimento não chama Apollo, Google ou enriquecimento pago', async () => {
    await discoverCandidates(criteria, 'tenant-a');
    expect(mocks.apollo).not.toHaveBeenCalled();
    expect(mocks.places).not.toHaveBeenCalled();
    expect(mocks.enrich).not.toHaveBeenCalled();
    expect(mocks.nominatim).toHaveBeenCalledOnce();
    expect(mocks.company).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-a' },
      select: { tradeName: true, website: true },
    });
  });
  it('econômico bloqueia provedores pagos mesmo com flag autorização', async () => {
    await discoverCandidates({ ...criteria, modoPesquisa: 'economico', autorizarPagos: true });
    expect(mocks.apollo).not.toHaveBeenCalled();
    expect(mocks.places).not.toHaveBeenCalled();
  });
  it('preserva resultados válidos e expõe falha parcial sanitizada', async () => {
    mocks.nominatim.mockRejectedValue(new Error('token=secret-pii'));
    mocks.apollo.mockResolvedValue({
      candidates: [
        {
          tradeName: 'Tech',
          legalNameGuess: null,
          cnpjGuess: null,
          segment: 'Tecnologia',
          segmentObserved: true,
          size: 'Não informado',
          location: 'Brasil',
          fitScoreEstimate: 70,
          suggestedContact: null,
          rationale: 'Apollo',
          source: 'apollo',
        },
      ],
    });
    const result = await discoverCandidates({ ...criteria, quantidade: 20, autorizarPagos: true });
    expect(result.candidates).toHaveLength(1);
    expect(result.partialFailures?.[0].message).not.toContain('secret');
    expect(result.partialFailures?.[0].provider).toBe('nominatim');
  });
  it('consulta CNPJ direto sem gastar créditos dos provedores de descoberta', async () => {
    mocks.cnpj.mockResolvedValue({
      found: true,
      cnpj: '00.000.000/0001-91',
      data: {
        tradeName: 'Empresa Cadastral',
        legalName: 'Empresa Cadastral SA',
        cnae: '1234567',
        cnaeDescription: 'Atividade',
        size: 'Grande',
        city: 'Brasília',
        state: 'DF',
        phones: [],
        emails: [],
      },
    });
    const result = await discoverCandidates({ ...criteria, cnpj: '00000000000191' });
    expect(result.candidates[0].companyData?.cnpj).toBe('00.000.000/0001-91');
    expect(mocks.nominatim).not.toHaveBeenCalled();
    expect(mocks.apollo).not.toHaveBeenCalled();
  });
  it('CNAE sem snapshot produz falha explícita e nenhuma chamada externa', async () => {
    mocks.catalog.mockResolvedValue({ available: false, candidates: [] });
    const result = await discoverCandidates({
      ...criteria,
      autorizarPagos: true,
      segmentoDetalhes: { cnaePrincipal: '1234567' },
    });
    expect(result.candidates).toHaveLength(0);
    expect(result.partialFailures?.[0].message).toContain('snapshot CNPJ');
    expect(mocks.apollo).not.toHaveBeenCalled();
    expect(mocks.places).not.toHaveBeenCalled();
    expect(mocks.nominatim).not.toHaveBeenCalled();
  });
});
