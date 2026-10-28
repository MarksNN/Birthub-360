import { getProspectingProviderMode } from '../../../../config/prospecting-integrations.js';
import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';
import { buildLocationLabel } from '../../domain/prospectTypes.js';
import {
  type ProviderPlanStep,
  planCompanyDiscovery,
  planShortfallFallback,
} from '../../domain/queryPlanner.js';
import { evaluateCandidateRequirements } from '../../domain/requirementEngine.js';
import { buildSearchIntent } from '../../domain/searchIntent.js';
import {
  annotateTurboCandidate,
  getTurboFilterWarnings,
  hasUnavailableDiscoveryFilter,
  matchesTurboLocalFilters,
} from '../../domain/turboQuality.js';
import { ExclusionSet } from '../../utils/exclusionSet.js';
import { fetchApolloCandidates } from '../apollo.service.js';
import { discoverViaCompanyCatalog } from '../companyCatalogDiscovery.service.js';
import { fetchCnpjData } from '../enrichment/cnpjLookup.js';
import { searchNominatimCandidates } from '../nominatim.service.js';
import { searchGooglePlacesCandidates } from '../places.service.js';
import { type SearchExecutionStatus, SearchExecutionTracker } from '../searchExecution.service.js';
import { enrichCandidatesWithQualityData } from './qualityEnrichment.js';
import type { DiscoverResult, ProspectCandidate, ProspectCriteria } from './types.js';

export { buildLocationLabel };

/** Monta a pesquisa nominal para Google Places/OpenStreetMap, combinando livremente nome, segmento, palavra-chave e localização. */
function buildPlacesQuery(criteria: ProspectCriteria): string {
  const companyOrPlace = criteria.nomeEmpresa?.trim();
  const segment = criteria.segmento?.trim();
  const location = buildLocationLabel(criteria)?.trim();
  const keywords = criteria.palavrasChave?.trim();
  const icp = criteria.icp?.trim();
  const details = criteria.segmentoDetalhes;
  const detailTerms = [
    details?.subsegmento,
    details?.nicho,
    ...(details?.produtos ?? []),
    ...(details?.servicos ?? []),
    ...(details?.palavrasObrigatorias ?? []),
    ...(details?.palavrasOpcionais ?? []),
  ];

  // Combina os termos relevantes (exclui persona/decisorCargos da busca geográfica, pois foca em serviços/empresas)
  const terms = [companyOrPlace, segment, icp, keywords, ...detailTerms].filter(Boolean);
  const term = terms.length > 0 ? terms.join(' ') : 'Empresa';

  return [term, location ? `em ${location}` : null].filter(Boolean).join(' ');
}

/**
 * Descoberta via Google Places (New) Text Search — empresas reais, sem IA generativa envolvida.
 * Exportada (além de usada pelo orquestrador `discoverCandidates`) porque é a base da ferramenta
 * standalone "Google Places" (`prospecting-tools.routes.ts`) — já é 100% single-provider, não
 * precisa de nenhuma outra função pra "isolar" a fonte.
 */
export async function discoverViaGooglePlaces(
  criteria: ProspectCriteria,
  count: number,
  exclusions: ExclusionSet,
): Promise<ProspectCandidate[]> {
  const query = buildPlacesQuery(criteria);
  const places = await searchGooglePlacesCandidates(query, count + exclusions.size);

  return places
    .filter((p) => !exclusions.has(p.tradeName, p.website))
    .slice(0, count)
    .map((p) => ({
      tradeName: p.tradeName,
      legalNameGuess: null,
      cnpjGuess: null,
      segment: criteria.segmento,
      // Google Places não classifica indústria/segmento — `segment` acima é só o critério pedido
      // ecoado, nunca um dado observado (ver Requirement Engine, `domain/requirementEngine.ts`).
      segmentObserved: false,
      source: 'googlePlaces',
      size: 'Não informado',
      location: [p.city, p.state].filter(Boolean).join(', '),
      locationObserved: !!(p.city || p.state),
      fitScoreEstimate: p.rating ? Math.round(Math.min(100, p.rating * 20)) : 60,
      suggestedContact: null,
      rationale: p.rating
        ? `Encontrado via Google Places — nota ${p.rating} (${p.userRatingCount || 0} avaliações)`
        : 'Encontrado via Google Places',
      website: p.website || null,
      phone: p.phone || null,
    }));
}

