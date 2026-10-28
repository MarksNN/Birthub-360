import { describe, expect, it } from 'vitest';
import { discoverCriteriaSchema } from '../../schemas/discoverCriteria.schema.js';
import { ExclusionSet } from '../../utils/exclusionSet.js';
import type { ProspectCandidate } from '../prospectTypes.js';
import {
  annotateTurboCandidate,
  getTurboFilterWarnings,
  hasUnavailableDiscoveryFilter,
  matchesTurboLocalFilters,
} from '../turboQuality.js';

const candidate = (): ProspectCandidate => ({
  tradeName: 'Empresa Teste',
  legalNameGuess: null,
  cnpjGuess: null,
  segment: 'Pedido',
  size: 'Não informado',
  location: 'Pedido',
  locationObserved: false,
  segmentObserved: false,
  fitScoreEstimate: 95,
  suggestedContact: null,
  rationale: 'Origem pública',
});
describe('Turbo: critérios verificáveis', () => {
  it('rejeita CNPJ inválido e preserva filtros/personas estruturados', () => {
    expect(discoverCriteriaSchema.safeParse({ cnpj: '00000000000000' }).success).toBe(false);
    const parsed = discoverCriteriaSchema.parse({
      cnpj: '00000000000191',
      personas: [{ cargoPrincipal: 'CEO' }],
      segmentoDetalhes: { cnaesSecundarios: ['1234567'] },
    });
    expect(parsed.personas?.[0].cargoPrincipal).toBe('CEO');
    expect(parsed.cnpj).toBe('00000000000191');
  });
  it('rejeita intervalo invertido e volume é descartado', () => {
    expect(
      discoverCriteriaSchema.safeParse({ faturamentoMin: 500, faturamentoMax: 100 }).success,
    ).toBe(false);
    expect(discoverCriteriaSchema.parse({ volume: '50 cargas' })).not.toHaveProperty('volume');
  });
  it('não atribui ICP com dados desconhecidos nem telefone como contato verificado', () => {
    const c = candidate();
    c.phone = '+5511999999999';
    c.requirementEvaluations = [
      {
        criterion: 'segment',
        label: 'Segmento',
        type: 'SOFT_FILTER',
        expected: 'Pedido',
        observed: null,
        status: 'unknown',
        source: 'none',
        reason: 'Não observado',
      },
    ];
    annotateTurboCandidate(c);
    expect(c.fitScoreEstimate).toBe(0);
    expect(c.metrics?.contactQuality).toBe(0);
    expect(c.provenance?.segment.status).toBe('unverified');
  });
  it('score depende de correspondência observada, separado da completude', () => {
    const c = candidate();
    c.requirementEvaluations = [
      {
        criterion: 'segment',
        label: 'Segmento',
        type: 'SOFT_FILTER',
        expected: 'Tech',
        observed: 'Tech',
        status: 'matched',
        source: 'apollo',
        reason: 'Confirmado',
      },
    ];
    annotateTurboCandidate(c);
    expect(c.metrics?.icpScore).toBe(100);
    expect(c.metrics?.completeness).toBeLessThan(100);
  });
  it('bloqueia CNAEs secundários sem suporte em vez de ignorá-los', () => {
    const criteria = {
      segmento: '',
      localizacao: '',
      quantidade: 20,
      segmentoDetalhes: { cnaesSecundarios: ['1234567'] },
    };
    expect(hasUnavailableDiscoveryFilter(criteria)).toBe(true);
    expect(getTurboFilterWarnings(criteria, false).join(' ')).toContain('CNAEs secundários');
  });
  it('aplica inclusões/exclusões somente contra dados retornados', () => {
    const c = candidate();
    expect(
      matchesTurboLocalFilters(c, {
        segmento: '',
        localizacao: '',
        quantidade: 20,
        segmentoDetalhes: { palavrasExcluir: ['teste'] },
      }),
    ).toBe(false);
    expect(
      matchesTurboLocalFilters(c, {
        segmento: '',
        localizacao: '',
        quantidade: 20,
        segmentoDetalhes: { palavrasObrigatorias: ['desconhecido'] },
      }),
    ).toBe(false);
  });
  it('não mescla empresas homônimas com domínios diferentes', () => {
    const exclusions = new ExclusionSet();
    exclusions.add('Acme', 'https://acme-a.example');
    expect(exclusions.has('Acme', 'https://acme-b.example')).toBe(false);
    expect(exclusions.has('ACME Novo Nome', 'https://www.acme-a.example')).toBe(true);
  });
  it('pesos editáveis não convertem desconhecido em correspondência', () => {
    const c = candidate();
    c.requirementEvaluations = [
      {
        criterion: 'segment',
        label: 'Segmento',
        type: 'SOFT_FILTER',
        expected: 'Tech',
        observed: 'Tech',
        status: 'matched',
        source: 'apollo',
        reason: 'Confirmado',
      },
      {
        criterion: 'annualRevenue',
        label: 'Receita',
        type: 'SOFT_FILTER',
        expected: '1000',
        observed: null,
        status: 'unknown',
        source: 'none',
        reason: 'Ausente',
      },
    ];
    annotateTurboCandidate(c, { segment: 20, annualRevenue: 80 });
    expect(c.metrics?.icpScore).toBe(20);
    c.cnpjGuess = '00.000.000/0001-91';
    annotateTurboCandidate(c);
    expect(c.metrics?.identificationConfidence).toBe(0);
  });
});
