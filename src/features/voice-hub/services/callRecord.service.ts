/**
 * callRecord.service.ts (Passo 039)
 * Serviço de gravação de telemetria de chamadas de voz com redação mandatória de PII.
 */

import {
  type CallRecordData,
  type CallRecordRepository,
  InMemoryCallRecordRepository,
} from '../infra/PrismaCallRecordRepository.js';

export class CallRecordService {
  constructor(
    private readonly repo: CallRecordRepository = new InMemoryCallRecordRepository(),
  ) {}

  /**
   * Redige dados pessoais (CPF, telefones, cartões de crédito e emails) antes da persistência.
   */
  public redactPii(transcript: string): string {
    if (!transcript) return '';

    return transcript
      // CPF: 000.000.000-00 ou 11 dígitos
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[REDACTED_CPF]')
      // Cartão de Crédito: 16 dígitos
      .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[REDACTED_CREDIT_CARD]')
      // E-mails
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
      // Telefones: (XX) 9XXXX-XXXX ou variações
      .replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/g, (match) => {
        if (match.trim().length <= 5) return match;
        return '[REDACTED_PHONE]';
      });
  }

  async recordCallTelemetry(params: {
    organizationId: string;
    callId: string;
    sellerId: string;
    customerRef: string;
    durationMs: number;
    aiLatencyMs: number;
    rawTranscript: string;
    talkRatioSeller: number;
    talkRatioCustomer: number;
  }): Promise<CallRecordData> {
    if (!params.organizationId || !params.callId) {
      throw new Error('Tenancy violation: organizationId e callId obrigatórios');
    }

    const redactedTranscript = this.redactPii(params.rawTranscript);

    return this.repo.saveCallRecord({
      organizationId: params.organizationId,
      callId: params.callId,
      sellerId: params.sellerId,
      customerRef: params.customerRef,
      durationMs: params.durationMs,
      aiLatencyMs: params.aiLatencyMs,
      redactedTranscript,
      talkRatioSeller: params.talkRatioSeller,
      talkRatioCustomer: params.talkRatioCustomer,
    });
  }

  async getCallRecord(organizationId: string, callId: string): Promise<CallRecordData | null> {
    return this.repo.findByCallId(organizationId, callId);
  }
}

export const callRecordService = new CallRecordService();
