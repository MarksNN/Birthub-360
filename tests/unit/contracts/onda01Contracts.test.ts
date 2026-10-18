import { describe, expect, it } from 'vitest';
import type { DomainEventEnvelope, DomainEventType } from '../../../src/shared/contracts/domainEventMesh.contract.js';
import type { CuratedObjectionItem, ObjectionCurationStatus } from '../../../src/shared/contracts/dataFlywheel.contract.js';
import type { SemanticCacheKeyParams } from '../../../src/shared/contracts/semanticCache.contract.js';
import type { ConsentAuditEvent } from '../../../src/shared/contracts/consentAudit.contract.js';

describe('Onda 01 — Shared Contracts Validation', () => {
  it('should support valid DomainEventEnvelope structure', () => {
    const event: DomainEventEnvelope<{ dealId: string }> = {
      eventId: 'evt-123',
      eventType: 'COMMERCIAL_OBJECTION_DETECTED',
      eventVersion: '1.0.0',
      organizationId: 'org-tenant-a',
      correlationId: 'corr-456',
      occurredAt: new Date().toISOString(),
      producer: 'voice-hub',
      aggregateId: 'call-789',
      payload: { dealId: 'deal-999' },
    };

    expect(event.eventId).toBe('evt-123');
    expect(event.eventType).toBe('COMMERCIAL_OBJECTION_DETECTED');
    expect(event.organizationId).toBe('org-tenant-a');
  });

  it('should support Objection Curation Status transitions', () => {
    const validStatuses: ObjectionCurationStatus[] = [
      'DETECTED',
      'NORMALIZED',
      'REVIEW_REQUIRED',
      'VERIFIED',
      'PROMOTED',
      'REJECTED',
      'RETRACTED',
    ];
    expect(validStatuses).toHaveLength(7);

    const objection: CuratedObjectionItem = {
      id: 'obj-1',
      organizationId: 'org-1',
      sourceInteractionId: 'call-1',
      sourceType: 'VOICE_CALL',
      category: 'Preço',
      commercialContext: 'Cliente achou caro comparado a solução local',
      segment: 'Logística',
      detectedAt: new Date().toISOString(),
      confidenceScore: 0.92,
      version: 1,
      curationStatus: 'VERIFIED',
      anonymizedEvidence: 'O valor da mensalidade está 30% acima do orçamento',
    };

    expect(objection.confidenceScore).toBeGreaterThan(0.9);
    expect(objection.curationStatus).toBe('VERIFIED');
  });

  it('should support Semantic Cache Key parameters', () => {
    const keyParams: SemanticCacheKeyParams = {
      organizationId: 'org-a',
      model: 'local-llama3',
      promptVersion: 'v1.2',
      purpose: 'social-selling-approach',
      promptText: 'Elaborar abordagem para diretor de operações',
    };
    expect(keyParams.organizationId).toBe('org-a');
  });

  it('should support Consent Audit Event schema', () => {
    const consent: ConsentAuditEvent = {
      id: 'c-1',
      organizationId: 'org-1',
      subjectRef: 'lead-lead123',
      purpose: 'AI_COMMERCIAL_TRAINING',
      termsVersion: '2026-v1',
      previousHash: 'GENESIS_HASH',
      currentHash: 'abc123hash',
      occurredAt: new Date().toISOString(),
      status: 'GRANTED',
    };
    expect(consent.previousHash).toBe('GENESIS_HASH');
  });
});
