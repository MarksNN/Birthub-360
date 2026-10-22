import { describe, expect, it } from 'vitest';
import {
  BitrixPaginatedExtractor,
  type ExtractionBatch,
} from '../../../../src/features/integrations/bitrix/paginatedExtractor.js';

describe('BitrixPaginatedExtractor (Passo 055)', () => {
  const orgId = 'org-bitrix-extractor';

  it('deve extrair lote inicial e registrar checkpoint com id e contagem', async () => {
    const extractor = new BitrixPaginatedExtractor();

    const mockFetcher = async (startId: number): Promise<ExtractionBatch> => {
      expect(startId).toBe(0);
      return {
        items: [
          { id: 1, title: 'Lead 1' },
          { id: 2, title: 'Lead 2' },
        ],
        total: 4,
      };
    };

    const cp = await extractor.processBatch(orgId, 'LEAD', mockFetcher);
    expect(cp.lastExtractedId).toBe(2);
    expect(cp.processedCount).toBe(2);
    expect(cp.totalRecords).toBe(4);
    expect(cp.status).toBe('IN_PROGRESS');
  });

  it('deve retomar a partir do último checkpoint sem duplicar registros', async () => {
    const extractor = new BitrixPaginatedExtractor();

    // Seta checkpoint anterior (já extraiu até id=10)
    extractor.saveCheckpoint({
      organizationId: orgId,
      entityType: 'DEAL',
      lastExtractedId: 10,
      processedCount: 10,
      totalRecords: 15,
      status: 'IN_PROGRESS',
    });

    const mockFetcher = async (startId: number): Promise<ExtractionBatch> => {
      expect(startId).toBe(10); // Retoma exatamente a partir de 10
      return {
        items: [
          { id: 11, title: 'Deal 11' },
          { id: 12, title: 'Deal 12' },
          { id: 13, title: 'Deal 13' },
          { id: 14, title: 'Deal 14' },
          { id: 15, title: 'Deal 15' },
        ],
        total: 15,
      };
    };

    const cp = await extractor.processBatch(orgId, 'DEAL', mockFetcher);
    expect(cp.lastExtractedId).toBe(15);
    expect(cp.processedCount).toBe(15);
    expect(cp.status).toBe('COMPLETED');
  });
});
