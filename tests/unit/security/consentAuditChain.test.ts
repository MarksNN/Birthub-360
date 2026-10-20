import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConsentAuditChainService,
  InMemoryConsentAuditChainRepository,
  computeConsentEventHash,
  verifyConsentChain,
} from '../../../src/lib/security/consentAuditChain.service.js';
import {
  type ConsentAuditRow,
  type ConsentAuditTx,
  PrismaConsentAuditChainRepository,
} from '../../../src/lib/security/prismaConsentAuditChain.repository.js';

describe('ConsentAuditChainService Unit Tests', () => {
  let auditChain: ConsentAuditChainService;
  let repo: InMemoryConsentAuditChainRepository;

  beforeEach(() => {
    repo = new InMemoryConsentAuditChainRepository();
    auditChain = new ConsentAuditChainService(repo);
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
    const chain = repo.rawChain('org-tenant-1');
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

    const chainA = await auditChain.getChain('org-A');
    const chainB = await auditChain.getChain('org-B');

    expect(chainA).toHaveLength(1);
    expect(chainB).toHaveLength(1);
    expect(chainA[0].previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(chainB[0].previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('REMED-06: getChain devolve cópia (adulterar retorno não afeta o armazenado)', async () => {
    await auditChain.recordConsent({ organizationId: 'o', subjectRef: 's', purpose: 'p', termsVersion: 'v' });
    const copy = await auditChain.getChain('o');
    copy[0].purpose = 'X';
    expect((await auditChain.verifyChainIntegrity('o')).valid).toBe(true);
  });

  it('REMED-06: detecta remoção de elo (SEQUENCE_GAP) e reordenação', async () => {
    for (const s of ['a', 'b', 'c']) {
      await auditChain.recordConsent({ organizationId: 'o', subjectRef: s, purpose: 'p', termsVersion: 'v' });
    }
    const raw = repo.rawChain('o');
    raw.splice(1, 1);
    const r = await auditChain.verifyChainIntegrity('o');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('SEQUENCE_GAP');
  });

  it('REMED-06: detecta hash recalculado por atacante sem reencadear o elo seguinte', async () => {
    for (const s of ['a', 'b']) {
      await auditChain.recordConsent({ organizationId: 'o', subjectRef: s, purpose: 'p', termsVersion: 'v' });
    }
    const raw = repo.rawChain('o');
    raw[0].purpose = 'forjado';
    const { currentHash: _h, ...content } = raw[0];
    raw[0].currentHash = computeConsentEventHash(content);
    const r = verifyConsentChain('o', raw);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('PREVIOUS_HASH_MISMATCH');
    expect(r.brokenAtId).toBe(raw[1].id);
  });

  it('REMED-06: appends concorrentes no mesmo tenant mantêm cadeia linear', async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        auditChain.recordConsent({ organizationId: 'o', subjectRef: `s${i}`, purpose: 'p', termsVersion: 'v' }),
      ),
    );
    const r = await auditChain.verifyChainIntegrity('o');
    expect(r).toEqual({ valid: true, totalRecords: 20 });
  });

  it('REMED-06: revogação notifica consumidores para expurgo', async () => {
    const calls: string[] = [];
    auditChain.onRevocation(async (org, subj) => {
      calls.push(`${org}:${subj}`);
    });
    await auditChain.revokeConsent('o', 'lead-9', 'pedido do titular');
    expect(calls).toEqual(['o:lead-9']);
  });

  it('REMED-06: repositório Prisma persiste, usa advisory lock e relê cadeia verificável', async () => {
    const rows: ConsentAuditRow[] = [];
    const locks: unknown[][] = [];
    const tx: ConsentAuditTx = {
      consentAuditRecord: {
        findFirst: async ({ where }) =>
          rows.filter((r) => r.organizationId === where.organizationId).sort((a, b) => b.sequence - a.sequence)[0] ??
          null,
        findMany: async ({ where }) =>
          rows.filter((r) => r.organizationId === where.organizationId).sort((a, b) => a.sequence - b.sequence),
        create: async ({ data }) => {
          if (rows.some((r) => r.organizationId === data.organizationId && r.sequence === data.sequence)) {
            throw new Error('unique violation (organizationId, sequence)');
          }
          rows.push({ ...data });
          return data;
        },
      },
      $executeRaw: async (q, ...v) => {
        locks.push([q.join('?'), ...v]);
        return 1;
      },
    };
    const db = { ...tx, $transaction: <T>(fn: (t: ConsentAuditTx) => Promise<T>) => fn(tx) };
    const svc = new ConsentAuditChainService(new PrismaConsentAuditChainRepository(db));
    await svc.recordConsent({ organizationId: 'o', subjectRef: 'a', purpose: 'p', termsVersion: 'v', retentionDays: 30 });
    await svc.revokeConsent('o', 'a', 'r');
    expect(rows).toHaveLength(2);
    expect(rows[1].previousHash).toBe(rows[0].currentHash);
    expect(String(locks[0][0])).toContain('pg_advisory_xact_lock');
    expect(await svc.verifyChainIntegrity('o')).toEqual({ valid: true, totalRecords: 2 });
    rows[0].termsVersion = 'adulterado';
    expect((await svc.verifyChainIntegrity('o')).valid).toBe(false);
  });
});
