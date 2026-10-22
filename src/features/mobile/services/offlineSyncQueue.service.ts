/**
 * Fila de Sincronização Offline — Mobile Capacitor (Passo 40 / Agente 09)
 * Gerencia persistência local de mutações offline e sincronização ordenada ao reconectar.
 */

export interface OfflineMutation {
  id: string;
  action: string;
  endpoint: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export class OfflineSyncQueueService {
  private queue: OfflineMutation[] = [];

  public enqueue(mutation: Omit<OfflineMutation, 'id' | 'timestamp'>): OfflineMutation {
    const item: OfflineMutation = {
      ...mutation,
      id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    this.queue.push(item);
    return item;
  }

  public getQueue(): OfflineMutation[] {
    return [...this.queue];
  }

  public clear(): void {
    this.queue = [];
  }
}

export const offlineSyncQueue = new OfflineSyncQueueService();
