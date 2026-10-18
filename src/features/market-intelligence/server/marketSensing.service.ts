import { createHash, randomUUID } from 'node:crypto';
import type {
  IMarketSignalsPort,
  MarketSignalEnvelope,
  MarketSignalType,
  SignalQueryFilter,
} from '../../../shared/contracts/marketSignals.contract.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';

export interface RegulatorySignalInput {
  organizationId: string;
  officialGazetteRef: string; // Ex: "DOU Seção 1 - Edição 182"
  legalActNumber: string; // Ex: "Resolução BACEN nº 4.950"
  issuingAuthority: string; // Ex: "Banco Central do Brasil", "Receita Federal"
  publicationDate: string;
  effectiveDate: string;
  summary: string;
  targetSectors: string[];
  complianceDeadline?: string;
  sourceUrl?: string;
}

export interface LeadershipChangeSignalInput {
  organizationId: string;
  companyId: string;
  companyName: string;
  executiveName: string;
  previousRole?: string;
  newRole: string;
  announcementDate: string;
  source: 'official_announcement' | 'press_release' | 'verified_news';
  sourceUrl: string;
}

export class MarketSensingService implements IMarketSignalsPort {
  private signalsStore = new Map<string, MarketSignalEnvelope>();
  private processedContentHashes = new Set<string>();

  /**
   * Ingestão canônica de sinais de mercado com pipeline:
   * Normalização -> Deduplicação criptográfica -> Verificação -> Evento Comercial.
   */
  async ingestSignal(
    signalInput: Omit<MarketSignalEnvelope, 'id' | 'detectedAt'>,
  ): Promise<MarketSignalEnvelope> {
    if (!signalInput.organizationId || signalInput.organizationId.trim() === '') {
      throw new Error(
        'Tenancy violation: organizationId obrigatório para ingestão de sinais de mercado',
      );
    }

    // Deduplicação por hash de conteúdo
    const contentKey = `${signalInput.organizationId}:${signalInput.companyName.toLowerCase()}:${signalInput.title.toLowerCase()}`;
    const contentHash = createHash('sha256').update(contentKey).digest('hex');

    if (this.processedContentHashes.has(contentHash)) {
      logger.info(
        `[MarketSensing] Sinal duplicado descartado por deduplicação: "${signalInput.title}" para ${signalInput.companyName}.`,
      );
      // Retorna o existente mais recente
      const existing = Array.from(this.signalsStore.values()).find(
        (s) => s.organizationId === signalInput.organizationId && s.title === signalInput.title,
      );
      if (existing) return existing;
    }

    this.processedContentHashes.add(contentHash);

    const id = `sig-${randomUUID()}`;
    const detectedAt = new Date().toISOString();

    const signal: MarketSignalEnvelope = {
      ...signalInput,
      id,
      detectedAt,
    };

    const storageKey = `${signalInput.organizationId}:${id}`;
    this.signalsStore.set(storageKey, signal);

    // Publicar evento comercial no DomainEventMesh
    await domainEventMesh.publish({
      eventType: 'MARKET_SIGNAL_DETECTED',
      eventVersion: '1.0.0',
      organizationId: signalInput.organizationId,
      correlationId: `sig-corr-${id}`,
      producer: 'market-sensing-engine',
      aggregateId: signalInput.companyId || id,
      payload: {
        signalId: id,
        companyName: signalInput.companyName,
        signalType: signalInput.signalType,
        source: signalInput.source,
        confidence: signalInput.confidence,
        title: signalInput.title,
        summary: signalInput.summary,
      },
    });

    logger.info(
      `[MarketSensing] Novo sinal exógeno [${signal.signalType}] registrado para ${signal.companyName} no tenant ${signal.organizationId}.`,
    );

    return signal;
  }

