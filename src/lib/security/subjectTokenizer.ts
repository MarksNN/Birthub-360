import { createHmac, randomBytes } from 'node:crypto';

/**
 * Pseudonimização do titular para a cadeia de consentimento (Agente 15, F2/F3).
 *
 * token = "hs256:" + HMAC-SHA256(chaveDoTitular, subjectRef NFC)
 * - chaveDoTitular: 32 bytes aleatórios por (tenant, titular), guardados em store expurgável;
 * - a linha da chave é endereçada por lookupId = HMAC-SHA256(pepperDoTenant, subjectRef NFC);
 * - pepperDoTenant vem de um TenantKeyProvider (KMS envelope em produção; env só teste/dev).
 * Esquecimento (art. 18, VI): destruir a chave do titular torna os tokens já gravados na cadeia
 * impossíveis de religar ao titular (crypto-shredding), sem quebrar o encadeamento de hashes.
 */
export interface TenantPepperProvider {
  getPepper(organizationId: string): Promise<Buffer>;
}

export class MissingPepperError extends Error {}

/**
 * SOMENTE teste/dev: pepper derivado de segredo de ambiente. Proibido em produção (a fábrica
 * recusa); a destruição por tenant é simulada em memória.
 */
export class EnvTenantPepperProvider implements TenantKeyProvider {
  private destroyed = new Set<string>();

  async destroyTenantKey(organizationId: string): Promise<void> {
    this.destroyed.add(organizationId);
  }

  constructor(
    private readonly secret: string | undefined = process.env.LGPD_SUBJECT_PEPPER_SECRET,
  ) {}

  /** Validação de boot: falha se o segredo estiver ausente/curto. */
  assertConfigured(): void {
    if (!this.secret || this.secret.length < 32) {
      throw new MissingPepperError(
        'LGPD_SUBJECT_PEPPER_SECRET ausente ou curto (>= 32 caracteres)',
      );
    }
  }

  async getPepper(organizationId: string): Promise<Buffer> {
    if (this.destroyed.has(organizationId)) {
      throw new TenantKeyDestroyedError('Chave do tenant destruída (offboarding)');
    }
    if (!this.secret || this.secret.length < 32) {
      throw new MissingPepperError(
        'LGPD_SUBJECT_PEPPER_SECRET ausente ou curto (>= 32 caracteres) — pseudonimização indisponível',
      );
    }
    return createHmac('sha256', this.secret).update(`tenant-pepper:v1:${organizationId}`).digest();
  }
}

/**
 * Segredo por tenant DESTRUTÍVEL (bloqueio do Agente 24): `destroyTenantKey(org)` no offboarding
 * torna todos os lookupIds/tokens do tenant irreligáveis (crypto-shredding do tenant inteiro).
 */
export interface TenantKeyProvider extends TenantPepperProvider {
  destroyTenantKey(organizationId: string): Promise<void>;
}

export class TenantKeyDestroyedError extends MissingPepperError {}

/** Cliente KMS mínimo para envelope encryption (ex.: AWS KMS GenerateDataKey/Decrypt). */
export interface KmsEnvelopeClient {
  generateDataKey(input: {
    keyId: string;
    encryptionContext: Record<string, string>;
  }): Promise<{ plaintext: Buffer; ciphertext: Buffer }>;
  decrypt(input: {
    keyId: string;
    ciphertext: Buffer;
    encryptionContext: Record<string, string>;
  }): Promise<Buffer>;
}

export type WrappedTenantKeyState =
  | { status: 'ACTIVE'; ciphertext: Buffer }
  | { status: 'DESTROYED' }
  | { status: 'ABSENT' };

/** Persistência da DEK CIFRADA por tenant (nunca o plaintext). Tabela a cargo do Agente 01. */
export interface WrappedTenantKeyStore {
  get(organizationId: string): Promise<WrappedTenantKeyState>;
  /** Insere se ausente; devolve o ciphertext vencedor em caso de corrida. */
  putIfAbsent(organizationId: string, ciphertext: Buffer, cmkId: string): Promise<Buffer>;
  /** Apaga o ciphertext e grava tombstone (impede recriação). */
  destroy(organizationId: string): Promise<void>;
}

