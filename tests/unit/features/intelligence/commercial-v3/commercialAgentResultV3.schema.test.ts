import { describe, expect, it } from 'vitest';
import { commercialAgentResultV3Schema } from '../../../../../src/features/intelligence/commercial-v3/contracts/commercialAgentResultV3.schema.js';

type Signals = {
  whatsappOptIn: 'CONFIRMED' | 'NOT_CONFIRMED' | 'UNKNOWN' | 'NOT_APPLICABLE';
  optOutSuppression: 'CLEAR' | 'SUPPRESSED' | 'UNKNOWN';
  touchHistory: 'NO_CONFLICT' | 'CONFLICT' | 'UNKNOWN';
  businessHours: 'WITHIN_WINDOW' | 'OUTSIDE_WINDOW' | 'UNKNOWN' | 'NOT_APPLICABLE';
  timezone: string | null;
};

const safeSignals: Signals = {
  whatsappOptIn: 'CONFIRMED',
  optOutSuppression: 'CLEAR',
  touchHistory: 'NO_CONFLICT',
  businessHours: 'WITHIN_WINDOW',
  timezone: 'America/Sao_Paulo',
};

function envelope(options?: {
  channel?: 'EMAIL' | 'WHATSAPP' | 'PHONE' | 'LINKEDIN' | 'MULTICHANNEL' | 'NONE';
  sendEligible?: boolean;
  signals?: Partial<Signals>;
  checkState?: 'PASS' | 'FAIL' | 'UNKNOWN' | 'NOT_APPLICABLE';
}) {
  return {
    schemaVersion: '3.1' as const,
    agentId: 'outbound' as const,
    missionId: 'm-1',
    correlationId: 'c-1',
    status: 'COMPLETED' as const,
    mode: 'CONSULTIVO' as const,
    skillIds: ['comercial.outbound.executar-cadencia'],
    summary: 'Análise',
    resumo_humano: 'Nada foi enviado.',
    artifacts: [],
    evidence: [],
    hypotheses: [],
    missingData: [],
    compliance: {
      channel: options?.channel ?? 'EMAIL',
      sendEligible: options?.sendEligible ?? false,
      reason: 'Critério de elegibilidade.',
      checks: [
        {
          check: 'OPT_OUT' as const,
          state: options?.checkState ?? 'PASS',
          reason: 'Lista consultada.',
          evidenceRef: null,
        },
      ],
      signals: { ...safeSignals, ...options?.signals },
    },
    approvalPending: {
      required: false,
      status: 'NOT_REQUIRED' as const,
      action: null,
      approverRole: null,
      requestId: null,
      reason: 'Sem ação sensível.',
    },
    handoffs: [],
    execution: {
      actionType: 'NONE' as const,
      performed: false,
      state: 'NONE' as const,
      executionId: null,
      idempotencyKey: null,
      toolCalls: [],
    },
    metrics: {},
    nextStep: 'Revisar.',
  };
}

describe('commercialAgentResultV3Schema — sinais de envio', () => {
  it('aceita envio quando sinais e checks estão limpos', () => {
    expect(commercialAgentResultV3Schema.safeParse(envelope({ sendEligible: true })).success).toBe(
      true,
    );
  });

  it.each([
    ['opt-out suprimido', { signals: { optOutSuppression: 'SUPPRESSED' as const } }],
    ['opt-out desconhecido', { signals: { optOutSuppression: 'UNKNOWN' as const } }],
    ['histórico desconhecido', { signals: { touchHistory: 'UNKNOWN' as const } }],
    ['histórico em conflito', { signals: { touchHistory: 'CONFLICT' as const } }],
    ['fora da janela', { signals: { businessHours: 'OUTSIDE_WINDOW' as const } }],
    ['janela desconhecida', { signals: { businessHours: 'UNKNOWN' as const } }],
    [
      'whatsapp sem opt-in',
      { channel: 'WHATSAPP' as const, signals: { whatsappOptIn: 'UNKNOWN' as const } },
    ],
    [
      'multicanal sem confirmação',
      { channel: 'MULTICHANNEL' as const, signals: { whatsappOptIn: 'NOT_CONFIRMED' as const } },
    ],
  ])('recusa sendEligible com %s', (_label, patch) => {
    const parsed = commercialAgentResultV3Schema.safeParse(envelope({ sendEligible: true, ...patch }));
    expect(parsed.success).toBe(false);
  });

  it('recusa sendEligible quando o check falha mesmo com sinais limpos', () => {
    const failed = commercialAgentResultV3Schema.safeParse(
      envelope({ sendEligible: true, channel: 'WHATSAPP', checkState: 'FAIL' }),
    );
    expect(failed.success).toBe(false);

    const unknownCheck = commercialAgentResultV3Schema.safeParse(
      envelope({ sendEligible: false, checkState: 'UNKNOWN' }),
    );
    expect(unknownCheck.success).toBe(true);
  });
});