/** Descoberta via OpenStreetMap (Nominatim) — alternativa livre para dados geográficos. */
async function discoverViaNominatim(
  criteria: ProspectCriteria,
  count: number,
  exclusions: ExclusionSet,
): Promise<ProspectCandidate[]> {
  const query = buildPlacesQuery(criteria);
  const places = await searchNominatimCandidates(query, count + exclusions.size);

  return places
    .filter((p) => !exclusions.has(p.tradeName, p.website))
    .slice(0, count)
    .map((p) => ({
      tradeName: p.tradeName,
      legalNameGuess: null,
      cnpjGuess: null,
      segment: criteria.segmento,
      // Mesma honestidade do mapper de Google Places acima: Nominatim não classifica indústria.
      segmentObserved: false,
      source: 'nominatim',
      size: 'Não informado',
      location: [p.city, p.state].filter(Boolean).join(', '),
      locationObserved: !!(p.city || p.state),
      fitScoreEstimate: 60,
      suggestedContact: null,
      rationale: 'Encontrado via OpenStreetMap (Nominatim)',
      website: p.website ?? null,
      phone: p.phone ?? null,
    }));
}

/**
 * Empresas já cadastradas no CRM deste tenant + candidatos explicitamente rejeitados
 * ("Não é esse perfil") — usado para excluir da descoberta empresas que o vendedor já viu/salvou
 * ou já descartou antes. Sem isso, uma busca repetida com os mesmos filtros amplos (ex:
 * "Transportadora" + "São Paulo") sempre resurfaceava as mesmas ~10 empresas de maior relevância
 * na Apollo, mesmo depois de já promovidas a lead ou marcadas como fora do perfil — era a causa
 * principal do motor de busca "sempre trazer os mesmos contatos".
 */
export async function fetchKnownExclusions(organizationId: string): Promise<ExclusionSet> {
  const exclusions = new ExclusionSet();
  try {
    const [companies, rejections] = await Promise.all([
      prisma.company.findMany({
        where: { organizationId },
        select: { tradeName: true, website: true },
      }),
      prisma.prospectRejection.findMany({
        where: { organizationId },
        select: { tradeName: true, website: true },
      }),
    ]);
    for (const c of companies) exclusions.add(c.tradeName, c.website);
    for (const r of rejections) exclusions.add(r.tradeName, r.website);
  } catch (error: any) {
    logger.error(
      { err: error },
      'Falha ao buscar empresas já cadastradas/rejeitadas para excluir da descoberta',
    );
  }
  return exclusions;
}

/**
 * Executa UM passo do `QueryPlan` (`domain/queryPlanner.ts`) contra o provider real que ele indica
 * — o único lugar que ainda conhece as três funções concretas de busca (`fetchApolloCandidates`,
 * `discoverViaGooglePlaces`, `discoverViaNominatim`). O planner decide QUAIS providers chamar, com
 * que cota e em que ordem; este dispatcher só traduz essa decisão em chamada real, normalizando o
 * retorno de cada provider (só a Apollo hoje devolve `error` junto dos candidatos) para o mesmo
 * formato `{ candidates, error? }`.
 */
async function executeDiscoveryStep(
  step: ProviderPlanStep,
  criteria: ProspectCriteria,
  exclusions: ExclusionSet,
): Promise<{ candidates: ProspectCandidate[]; error?: string }> {
  switch (step.provider) {
    case 'apollo':
      return fetchApolloCandidates(criteria, step.quota, exclusions);
    case 'googlePlaces':
      return { candidates: await discoverViaGooglePlaces(criteria, step.quota, exclusions) };
    case 'nominatim':
      return { candidates: await discoverViaNominatim(criteria, step.quota, exclusions) };
  }
}

// Onda 42 (DEC-12+DEC-13): a ORDEM e a COTA de cada provider deixaram de ser um array hardcoded e
// passaram a ser uma decisão explícita do QueryPlanner (`domain/queryPlanner.ts`) — dado o mesmo
// `SearchIntent` e `providerMode`, `planCompanyDiscovery` devolve o MESMO cascade que existia antes
// (Apollo → Google Places → Nominatim, com a mesma aritmética de cota), só que agora nomeado,
// comentado e testado (ver queryPlanner.test.ts). Cada chamada de provider real, tanto na leva
// primária quanto no fallback, também alimenta o `SearchExecutionTracker` (DEC-13) — o Search-ID
// rastreável amarra critério → providers chamados → resultados → custo de ponta a ponta.
function trackerProviderName(provider: ProviderPlanStep['provider']): string {
  return provider === 'googlePlaces' ? 'google_places' : provider;
}