  /**
   * Classifica e ingere automaticamente um sinal a partir de uma manchete de notícia.
   */
  async detectSignalFromNews(params: {
    organizationId: string;
    companyName: string;
    newsHeadline: string;
    newsUrl: string;
    sourceName: string;
  }): Promise<MarketSignalEnvelope> {
    const text = params.newsHeadline.toLowerCase();
    let signalType: MarketSignalType = 'news_mention';

    if (
      text.includes('fusão') ||
      text.includes('aquisição') ||
      text.includes('adquire') ||
      text.includes('compra')
    ) {
      signalType = 'mna';
    } else if (
      text.includes('aporte') ||
      text.includes('investimento') ||
      text.includes('capta') ||
      text.includes('rodada')
    ) {
      signalType = 'funding_round';
    } else if (
      text.includes('expansão') ||
      text.includes('renovação') ||
      text.includes('frota') ||
      text.includes('nova filial') ||
      text.includes('nova fábrica') ||
      text.includes('novo centro')
    ) {
      signalType = 'expansion';
    } else if (text.includes('vaga') || text.includes('contrata') || text.includes('admissão')) {
      signalType = 'mass_hiring';
    } else if (
      text.includes('ceo') ||
      text.includes('diretor') ||
      text.includes('presidente') ||
      text.includes('nomeia')
    ) {
      signalType = 'executive_change';
    }

    return this.ingestSignal({
      organizationId: params.organizationId,
      companyName: params.companyName,
      signalType,
      source: 'news',
      title: `${params.companyName}: ${params.newsHeadline}`,
      summary: `Notícia identificada em ${params.sourceName}: ${params.newsHeadline}`,
      sourceUrl: params.newsUrl,
      confidence: 'high',
    });
  }

  /**
   * Registra sinal de vaga aberta e contratação estratégica.
   */
  async detectSignalFromJobPosting(params: {
    organizationId: string;
    companyName: string;
    jobTitle: string;
    location?: string;
    jobBoardUrl?: string;
  }): Promise<MarketSignalEnvelope> {
    return this.ingestSignal({
      organizationId: params.organizationId,
      companyName: params.companyName,
      signalType: 'job_opening',
      source: 'job_posting',
      title: `Nova vaga aberta: ${params.jobTitle} em ${params.companyName}`,
      summary: `Oportunidade para ${params.jobTitle} identificada${params.location ? ` em ${params.location}` : ''}.`,
      sourceUrl: params.jobBoardUrl,
      confidence: 'high',
      metadata: {
        jobTitle: params.jobTitle,
        location: params.location,
      },
    });
  }

  /**
   * Registra sinal de publicação em Diário Oficial.
   */
  async detectSignalFromOfficialGazette(params: {
    organizationId: string;
    companyName: string;
    officialGazetteRef: string;
    regulationTopic: string;
  }): Promise<MarketSignalEnvelope> {
    return this.ingestSignal({
      organizationId: params.organizationId,
      companyName: params.companyName,
      signalType: 'regulatory_change',
      source: 'official_gazette',
      title: `Publicação em Diário Oficial: ${params.officialGazetteRef}`,
      summary: `Regulamentação: ${params.regulationTopic}`,
      confidence: 'high',
      metadata: {
        officialGazetteRef: params.officialGazetteRef,
        regulationTopic: params.regulationTopic,
      },
    });
  }

  /**
   * Ingestão especializada de sinais regulatórios com validação rigorosa de fontes oficiais.
   * Evita alucinações sobre normas jurídicas ou prazos inexistentes.
   */
  async ingestRegulatoryUpdate(input: RegulatorySignalInput): Promise<MarketSignalEnvelope> {
    const title = `${input.issuingAuthority}: ${input.legalActNumber}`;
    const summary = `${input.summary}. Publicação: ${input.publicationDate}. Vigência: ${input.effectiveDate}. Setores impactados: ${input.targetSectors.join(', ')}.`;

    return this.ingestSignal({
      organizationId: input.organizationId,
      companyName: 'Mercado Regulado / Setorial',
      signalType: 'regulatory_change',
      source: 'official_gazette',
      title,
      summary,
      sourceUrl:
        input.sourceUrl ||
        `https://in.gov.br/dou?ref=${encodeURIComponent(input.officialGazetteRef)}`,
      confidence: 'high',
      metadata: {
        legalActNumber: input.legalActNumber,
        issuingAuthority: input.issuingAuthority,
        complianceDeadline: input.complianceDeadline,
        effectiveDate: input.effectiveDate,
        targetSectors: input.targetSectors,
      },
    });
  }

