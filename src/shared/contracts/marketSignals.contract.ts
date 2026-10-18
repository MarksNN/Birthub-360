/**
 * Contrato canônico para o subsistema de Sinais de Mercado e Inteligência Exógena.
 * Onda 02 — Evolução 05
 */

export type MarketSignalType =
  | 'funding_round'
  | 'executive_change'
  | 'mass_hiring'
  | 'geographic_expansion'
  | 'mna'
  | 'news_mention'
  | 'job_opening'
  | 'expansion'
  | 'regulatory_change'
  | 'fiscal_change'
  | 'partnership';

export type MarketSignalSource =
  | 'news'
  | 'job_posting'
  | 'official_gazette'
  | 'financial_filing'
  | 'social_media';

export type MarketSignalConfidence = 'low' | 'medium' | 'high';

export interface MarketSignalEnvelope {
  id: string;
  organizationId: string;
  companyId?: string;
  companyName: string;
  signalType: MarketSignalType;
  source: MarketSignalSource;
  title: string;
  summary: string;
  sourceUrl?: string;
  confidence: MarketSignalConfidence;
  detectedAt: string;
  metadata?: Record<string, unknown>;
}

export interface SignalQueryFilter {
  organizationId: string;
  companyId?: string;
  signalType?: string;
  minConfidence?: MarketSignalConfidence;
  limit?: number;
}

export interface IMarketSignalsPort {
  ingestSignal(
    signal: Omit<MarketSignalEnvelope, 'id' | 'detectedAt'>,
  ): Promise<MarketSignalEnvelope>;
  getSignalsByCompany(organizationId: string, companyId: string): Promise<MarketSignalEnvelope[]>;
  searchSignals(filter: SignalQueryFilter): Promise<MarketSignalEnvelope[]>;
}
