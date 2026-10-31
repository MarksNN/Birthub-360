import { z } from 'zod';
import { COMMERCIAL_V3_AGENT_IDS } from './commercialAgentV3.types.js';

export const commercialV3AgentIdSchema = z.enum(COMMERCIAL_V3_AGENT_IDS);

export const commercialV3ArtifactSchema = z.object({
  artifactType: z.enum([
    'CADENCE_DRAFT',
    'MESSAGE_DRAFT',
    'CALL_SCRIPT',
    'VOICEMAIL_DRAFT',
    'FOLLOWUP_PLAN',
    'REPLY_TRIAGE',
    'PERFORMANCE_REVIEW',
    'HANDOFF_PROPOSAL',
    'EVENT_OUTREACH_PLAN',
    'OTHER',
    'ANALYSIS',
    'PLAN',
    'MATRIX',
    'REPORT',
    'SCORECARD',
    'SCENARIO',
    'QUOTE_DRAFT',
    'DEMO_DRAFT',
    'CRM_CHANGESET',
    'RISK_REGISTER',
    'QUALIFICATION_BRIEF',
    'ROUTING_PLAN',
    'TRAINING_PLAN',
    'OTHER_DOCUMENT',
  ]),
  name: z.string(),
  payload: z.record(z.unknown()),
  state: z.enum([
    'DRAFT_NOT_SENT',
    'PREPARED_NOT_EXECUTED',
    'PERSISTED_VERIFIED',
    'EXECUTED_VERIFIED',
  ]),
});

export const commercialV3EvidenceSchema = z.object({
  sourceType: z.enum([
    'USER_INPUT',
    'DOCUMENT',
    'CRM',
    'TOOL_EXECUTION',
    'PROVIDER_EVENT',
    'POLICY',
    'OTHER',
  ]),
  reference: z.string(),
  claim: z.string(),
  verification: z.enum([
    'USER_REPORTED',
    'TOOL_VERIFIED',
    'POLICY_REFERENCE',
    'UNVERIFIED',
  ]),
  observedAt: z.string().nullable().optional(),
});

export const commercialV3ComplianceCheckSchema = z.object({
  check: z.enum([
    'LEGAL_BASIS',
    'PURPOSE',
    'OPT_OUT',
    'ORIGIN',
    'CHANNEL_POLICY',
    'WHATSAPP_OPT_IN',
    'TEMPLATE',
    'WINDOW_24H',
    'FREQUENCY',
    'BUSINESS_HOURS',
    'DUPLICATE',
    'OWNER',
    'HUMAN_APPROVAL',
    'AUTHORIZATION',
  ]),
  state: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE']),
  reason: z.string(),
  evidenceRef: z.string().nullable().optional(),
});

export const commercialV3ComplianceSignalsSchema = z.object({
  whatsappOptIn: z.enum(['CONFIRMED', 'NOT_CONFIRMED', 'UNKNOWN', 'NOT_APPLICABLE']),
  optOutSuppression: z.enum(['CLEAR', 'SUPPRESSED', 'UNKNOWN']),
  touchHistory: z.enum(['NO_CONFLICT', 'CONFLICT', 'UNKNOWN']),
  businessHours: z.enum(['WITHIN_WINDOW', 'OUTSIDE_WINDOW', 'UNKNOWN', 'NOT_APPLICABLE']),
  timezone: z.string().nullable(),
});

