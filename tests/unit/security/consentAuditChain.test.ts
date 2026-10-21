import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CanonicalJsonError, canonicalJson } from '../../../src/lib/security/canonicalJson.js';
import {
  CONSENT_CHAIN_FORMAT_VERSION,
  ConsentAuditChainService,
  ConsentChainUnavailableError,
  computeConsentEventHash,
  GENESIS_HASH,
  InMemoryConsentAuditChainRepository,
  type StoredConsentAuditEvent,
  verifyConsentChain,
} from '../../../src/lib/security/consentAuditChain.service.js';
import {
  assertConsentChainBootConfig,
  createConsentAuditChain,
  hasConsentChainDelegates,
} from '../../../src/lib/security/consentChainFactory.js';
import {
  EnvTenantPepperProvider,
  InMemorySubjectKeyStore,
  KmsEnvelopeTenantKeyProvider,
  InMemoryWrappedTenantKeyStore,
  TenantKeyDestroyedError,
  MissingPepperError,
  SubjectShreddedError,
  SubjectTokenizer,
} from '../../../src/lib/security/subjectTokenizer.js';

const PEPPER = 'p'.repeat(48); // valor de teste, não é segredo

const rec = (svc: ConsentAuditChainService, o: string, s: string) =>
  svc.recordConsent({ organizationId: o, subjectRef: s, purpose: 'COMMERCIAL_CONTACT', termsVersion: 'v1' });

