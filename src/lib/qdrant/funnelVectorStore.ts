import { logger } from '../logger.js';
import { isQdrantConfigured, qdrant } from './index.js';

export const QDRANT_FUNNEL_COLLECTION = 'sales_funnel_deals';
export const VECTOR_DIMENSION = 768;

export interface QdrantDealPoint {
  id: string;
  organizationId: string;
  tradeName?: string;
  segment?: string;
  cnae?: string;
  stage?: string;
  value?: number;
}

export interface QdrantSearchResult {
  dealId: string;
  similarity: number;
  payload: Record<string, unknown>;
}

/**
  Garante que a coleção vetorial no Qdrant para o funil de vendas exista.
 */
export async function ensureFunnelCollectionExists(): Promise<boolean> {
  if (!isQdrantConfigured()) return false;
  try {
    const { collections } = await qdrant.getCollections();
    const exists = collections.some((c) => c.name === QDRANT_FUNNEL_COLLECTION);
    if (!exists) {
      await qdrant.createCollection(QDRANT_FUNNEL_COLLECTION, {
        vectors: {
          size: VECTOR_DIMENSION,
          distance: 'Cosine',
        },
      });
      logger.info({ collection: QDRANT_FUNNEL_COLLECTION }, '[qdrant] Coleção de funil criada.');
    }
    return true;
  } catch (err: any) {
    logger.warn({ err }, '[qdrant] Falha ao verificar/criar coleção de funil.');
    return false;
  }
}

/**
 * Indexa um negócio ganho no Qdrant para busca de similaridade no Lead Scoring.
 */
export async function indexWonDealVector(
  point: QdrantDealPoint,
  vector: number[],
): Promise<boolean> {
  if (!isQdrantConfigured() || vector.length !== VECTOR_DIMENSION) return false;
  try {
    await ensureFunnelCollectionExists();
    await qdrant.upsert(QDRANT_FUNNEL_COLLECTION, {
      wait: true,
      points: [
        {
          id: point.id,
          vector,
          payload: {
            organizationId: point.organizationId,
            tradeName: point.tradeName || '',
            segment: point.segment || '',
            cnae: point.cnae || '',
            value: point.value || 0,
            indexedAt: Date.now(),
          },
        },
      ],
    });
    return true;
  } catch (err: any) {
    logger.error({ err, dealId: point.id }, '[qdrant] Falha ao indexar negócio no Qdrant.');
    return false;
  }
}

/**
 * Busca negócios ganhos semelhantes no Qdrant por similaridade vetorial.
 */
export async function searchSimilarWonDealsInQdrant(
  organizationId: string,
  vector: number[],
  limit = 5,
): Promise<QdrantSearchResult[]> {
  if (!isQdrantConfigured() || vector.length !== VECTOR_DIMENSION) return [];
  try {
    const results = await (qdrant as any).search(QDRANT_FUNNEL_COLLECTION, {
      vector,
      filter: {
        must: [
          {
            key: 'organizationId',
            match: { value: organizationId },
          },
        ],
      },
      limit,
      with_payload: true,
    });

    return (results || []).map((r: any) => ({
      dealId: String(r.id),
      similarity: r.score,
      payload: (r.payload as Record<string, unknown>) || {},
    }));
  } catch (err: any) {
    logger.warn(
      { err, organizationId },
      '[qdrant] Falha na busca vetorial por negócios semelhantes.',
    );
    return [];
  }
}
