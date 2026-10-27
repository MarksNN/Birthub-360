import type { AutomationActionLabel, AutomationTriggerLabel } from '../../lib/enumMap.js';

/**
 * P3.1: Extensão de gatilhos do motor de automações para cobrir todo o ciclo
 * de vendas e inteligência comercial da plataforma Birth Hub 360°.
 */
export type ExtendedAutomationTrigger =
  | AutomationTriggerLabel
  | 'Deal mudou de estágio'
  | 'Reunião agendada'
  | 'Proposta enviada'
  | 'Contrato assinado'
  | 'Score de risco mudou';

/**
 * P3.1: Extensão das ações do motor de automações.
 */
export type ExtendedAutomationAction =
  | AutomationActionLabel
  | 'Atualizar campo customizado'
  | 'Enrich lead'
  | 'Chamar webhook externo'
  | 'Mover para outra etapa de cadência';

export interface WebhookActionConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  secret?: string;
  timeoutMs?: number;
}

export interface UpdateCustomFieldActionConfig {
  entity?: 'Lead' | 'Company' | 'Contact';
  entityId?: string;
  field: string;
  value: unknown;
}

export interface EnrichLeadActionConfig {
  leadId?: string;
  enrichmentType?: 'full' | 'contact' | 'company';
  priority?: 'low' | 'normal' | 'high';
}

export interface CadenceActionConfig {
  cadenceId: string;
  leadId?: string;
  stepIndex?: number;
  action: 'move_to_step' | 'pause' | 'resume' | 'restart';
  pauseDays?: number;
}

export interface ExtendedAutomationEvent {
  organizationId: string;
  trigger: ExtendedAutomationTrigger;
  entity: 'Lead' | 'Activity' | 'Company' | 'Contact' | 'Deal';
  entityId: string;
  data: Record<string, unknown>;
}
