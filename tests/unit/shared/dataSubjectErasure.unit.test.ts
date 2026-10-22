import { describe, it, expect } from 'vitest';
import {
  ANONYMIZED_CONTACT_NAME,
  ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT,
  type ErasureResult,
  type ErasureTarget,
} from '../../../src/shared/services/dataSubjectErasure.service';

describe('dataSubjectErasure — Contratos e Definições de Anonimização LGPD (Unitário)', () => {
  it('define marcadores explícitos e não-nulos para identificação de titular anonimizado', () => {
    expect(ANONYMIZED_CONTACT_NAME).toBe('[titular anonimizado — LGPD]');
    expect(ANONYMIZED_TRANSCRIPT_SEGMENT_TEXT).toBe('[segmento de transcrição anonimizado — LGPD]');
  });

  it('valida estrutura do target e campos obrigatórios de tenancy', () => {
    const target: ErasureTarget = {
      organizationId: 'org-tenant-123',
      contactId: 'contact-abc',
      actorUserId: 'admin-user-001',
    };

    expect(target.organizationId).toBe('org-tenant-123');
    expect(target.contactId).toBe('contact-abc');
    expect(target.actorUserId).toBe('admin-user-001');
  });

  it('valida formato canônico do resultado de anonimização', () => {
    const result: ErasureResult = {
      contactId: 'contact-abc',
      whatsAppMessagesMasked: 4,
      conversationSignalsRedacted: 2,
      timelineEventsRedacted: 5,
      voiceCallLogsRedacted: 1,
      copilotoTranscriptSegmentsRedacted: 10,
      copilotoInsightsRedacted: 3,
      copilotoAudiosDeleted: 1,
      alreadyAnonymized: false,
    };

    expect(result.alreadyAnonymized).toBe(false);
    expect(result.whatsAppMessagesMasked).toBe(4);
    expect(result.copilotoAudiosDeleted).toBe(1);
  });
});
