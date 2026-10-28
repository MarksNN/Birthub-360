import type { DecisionMaker, Lead } from '../../types.js';
import { type CnpjData, resolveAndEnrichCnpjForLead } from '../cnpj.js';
import { canonicalizeDomain, normalizeCompanyName } from '../entityResolution.js';
import {
  CACHE_TTL_MS,
  withCache,
  withCircuitBreaker,
  withProviderCircuitBreaker,
  withProviderRetry,
  withRetry,
} from '../resilience.js';
import { enrichOrganization, searchAndMatchPeople } from '../search/providers/apollo.provider.js';
import { searchPlaces } from '../search/providers/googlePlaces.provider.js';

export function cleanDomain(url: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0];
}

export function cleanDomainForCache(url?: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase();
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function normalizeLinkedInUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();
  if (!clean) return '';
  if (clean.startsWith('http://')) {
    clean = `https://${clean.slice(7)}`;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  clean = clean.replace('https://linkedin.com', 'https://www.linkedin.com');
  return clean;
}

export const APOLLO_PREFERRED_TITLES = [
  'CEO',
  'Founder',
  'Owner',
  'Presidente',
  'Diretor',
  'Gerente',
  'Head',
  'Sócio',
  'VP',
  'Operações',
  'Logística',
  'Comercial',
];

export function isCnpjLookupIncomplete(result: CnpjData): boolean {
  return Boolean(result.cnpj_raw) && !result.razao_social;
}

export function buildCnpjCacheKey(lead: { name: string; domain?: string; cnpj?: string }): string {
  const cnpjDigits = (lead.cnpj || '').replace(/\D/g, '');
  if (cnpjDigits.length >= 14) return `cnpj:${cnpjDigits}`;
  if (lead.domain) return `cnpj:domain:${lead.domain.toLowerCase()}`;
  return `cnpj:name:${lead.name.toLowerCase()}`;
}

export async function resolveCnpjWithResilience(
  lead: { name: string; domain?: string; cnpj?: string; address?: string },
  cacheKey: string,
  onProviderCall?: (info: any) => void,
): Promise<CnpjData> {
  return withCache<CnpjData>(
    cacheKey,
    (result) => (result.razao_social ? CACHE_TTL_MS.LONG_CADASTRAL : CACHE_TTL_MS.SHORT_SIGNAL),
    async () => {
      const { result } = await withCircuitBreaker<CnpjData>(
        'cnpj_receita_federal',
        () =>
          withRetry(
            () => resolveAndEnrichCnpjForLead(lead, onProviderCall),
            isCnpjLookupIncomplete,
            { maxRetries: 2, baseDelayMs: 150, maxDelayMs: 1000 },
          ),
        () => ({}),
        isCnpjLookupIncomplete,
      );
      return result;
    },
  );
}

export async function findLeads(opts: {
  query: string;
  limit: number;
  googleApiKey?: string;
  excludeDomains?: Set<string>;
  excludeNames?: Set<string>;
  onProviderCall?: (log: {
    provider: string;
    operation: string;
    status: string;
    latencyMs?: number;
    httpStatus?: number;
    source?: string;
    errorMessage?: string;
  }) => void;
  onCandidateDiscarded?: (log: {
    name: string;
    domain?: string;
    reasonCode: 'duplicate_pre_cnpj_domain_or_name' | 'exceeds_requested_limit';
    reason: string;
  }) => void;
}): Promise<Lead[]> {
  const { query, limit, googleApiKey } = opts;
  const excludeDomains = opts.excludeDomains || new Set<string>();
  const excludeNames = opts.excludeNames || new Set<string>();

  const placesQuery = query
    .replace(/\(.*?\)/g, '')
    .replace(/com\s.*?colaboradores/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const result = await searchPlaces(placesQuery, limit, googleApiKey);

  opts.onProviderCall?.({
    provider: 'google_places',
    operation: 'text_search',
    status: result.status,
    latencyMs: result.latencyMs,
    httpStatus: result.httpStatus,
    source: result.source,
    errorMessage: result.errorMessage,
  });

  if (result.status !== 'ok') {
    if (
      result.status === 'error' ||
      result.status === 'timeout' ||
      result.status === 'rate_limited'
    ) {
      console.warn(`[google_places] ${result.status}: ${result.errorMessage || result.httpStatus}`);
    }
    return [];
  }

  const mapped =
    result.data?.map((p, idx) => {
      const domain = cleanDomain(p.website || '') || `${slugify(p.name || 'empresa')}.com.br`;

      return {
        id: `place-${idx}`,
        name: p.name || 'Empresa não identificada',
        address: p.address,
        phone: p.phone,
        website: p.website,
        domain: domain,
        rating: p.rating,
        total_ratings: p.totalRatings,
        decision_makers: [] as DecisionMaker[],
      } as unknown as Lead;
    }) || [];

  const fresh = mapped.filter((lead: any) => {
    const domain = canonicalizeDomain(lead.domain);
    const name = normalizeCompanyName(lead.name);
    const isDuplicate = (domain && excludeDomains.has(domain)) || (name && excludeNames.has(name));
    if (isDuplicate) {
      opts.onCandidateDiscarded?.({
        name: lead.name,
        domain: lead.domain,
        reasonCode: 'duplicate_pre_cnpj_domain_or_name',
        reason:
          'Domínio ou nome normalizado já pertence a um lead existente na base (checagem prévia à resolução de CNPJ oficial).',
      });
    }
    return !isDuplicate;
  });

  return fresh.slice(0, limit);
}

export async function enrichLeadWithApollo(
  domain: string,
  companyName: string,
  apiKey?: string,
  preferredRole?: string,
  preferredTitles?: string[],
  onProviderCall?: (log: {
    provider: string;
    operation: string;
    status: string;
    latencyMs?: number;
    httpStatus?: number;
    source?: string;
    errorMessage?: string;
  }) => void,
): Promise<{ decisionMakers: DecisionMaker[]; companyLinkedin?: string }> {
  const cleanDom = cleanDomain(domain);

  const orgResult = await withProviderCircuitBreaker('apollo', () =>
    withProviderRetry(() => enrichOrganization(cleanDom, apiKey)),
  );
  onProviderCall?.({
    provider: 'apollo',
    operation: 'organization_enrich',
    status: orgResult.status,
    latencyMs: orgResult.latencyMs,
    httpStatus: orgResult.httpStatus,
    source: orgResult.source,
    errorMessage: orgResult.errorMessage,
  });
  const companyLinkedin =
    orgResult.status === 'ok' ? normalizeLinkedInUrl(orgResult.data?.linkedinUrl) : '';

  if (
    orgResult.status === 'error' ||
    orgResult.status === 'timeout' ||
    orgResult.status === 'rate_limited'
  ) {
    console.warn(
      `[apollo:organization/enrich] ${orgResult.status}: ${orgResult.errorMessage || orgResult.httpStatus}`,
    );
  }

  const titlesToSearch =
    preferredTitles && preferredTitles.length > 0 ? preferredTitles : APOLLO_PREFERRED_TITLES;
  const peopleResult = await withProviderCircuitBreaker('apollo', () =>
    withProviderRetry(() => searchAndMatchPeople(cleanDom, companyName, titlesToSearch, apiKey)),
  );
  onProviderCall?.({
    provider: 'apollo',
    operation: 'people_search',
    status: peopleResult.status,
    latencyMs: peopleResult.latencyMs,
    httpStatus: peopleResult.httpStatus,
    source: peopleResult.source,
    errorMessage: peopleResult.errorMessage,
  });

  if (peopleResult.status === 'ok') {
    const dms: DecisionMaker[] = (peopleResult.data || []).map((p) => ({
      name: p.name,
      title: p.title || preferredRole || '',
      email: p.email,
      emails: p.email ? [p.email] : [],
      phone: p.phone,
      phones: p.phone ? [p.phone] : [],
      linkedin: p.linkedinUrl ? normalizeLinkedInUrl(p.linkedinUrl) : '',
    }));

    if (dms.length > 0) {
      return { decisionMakers: dms, companyLinkedin };
    }
  } else if (
    peopleResult.status === 'error' ||
    peopleResult.status === 'timeout' ||
    peopleResult.status === 'rate_limited'
  ) {
    console.warn(
      `[apollo:people_search] ${peopleResult.status}: ${peopleResult.errorMessage || peopleResult.httpStatus}`,
    );
  }

  return { decisionMakers: [], companyLinkedin };
}
