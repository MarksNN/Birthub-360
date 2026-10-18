import { describe, expect, it } from 'vitest';
import { MarketSensingService } from '../../../src/features/market-intelligence/server/marketSensing.service.js';

describe('MarketSensingService — Eixo 12 (Market Sensing & Inteligência Exógena)', () => {
  const service = new MarketSensingService();
  const orgId = 'org-tenant-sensing-001';

  it('deve ingerir sinal de mercado e normalizar com metadados e confiança', async () => {
    const signal = await service.ingestSignal({
      organizationId: orgId,
      companyId: 'company-abc',
      companyName: 'TransRio Logística S/A',
      signalType: 'funding_round',
      source: 'news',
      title: 'TransRio recebe aporte de R$ 50 milhões para expansão de frotas e telemetria',
      summary: 'Empresa capta recursos série B para modernização tecnológica.',
      sourceUrl: 'https://exame.com/negocios/transrio-aporte',
      confidence: 'high',
    });

    expect(signal.id).toBeDefined();
    expect(signal.detectedAt).toBeDefined();
    expect(signal.signalType).toBe('funding_round');
    expect(signal.confidence).toBe('high');
  });

  it('deve classificar automaticamente sinal a partir de notícia via taxonomia', async () => {
    const newsSignal = await service.detectSignalFromNews({
      organizationId: orgId,
      companyName: 'Viação Sul',
      newsHeadline: 'Viação Sul anuncia fusão com grupo de cargas rodoviárias',
      newsUrl: 'https://valor.globo.com/empresas/fusao-viacao-sul',
      sourceName: 'Valor Econômico',
    });

    expect(newsSignal.signalType).toBe('mna');
    expect(newsSignal.title).toContain('Viação Sul');
  });

  it('deve registrar sinal de vaga aberta e identificar cargo de expansão', async () => {
    const jobSignal = await service.detectSignalFromJobPosting({
      organizationId: orgId,
      companyName: 'Rota Verde Transportes',
      jobTitle: 'Gerente Comercial de Frotas Corporativas',
      location: 'São Paulo - SP',
      jobBoardUrl: 'https://linkedin.com/jobs/view/123456',
    });

    expect(jobSignal.signalType).toBe('job_opening');
    expect(jobSignal.source).toBe('job_posting');
    expect(jobSignal.title).toContain('Nova vaga aberta');
  });

  it('deve registrar sinal de diário oficial garantindo referência normativa', async () => {
    const gazetteSignal = await service.detectSignalFromOfficialGazette({
      organizationId: orgId,
      companyName: 'Governo do Estado de SP / Consórcio Via Paulista',
      officialGazetteRef: 'DOU-2026-10-15-SEC-3',
      regulationTopic: 'Resolução ANTT 6.000 de monitoramento eletrônico de cargas frigorificadas',
    });

    expect(gazetteSignal.signalType).toBe('regulatory_change');
    expect(gazetteSignal.source).toBe('official_gazette');
    expect(gazetteSignal.confidence).toBe('high');
  });

  it('deve buscar sinais por empresa isolados por tenant', async () => {
    const signals = await service.getSignalsByCompany(orgId, 'company-abc');
    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals[0].companyId).toBe('company-abc');
  });
});