export class InMemoryWrappedTenantKeyStore implements WrappedTenantKeyStore {
  private rows = new Map<string, Buffer | null>();
  async get(o: string): Promise<WrappedTenantKeyState> {
    if (!this.rows.has(o)) return { status: 'ABSENT' };
    const c = this.rows.get(o);
    return c ? { status: 'ACTIVE', ciphertext: c } : { status: 'DESTROYED' };
  }
  async putIfAbsent(o: string, ciphertext: Buffer): Promise<Buffer> {
    if (this.rows.has(o)) {
      const c = this.rows.get(o);
      if (!c) throw new TenantKeyDestroyedError('Chave do tenant destruída');
      return c;
    }
    this.rows.set(o, ciphertext);
    return ciphertext;
  }
  async destroy(o: string): Promise<void> {
    this.rows.set(o, null);
  }
}

/**
 * Envelope KMS: DEK aleatória por tenant, cifrada pela CMK (encryptionContext = organizationId),
 * guardada cifrada no store. Plaintext só em memória com TTL curto.
 */
export class KmsEnvelopeTenantKeyProvider implements TenantKeyProvider {
  private cache = new Map<string, { key: Buffer; exp: number }>();
  constructor(
    private readonly kms: KmsEnvelopeClient,
    private readonly store: WrappedTenantKeyStore,
    private readonly cmkId: string,
    private readonly cacheTtlMs = 60_000,
  ) {}

  async getPepper(organizationId: string): Promise<Buffer> {
    const hit = this.cache.get(organizationId);
    if (hit && hit.exp > Date.now()) return hit.key;
    const ctx = { organizationId, purpose: 'lgpd-subject-pepper:v1' };
    const state = await this.store.get(organizationId);
    if (state.status === 'DESTROYED') {
      throw new TenantKeyDestroyedError('Chave do tenant destruída (offboarding)');
    }
    let key: Buffer;
    if (state.status === 'ACTIVE') {
      key = await this.kms.decrypt({
        keyId: this.cmkId,
        ciphertext: state.ciphertext,
        encryptionContext: ctx,
      });
    } else {
      const dk = await this.kms.generateDataKey({ keyId: this.cmkId, encryptionContext: ctx });
      const winner = await this.store.putIfAbsent(organizationId, dk.ciphertext, this.cmkId);
      key = winner.equals(dk.ciphertext)
        ? dk.plaintext
        : await this.kms.decrypt({ keyId: this.cmkId, ciphertext: winner, encryptionContext: ctx });
    }
    this.cache.set(organizationId, { key, exp: Date.now() + this.cacheTtlMs });
    return key;
  }

  async destroyTenantKey(organizationId: string): Promise<void> {
    await this.store.destroy(organizationId);
    this.cache.get(organizationId)?.key.fill(0);
    this.cache.delete(organizationId);
  }
}

/** Nome canônico exigido em produção (alinhado ao #35/Agente 24). */
export const KmsTenantPepperProvider = KmsEnvelopeTenantKeyProvider;
export type KmsTenantPepperProvider = KmsEnvelopeTenantKeyProvider;

/** Fail-closed: usado em produção quando o KMS não está configurado. */
export class UnavailableTenantKeyProvider implements TenantKeyProvider {
  constructor(private readonly reason: string) {}
  async getPepper(): Promise<Buffer> {
    throw new MissingPepperError(this.reason);
  }
  async destroyTenantKey(): Promise<void> {
    throw new MissingPepperError(this.reason);
  }
}

export class SubjectShreddedError extends Error {}

export type SubjectKeyState =
  | { status: 'ACTIVE'; key: Buffer }
  | { status: 'SHREDDED' }
  | { status: 'ABSENT' };

/**
 * Store das chaves por titular (model `ConsentSubjectKey` — handoff ao Agente 01).
 * Esquecimento = DELETE da chave; o Postgres (#35) grava ConsentSubjectKeyTombstone via trigger, o que
 * impede recriação da chave (retry, corrida ou novo consentimento do mesmo titular): fail-closed.
 */
