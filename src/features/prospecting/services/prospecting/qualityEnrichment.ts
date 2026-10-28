import { logger } from '../../../../lib/logger.js';
import { validContactEmails } from '../../../../shared/utils/contact-links.js';
import { findCompanyDomain } from '../../utils/domain.js';
import { enrichOrganizationWithContacts, searchDecisionMakersAdvanced } from '../apollo.service.js';
import { searchCompanyNews } from '../news.service.js';
import type { SearchExecutionTracker } from '../searchExecution.service.js';
import type { ProspectCandidate, ProspectCriteria } from './types.js';

/**
 * Enriquecimento de qualidade rodado automaticamente ao final de toda busca (candidatos já
 * limitados a MAX_LEADS_PER_SEARCH): CNPJ (busca reversa por nome), decisores com LinkedIn/
 * e-mail/telefone (para candidatos que ainda não vieram com decisor pré-buscado da Apollo — ex:
 * Google Places/OpenStreetMap) e notícia/quebra-gelo recente. As três tarefas de um candidato
 * rodam em paralelo entre si, e todos os candidatos rodam em paralelo entre eles — o tempo total
 * fica limitado pelo orçamento em `discoverCandidates` (Promise.race), não pela soma dos custos.
 */
export async function enrichCandidatesWithQualityData(
  candidates: ProspectCandidate[],
  /** Onda 42: quando informado, cada chamada real de provider feita aqui (CNPJ/Receita Federal,
   * decisores via Apollo/Hunter, notícias) entra na mesma execução de busca rastreada pelo
   * Search-ID do chamador (ver discoverCandidates). Opcional — chamadores fora do fluxo de busca
   * (ex.: reprocessamento manual) continuam funcionando sem tracker. */
  tracker?: SearchExecutionTracker,
  criteria?: ProspectCriteria,
): Promise<void> {
  for (let offset = 0; offset < candidates.length; offset += 3) {
    await Promise.allSettled(
      candidates.slice(offset, offset + 3).map(async (candidate) => {
        await Promise.allSettled([
          (async () => {
            if (candidate.decisionMakers) return; // já veio pré-buscado (Apollo) ou já tentamos antes
            const domain = findCompanyDomain(candidate.website, candidate.rationale);
            if (!domain) return;
            try {
              const titles = [
                ...(criteria?.decisorCargos ?? []),
                ...(criteria?.personas ?? []).flatMap((p) => [
                  p.cargoPrincipal ?? '',
                  ...(p.cargosEquivalentes ?? []),
                ]),
              ].filter(Boolean);
              const { contacts, source, error } =
                titles.length || criteria?.personas?.length
                  ? await searchDecisionMakersAdvanced(
                      domain,
                      {
                        cargos: titles.join(','),
                        senioridades: criteria?.personas?.flatMap((p) => p.senioridades ?? []),
                        localizacoes: criteria?.personas?.flatMap((p) => p.localizacoes ?? []),
                        cargosExcluir: criteria?.personas?.flatMap((p) => p.cargosExcluir ?? []),
                      },
                      3,
                    )
                  : await enrichOrganizationWithContacts(domain, 3);
              candidate.decisionMakers = contacts.map((c) => ({
                name: c.name,
                title: c.title,
                email: c.email,
                emailSource: c.email ? (source === 'hunter' ? 'hunter' : 'apollo') : undefined,
                phone: c.phone || null,
                linkedinUrl: 'linkedinUrl' in c ? c.linkedinUrl : c.linkedin_url,
              }));
              if (candidate.decisionMakers.length > 0) {
                candidate.emails = validContactEmails(
                  candidate.decisionMakers.map((dm) => dm.email),
                );
              }
              tracker?.recordProviderCall({
                provider: source ?? 'apollo',
                resultCount: contacts.length,
                status: error ? 'error' : 'ok',
                errorMessage: error,
              });
            } catch (err: any) {
              logger.error(
                { err, searchId: tracker?.searchId, companyName: candidate.tradeName, domain },
                'Falha ao buscar decisores do candidato',
              );
              tracker?.recordProviderCall({
                provider: 'apollo',
                resultCount: 0,
                status: 'error',
                errorMessage: 'Falha ao buscar decisores',
              });
            }
          })(),
          (async () => {
            try {
              const mentions = await searchCompanyNews(candidate.tradeName);
              if (mentions && mentions.length > 0) {
                candidate.webInsights = mentions.map((m) => ({
                  title: m.title,
                  url: m.url,
                  domain: m.domain,
                }));
                candidate.icebreakerHook = `📰 Fato Relevante / Notícia: "${mentions[0].title}" (${mentions[0].domain})`;
              }
              tracker?.recordProviderCall({
                provider: 'news_search',
                resultCount: mentions?.length ?? 0,
                status: 'ok',
              });
            } catch (err: any) {
              logger.error(
                { err, searchId: tracker?.searchId, companyName: candidate.tradeName },
                'Falha ao buscar notícias para candidato',
              );
              tracker?.recordProviderCall({
                provider: 'news_search',
                resultCount: 0,
                status: 'error',
                errorMessage: 'Falha ao buscar notícias',
              });
            }
          })(),
        ]);
      }),
    );
  }
}
