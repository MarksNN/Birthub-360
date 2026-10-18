import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainEventMeshService } from '../../../src/lib/queue/domainEventMesh.service.js';

describe('DomainEventMeshService Unit Tests', () => {
  let mesh: DomainEventMeshService;

  beforeEach(() => {
    mesh = new DomainEventMeshService();
    mesh.clearProcessedEvents();
  });

  it('should publish valid event and record in outbox', async () => {
    const published = await mesh.publish({
      eventType: 'COMMERCIAL_OBJECTION_DETECTED',
      eventVersion: '1.0.0',
      organizationId: 'org-tenant-1',
      correlationId: 'corr-001',
      producer: 'voice-hub',
      aggregateId: 'call-101',
      payload: { objectionCategory: 'Preço', confidence: 0.95 },
    });

    expect(published.eventId).toMatch(/^evt-/);
    expect(published.occurredAt).toBeDefined();

    const outbox = mesh.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].status).toBe('DISPATCHED');
    expect(outbox[0].organizationId).toBe('org-tenant-1');
  });

  it('should reject event without organizationId (tenancy isolation check)', async () => {
    await expect(
      mesh.publish({
        eventType: 'DEAL_RISK_SPIKED',
        eventVersion: '1.0.0',
        organizationId: '',
        correlationId: 'corr-002',
        producer: 'revops',
        aggregateId: 'deal-202',
        payload: { riskScore: 88 },
      }),
    ).rejects.toThrow(/Tenancy violation/);
  });

  it('should prevent recursion cycles when causation depth exceeds maximum', async () => {
    await expect(
      mesh.publish({
        eventType: 'DEAL_RISK_SPIKED',
        eventVersion: '1.0.0',
        organizationId: 'org-tenant-1',
        correlationId: 'corr-003',
        causationId: 'evt-1->evt-2->evt-3->evt-4->evt-5->evt-6',
        producer: 'ai-swarm',
        aggregateId: 'deal-303',
        payload: { cycle: true },
      }),
    ).rejects.toThrow(/Ciclo causal excedeu limite máximo permitido/);
  });

  it('should execute registered subscribers for the 5 canonical flows', async () => {
    const handlerMobile = vi.fn();
    const handlerVoice = vi.fn();
    const handlerRisk = vi.fn();
    const handlerRoleplay = vi.fn();
    const handlerMeeting = vi.fn();

    mesh.subscribe('MOBILE_MEETING_AUDIO_SYNCED', handlerMobile);
    mesh.subscribe('VOICE_CALL_COMPLETED', handlerVoice);
    mesh.subscribe('DEAL_RISK_SPIKED', handlerRisk);
    mesh.subscribe('ROLEPLAY_SESSION_MASTERED', handlerRoleplay);
    mesh.subscribe('CRM_MEETING_SCHEDULED', handlerMeeting);

    await mesh.publish({
      eventType: 'MOBILE_MEETING_AUDIO_SYNCED',
      eventVersion: '1.0.0',
      organizationId: 'org-test',
      correlationId: 'c1',
      producer: 'mobile',
      aggregateId: 'm1',
      payload: { audioSynced: true },
    });
    expect(handlerMobile).toHaveBeenCalledTimes(1);

    await mesh.publish({
      eventType: 'VOICE_CALL_COMPLETED',
      eventVersion: '1.0.0',
      organizationId: 'org-test',
      correlationId: 'c2',
      producer: 'voice',
      aggregateId: 'v1',
      payload: { duration: 180 },
    });
    expect(handlerVoice).toHaveBeenCalledTimes(1);

    await mesh.publish({
      eventType: 'DEAL_RISK_SPIKED',
      eventVersion: '1.0.0',
      organizationId: 'org-test',
      correlationId: 'c3',
      producer: 'revops',
      aggregateId: 'd1',
      payload: { silenceDays: 6 },
    });
    expect(handlerRisk).toHaveBeenCalledTimes(1);

    await mesh.publish({
      eventType: 'ROLEPLAY_SESSION_MASTERED',
      eventVersion: '1.0.0',
      organizationId: 'org-test',
      correlationId: 'c4',
      producer: 'roleplay',
      aggregateId: 'r1',
      payload: { score: 94 },
    });
    expect(handlerRoleplay).toHaveBeenCalledTimes(1);

    await mesh.publish({
      eventType: 'CRM_MEETING_SCHEDULED',
      eventVersion: '1.0.0',
      organizationId: 'org-test',
      correlationId: 'c5',
      producer: 'social-selling',
      aggregateId: 's1',
      payload: { meetingId: 'meet-1' },
    });
    expect(handlerMeeting).toHaveBeenCalledTimes(1);
  });
});
