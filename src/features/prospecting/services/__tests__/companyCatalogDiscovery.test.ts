import { beforeEach, describe, expect, it, vi } from 'vitest';
import { container } from '../../../../shared/di/container.js';
import { discoverViaCompanyCatalog } from '../companyCatalogDiscovery.service.js';

const search = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  container.register('CompanyCatalogSearch', search);
});
describe('Descoberta cadastral: catálogo existente', () => {
  it('aplica razão/nome, CNAE, UF, município e paginação via contrato existente', async () => {
    search.mockResolvedValue({
      dataset: { competencia: '2026-09', source: 'Receita' },
      meta: { page: 2, total: 2, totalPages: 1, pageSize: 20 },
      data: [
        {
          cnpj: '00000000000191',
          razaoSocial: 'Banco Teste',
          nomeFantasia: 'Nome Público',
          cnaePrincipal: '1234567',
          cnaePrincipalDescricao: 'Atividade',
          porte: 'Grande',
          municipioNome: 'São Paulo',
          uf: 'SP',
          dataOrigin: 'OBSERVED',
        },
        { cnpj: '11111111111111', razaoSocial: 'DEMO', dataOrigin: 'SIMULATED' },
      ],
    });
    const result = await discoverViaCompanyCatalog({
      segmento: '',
      localizacao: '',
      quantidade: 20,
      nomeEmpresa: 'Banco',
      cidade: 'São Paulo',
      estado: 'São Paulo',
      pagina: 2,
      segmentoDetalhes: { cnaePrincipal: '1234567' },
    });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'Banco',
        cnae: '1234567',
        uf: 'SP',
        municipio: 'São Paulo',
        page: 2,
      }),
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].tradeName).toBe('Nome Público');
    expect(result.candidates[0].source).toBe('cnpjCatalog');
    expect(result.candidates[0].provenance?.cnpjGuess.source).toBe('cnpjCatalog');
    expect(result.candidates[0].companyData?.competencia).toBe('2026-09');
  });
  it('não confunde ausência do snapshot com catálogo vazio disponível', async () => {
    search.mockResolvedValue({
      dataset: null,
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    expect(
      (await discoverViaCompanyCatalog({ segmento: '', localizacao: '', quantidade: 20 }))
        .available,
    ).toBe(false);
  });
});