/**
 * Descoberta de candidatos: combina Apollo.io, Google Places e OpenStreetMap (Nominatim), na
 * ordem/cota que o `QueryPlanner` (`domain/queryPlanner.ts`) decidir para o `SearchIntent` desta
 * busca — nenhuma chamada a modelos generativos. Cada candidato ainda passa pelo pipeline de
 * enriquecimento real (Receita Federal + Google Places + Apollo People) antes de virar um Lead confiável.
 * `organizationId`, quando informado, exclui do resultado empresas já cadastradas no CRM do tenant
 * ou já rejeitadas (ver `fetchKnownExclusions`) — opcional só para não quebrar chamadas de teste
 * sem tenant. Quando `criteria.cidade` é informado, uma fatia da cota é sempre reservada pro
 * Google Places (precisão geográfica real), em vez de só entrar como fallback se a Apollo não
 * preencher a cota sozinha. `criteria.pagina` avança pro próximo lote do ranking da Apollo.
 */
export async function discoverCandidates(
  criteria: ProspectCriteria,
  organizationId?: string,
  /** Onda 42 (dossiê CPI, DEC-13, opção A): id da SavedSearch cuja reexecução gerou esta busca,
   * quando aplicável (ver `/saved-searches/:id/run` em prospecting.routes.ts) — nunca inferido,
   * só passado quando o chamador realmente sabe a origem. Persistido no
   * ProspectingSearchExecution como relação opcional para amarrar "esta execução veio desta
   * busca salva". */
  savedSearchId?: string | null,
): Promise<DiscoverResult> {
  // `SearchIntent` normaliza `criteria.quantidade` (clamp a MAX_LEADS_PER_SEARCH) da mesma forma
  // que este serviço já fazia antes — `total` é só um apelido local de `intent.quantityRequested`
  // para o restante da função (ranking/corte final) não precisar recalcular o mesmo clamp.
  const intent = buildSearchIntent({
    ...criteria,
    decisorCargos: [
      ...(criteria.decisorCargos ?? []),
      ...(criteria.personas ?? []).flatMap((p) => [
        p.cargoPrincipal ?? '',
        ...(p.cargosEquivalentes ?? []),
      ]),
    ].filter(Boolean),
  });
  const total = intent.quantityRequested;
  const configuredMode = getProspectingProviderMode();
  const paidAllowed =
    configuredMode === 'hybrid' &&
    criteria.modoPesquisa !== 'economico' &&
    criteria.autorizarPagos === true;
  const providerMode = paidAllowed ? configuredMode : 'free';
  // Search-ID gerado ANTES de qualquer chamada a provider — precisa existir mesmo que a busca
  // falhe logo no início, para os logs estruturados da execução inteira poderem carregá-lo.
  const tracker = new SearchExecutionTracker({
    organizationId,
    savedSearchId: savedSearchId ?? null,
    criteria,
    providerMode,
  });

  try {
    const allCandidates: ProspectCandidate[] = [];
    const exclusions = organizationId
      ? await fetchKnownExclusions(organizationId)
      : new ExclusionSet();

    if (criteria.excludeNames && criteria.excludeNames.length > 0) {
      for (const name of criteria.excludeNames) {
        exclusions.add(name);
      }
    }

    let apolloError: string | undefined;

    function absorb(found: ProspectCandidate[]) {
      for (const candidate of found) {
        if (exclusions.has(candidate.tradeName, candidate.website)) continue;
        exclusions.add(candidate.tradeName, candidate.website);
        allCandidates.push(candidate);
      }
    }

    // A leva primária continua rodando em PARALELO — o plano decide QUEM e QUANTO, não quando;
    // o tempo de resposta ultrarrápido (Promise.allSettled) é preservado.
    const plan = planCompanyDiscovery(intent, providerMode);
    if (!paidAllowed)
      plan.steps = [
        {
          provider: 'nominatim',
          quota: Math.min(total, 8),
          score: 0,
          reasons: ['Modo econômico: sem consultas pagas'],
        },
      ];
    const filterWarnings = getTurboFilterWarnings(criteria, paidAllowed);
    const catalogSearchRequested =
      !criteria.cnpj && !!(criteria.nomeEmpresa || criteria.segmentoDetalhes?.cnaePrincipal);
    if (hasUnavailableDiscoveryFilter(criteria)) plan.steps = [];
    if (catalogSearchRequested && !hasUnavailableDiscoveryFilter(criteria)) {
      try {
        const catalog = await discoverViaCompanyCatalog(criteria);
        absorb(catalog.candidates);
        tracker.recordProviderCall({
          provider: 'cnpj_catalog',
          resultCount: catalog.candidates.length,
          status: catalog.available ? 'ok' : 'error',
          errorMessage: catalog.available ? undefined : 'Nenhum snapshot CNPJ publicado disponível',
        });
        if (criteria.segmentoDetalhes?.cnaePrincipal) plan.steps = [];
      } catch {
        tracker.recordProviderCall({
          provider: 'cnpj_catalog',
          resultCount: 0,
          status: 'error',
          errorMessage: 'Catálogo CNPJ indisponível; cadastro por nome/CNAE não consultado',
        });
        if (criteria.segmentoDetalhes?.cnaePrincipal) plan.steps = [];
      }
    }
    if (criteria.cnpj && !hasUnavailableDiscoveryFilter(criteria)) {
      plan.steps = [];
      const result = await fetchCnpjData(criteria.cnpj);
      tracker.recordProviderCall({
        provider: 'brasilapi',
        resultCount: result.found ? 1 : 0,
        status: result.error && result.error !== 'not_found' ? 'error' : 'ok',
        errorMessage: result.error,
      });
      if (result.found && result.data) {
        const data = result.data;
        absorb([
          {
            source: 'brasilapi',
            tradeName: data.tradeName,
            legalNameGuess: data.legalName,
            cnpjGuess: result.cnpj,
            segment: data.cnaeDescription,
            segmentObserved: true,
            size: data.size,
            location: [data.city, data.state].join(', '),
            locationObserved: true,
            fitScoreEstimate: 0,
            suggestedContact: null,
            rationale: 'Cadastro consultado via BrasilAPI',
            phone: data.phones[0] ?? null,
            emails: data.emails,
            companyData: {
              legalName: data.legalName,
              tradeName: data.tradeName,
              cnpj: result.cnpj,
              cnae: data.cnae,
              cnaeDescription: data.cnaeDescription,
              situacaoCadastral: data.situacaoCadastral,
              naturezaJuridica: data.naturezaJuridica,
              capitalSocial: data.capitalSocial,
              dataAbertura: data.dataAbertura,
              address: data.address,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
            },
            provenance: {
              cnpjGuess: {
                source: 'brasilapi',
                queriedAt: new Date().toISOString(),
                status: 'reported',
              },
            },
          },
        ]);
      }
    }
    const results = await Promise.allSettled(
      plan.steps.map((step) => executeDiscoveryStep(step, criteria, exclusions)),
    );

    // A ordem de absorção segue `plan.steps` (maior prioridade primeiro) — quando o mesmo nome
    // de empresa aparece em mais de um provider da leva, o resultado do provider mais
    // prioritário "vence" o dedupe (ver `scoreProvider` em queryPlanner.ts). Mesmo comportamento
    // do cascade anterior (Apollo antes de Google Places antes de Nominatim), só que a ordem
    // agora vem do plano, não da posição literal no array de código.
    plan.steps.forEach((step, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        absorb(result.value.candidates);
        if (step.provider === 'apollo') apolloError = result.value.error;
        tracker.recordProviderCall({
          provider: trackerProviderName(step.provider),
          resultCount: result.value.candidates.length,
          status: result.value.error ? 'error' : 'ok',
          errorMessage: result.value.error,
        });
      } else {
        if (step.provider === 'apollo') apolloError = 'Apollo indisponível durante a consulta';
        tracker.recordProviderCall({
          provider: trackerProviderName(step.provider),
          resultCount: 0,
          status: 'error',
          errorMessage: `Falha na consulta ${step.provider}; tente novamente mais tarde`,
        });
      }
    });

    // Se faltarem candidatos para completar a cota desejada, o planner decide se (e como)
    // reforçar — mesma regra do cascade anterior: só em modo 'hybrid', sempre via Google Places.
    const fallbackStep =
      paidAllowed &&
      !criteria.cnpj &&
      !criteria.segmentoDetalhes?.cnaePrincipal &&
      !hasUnavailableDiscoveryFilter(criteria)
        ? planShortfallFallback(intent, providerMode, allCandidates.length)
        : null;
    if (fallbackStep) {
      try {
        const fallbackResult = await executeDiscoveryStep(fallbackStep, criteria, exclusions);
        absorb(fallbackResult.candidates);
        tracker.recordProviderCall({
          provider: trackerProviderName(fallbackStep.provider),
          resultCount: fallbackResult.candidates.length,
          status: 'ok',
        });
      } catch {
        tracker.recordProviderCall({
          provider: trackerProviderName(fallbackStep.provider),
          resultCount: 0,
          status: 'error',
          errorMessage: 'Falha no fallback do Google Places',
        });
      }
    }

    const finalCandidates = allCandidates
      .filter((candidate) => matchesTurboLocalFilters(candidate, criteria))
      .slice(0, total);

    // Enriquecimento de qualidade (CNPJ, decisores + LinkedIn/e-mail/telefone, notícias/quebra-gelo)
    // direto na busca — o teto de MAX_LEADS_PER_SEARCH candidatos é o que torna isto viável em
    // termos de tempo/custo (antes, com até 500 candidatos, só os 10 primeiros recebiam notícia e
    // decisores só vinham para os candidatos originados da Apollo).
    if (paidAllowed && !criteria.cnpj) {
      // Await completion: returning while enrichment mutates candidates gives an inconsistent snapshot.
      await enrichCandidatesWithQualityData(finalCandidates, tracker, criteria);
    }

    // Requirement Engine (`domain/requirementEngine.ts`): anota, por candidato, o que cada
    // critério pedido nesta busca encontrou de fato observado (vs. só pedido) — depois do
    // enriquecimento de qualidade acima, quando o candidato já tem o máximo de dado real que a
    // busca vai trazer (CNPJ, decisores, tecnologias). Puramente aditivo: nunca remove nem
    // reordena `finalCandidates` — só documenta para a UI mostrar com honestidade.
    for (const candidate of finalCandidates) {
      candidate.requirementEvaluations = evaluateCandidateRequirements(intent, candidate);
      if (criteria.segmentoDetalhes?.cnaePrincipal) {
        const observed =
          typeof candidate.companyData?.cnae === 'string' ? candidate.companyData.cnae : null;
        candidate.requirementEvaluations.push({
          criterion: 'cnae',
          label: 'CNAE principal',
          type: 'HARD_FILTER',
          expected: criteria.segmentoDetalhes.cnaePrincipal,
          observed,
          status:
            observed === criteria.segmentoDetalhes.cnaePrincipal
              ? 'matched'
              : observed
                ? 'unmatched'
                : 'unknown',
          source: candidate.source ?? 'none',
          reason: observed ? 'CNAE cadastral comparado ao solicitado' : 'CNAE não confirmado',
        });
      }
      annotateTurboCandidate(candidate, criteria.icpPesos);
    }

    finalCandidates.sort((a, b) => b.fitScoreEstimate - a.fitScoreEstimate);

    const hadProviderError = tracker.providerCalls.some((c) => c.status === 'error');
    const finishStatus: SearchExecutionStatus = !hadProviderError
      ? 'success'
      : finalCandidates.length > 0
        ? 'partial'
        : 'error';

    await tracker.finish({
      status: finishStatus,
      totalResults: finalCandidates.length,
      errorMessage: providerMode === 'hybrid' ? apolloError : undefined,
    });

    return {
      searchId: tracker.searchId,
      candidates: finalCandidates,
      sources: tracker.providerCalls.map((call) => ({
        title: call.provider,
        uri:
          call.provider === 'apollo'
            ? 'https://apollo.io'
            : call.provider === 'brasilapi'
              ? 'https://brasilapi.com.br'
              : call.provider === 'cnpj_catalog'
                ? 'https://www.gov.br/receitafederal'
                : call.provider === 'nominatim'
                  ? 'https://www.openstreetmap.org'
                  : call.provider === 'google_places'
                    ? 'https://developers.google.com/maps'
                    : '',
      })),
      costSummary: {
        apolloOrganizationSearchCredits: tracker.providerCalls.filter(
          (call) => call.provider === 'apollo' && call.status === 'ok',
        ).length,
        estimatedUsd: tracker.providerCalls.reduce((total, call) => total + call.costUsd, 0),
        coverage: 'partial',
        message:
          'Estimativa parcial: não inclui custo de todos os enriquecimentos, créditos de contatos ou Google Places.',
      },
      partialFailures: tracker.providerCalls
        .filter((call) => call.status === 'error')
        .map((call) => ({
          provider: call.provider,
          message: call.errorMessage ?? 'Consulta não concluída',
        })),
      filterWarnings,
      apolloError: providerMode === 'hybrid' ? apolloError : undefined,
      providerMode,
    };
  } catch (error: any) {
    // Search-ID precisa ser persistido mesmo quando a execução inteira quebra antes de gerar
    // qualquer candidato — é exatamente o cenário que a auditoria de execução (Onda 42) existe
    // para capturar ("a busca rodou, com este critério, e falhou assim").
    await tracker.finish({
      status: 'error',
      totalResults: 0,
      errorMessage:
        error instanceof Error ? error.message : 'Erro desconhecido na execução de busca',
    });
    throw error;
  }
}