export const commercialV3ComplianceSchema = z
  .object({
    channel: z.enum(['EMAIL', 'WHATSAPP', 'PHONE', 'LINKEDIN', 'MULTICHANNEL', 'NONE']),
    sendEligible: z.boolean(),
    reason: z.string(),
    checks: z.array(commercialV3ComplianceCheckSchema),
    signals: commercialV3ComplianceSignalsSchema,
  })
  .superRefine((data, ctx) => {
    const hasUnsafeSignal =
      data.signals.optOutSuppression === 'UNKNOWN' ||
      data.signals.optOutSuppression === 'SUPPRESSED' ||
      data.signals.touchHistory === 'UNKNOWN' ||
      data.signals.touchHistory === 'CONFLICT' ||
      data.signals.businessHours === 'UNKNOWN' ||
      data.signals.businessHours === 'OUTSIDE_WINDOW' ||
      ((data.channel === 'WHATSAPP' || data.channel === 'MULTICHANNEL') &&
        (data.signals.whatsappOptIn === 'UNKNOWN' || data.signals.whatsappOptIn === 'NOT_CONFIRMED'));

    const hasFailedOrUnknownCheck = data.checks.some(
      (c) => c.state === 'FAIL' || c.state === 'UNKNOWN',
    );

    if ((hasUnsafeSignal || hasFailedOrUnknownCheck) && data.sendEligible) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sendEligible não pode ser true quando houver checks ou sinais com UNKNOWN/FAIL.',
        path: ['sendEligible'],
      });
    }
  });

export const commercialV3ApprovalPendingSchema = z.object({
  required: z.boolean(),
  status: z.enum(['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']),
  action: z.string().nullable(),
  approverRole: z.string().nullable(),
  requestId: z.string().nullable(),
  reason: z.string(),
});

export const commercialV3HandoffSchema = z.object({
  to: commercialV3AgentIdSchema,
  reason: z.string(),
  payloadRef: z.string().nullable(),
  viaSupervisor: z.literal(true),
});

export const commercialV3ToolCallSchema = z.object({
  toolCode: z.string(),
  status: z.enum(['SUCCESS', 'FAILURE']),
  reference: z.string(),
});

export const commercialV3ExecutionSchema = z.object({
  actionType: z.enum([
    'ASSIGN_OWNER',
    'CREATE_TASK',
    'DRAFT_ONLY',
    'ENQUEUE_SEND',
    'GENERATE_DOCUMENT',
    'GENERATE_REPORT',
    'NONE',
    'READ_DATA',
    'SAVE_DRAFT',
    'SCHEDULE_MEETING',
    'SCHEDULE_TASK',
    'SEND_MESSAGE',
    'SUBMIT_FOR_APPROVAL',
    'UPDATE_CRM',
    'UPDATE_RESOURCE',
    'UPDATE_SUPPRESSION',
  ]),
  performed: z.boolean(),
  state: z.enum([
    'NONE',
    'PREPARED',
    'PERSISTED_VERIFIED',
    'EXECUTED_VERIFIED',
    'DENIED',
    'FAILED',
  ]),
  executionId: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  toolCalls: z.array(commercialV3ToolCallSchema),
});

export const commercialAgentResultV3Schema = z.object({
  schemaVersion: z.literal('3.1'),
  agentId: commercialV3AgentIdSchema,
  missionId: z.string().nullable(),
  correlationId: z.string().nullable(),
  status: z.enum(['COMPLETED', 'PARTIAL', 'BLOCKED', 'APPROVAL_REQUIRED', 'NEEDS_INFO']),
  mode: z.enum(['CONSULTIVO', 'OPERACIONAL', 'BLOQUEADO']),
  skillIds: z
    .array(z.string().regex(/^comercial\.[a-z_]+\.[a-z0-9-]+$/))
    .refine((items) => new Set(items).size === items.length, {
      message: 'skillIds deve conter apenas identificadores únicos.',
    }),
  summary: z.string(),
  resumo_humano: z.string().min(1).max(600),
  artifacts: z.array(commercialV3ArtifactSchema),
  evidence: z.array(commercialV3EvidenceSchema),
  hypotheses: z.array(z.string()),
  missingData: z.array(z.string()),
  compliance: commercialV3ComplianceSchema,
  approvalPending: commercialV3ApprovalPendingSchema,
  handoffs: z.array(commercialV3HandoffSchema),
  execution: commercialV3ExecutionSchema,
  metrics: z.record(z.union([z.number(), z.string(), z.null()])),
  nextStep: z.string(),
});
