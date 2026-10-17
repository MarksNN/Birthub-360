import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../../../src/lib/prisma.js';
import { AuditService } from '../../../../src/lib/audit/audit.service.js';
import { MobileFieldMeetingService } from '../../../../src/features/mobile/server/mobileFieldMeeting.service.js';
import * as transcribeJob from '../../../../src/features/copiloto-ia/jobs/transcribeConversation.worker.js';

import { container } from '../../../../src/shared/di/container.js';

describe('MobileFieldMeetingService (Backend de Reuniões de Campo)', () => {
  let service: MobileFieldMeetingService;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuditService, 'log').mockResolvedValue({} as any);
    vi.spyOn(transcribeJob, 'enqueueTranscribeConversationJob').mockResolvedValue(undefined as any);

    container.register('CopilotoTranscriptionQueuePort', {
      enqueueTranscribeConversationJob: transcribeJob.enqueueTranscribeConversationJob,
    });
    service = new MobileFieldMeetingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejeita requisição sem título válido', async () => {
    await expect(
      service.syncFieldMeeting('org_1', {
        title: '',
        audioData: 'bW9jaw==',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 100,
        consentGranted: true,
      }),
    ).rejects.toThrow(/título da reunião de campo é obrigatório/i);
  });

  it('rejeita sincronização sem consentimento LGPD concedido', async () => {
    await expect(
      service.syncFieldMeeting('org_1', {
        title: 'Reunião sem consentimento',
        audioData: 'bW9jaw==',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 100,
        consentGranted: false,
      }),
    ).rejects.toThrow(/consentimento verbal prévio/i);
  });

  it('valida existência do lead no tenant e lança 404 se não for encontrado', async () => {
    vi.spyOn(prisma.lead, 'findFirst').mockResolvedValueOnce(null);

    await expect(
      service.syncFieldMeeting('org_1', {
        title: 'Reunião com Lead Inexistente',
        leadId: 'lead_inexistente',
        audioData: 'bW9jaw==',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 100,
        consentGranted: true,
      }),
    ).rejects.toThrow(/lead associado não encontrado/i);
  });

  it('cria conversa Copiloto IA, registra consentimento, transiciona status e persiste notas', async () => {
    vi.spyOn(prisma.lead, 'findFirst').mockResolvedValueOnce({ id: 'lead_123' } as any);

    const mockCreatedConv = {
      id: 'conv_copiloto_999',
      organizationId: 'org_1',
      source: 'MANUAL',
      status: 'SCHEDULED',
      title: 'Visita Técnica à Fábrica',
      leadId: 'lead_123',
    };

    vi.spyOn(prisma.copilotoConversation, 'create').mockResolvedValueOnce(mockCreatedConv as any);
    vi.spyOn(prisma.copilotoConsentRecord, 'create').mockResolvedValueOnce({ id: 'consent_1' } as any);
    vi.spyOn(prisma.copilotoConversation, 'update').mockResolvedValue(mockCreatedConv as any);
    vi.spyOn(prisma.copilotoTranscriptSegment, 'create').mockResolvedValueOnce({ id: 'seg_1' } as any);

    const result = await service.syncFieldMeeting(
      'org_1',
      {
        title: 'Visita Técnica à Fábrica',
        leadId: 'lead_123',
        audioData: 'dGVzdC1hdWRpby1ieXRlcw==',
        audioMimeType: 'audio/webm',
        audioSizeBytes: 85000,
        durationMs: 60000,
        recordedAt: '2026-10-16T14:30:00Z',
        consentGranted: true,
        consentMethod: 'FIELD_VERBAL_CONSENT',
        meetingNotes: 'Diretor aprovou envio de minuta contratual.',
      },
      'user_sdr_1',
      '127.0.0.1',
    );

    expect(prisma.copilotoConversation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_1',
        source: 'MANUAL',
        title: 'Visita Técnica à Fábrica',
        leadId: 'lead_123',
        createdBy: 'user_sdr_1',
      }),
    });

    expect(prisma.copilotoConsentRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_1',
        method: 'FIELD_VERBAL_CONSENT',
        actorId: 'user_sdr_1',
      }),
    });

    expect(prisma.copilotoTranscriptSegment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_1',
        text: expect.stringContaining('Diretor aprovou envio de minuta contratual.'),
        speakerLabel: 'Consultor (Campo)',
      }),
    });

    expect(transcribeJob.enqueueTranscribeConversationJob).toHaveBeenCalled();
    expect(result.status).toBe('PROCESSING');
    expect(result.hasNotes).toBe(true);
  });
});
