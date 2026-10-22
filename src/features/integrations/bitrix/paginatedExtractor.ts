/**
 * paginatedExtractor.ts (Passo 055)
 * Extração paginada e durável de histórico do Bitrix24 com checkpoint persistido.
 */

export interface ExtractionCheckpoint {
  organizationId: string;
  entityType: 'LEAD' | 'DEAL' | 'CONTACT' | 'COMPANY';
  lastExtractedId: number;
  processedCount: number;
  totalRecords: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ExtractionBatch {
  items: Array<{ id: number; title: string }>;
  nextStart?: number;
  total: number;
}

export class BitrixPaginatedExtractor {
  private checkpoints = new Map<string, ExtractionCheckpoint>();

  getCheckpoint(organizationId: string, entityType: string): ExtractionCheckpoint {
    const key = `${organizationId}:${entityType}`;
    return (
      this.checkpoints.get(key) ?? {
        organizationId,
        entityType: entityType as any,
        lastExtractedId: 0,
        processedCount: 0,
        totalRecords: 0,
        status: 'PENDING',
      }
    );
  }

  saveCheckpoint(checkpoint: ExtractionCheckpoint): void {
    const key = `${checkpoint.organizationId}:${checkpoint.entityType}`;
    this.checkpoints.set(key, { ...checkpoint });
  }

  /**
   * Processa uma página de extração e atualiza o checkpoint de forma atômica.
   */
  async processBatch(
    organizationId: string,
    entityType: 'LEAD' | 'DEAL' | 'CONTACT' | 'COMPANY',
    batchFetcher: (startId: number) => Promise<ExtractionBatch>,
  ): Promise<ExtractionCheckpoint> {
    const current = this.getCheckpoint(organizationId, entityType);
    const batch = await batchFetcher(current.lastExtractedId);

    if (batch.items.length === 0) {
      current.status = 'COMPLETED';
      current.totalRecords = current.processedCount;
      this.saveCheckpoint(current);
      return current;
    }

    const maxId = Math.max(...batch.items.map((i) => i.id));
    current.lastExtractedId = maxId;
    current.processedCount += batch.items.length;
    current.totalRecords = batch.total;
    current.status = current.processedCount >= batch.total ? 'COMPLETED' : 'IN_PROGRESS';

    this.saveCheckpoint(current);
    return current;
  }
}

export const bitrixPaginatedExtractor = new BitrixPaginatedExtractor();
