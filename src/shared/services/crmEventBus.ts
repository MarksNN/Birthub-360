import { logger } from '../../lib/logger.js';

export interface CrmLeadStageChangedEvent {
  organizationId: string;
  leadId: string;
  stageId?: string;
  funnel?: string;
  data: Record<string, unknown>;
}

export type CrmLeadStageChangedListener = (event: CrmLeadStageChangedEvent) => Promise<void> | void;

const listeners: CrmLeadStageChangedListener[] = [];

/**
 * Registra um ouvinte para transições de estágio/conversões no CRM.
 * Chamado principalmente pelo composition root (`src/shared/di/setup.ts`).
 */
export function subscribeToCrmStageChanges(listener: CrmLeadStageChangedListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
}

/**
 * Publica um evento de alteração de estágio/status do CRM de forma desacoplada.
 */
export async function publishCrmStageChange(event: CrmLeadStageChangedEvent): Promise<void> {
  for (const listener of listeners) {
    try {
      await listener(event);
    } catch (err) {
      logger.error({ err, event }, 'Erro ao executar listener de transição de etapa do CRM');
    }
  }
}
