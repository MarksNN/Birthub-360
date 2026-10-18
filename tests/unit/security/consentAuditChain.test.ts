import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentAuditChainService } from '../../../src/lib/security/consentAuditChain.service.js';

describe('ConsentAuditChainService Unit Tests', () => {
  let auditChain: ConsentAuditChainService;

  beforeEach(() => {
    auditChain = new ConsentAuditChainService();
    auditChain.clear();
  });

  it('should record genesis and subsequent consent events with valid hash linking', async () => {
    const event1 = await auditChain.recordConsent({
      organizationId: 'org-tenant-1',
      subjectRef: 'lead-001',
      purpose: 'COMMERCIAL_CONTACT',
      termsVersion: 'v2026.1',
      operatorUserId: 'user-sdr-1',
      retentionDays: 180,
    });

    expect(event1.previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(event1.currentHash).toMatch(/^[a-f0-9]{64}$/);

    const event2 = await auditChain.recordConsent({
      organizationId: 'org-tenant-1',
      subjectRef: 'lead-002',
      purpose: 'AI_ROLEPLAY_TRAINING',
      termsVersion: 'v2026.1',
      operatorUserId: 'user-sdr-1',
    });

    expect(event2.previousHash).toBe(event1.currentHash);
    expect(event2.currentHash).toMatch(/^[a-f0-9]{64}$/);

    const verification = await auditChain.verifyChainIntegrity('org-tenant-1');
    expect(verification.valid).toBe(true);
    expect(verification.totalRecords).toBe(2);
  });

  it('should append revocation event and maintain chain validity', async () => {
    await auditChain.recordConsent({
      organizationId: 'org-tenant-1',
      subjectRef: 'lead-003',
      purpose: 'MARKETING_WHATSAPP',
      termsVersion: 'v2026.1',
    });

    const revoked = await auditChain.revokeConsent(
      'org-tenant-1',
      'lead-003',
      'Direito de revogação solicitado via formulário de privacidade',
      'user-dpo-1',
    );

    expect(revoked.status).toBe('REVOKED');
    expect(revoked.purpose).toContain('REVOCATION');

    const verification = await auditChain.verifyChainIntegrity('org-tenant-1');
    expect(verification.valid).toBe(true);
    expect(verification.totalRecords).toBe(2);
  });

  it('should detect tampering if an historical record is modified', async () => {
    await auditChain.recordConsent({
      organizationId: 'org-tenant-1',
      subjectRef: 'lead-004',
      purpose: 'RECORD_A',
      termsVersion: 'v1',
    });

    await auditChain.recordConsent({
      organizationId: 'org-tenant-1',
      subjectRef: 'lead-005',
      purpose: 'RECORD_B',
      termsVersion: 'v1',
    });

    // Modifica indevidamente o conteúdo do primeiro registro (simulando ataque/adulteração)
    const chain = auditChain.getChain('org-tenant-1');
    chain[0].purpose = 'RECORD_ALTERADO_ILEGALMENTE';

    const verification = await auditChain.verifyChainIntegrity('org-tenant-1');
    expect(verification.valid).toBe(false);
    expect(verification.brokenAtId).toBe(chain[0].id);
  });

  it('should keep independent chains for separate tenants', async () => {
    await auditChain.recordConsent({
      organizationId: 'org-A',
      subjectRef: 'lead-A',
      purpose: 'PROSPECTING',
      termsVersion: 'v1',
    });

    await auditChain.recordConsent({
      organizationId: 'org-B',
      subjectRef: 'lead-B',
      purpose: 'PROSPECTING',
      termsVersion: 'v1',
    });

    const chainA = auditChain.getChain('org-A');
    const chainB = auditChain.getChain('org-B');

    expect(chainA).toHaveLength(1);
    expect(chainB).toHaveLength(1);
    expect(chainA[0].previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(chainB[0].previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
  });
});
