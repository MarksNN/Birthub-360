/**
 * Geração de embeddings — caminho separado do chat completion (modelo diferente, contrato de
 * resposta diferente, e o provedor padrão hoje nem sai para a rede). Usado para a Memória
 * Vetorial (RAG) do Agente SDR via pgvector ou Qdrant.
 */

import {
  type EmbeddingMetadata,
  initializeQdrantCollection,
  searchEmbeddings,
  upsertEmbedding,
} from '../embeddings/qdrant.js';
import { EMBEDDING_DIMENSIONS } from '../local-embeddings.js';
import { callProvider } from './circuit-breaker.js';
import { normalizeApiBaseUrl, resolveEmbeddingTimeoutMs } from './http-client.js';
import { readProviderError } from './redaction.js';

const MAX_EMBEDDING_INPUT_CHARS = 100_000;

/**
 * Verifica se Qdrant está configurado e deve ser usado
 */
function shouldUseQdrant(): boolean {
  return Boolean(process.env.QDRANT_URL && process.env.QDRANT_URL !== 'local');
}

/**
 * Gera embedding e opcionalmente armazena no Qdrant
 */
export const generateEmbedding = async (
  text: string,
  kind: 'query' | 'passage' = 'passage',
  options?: {
    tenantId?: string;
    documentId?: string;
    metadata?: Omit<EmbeddingMetadata, 'tenantId' | 'documentId'>;
  },
): Promise<number[]> => {
  // Provedor padrão é o modelo local: não depende de chave, de cota nem de serviço externo no ar.
  // `EMBEDDINGS_PROVIDER=gateway` volta ao caminho antigo (LiteLLM → Google) quando desejado.
  let embedding: number[];
  if ((process.env.EMBEDDINGS_PROVIDER || 'local') === 'local') {
    const { embedLocal } = await import('../local-embeddings.js');
    embedding = await embedLocal(text, kind);
  } else {
    // EMBEDDINGS_PROVIDER=gateway é o caminho legado via proxy LiteLLM (pré-modelo local). O
    // modelo servido pelo proxy é definido em litellm-config.yaml, fora deste código.
    const LITELLM_URL = normalizeApiBaseUrl(process.env.LITELLM_URL || 'http://localhost:4000');
    const LITELLM_KEY = process.env.LITELLM_KEY || 'sk-litellm';
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error('O texto do embedding não pode ser vazio.');
    if (normalizedText.length > MAX_EMBEDDING_INPUT_CHARS) {
      throw new Error(`O texto do embedding excede ${MAX_EMBEDDING_INPUT_CHARS} caracteres.`);
    }

    embedding = await callProvider('embedding', async () => {
      const response = await fetch(`${LITELLM_URL}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LITELLM_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LITELLM_EMBEDDING_MODEL || 'text-embedding-3-small',
          input: normalizedText,
        }),
        signal: AbortSignal.timeout(resolveEmbeddingTimeoutMs()),
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao gerar embedding (HTTP ${response.status}): ${await readProviderError(response)}`,
        );
      }

      const data = (await response.json()) as { data?: Array<{ embedding?: unknown }> };
      const embeddingResult = data.data?.[0]?.embedding;
      if (
        !Array.isArray(embeddingResult) ||
        embeddingResult.length === 0 ||
        !embeddingResult.every(Number.isFinite)
      ) {
        throw new Error('O provedor retornou um embedding inválido.');
      }
      // Mesma guarda de local-embeddings.ts: a coluna é vector(768) — um provedor gateway que
      // devolva outra dimensão (ex.: text-embedding-3-small da OpenAI, 1536) precisa falhar aqui,
      // dentro do try/catch de "falha de embedding", em vez de estourar sem tratamento no INSERT.
      if (embeddingResult.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `O provedor gateway devolveu ${embeddingResult.length} dimensões, mas a coluna espera ${EMBEDDING_DIMENSIONS}.`,
        );
      }
      return embeddingResult as number[];
    });
  }

  // Se Qdrant estiver configurado e metadados fornecidos, armazenar o embedding
  if (shouldUseQdrant() && options?.tenantId && options?.documentId) {
    try {
      await initializeQdrantCollection();
      await upsertEmbedding(options.tenantId, options.documentId, embedding, {
        ...options.metadata,
        tenantId: options.tenantId,
        documentId: options.documentId,
      });
    } catch (error) {
      console.error('Erro ao armazenar embedding no Qdrant (continuando sem Qdrant):', error);
      // Não falhar a geração de embedding se Qdrant falhar
    }
  }

  return embedding;
};

/**
 * Busca embeddings semânticos no Qdrant
 */
export const searchSemanticEmbeddings = async (
  tenantId: string,
  queryVector: number[],
  options?: {
    limit?: number;
    scoreThreshold?: number;
    documentType?: string;
  },
): Promise<Array<{ id: string; score: number; payload: EmbeddingMetadata }>> => {
  if (!shouldUseQdrant()) {
    throw new Error('Qdrant não está configurado. Defina QDRANT_URL no .env');
  }

  try {
    await initializeQdrantCollection();
    return await searchEmbeddings(tenantId, queryVector, {
      limit: options?.limit,
      scoreThreshold: options?.scoreThreshold,
      filter: options?.documentType
        ? { tenantId, documentType: options.documentType }
        : { tenantId },
    });
  } catch (error) {
    console.error('Erro ao buscar embeddings no Qdrant:', error);
    throw error;
  }
};