describe('ConsentAuditChain — REMED-06 / Agentes 15 e 24', () => {
  let repo: InMemoryConsentAuditChainRepository;
  let keys: InMemorySubjectKeyStore;
  let tokenizer: SubjectTokenizer;
  let chain: ConsentAuditChainService;

  beforeEach(() => {
    repo = new InMemoryConsentAuditChainRepository();
    keys = new InMemorySubjectKeyStore();
    tokenizer = new SubjectTokenizer(new EnvTenantPepperProvider(PEPPER), keys);
    chain = new ConsentAuditChainService({ repo, tokenizer });
  });

  describe('F6 — canonicalização', () => {
    it('ordena chaves recursivamente, Date como ISO, NFC e rejeita Map/Set', () => {
      expect(canonicalJson({ b: 1, a: { d: [{ z: 1, y: 2 }], c: undefined } })).toBe(
        '{"a":{"d":[{"y":2,"z":1}]},"b":1}',
      );
      expect(canonicalJson({ t: new Date('2026-10-20T12:00:00.123Z') })).toBe('{"t":"2026-10-20T12:00:00.123Z"}');
      expect(canonicalJson('Jose\u0301')).toBe(canonicalJson('Jos\u00e9'));
      expect(() => canonicalJson(new Map())).toThrow(CanonicalJsonError);
      expect(() => canonicalJson({ s: new Set([1]) })).toThrow(CanonicalJsonError);
      expect(() => canonicalJson(Number.NaN)).toThrow(CanonicalJsonError);
    });

    it('hash = sha256(previousHash + JSON canônico) com versão de formato', async () => {
      const e = (await rec(chain, 'o', 's')) as StoredConsentAuditEvent;
      expect(e.formatVersion).toBe(CONSENT_CHAIN_FORMAT_VERSION);
      const { currentHash, previousHash, ...payload } = e;
      expect(currentHash).toBe(
        createHash('sha256')
          .update(previousHash + canonicalJson(payload))
          .digest('hex'),
      );
      expect(Date.parse(e.occurredAt)).not.toBeNaN();
      expect(e.occurredAt).toMatch(/\.\d{3}Z$/); // precisão de ms = timestamptz(3)
    });
  });

  describe('gênese, head e verificação', () => {
    it('cria gênese por tenant e encadeia', async () => {
      const e1 = await rec(chain, 'o', 'a');
      const all = await chain.getChain('o');
      expect(all[0].kind).toBe('GENESIS');
      expect(all[0].previousHash).toBe(GENESIS_HASH);
      expect(e1.previousHash).toBe(all[0].currentHash);
      expect(await chain.verifyChainIntegrity('o')).toEqual({ valid: true, totalRecords: 2 });
    });

    it('detecta adulteração de conteúdo', async () => {
      await rec(chain, 'o', 'a');
      repo.rawChain('o')[1].purpose = 'ALTERADO';
      const r = await chain.verifyChainIntegrity('o');
      expect(r).toMatchObject({ valid: false, reason: 'HASH_MISMATCH' });
    });

    it('detecta hash recalculado sem reencadear o elo seguinte', async () => {
      await rec(chain, 'o', 'a');
      await rec(chain, 'o', 'b');
      const raw = repo.rawChain('o');
      raw[1].purpose = 'forjado';
      const { currentHash: _h, ...content } = raw[1];
      raw[1].currentHash = computeConsentEventHash(content);
      expect(await chain.verifyChainIntegrity('o')).toMatchObject({ valid: false, reason: 'PREVIOUS_HASH_MISMATCH' });
    });

    it('detecta reordenação (com e sem renumerar sequence)', async () => {
      for (const s of ['a', 'b', 'c']) await rec(chain, 'o', s);
      const raw = repo.rawChain('o');
      [raw[1], raw[2]] = [raw[2], raw[1]];
      expect((await chain.verifyChainIntegrity('o')).reason).toBe('SEQUENCE_GAP');
      raw.forEach((e, i) => {
        e.sequence = i;
      });
      const r = await chain.verifyChainIntegrity('o');
      expect(r.valid).toBe(false);
      expect(['PREVIOUS_HASH_MISMATCH', 'HASH_MISMATCH']).toContain(r.reason);
    });

    it('detecta lacuna no meio', async () => {
      for (const s of ['a', 'b', 'c']) await rec(chain, 'o', s);
      repo.rawChain('o').splice(2, 1);
      expect((await chain.verifyChainIntegrity('o')).reason).toBe('SEQUENCE_GAP');
    });

    it('F5/P2-2: detecta truncamento de cauda via head', async () => {
      for (const s of ['a', 'b', 'c']) await rec(chain, 'o', s);
      repo.rawChain('o').pop();
      expect((await chain.verifyChainIntegrity('o')).reason).toBe('TRUNCATED');
      repo.rawChain('o').splice(0);
      expect((await chain.verifyChainIntegrity('o')).reason).toBe('TRUNCATED');
    });

    it('F5: detecta recriação da cadeia (novo gênese) e recusa append sobre head órfão', async () => {
      await rec(chain, 'o', 'a');
      const head = repo.rawHeads().get('o');
      repo.rawChain('o').splice(0);
      await expect(rec(chain, 'o', 'b')).rejects.toBeInstanceOf(ConsentChainUnavailableError);
      // atacante recria cadeia do zero com repositório limpo mas mantém o head antigo
      const forged = new InMemoryConsentAuditChainRepository();
      const svc2 = new ConsentAuditChainService({ repo: forged, tokenizer });
      await rec(svc2, 'o', 'x');
      const r = verifyConsentChain('o', await forged.listChain('o'), head);
      expect(r).toMatchObject({ valid: false, reason: 'GENESIS_REPLACED' });
    });

    it('detecta head ausente com cadeia existente', async () => {
      await rec(chain, 'o', 'a');
      repo.rawHeads().delete('o');
      expect((await chain.verifyChainIntegrity('o')).reason).toBe('HEAD_MISSING');
    });

    it('appends concorrentes mantêm cadeia linear', async () => {
      await Promise.all(Array.from({ length: 20 }, (_, i) => rec(chain, 'o', `s${i}`)));
      expect(await chain.verifyChainIntegrity('o')).toEqual({ valid: true, totalRecords: 21 });
    });
  });

  describe('isolamento entre tenants', () => {
    it('cadeias, gêneses e tokens independentes; elo alheio é rejeitado', async () => {
      await rec(chain, 'A', 'mesmo-lead');
      await rec(chain, 'B', 'mesmo-lead');
      const a = await chain.getChain('A');
      const b = await chain.getChain('B');
      expect(a.every((e) => e.organizationId === 'A')).toBe(true);
      expect(a[0].currentHash).not.toBe(b[0].currentHash);
      expect(a[1].subjectRef).not.toBe(b[1].subjectRef); // pepper por tenant
      expect(verifyConsentChain('A', [a[0], b[1]])).toMatchObject({ valid: false, reason: 'TENANT_MISMATCH' });
      await expect(chain.getChain('')).rejects.toThrow(/Tenancy/);
      expect((await chain.verifyChainIntegrity('B')).valid).toBe(true);
    });
  });

  describe('F2/F3 — pseudonimização HMAC, crypto-shredding e ausência de PII', () => {
    it('subjectRef na cadeia é HMAC (não o valor nem hash simples) e estável por titular', async () => {
      const e1 = await rec(chain, 'o', 'joao@example.com');
      const e2 = await rec(chain, 'o', 'joao@example.com');
      expect(e1.subjectRef).toMatch(/^hs256:[a-f0-9]{64}$/);
      expect(e1.subjectRef).toBe(e2.subjectRef);
      expect(e1.subjectRef).not.toContain(createHash('sha256').update('joao@example.com').digest('hex'));
      expect(JSON.stringify(await chain.getChain('o'))).not.toContain('joao');
    });

    it('verify acusa PII_IN_CHAIN se um subjectRef em claro for gravado', async () => {
      await rec(chain, 'o', 'a');
      const raw = repo.rawChain('o');
      raw[1].subjectRef = 'lead-em-claro';
      const { currentHash: _c, ...content } = raw[1];
      raw[1].currentHash = computeConsentEventHash(content);
      expect((await chain.verifyChainIntegrity('o')).reason).toBe('PII_IN_CHAIN');
    });

    it('reason é enum; texto livre é recusado e o detalhe fica fora da cadeia (expurgável)', async () => {
      await expect(chain.revokeConsent('o', 'a', 'Maria pediu por telefone')).rejects.toThrow(/reason inválido/);
      const ev = await chain.revokeConsent('o', 'a', 'TITULAR_REQUEST', 'u1', { detail: 'ligação de Maria' });
      expect(JSON.stringify(await chain.getChain('o'))).not.toContain('Maria');
      expect([...repo.details.values()].map((d) => d.eventId)).toEqual([ev.id]);
    });

    it('ERASURE_REQUEST destrói a chave do titular (crypto-shredding) e o detalhe livre', async () => {
      const before = await rec(chain, 'o', 'lead-1');
      await chain.revokeConsent('o', 'lead-1', 'ERASURE_REQUEST', 'u1', { detail: 'x' });
      expect(keys.size()).toBe(0);
      expect(repo.details.size).toBe(0);
      // tombstone: a chave nunca é recriada — novo consentimento do titular esquecido falha fechado
      await expect(rec(chain, 'o', 'lead-1')).rejects.toBeInstanceOf(SubjectShreddedError);
      expect(before.subjectRef).toMatch(/^hs256:/);
      expect((await chain.verifyChainIntegrity('o')).valid).toBe(true);
    });

    it('pepper ausente/curto falha fechado; KMS envelope: DEK por tenant, cifrada, destrutível', async () => {
      await expect(new EnvTenantPepperProvider(undefined).getPepper('o')).rejects.toBeInstanceOf(MissingPepperError);
      const calls: string[] = [];
      const wrap = (k: Buffer, o: string) => Buffer.concat([Buffer.from(`wrapped:${o}:`), k]);
      const kms = {
        generateDataKey: async ({ encryptionContext }: { encryptionContext: Record<string, string> }) => {
          calls.push(`gen:${encryptionContext.organizationId}`);
          const plaintext = createHash('sha256').update(`dek-${encryptionContext.organizationId}`).digest();
          return { plaintext, ciphertext: wrap(plaintext, encryptionContext.organizationId) };
        },
        decrypt: async ({ ciphertext, encryptionContext }: { ciphertext: Buffer; encryptionContext: Record<string, string> }) => {
          calls.push(`dec:${encryptionContext.organizationId}`);
          const prefix = `wrapped:${encryptionContext.organizationId}:`;
          if (!ciphertext.subarray(0, prefix.length).equals(Buffer.from(prefix))) throw new Error('contexto inválido');
          return ciphertext.subarray(prefix.length);
        },
      };
      const store = new InMemoryWrappedTenantKeyStore();
      const provider = new KmsEnvelopeTenantKeyProvider(kms, store, 'alias/lgpd', 0);
      const t = new SubjectTokenizer(provider, new InMemorySubjectKeyStore());
      const a1 = await t.lookupId('A', 's');
      expect(a1).not.toBe(await t.lookupId('B', 's'));
      expect(await t.lookupId('A', 's')).toBe(a1); // DEK persistida cifrada e reaberta via decrypt
      expect(calls).toEqual(['gen:A', 'gen:B', 'dec:A']);
      const st = await store.get('A');
      expect(st.status).toBe('ACTIVE');
      await t.destroyTenantKey('A');
      await expect(t.lookupId('A', 's')).rejects.toBeInstanceOf(TenantKeyDestroyedError);
      expect(calls.filter((c) => c === 'gen:A')).toHaveLength(1); // não recria após destruir
      expect(await t.lookupId('B', 's')).toBeTruthy();
    });

    it('contrato HMAC: token ≠ sha256(subjectRef) e muda quando a chave muda', async () => {
      const ks = new InMemorySubjectKeyStore();
      const t = new SubjectTokenizer(new EnvTenantPepperProvider(PEPPER), ks);
      const tok = await t.tokenFor('o', 'lead-1');
      const sha = createHash('sha256').update('lead-1').digest('hex');
      expect(tok).toMatch(/^hs256:/);
      expect(tok).not.toContain(sha);
      expect(tok.slice('hs256:'.length)).not.toBe(sha);
      // outra chave de titular (store novo) → token diferente para o mesmo subjectRef
      const t2 = new SubjectTokenizer(new EnvTenantPepperProvider(PEPPER), new InMemorySubjectKeyStore());
      expect(await t2.tokenFor('o', 'lead-1')).not.toBe(tok);
      // outro segredo de tenant → lookupId diferente
      const t3 = new SubjectTokenizer(new EnvTenantPepperProvider(PEPPER.replace(/./, 'z')), ks);
      expect(await t3.lookupId('o', 'lead-1')).not.toBe(await t.lookupId('o', 'lead-1'));
    });

    it('produção com provider por env: falha no boot da fábrica', () => {
      expect(() =>
        createConsentAuditChain({
          env: { NODE_ENV: 'production', LGPD_KMS_KEY_ID: 'alias/x' },
          pepperProvider: new EnvTenantPepperProvider(PEPPER),
          prisma: {},
        }),
      ).toThrow(MissingPepperError);
    });

    it('produção sem KMS: fail-closed, mesmo com segredo global presente', async () => {
      const chain = createConsentAuditChain({
        env: { NODE_ENV: 'production', LGPD_SUBJECT_PEPPER_SECRET: PEPPER },
        prisma: {},
      });
      await expect(chain.subjectPseudonym('o', 's')).rejects.toBeInstanceOf(MissingPepperError);
    });
  });

  describe('F4/P2-3 — outbox de expurgo reprocessável', () => {
    it('revogação + tarefa na mesma transação; falha do purger mantém PENDING e reprocessa', async () => {
      let fail = true;
      const purged: string[] = [];
      chain.registerPurger('x', async (o, s) => {
        if (fail) throw new Error('db fora');
        purged.push(`${o}:${s}`);
        return { rows: 1 };
      });
      await chain.revokeConsent('o', 'lead-9', 'TITULAR_REQUEST');
      const [task] = [...repo.purges.values()];
      expect(task).toMatchObject({ status: 'PENDING', attempts: 1 });
      expect((await chain.getChain('o')).some((e) => e.kind === 'RETRACTION')).toBe(false);

      fail = false;
      const r = await chain.processPendingPurges(50, new Date(Date.now() + 3_600_000));
      expect(r).toEqual({ done: 1, failed: 0 });
      expect(purged).toEqual(['o:lead-9']);
      const done = repo.purges.get(task.id);
      expect(done).toMatchObject({ status: 'DONE', subjectRef: null });
      expect(done?.retainUntil).toBeDefined();
      const events = await chain.getChain('o');
      const retraction = events.filter((e) => e.kind === 'RETRACTION');
      expect(retraction).toHaveLength(1);
      expect(JSON.stringify(events)).not.toContain('lead-9');
      // idempotente: nada mais a processar
      expect(await chain.processPendingPurges(50, new Date(Date.now() + 7_200_000))).toEqual({ done: 0, failed: 0 });
      expect((await chain.verifyChainIntegrity('o')).valid).toBe(true);
    });

    it('falha ao gravar a revogação não deixa tarefa órfã (atomicidade)', async () => {
      const failing = new InMemoryConsentAuditChainRepository();
      const orig = failing.withTenantLock.bind(failing);
      failing.withTenantLock = (o, fn) =>
        orig(o, async (ctx) => {
          const r = await fn({
            ...ctx,
            enqueuePurge: async () => {
              throw new Error('crash');
            },
          });
          return r;
        });
      const svc = new ConsentAuditChainService({ repo: failing, tokenizer });
      await expect(svc.revokeConsent('o', 'l', 'TITULAR_REQUEST')).rejects.toThrow('crash');
      expect(failing.purges.size).toBe(0);
      expect(await failing.listChain('o')).toHaveLength(0);
    });

    it('registros concluídos expiram após a retenção', async () => {
      chain.registerPurger('x', async () => ({}));
      await chain.revokeConsent('o', 'l', 'TITULAR_REQUEST');
      expect(repo.purges.size).toBe(1);
      await chain.processPendingPurges(50, new Date(Date.now() + 1826 * 86_400_000));
      expect(repo.purges.size).toBe(0);
    });

    it('broadcast entre instâncias é chamado ao concluir o expurgo', async () => {
      const sent: string[] = [];
      chain.setPurgeBroadcaster(async (o, s) => {
        sent.push(`${o}:${s}`);
      });
      await chain.revokeConsent('o', 'l', 'TITULAR_REQUEST');
      expect(sent).toEqual(['o:l']);
    });
  });

  describe('factory de produção (F1/P1-2)', () => {
    it('fora de teste, sem models do Agente 01, falha fechado (nunca memória)', async () => {
      const svc = createConsentAuditChain({
        env: { NODE_ENV: 'development', LGPD_SUBJECT_PEPPER_SECRET: PEPPER },
        pepperProvider: new EnvTenantPepperProvider(PEPPER),
        prisma: {},
      });
      await expect(rec(svc, 'o', 'a')).rejects.toBeInstanceOf(ConsentChainUnavailableError);
      expect(hasConsentChainDelegates({})).toBe(false);
    });

    it('fora de teste, com delegates presentes, usa o repositório Prisma (transação + advisory lock)', async () => {
      const rows: Record<string, Record<string, unknown>[]> = {};
      const locks: string[] = [];
      const match = (r: Record<string, unknown>, w: Record<string, unknown>) =>
        Object.entries(w).every(([k, v]) => r[k] === v);
      const delegate = (name: string, key: string) => {
        rows[name] = [];
        return {
          findFirst: async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: Record<string, string> }) => {
            const list = rows[name].filter((r) => match(r, where));
            if (orderBy?.sequence === 'desc') list.sort((a, b) => (b.sequence as number) - (a.sequence as number));
            return list[0] ?? null;
          },
          findMany: async ({ where }: { where: Record<string, unknown> }) =>
            rows[name]
              .filter((r) => match(r, where))
              .sort((a, b) => ((a.sequence as number) ?? 0) - ((b.sequence as number) ?? 0)),
          create: async ({ data }: { data: Record<string, unknown> }) => {
            if (rows[name].some((r) => key && r[key] === data[key] && r.organizationId === data.organizationId)) {
              throw new Error('unique');
            }
            rows[name].push({ ...data });
            return data;
          },
          deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
            const before = rows[name].length;
            rows[name] = rows[name].filter((r) => !match(r, where));
            return { count: before - rows[name].length };
          },
          upsert: async ({ where, create, update }: Record<string, Record<string, unknown>>) => {
            const r = rows[name].find((x) => match(x, where));
            if (r) Object.assign(r, update);
            else rows[name].push({ ...create });
          },
          update: async ({ where, data }: Record<string, Record<string, unknown>>) => {
            Object.assign(rows[name].find((x) => match(x, where)) ?? {}, data);
          },
        };
      };
      const tx = {
        consentAuditRecord: delegate('rec', 'sequence'),
        consentAuditChainHead: delegate('head', ''),
        consentPurgeTask: delegate('task', ''),
        consentEventDetail: delegate('detail', ''),
        consentSubjectKey: delegate('key', 'lookupId'),
        consentSubjectKeyTombstone: delegate('tomb', ''),
        $executeRaw: async (q: TemplateStringsArray) => {
          locks.push(q.join('?'));
          return 1;
        },
      };
      // Emula o trigger BEFORE INSERT do #35 (cria/avança o head).
      const recCreate = tx.consentAuditRecord.create;
      tx.consentAuditRecord.create = async (a: { data: Record<string, unknown> }) => {
        const d = a.data;
        rows.headTrigger ??= [];
        const h = rows.headTrigger[0];
        if (!h) rows.headTrigger.push({ organizationId: d.organizationId, genesisId: d.id, genesisHash: d.currentHash, lastSequence: d.sequence, lastHash: d.currentHash });
        else Object.assign(h, { lastSequence: d.sequence, lastHash: d.currentHash });
        return recCreate(a);
      };
      tx.consentAuditChainHead.findFirst = async () => rows.headTrigger?.[0] ?? null;
      const prisma = { ...tx, $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) };
      const svc = createConsentAuditChain({
        env: { NODE_ENV: 'development', LGPD_SUBJECT_PEPPER_SECRET: PEPPER },
        pepperProvider: new EnvTenantPepperProvider(PEPPER),
        prisma,
      });
      await rec(svc, 'o', 'a');
      await svc.revokeConsent('o', 'a', 'TITULAR_REQUEST', undefined, { processNow: false });
      expect(rows.rec).toHaveLength(3);
      expect(rows.task).toHaveLength(1);
      // head é mantido pelo trigger do #35: a aplicação nunca grava head
      expect(rows.head ?? []).toHaveLength(0);
      expect(rows.headTrigger[0]).toMatchObject({ lastSequence: 2 });
      expect(locks).toContainEqual(expect.stringContaining('pg_advisory_xact_lock'));
      expect(locks[0]).toContain("set_config('app.current_tenant_id'");
      expect(await svc.verifyChainIntegrity('o')).toEqual({ valid: true, totalRecords: 3 });
      rows.rec[1].termsVersion = 'adulterado';
      expect((await svc.verifyChainIntegrity('o')).valid).toBe(false);
    });
  });
});

