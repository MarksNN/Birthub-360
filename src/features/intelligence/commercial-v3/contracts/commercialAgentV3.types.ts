/**
 * Contratos e Tipos da Célula Comercial V3.1 Multiagentes (19 Especialistas, 463 Habilidades).
 * Fonte canônica: AGENT_RESULT_V3_1_GLOBAL.schema.json e EXECUTION_POLICY_V3_1.json.
 */

export const COMMERCIAL_V3_AGENT_IDS = [
  'supervisor',
  'gestao',
  'icp',
  'account_intel',
  'prospeccao',
  'intencao',
  'outbound',
  'sdr',
  'solucoes',
  'negociacao',
  'deal_desk',
  'deal_health',
  'forecast',
  'growth_analytics',
  'coaching',
  'crm',
  'expansao',
  'parcerias',
  'winloss',
] as const;

export type CommercialV3AgentId = (typeof COMMERCIAL_V3_AGENT_IDS)[number];

export type CommercialV3Status =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'BLOCKED'
  | 'APPROVAL_REQUIRED'
  | 'NEEDS_INFO';

export type CommercialV3Mode = 'CONSULTIVO' | 'OPERACIONAL' | 'BLOQUEADO';

export type CommercialV3ArtifactType =
  | 'CADENCE_DRAFT'
  | 'MESSAGE_DRAFT'
  | 'CALL_SCRIPT'
  | 'VOICEMAIL_DRAFT'
  | 'FOLLOWUP_PLAN'
  | 'REPLY_TRIAGE'
  | 'PERFORMANCE_REVIEW'
  | 'HANDOFF_PROPOSAL'
  | 'EVENT_OUTREACH_PLAN'
  | 'OTHER'
  | 'ANALYSIS'
  | 'PLAN'
  | 'MATRIX'
  | 'REPORT'
  | 'SCORECARD'
  | 'SCENARIO'
  | 'QUOTE_DRAFT'
  | 'DEMO_DRAFT'
  | 'CRM_CHANGESET'
  | 'RISK_REGISTER'
  | 'QUALIFICATION_BRIEF'
  | 'ROUTING_PLAN'
  | 'TRAINING_PLAN'
  | 'OTHER_DOCUMENT';

export type CommercialV3ArtifactState =
  | 'DRAFT_NOT_SENT'
  | 'PREPARED_NOT_EXECUTED'
  | 'PERSISTED_VERIFIED'
  | 'EXECUTED_VERIFIED';

export interface CommercialV3Artifact {
  artifactType: CommercialV3ArtifactType;
  name: string;
  payload: Record<string, unknown>;
  state: CommercialV3ArtifactState;
}

export type CommercialV3EvidenceSource =
  | 'USER_INPUT'
  | 'DOCUMENT'
  | 'CRM'
  | 'TOOL_EXECUTION'
  | 'PROVIDER_EVENT'
  | 'POLICY'
  | 'OTHER';

export type CommercialV3EvidenceVerification =
  | 'USER_REPORTED'
  | 'TOOL_VERIFIED'
  | 'POLICY_REFERENCE'
  | 'UNVERIFIED';

export interface CommercialV3Evidence {
  sourceType: CommercialV3EvidenceSource;
  reference: string;
  claim: string;
  verification: CommercialV3EvidenceVerification;
  observedAt?: string | null;
}

export type CommercialV3Channel =
  | 'EMAIL'
  | 'WHATSAPP'
  | 'PHONE'
  | 'LINKEDIN'
  | 'MULTICHANNEL'
  | 'NONE';

export type CommercialV3CheckType =
  | 'LEGAL_BASIS'
  | 'PURPOSE'
  | 'OPT_OUT'
  | 'ORIGIN'
  | 'CHANNEL_POLICY'
  | 'WHATSAPP_OPT_IN'
  | 'TEMPLATE'
  | 'WINDOW_24H'
  | 'FREQUENCY'
  | 'BUSINESS_HOURS'
  | 'DUPLICATE'
  | 'OWNER'
  | 'HUMAN_APPROVAL'
  | 'AUTHORIZATION';

