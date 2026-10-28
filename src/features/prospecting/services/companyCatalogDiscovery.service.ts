import { ESTADO_OPTIONS } from '../../../shared/constants/icp-options.js';
import { container } from '../../../shared/di/container.js';
import type { ProspectCandidate, ProspectCriteria } from '../domain/prospectTypes.js';

interface CatalogRow {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnaePrincipal: string | null;
  cnaePrincipalDescricao: string | null;
  porte: string | null;
  municipioNome: string | null;
  uf: string | null;
  capitalSocial?: string | null;
  situacaoCadastral?: string;
  dataOrigin: string;
  competencia?: string;
}
export interface CompanyCatalogSearchResult {
  data: CatalogRow[];
  dataset: { competencia: string; source: string; activatedAt?: Date | null } | null;
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
export type CompanyCatalogSearch = (query: {
  q?: string;
  cnpj?: string;
  uf?: string;
  municipio?: string;
  cnae?: string;
  situacao: string | null;
  page: number;
  pageSize: number;
  sort: 'name';
}) => Promise<CompanyCatalogSearchResult>;

export async function discoverViaCompanyCatalog(criteria: ProspectCriteria): Promise<{
  candidates: ProspectCandidate[];
  available: boolean;
  meta?: CompanyCatalogSearchResult['meta'];
}> {
  const search = container.resolve<CompanyCatalogSearch>('CompanyCatalogSearch');
  const ufs = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];
  const stateIndex = ESTADO_OPTIONS.findIndex(
    (state) => state.toLowerCase() === criteria.estado?.toLowerCase(),
  );
  const uf =
    criteria.estado?.length === 2
      ? criteria.estado.toUpperCase()
      : stateIndex >= 0
        ? ufs[stateIndex]
        : undefined;
  if (criteria.estado && !uf) throw new Error('Estado não reconhecido pelo catálogo CNPJ');
  const result = await search({
    q: criteria.nomeEmpresa,
    cnpj: criteria.cnpj?.replace(/\D/g, ''),
    uf,
    municipio: criteria.cidade,
    cnae: criteria.segmentoDetalhes?.cnaePrincipal,
    situacao: 'ATIVA',
    page: criteria.pagina ?? 1,
    pageSize: criteria.quantidade,
    sort: 'name',
  });
  const queriedAt = new Date().toISOString();
  return {
    available: !!result.dataset,
    meta: result.meta,
    candidates: result.data
      .filter((row) => row.dataOrigin === 'OBSERVED')
      .map((row) => ({
        tradeName: row.nomeFantasia || row.razaoSocial,
        legalNameGuess: row.razaoSocial,
        cnpjGuess: row.cnpj,
        segment: row.cnaePrincipalDescricao ?? '',
        segmentObserved: !!row.cnaePrincipalDescricao,
        source: 'cnpjCatalog',
        size: row.porte ?? 'Não informado',
        location: [row.municipioNome, row.uf].filter(Boolean).join(', '),
        locationObserved: !!(row.municipioNome || row.uf),
        fitScoreEstimate: 0,
        suggestedContact: null,
        rationale: `Cadastro público CNPJ, competência ${result.dataset?.competencia ?? row.competencia ?? 'não informada'}`,
        companyData: {
          cnpj: row.cnpj,
          legalName: row.razaoSocial,
          tradeName: row.nomeFantasia,
          cnae: row.cnaePrincipal,
          cnaeDescription: row.cnaePrincipalDescricao,
          situacaoCadastral: row.situacaoCadastral,
          capitalSocial: row.capitalSocial,
          city: row.municipioNome,
          state: row.uf,
          competencia: result.dataset?.competencia,
        },
        provenance: Object.fromEntries(
          ['tradeName', 'legalNameGuess', 'cnpjGuess', 'segment', 'location', 'companyData'].map(
            (field) => [field, { source: 'cnpjCatalog', queriedAt, status: 'reported' as const }],
          ),
        ),
      })),
  };
}