describe('Ressalvas do Agente 15 @43922b4e', () => {
  const mk = () => {
    const repo = new InMemoryConsentAuditChainRepository();
    const keys = new InMemorySubjectKeyStore();
    const tokenizer = new SubjectTokenizer(new EnvTenantPepperProvider(PEPPER), keys);
    return { repo, keys, tokenizer };
  };

  it('(2) claim atômico: dois workers simultâneos não processam a mesma tarefa', async () => {
    const { repo, tokenizer } = mk();
    const calls: string[] = [];
    const slowPurger = async (o: string, s: string) => {
      calls.push(`${o}:${s}`);
      await new Promise((r) => setTimeout(r, 5));
      return { rows: 1 };
    };
    const a = new ConsentAuditChainService({ repo, tokenizer });
    const b = new ConsentAuditChainService({ repo, tokenizer });
    a.registerPurger('x', slowPurger);
    b.registerPurger('x', slowPurger);
    for (const s of ['l1', 'l2', 'l3', 'l4']) {
      await a.revokeConsent('o', s, 'TITULAR_REQUEST', undefined, { processNow: false });
    }
    const [ra, rb] = await Promise.all([
      a.processPendingPurges(50, new Date(), 'worker-A'),
      b.processPendingPurges(50, new Date(), 'worker-B'),
    ]);
    expect(ra.done + rb.done).toBe(4);
    expect(calls.sort()).toEqual(['o:l1', 'o:l2', 'o:l3', 'o:l4']);
    const events = await a.getChain('o');
    expect(events.filter((e) => e.kind === 'RETRACTION')).toHaveLength(4);
    expect((await a.verifyChainIntegrity('o')).valid).toBe(true);
  });

  it('(2) SKIP LOCKED: tarefa travada por um worker é pulada por outro; liberada após rollback', async () => {
    const { repo } = mk();
    repo.purges.set('t1', {
      id: 't1',
      organizationId: 'o',
      revocationEventId: 'r',
      subjectRef: 's',
      shredSubjectKey: false,
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: new Date(0).toISOString(),
    });
    const now = new Date();
    let inner: boolean | undefined;
    await expect(
      repo.withNextDuePurge('o', now, async () => {
        inner = await repo.withNextDuePurge('o', now, async (t) => t);
        throw new Error('crash');
      }),
    ).rejects.toThrow('crash');
    expect(inner).toBe(false);
    expect(await repo.withNextDuePurge('outra-org', now, async (t) => t)).toBe(false);
    expect(await repo.withNextDuePurge('o', now, async (t) => ({ ...t, status: 'DONE' }))).toBe(true);
    expect(repo.purges.get('t1')?.status).toBe('DONE');
  });

  it('(3) crash entre o shred e concluir a tarefa: retry não recria a chave nem duplica RETRACTION', async () => {
    const { repo, keys, tokenizer } = mk();
    let crash = true;
    const svc = new ConsentAuditChainService({
      repo,
      tokenizer,
      hooks: {
        afterShred: async () => {
          if (crash) throw new Error('processo caiu');
        },
      },
    });
    const purged: string[] = [];
    svc.registerPurger('x', async (o, s) => {
      purged.push(s);
      return {};
    });
    await rec(svc, 'o', 'lead-x');
    await svc.revokeConsent('o', 'lead-x', 'ERASURE_REQUEST');
    const [task] = [...repo.purges.values()];
    expect(task.status).toBe('PENDING');
    expect(keys.size()).toBe(0); // shred aconteceu antes do crash
    expect(await tokenizer.isShredded('o', 'lead-x')).toBe(true);

    crash = false;
    const r = await svc.processPendingPurges(50, new Date(Date.now() + 3_600_000));
    expect(r).toEqual({ done: 1, failed: 0 });
    expect(keys.size()).toBe(0); // nunca recriada
    expect(purged).toEqual(['lead-x', 'lead-x']); // purgers idempotentes reexecutados
    const events = await svc.getChain('o');
    expect(events.filter((e) => e.kind === 'RETRACTION')).toHaveLength(1);
    expect(repo.purges.get(task.id)).toMatchObject({ status: 'DONE', subjectRef: null });
    await expect(tokenizer.tokenFor('o', 'lead-x')).rejects.toBeInstanceOf(SubjectShreddedError);
    expect((await svc.verifyChainIntegrity('o')).valid).toBe(true);
  });

  it('(3) crash entre RETRACTION e shred: retry não duplica RETRACTION e conclui o shred', async () => {
    const { repo, keys, tokenizer } = mk();
    const svc = new ConsentAuditChainService({ repo, tokenizer });
    await svc.revokeConsent('o', 'lead-y', 'ERASURE_REQUEST', undefined, { processNow: false });
    const realShred = tokenizer.shred.bind(tokenizer);
    tokenizer.shred = async () => {
      throw new Error('crash antes do shred');
    };
    expect(await svc.processPendingPurges(50, new Date())).toEqual({ done: 0, failed: 1 });
    tokenizer.shred = realShred;
    expect(await svc.processPendingPurges(50, new Date(Date.now() + 3_600_000))).toEqual({ done: 1, failed: 0 });
    expect((await svc.getChain('o')).filter((e) => e.kind === 'RETRACTION')).toHaveLength(1);
    expect(keys.size()).toBe(0);
  });

  it('baixa: boot em produção exige KMS; segredo global não basta (falha fechada)', () => {
    expect(() => assertConsentChainBootConfig({ NODE_ENV: 'production' })).toThrow(MissingPepperError);
    expect(() =>
      assertConsentChainBootConfig({ NODE_ENV: 'production', LGPD_SUBJECT_PEPPER_SECRET: PEPPER }),
    ).toThrow(MissingPepperError);
    expect(() =>
      assertConsentChainBootConfig({ NODE_ENV: 'production', LGPD_KMS_KEY_ID: 'alias/lgpd' }),
    ).not.toThrow();
    expect(() => assertConsentChainBootConfig({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('baixa: NODE_ENV=test é recusado quando o ambiente é produção', () => {
    expect(() => createConsentAuditChain({ env: { NODE_ENV: 'test', APP_ENV: 'production' } })).toThrow(
      /recusado/,
    );
  });

  it('baixa: purpose e termsVersion com formato validado (sem texto livre)', async () => {
    const { repo, tokenizer } = mk();
    const svc = new ConsentAuditChainService({ repo, tokenizer });
    const base = { organizationId: 'o', subjectRef: 's', purpose: 'COMMERCIAL_CONTACT', termsVersion: 'v2026.1' };
    await expect(svc.recordConsent({ ...base, purpose: 'Contato com João' })).rejects.toThrow(/purpose/);
    await expect(svc.recordConsent({ ...base, termsVersion: 'versão do João 1' })).rejects.toThrow(/termsVersion/);
    await expect(svc.recordConsent(base)).resolves.toBeDefined();
  });

  it('baixa: colisão de chaves após NFC é erro', () => {
    expect(() => canonicalJson({ 'Jos\u00e9': 1, 'Jose\u0301': 2 })).toThrow(CanonicalJsonError);
  });
});