export type CommercialV3CheckState = 'PASS' | 'FAIL' | 'UNKNOWN' | 'NOT_APPLICABLE';

export interface CommercialV3ComplianceCheck {
  check: CommercialV3CheckType;
  state: CommercialV3CheckState;
  reason: string;
  evidenceRef?: string | null;
}

export interface CommercialV3ComplianceSignals {
  whatsappOptIn: 'CONFIRMED' | 'NOT_CONFIRMED' | 'UNKNOWN' | 'NOT_APPLICABLE';
  optOutSuppression: 'CLEAR' | 'SUPPRESSED' | 'UNKNOWN';
  touchHistory: 'NO_CONFLICT' | 'CONFLICT' | 'UNKNOWN';
  businessHours: 'WITHIN_WINDOW' | 'OUTSIDE_WINDOW' | 'UNKNOWN' | 'NOT_APPLICABLE';
  timezone: string | null;
}

export interface CommercialV3Compliance {
  channel: CommercialV3Channel;
  sendEligible: boolean;
  reason: string;
  checks: CommercialV3ComplianceCheck[];
  signals: CommercialV3ComplianceSignals;
}

export interface CommercialV3ApprovalPending {
  required: boolean;
  status: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  action: string | null;
  approverRole: string | null;
  requestId: string | null;
  reason: string;
}

export interface CommercialV3Handoff {
  to: CommercialV3AgentId;
  reason: string;
  payloadRef: string | null;
  viaSupervisor: true;
}

export type CommercialV3ActionType =
  | 'ASSIGN_OWNER'
  | 'CREATE_TASK'
  | 'DRAFT_ONLY'
  | 'ENQUEUE_SEND'
  | 'GENERATE_DOCUMENT'
  | 'GENERATE_REPORT'
  | 'NONE'
  | 'READ_DATA'
  | 'SAVE_DRAFT'
  | 'SCHEDULE_MEETING'
  | 'SCHEDULE_TASK'
  | 'SEND_MESSAGE'
  | 'SUBMIT_FOR_APPROVAL'
  | 'UPDATE_CRM'
  | 'UPDATE_RESOURCE'
  | 'UPDATE_SUPPRESSION';

export type CommercialV3ExecutionState =
  | 'NONE'
  | 'PREPARED'
  | 'PERSISTED_VERIFIED'
  | 'EXECUTED_VERIFIED'
  | 'DENIED'
  | 'FAILED';

export interface CommercialV3ToolCall {
  toolCode: string;
  status: 'SUCCESS' | 'FAILURE';
  reference: string;
}

export interface CommercialV3Execution {
  actionType: CommercialV3ActionType;
  performed: boolean;
  state: CommercialV3ExecutionState;
  executionId: string | null;
  idempotencyKey: string | null;
  toolCalls: CommercialV3ToolCall[];
}

export interface CommercialAgentResultV3 {
  schemaVersion: '3.1';
  agentId: CommercialV3AgentId;
  missionId: string | null;
  correlationId: string | null;
  status: CommercialV3Status;
  mode: CommercialV3Mode;
  skillIds: string[];
  summary: string;
  resumo_humano: string;
  artifacts: CommercialV3Artifact[];
  evidence: CommercialV3Evidence[];
  hypotheses: string[];
  missingData: string[];
  compliance: CommercialV3Compliance;
  approvalPending: CommercialV3ApprovalPending;
  handoffs: CommercialV3Handoff[];
  execution: CommercialV3Execution;
  metrics: Record<string, number | string | null>;
  nextStep: string;
}

export interface CommercialSkillDefinition {
  id: string;
  name: string;
  playbookId: string;
  catalogStage: string;
  number: number;
  agentId: CommercialV3AgentId;
}

export interface CommercialPlaybookMetadata {
  id: string;
  name?: string;
  path: string;
  skillIds?: string[];
  content?: string;
}

export interface CommercialAgentCatalogEntry {
  id: CommercialV3AgentId;
  name: string;
  prompt: string;
  index: string;
  skills: number;
  playbooks: number;
}