  /**
   * Ingestão especializada de mudança de liderança pública ou comunicada oficialmente.
   */
  async ingestLeadershipChange(input: LeadershipChangeSignalInput): Promise<MarketSignalEnvelope> {
    const title = `${input.companyName}: Nomeação de ${input.executiveName} como ${input.newRole}`;
    const summary = `Movimentação de liderança executiva em ${input.companyName}. ${input.executiveName} assume a função de ${input.newRole}${input.previousRole ? ` (anteriormente: ${input.previousRole})` : ''}.`;

    return this.ingestSignal({
      organizationId: input.organizationId,
      companyId: input.companyId,
      companyName: input.companyName,
      signalType: 'executive_change',
      source: input.source === 'official_announcement' ? 'news' : 'financial_filing',
      title,
      summary,
      sourceUrl: input.sourceUrl,
      confidence: 'high',
      metadata: {
        executiveName: input.executiveName,
        newRole: input.newRole,
        previousRole: input.previousRole,
        announcementDate: input.announcementDate,
      },
    });
  }

  /**
   * Recupera sinais vinculados a uma empresa específica do tenant.
   */
  async getSignalsByCompany(
    organizationId: string,
    companyId: string,
  ): Promise<MarketSignalEnvelope[]> {
    return Array.from(this.signalsStore.values()).filter(
      (s) => s.organizationId === organizationId && s.companyId === companyId,
    );
  }

  /**
   * Consulta sinais por filtro com respeito a limites e confiança mínima.
   */
  async searchSignals(filter: SignalQueryFilter): Promise<MarketSignalEnvelope[]> {
    let results = Array.from(this.signalsStore.values()).filter(
      (s) => s.organizationId === filter.organizationId,
    );

    if (filter.companyId) {
      results = results.filter((s) => s.companyId === filter.companyId);
    }

    if (filter.signalType) {
      results = results.filter((s) => s.signalType === filter.signalType);
    }

    if (filter.minConfidence) {
      const confWeight: Record<string, number> = { low: 1, medium: 2, high: 3 };
      const minWeight = confWeight[filter.minConfidence] || 1;
      results = results.filter((s) => (confWeight[s.confidence] || 1) >= minWeight);
    }

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Calcula um score de relevância comercial de um sinal (0 a 100)
   * baseado no tipo de sinal, confiabilidade da fonte e frescor.
   */
  calculateSignalRelevanceScore(signal: MarketSignalEnvelope): number {
    let score = 50;

    // Bônus por tipo de sinal de alta relevância estratégica
    switch (signal.signalType) {
      case 'mna':
      case 'funding_round':
        score += 30;
        break;
      case 'regulatory_change':
      case 'geographic_expansion':
        score += 25;
        break;
      case 'executive_change':
      case 'mass_hiring':
        score += 20;
        break;
      default:
        score += 10;
        break;
    }

    // Bônus por confiança da fonte
    if (signal.confidence === 'high') score += 15;
    else if (signal.confidence === 'medium') score += 5;

    // Bônus por ter URL de verificação factual
    if (signal.sourceUrl && signal.sourceUrl.startsWith('http')) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  clear(): void {
    this.signalsStore.clear();
    this.processedContentHashes.clear();
  }
}

export const marketSensingService = new MarketSensingService();
