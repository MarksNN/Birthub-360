import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  withRlsContext: vi.fn(),
}));

vi.mock('@/lib/ai/gateway', () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock('@/features/knowledge/vector-support', () => ({
  hasVectorSupport: vi.fn(),
}));

vi.mock('@/features/knowledge/services/reranker.service', () => ({
  rerankerService: {
    rerank: vi.fn(async (_q, hits) => hits),
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    KNOWLEDGE_RERANK_CANDIDATES: 20,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { withRlsContext } from '@/lib/prisma';
import { generateEmbedding } from '@/lib/ai/gateway';
import { hasVectorSupport } from '@/features/knowledge/vector-support';
import { SearchService } from '@/features/knowledge/search.service';

describe('SearchService — Busca Híbrida e Observabilidade de Falhas (DEBT-UX-007)', () => {
  const searchService = new SearchService();
  const ORG = 'org-tenant-knowledge';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna array vazio imediato quando a query é vazia ou só espaços', async () => {
    const result = await searchService.hybridSearch(ORG, '   ');
    expect(result).toEqual({
      hits: [],
      semanticAvailable: true,
      keywordAvailable: true,
      query: '',
    });
    expect(withRlsContext).not.toHaveBeenCalled();
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it('quando FTS falha e ILIKE sucede, recupera candidatos por ILIKE com keywordAvailable: true', async () => {
    (hasVectorSupport as any).mockResolvedValue(false); // desliga semântico para isolar textual

    let callCount = 0;
    (withRlsContext as any).mockImplementation(async (callback: any) => {
      callCount++;
      if (callCount === 1) {
        // Primeira chamada (FTS) falha
        throw new Error('syntax error in tsquery');
      }
      // Segunda chamada (fallback ILIKE) sucede
      return callback({
        $queryRaw: vi.fn().mockResolvedValue([
          {
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            documentTitle: 'Manual do Usuário',
            content: 'Texto encontrado via ILIKE',
            chunkIndex: 0,
          },
        ]),
      });
    });

    const result = await searchService.hybridSearch(ORG, 'manual');

    expect(result.semanticAvailable).toBe(false);
    expect(result.keywordAvailable).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].chunkId).toBe('chunk-1');
  });

  it('quando embeddings falham mas textual sucede, mantém keywordAvailable: true e semanticAvailable: false sem derrubar a busca', async () => {
    (hasVectorSupport as any).mockResolvedValue(true);
    (generateEmbedding as any).mockRejectedValue(new Error('Embedding API rate limit'));

    (withRlsContext as any).mockImplementation(async (callback: any) => {
      return callback({
        $queryRaw: vi.fn().mockResolvedValue([
          {
            chunkId: 'chunk-keyword-1',
            documentId: 'doc-1',
            documentTitle: 'Artigo Comercial',
            content: 'Palavra chave presente',
            chunkIndex: 0,
          },
        ]),
      });
    });

    const result = await searchService.hybridSearch(ORG, 'comercial');

    expect(result.semanticAvailable).toBe(false);
    expect(result.keywordAvailable).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].chunkId).toBe('chunk-keyword-1');
  });

  it('quando textual falha (FTS e ILIKE) mas busca semântica sucede, mantém semanticAvailable: true e keywordAvailable: false', async () => {
    (hasVectorSupport as any).mockResolvedValue(true);
    (generateEmbedding as any).mockResolvedValue([0.1, 0.2, 0.3]);

    (withRlsContext as any).mockImplementation(async (callback: any) => {
      const tx = {
        $queryRaw: vi.fn().mockImplementation((strings: TemplateStringsArray) => {
          const sql = strings.join('');
          if (sql.includes('DocumentChunk') && sql.includes('<=>')) {
            // Chamada vetorial sucede
            return [
              {
                chunkId: 'chunk-semantic-1',
                documentId: 'doc-2',
                documentTitle: 'Documento Semântico',
                content: 'Similaridade de conteúdo encontrada',
                chunkIndex: 0,
                similarity: 0.88,
              },
            ];
          }
          // Chamadas textuais (FTS e ILIKE) estouram erro de banco
          throw new Error('Database connection reset during text search');
        }),
      };
      return callback(tx);
    });

    const result = await searchService.hybridSearch(ORG, 'sinistro de carga');

    expect(result.semanticAvailable).toBe(true);
    expect(result.keywordAvailable).toBe(false);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].chunkId).toBe('chunk-semantic-1');
  });

  it('quando AMBAS estratégias falham, lança exceção explícita em vez de mascarar como lista vazia', async () => {
    (hasVectorSupport as any).mockResolvedValue(true);
    (generateEmbedding as any).mockRejectedValue(new Error('Embedding provider down'));

    // Textual também falha
    (withRlsContext as any).mockRejectedValue(new Error('PostgreSQL connection refused'));

    await expect(searchService.hybridSearch(ORG, 'termo')).rejects.toThrow(
      'Base de Conhecimento temporariamente indisponível: falha nas buscas semântica e textual.',
    );
  });
});
