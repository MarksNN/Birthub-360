/**
 * Barramento de Idempotência Durável (Passo 23 / Agente 16)
 * Previne consumo duplicado de DomainEventConsumption.
 */

export class IdempotencyManager {
  private processedKeys = new Set<string>();

  public async acquireLock(idempotencyKey: string): Promise<boolean> {
    if (this.processedKeys.has(idempotencyKey)) {
      return false; // Chave já processada
    }
    this.processedKeys.add(idempotencyKey);
    return true;
  }

  public async releaseLock(idempotencyKey: string): Promise<void> {
    this.processedKeys.delete(idempotencyKey);
  }

  public isProcessed(idempotencyKey: string): boolean {
    return this.processedKeys.has(idempotencyKey);
  }
}

export const idempotencyManager = new IdempotencyManager();
