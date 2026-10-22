import { beforeEach, describe, expect, it } from 'vitest';
import {
  CallRecordService,
} from '../../../src/features/voice-hub/services/callRecord.service.js';
import {
  InMemoryCallRecordRepository,
} from '../../../src/features/voice-hub/infra/PrismaCallRecordRepository.js';

describe('Voice Hub - Conversational Intelligence & Call Record Telemetry (Passo 039)', () => {
  let service: CallRecordService;
  let repo: InMemoryCallRecordRepository;

  const orgId = 'org-voice-alpha';
  const callId = 'call-telemetry-001';

  beforeEach(() => {
    repo = new InMemoryCallRecordRepository();
    service = new CallRecordService(repo);
  });

  it('deve redigir CPFs, cartões e dados sensíveis da transcrição antes de gravar', () => {
    const raw = 'O cliente informou o CPF 123.456.789-00 e o cartão 4532 1123 8899 0011 com o email cliente@empresa.com.';
    const redacted = service.redactPii(raw);

    expect(redacted).not.toContain('123.456.789-00');
    expect(redacted).not.toContain('4532 1123 8899 0011');
    expect(redacted).not.toContain('cliente@empresa.com');
    expect(redacted).toContain('[REDACTED_CPF]');
    expect(redacted).toContain('[REDACTED_CREDIT_CARD]');
    expect(redacted).toContain('[REDACTED_EMAIL]');
  });

  it('deve persistir métricas de chamada (durationMs, aiLatencyMs, talkRatios) com transcrição sanitizada', async () => {
    const record = await service.recordCallTelemetry({
      organizationId: orgId,
      callId,
      sellerId: 'seller-roberto',
      customerRef: 'lead-corp-42',
      durationMs: 180000,
      aiLatencyMs: 240,
      rawTranscript: 'Olá Roberto, me ligue no 11987654321 ou mande email para contato@alvo.com.',
      talkRatioSeller: 0.45,
      talkRatioCustomer: 0.55,
    });

    expect(record.id).toBeDefined();
    expect(record.organizationId).toBe(orgId);
    expect(record.durationMs).toBe(180000);
    expect(record.aiLatencyMs).toBe(240);
    expect(record.talkRatioSeller).toBe(0.45);
    expect(record.redactedTranscript).toContain('[REDACTED_EMAIL]');
    expect(record.redactedTranscript).not.toContain('contato@alvo.com');

    const fetched = await service.getCallRecord(orgId, callId);
    expect(fetched).not.toBeNull();
    expect(fetched?.callId).toBe(callId);
  });

  it('deve isolar a telemetria por organização (zero vazamento cross-tenant)', async () => {
    await service.recordCallTelemetry({
      organizationId: orgId,
      callId: 'call-org-a',
      sellerId: 'seller-a',
      customerRef: 'lead-a',
      durationMs: 60000,
      aiLatencyMs: 150,
      rawTranscript: 'Chamada privada Alpha',
      talkRatioSeller: 0.5,
      talkRatioCustomer: 0.5,
    });

    const otherOrg = 'org-voice-beta';
    const recordFromOther = await service.getCallRecord(otherOrg, 'call-org-a');
    expect(recordFromOther).toBeNull();
  });
});
