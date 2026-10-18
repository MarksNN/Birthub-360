import { createHash } from 'node:crypto';
import type {
  ISemanticCachePort,
  SemanticCacheEntry,
  SemanticCacheKeyParams,
} from '../../../shared/contracts/semanticCache.contract.js';
import { logger } from '../../logger.js';

export class SemanticCacheService implements ISemanticCachePort {
  private cacheStore = new Map<string, SemanticCacheEntry>();
  private tenantKeys = new Map<string, Set<string>>();

  /**
   * Gera a chave de cache estritamente isolada por tenant e versões de modelo/prompt.
   */
  generateKey(params: SemanticCacheKeyParams): string {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Cache semântico exige organizationId na chave');
    }

    const promptHash = createHash('sha256').update(params.promptText.trim()).digest('hex');
    const composite = [
      params.organizationId,
      params.model,
      params.promptVersion,
      params.knowledgeVersion ?? 1,
      params.purpose,
      promptHash,
    ].join(':');

    return createHash('sha256').update(composite).digest('hex');
  }

  /**
   * Recupera resposta do cache respeitando isolamento de tenant e validade de TTL.
   */
  async get(params: SemanticCacheKeyParams): Promise<string | null> {
    const key = this.generateKey(params);
    const entry = this.cacheStore.get(key);

    if (!entry) {
      return null;
    }

    const ageSeconds = (Date.now() - new Date(entry.createdAt).getTime()) / 1000;
    if (ageSeconds > entry.ttlSeconds) {
      // Expirado
      this.cacheStore.delete(key);
      const tenantSet = this.tenantKeys.get(params.organizationId);
      tenantSet?.delete(key);
      return null;
    }

    logger.info(
      {
        organizationId: params.organizationId,
        model: params.model,
        purpose: params.purpose,
        tokensSaved: entry.tokensSaved,
      },
      'SemanticCache: Cache hit válido! Economia de tokens e latência aplicada',
    );

    return entry.cachedResponse;
  }

  /**
   * Armazena uma resposta no cache.
   * Não armazena se for classificado como CONFIDENTIAL para proteção rigorosa de dados.
   */
  async set(
    params: SemanticCacheKeyParams,
    response: string,
    metadata: {
      tokens: number;
      costUsd: number;
      classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
      ttlSeconds?: number;
    },
  ): Promise<void> {
    if (metadata.classification === 'CONFIDENTIAL') {
      logger.info(
        { organizationId: params.organizationId, purpose: params.purpose },
        'SemanticCache: Resposta confidencial detectada. Descarte intencional de cache para proteção de PII/segredos.',
      );
      return;
    }

    const key = this.generateKey(params);
    const entry: SemanticCacheEntry = {
      cachedResponse: response,
      tokensSaved: metadata.tokens,
      costSavedUsd: metadata.costUsd,
      classification: metadata.classification,
      createdAt: new Date().toISOString(),
      ttlSeconds: metadata.ttlSeconds ?? 86400, // 24 horas default
    };

    this.cacheStore.set(key, entry);

    if (!this.tenantKeys.has(params.organizationId)) {
      this.tenantKeys.set(params.organizationId, new Set());
    }
    this.tenantKeys.get(params.organizationId)?.add(key);
  }

  /**
   * Invalida todas as chaves do tenant (ex.: ao atualizar Playbook, revogar consentimento ou alterar documentos).
   */
  async invalidateTenant(organizationId: string): Promise<number> {
    const keys = this.tenantKeys.get(organizationId);
    if (!keys || keys.size === 0) {
      return 0;
    }

    let count = 0;
    for (const key of keys) {
      if (this.cacheStore.delete(key)) {
        count += 1;
      }
    }

    this.tenantKeys.delete(organizationId);

    logger.warn(
      { organizationId, invalidatedCount: count },
      'SemanticCache: Invalidação em massa de cache do tenant concluída',
    );

    return count;
  }

  clear(): void {
    this.cacheStore.clear();
    this.tenantKeys.clear();
  }
}

export const semanticCache = new SemanticCacheService();
