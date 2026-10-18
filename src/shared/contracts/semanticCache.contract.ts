/**
 * Contrato de Cache Semântico e FinOps Multi-Tenant — Birth Hub 360°
 * Onda 01: Fundação da Inteligência Autônoma
 * Dono: Agente 18 — Contratos e API
 */

export interface SemanticCacheKeyParams {
  organizationId: string;
  model: string;
  promptVersion: string;
  knowledgeVersion?: number;
  purpose: string;
  promptText: string;
}

export interface SemanticCacheEntry {
  cachedResponse: string;
  tokensSaved: number;
  costSavedUsd: number;
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  createdAt: string;
  ttlSeconds: number;
}

export interface ISemanticCachePort {
  get(params: SemanticCacheKeyParams): Promise<string | null>;
  set(
    params: SemanticCacheKeyParams,
    response: string,
    metadata: {
      tokens: number;
      costUsd: number;
      classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
      ttlSeconds?: number;
    },
  ): Promise<void>;
  invalidateTenant(organizationId: string): Promise<number>;
}
