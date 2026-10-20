import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConsentAuditChainService,
  InMemoryConsentAuditChainRepository,
  computeConsentEventHash,
  canonicalJson,
  GENESIS_HASH,
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

    const genesis = (await auditChain.getChain('org-tenant-1'))[0];
    expect(genesis.kind).toBe('GENESIS');
    expect(genesis.previousHash).toBe(GENESIS_HASH);
    expect(event1.previousHash).toBe(genesis.currentHash);
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
    expect(verification.totalRecords).toBe(3);
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
    expect(verification.totalRecords).toBe(3);
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

    expect(chainA).toHaveLength(2);
    expect(chainB).toHaveLength(2);
    expect(chainA[0].kind).toBe('GENESIS');
    expect(chainA[1].previousHash).toBe(chainA[0].currentHash);
    expect(chainB[0].currentHash).not.toBe(chainA[0].currentHash);
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
    expect(r).toEqual({ valid: true, totalRecords: 21 });
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
    expect(rows).toHaveLength(3);
    expect(rows[1].previousHash).toBe(rows[0].currentHash);
    expect(String(locks[0][0])).toContain('pg_advisory_xact_lock');
    expect(await svc.verifyChainIntegrity('o')).toEqual({ valid: true, totalRecords: 3 });
    rows[1].termsVersion = 'adulterado';
    expect((await svc.verifyChainIntegrity('o')).valid).toBe(false);
  });

  it('Agente 15 (1): hash = sha256(prevHash + JSON canônico com chaves ordenadas recursivamente)', async () => {
    expect(canonicalJson({ b: 1, a: { d: [{ z: 1, y: 2 }], c: undefined } })).toBe(
      '{"a":{"d":[{"y":2,"z":1}]},"b":1}',
    );
    const e = (await auditChain.recordConsent({
      organizationId: 'o', subjectRef: 's', purpose: 'p', termsVersion: 'v',
    })) as import('../../../src/lib/security/consentAuditChain.service.js').StoredConsentAuditEvent;
    const { currentHash, previousHash, ...payload } = e;
    const { createHash } = await import('node:crypto');
    expect(currentHash).toBe(createHash('sha256').update(previousHash + canonicalJson(payload)).digest('hex'));
  });

  it('Agente 15 (3): detecta reordenação explícita de elos', async () => {
    for (const s of ['a', 'b', 'c']) {
      await auditChain.recordConsent({ organizationId: 'o', subjectRef: s, purpose: 'p', termsVersion: 'v' });
    }
    const raw = repo.rawChain('o');
    [raw[1], raw[2]] = [raw[2], raw[1]];
    const r = await auditChain.verify('o');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('SEQUENCE_GAP');
    const reordered = [...raw];
    // reordenação mesmo após "renumerar" é detectada pelo encadeamento
    reordered.forEach((e, i) => { e.sequence = i; });
    const r2 = verifyConsentChain('o', reordered);
    expect(r2.valid).toBe(false);
    expect(['PREVIOUS_HASH_MISMATCH', 'HASH_MISMATCH']).toContain(r2.reason);
  });

  it('Agente 15 (3): detecta remoção do gênese e gênese forjado no meio', async () => {
    await auditChain.recordConsent({ organizationId: 'o', subjectRef: 'a', purpose: 'p', termsVersion: 'v' });
    const raw = repo.rawChain('o');
    raw.shift();
    expect((await auditChain.verify('o')).valid).toBe(false);
  });

  it('Agente 15 (6): isolamento entre tenants — elo de outro tenant é rejeitado e cadeias não se cruzam', async () => {
    await auditChain.recordConsent({ organizationId: 'A', subjectRef: 'a', purpose: 'p', termsVersion: 'v' });
    await auditChain.recordConsent({ organizationId: 'B', subjectRef: 'b', purpose: 'p', termsVersion: 'v' });
    const a = await auditChain.getChain('A');
    expect(a.every((e) => e.organizationId === 'A')).toBe(true);
    const b = await auditChain.getChain('B');
    const r = verifyConsentChain('A', [a[0], b[1]]);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('TENANT_MISMATCH');
    await expect(auditChain.getChain('')).rejects.toThrow(/Tenancy/);
    expect((await auditChain.verify('B')).valid).toBe(true);
  });

  it('Agente 15 (4): evento de retração não carrega PII (titular pseudonimizado, só contagens)', async () => {
    const e = await auditChain.recordRetraction({
      organizationId: 'o', subjectRef: 'lead-joao@example.com', system: 'flywheel', purgedCounts: { fewShot: 2 },
    });
    expect(JSON.stringify(await auditChain.getChain('o'))).not.toContain('lead-joao@example.com');
    expect(e.subjectRef).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(e.kind).toBe('RETRACTION');
    expect((await auditChain.verify('o')).valid).toBe(true);
  });
});
