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
import { createConsentAuditChain, hasConsentChainDelegates } from '../../../src/lib/security/consentChainFactory.js';
import {
  EnvTenantPepperProvider,
  InMemorySubjectKeyStore,
  KmsTenantPepperProvider,
  MissingPepperError,
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
      // novo token após shred não religa aos eventos antigos
      const after = await rec(chain, 'o', 'lead-1');
      expect(after.subjectRef).not.toBe(before.subjectRef);
      expect((await chain.verifyChainIntegrity('o')).valid).toBe(true);
    });

    it('pepper ausente/curto falha fechado; KMS provider deriva por tenant', async () => {
      await expect(new EnvTenantPepperProvider(undefined).getPepper('o')).rejects.toBeInstanceOf(MissingPepperError);
      const calls: string[] = [];
      const kms = new KmsTenantPepperProvider(
        {
          generateMac: async ({ message }) => {
            calls.push(message.toString());
            return createHash('sha256').update(message).digest();
          },
        },
        'alias/lgpd',
      );
      const t = new SubjectTokenizer(kms, new InMemorySubjectKeyStore());
      expect(await t.lookupId('A', 's')).not.toBe(await t.lookupId('B', 's'));
      await t.lookupId('A', 's');
      expect(calls).toEqual(['tenant-pepper:v1:A', 'tenant-pepper:v1:B']);
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
            setHead: async () => {
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
        env: { NODE_ENV: 'production', LGPD_SUBJECT_PEPPER_SECRET: PEPPER },
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
        $executeRaw: async (q: TemplateStringsArray) => {
          locks.push(q.join('?'));
          return 1;
        },
      };
      const prisma = { ...tx, $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) };
      const svc = createConsentAuditChain({
        env: { NODE_ENV: 'production', LGPD_SUBJECT_PEPPER_SECRET: PEPPER },
        prisma,
      });
      await rec(svc, 'o', 'a');
      await svc.revokeConsent('o', 'a', 'TITULAR_REQUEST', undefined, { processNow: false });
      expect(rows.rec).toHaveLength(3);
      expect(rows.task).toHaveLength(1);
      expect(rows.head[0]).toMatchObject({ lastSequence: 2 });
      expect(locks).toContainEqual(expect.stringContaining('pg_advisory_xact_lock'));
      expect(locks[0]).toContain("set_config('app.current_tenant_id'");
      expect(await svc.verifyChainIntegrity('o')).toEqual({ valid: true, totalRecords: 3 });
      rows.rec[1].termsVersion = 'adulterado';
      expect((await svc.verifyChainIntegrity('o')).valid).toBe(false);
    });
  });
});