export interface SubjectKeyStore {
  get(organizationId: string, lookupId: string): Promise<SubjectKeyState>;
  /** Cria se ABSENT; devolve a existente se ACTIVE; lança SubjectShreddedError se SHREDDED. */
  getOrCreate(organizationId: string, lookupId: string, candidate: Buffer): Promise<Buffer>;
  /** Tombstone idempotente. Retorna true se havia chave ativa. */
  destroy(organizationId: string, lookupId: string): Promise<boolean>;
}

export class InMemorySubjectKeyStore implements SubjectKeyStore {
  private keys = new Map<string, { key: Buffer | null; shreddedAt?: string }>();
  private k = (o: string, l: string) => `${o}\u0000${l}`;

  async get(organizationId: string, lookupId: string): Promise<SubjectKeyState> {
    const row = this.keys.get(this.k(organizationId, lookupId));
    if (!row) return { status: 'ABSENT' };
    return row.key ? { status: 'ACTIVE', key: row.key } : { status: 'SHREDDED' };
  }

  async getOrCreate(organizationId: string, lookupId: string, candidate: Buffer): Promise<Buffer> {
    const key = this.k(organizationId, lookupId);
    const row = this.keys.get(key);
    if (row && !row.key) throw new SubjectShreddedError('Titular esquecido: chave destruída');
    if (row?.key) return row.key;
    this.keys.set(key, { key: candidate });
    return candidate;
  }

  async destroy(organizationId: string, lookupId: string): Promise<boolean> {
    const key = this.k(organizationId, lookupId);
    const row = this.keys.get(key);
    const hadKey = !!row?.key;
    this.keys.set(key, { key: null, shreddedAt: row?.shreddedAt ?? new Date().toISOString() });
    return hadKey;
  }

  /** Chaves ativas (testes). */
  size(): number {
    return [...this.keys.values()].filter((r) => r.key).length;
  }
}

export const SUBJECT_TOKEN_PATTERN = /^hs256:[a-f0-9]{64}$/;

export class SubjectTokenizer {
  constructor(
    private readonly pepper: TenantPepperProvider,
    private readonly keys: SubjectKeyStore,
  ) {}

  /** Offboarding: destrói o segredo do tenant (todos os lookupIds ficam irreligáveis). */
  async destroyTenantKey(organizationId: string): Promise<void> {
    const p = this.pepper as Partial<TenantKeyProvider>;
    if (typeof p.destroyTenantKey !== 'function') {
      throw new MissingPepperError('Provedor de segredo do tenant não suporta destruição');
    }
    await p.destroyTenantKey.call(this.pepper, organizationId);
  }

  async lookupId(organizationId: string, subjectRef: string): Promise<string> {
    if (!subjectRef || subjectRef.trim() === '') throw new Error('subjectRef obrigatório');
    const pepper = await this.pepper.getPepper(organizationId);
    return createHmac('sha256', pepper).update(subjectRef.normalize('NFC')).digest('hex');
  }

  async tokenFor(organizationId: string, subjectRef: string): Promise<string> {
    const lookupId = await this.lookupId(organizationId, subjectRef);
    const key = await this.keys.getOrCreate(organizationId, lookupId, randomBytes(32));
    return `hs256:${createHmac('sha256', key).update(subjectRef.normalize('NFC')).digest('hex')}`;
  }

  async isShredded(organizationId: string, subjectRef: string): Promise<boolean> {
    const lookupId = await this.lookupId(organizationId, subjectRef);
    return (await this.keys.get(organizationId, lookupId)).status === 'SHREDDED';
  }

  /** Crypto-shredding: tombstone da chave do titular. Retorna o lookupId para expurgos auxiliares. */
  async shred(
    organizationId: string,
    subjectRef: string,
  ): Promise<{ lookupId: string; destroyed: boolean }> {
    const lookupId = await this.lookupId(organizationId, subjectRef);
    const destroyed = await this.keys.destroy(organizationId, lookupId);
    return { lookupId, destroyed };
  }
}
