import { createHmac, randomBytes } from 'node:crypto';

/**
 * Pseudonimização do titular para a cadeia de consentimento (Agente 15, F2/F3).
 *
 * token = "hs256:" + HMAC-SHA256(chaveDoTitular, subjectRef NFC)
 * - chaveDoTitular: 32 bytes aleatórios por (tenant, titular), guardados em store expurgável;
 * - a linha da chave é endereçada por lookupId = HMAC-SHA256(pepperDoTenant, subjectRef NFC);
 * - pepperDoTenant vem de um provedor abstrato (env ou KMS) — nunca do git.
 * Esquecimento (art. 18, VI): destruir a chave do titular torna os tokens já gravados na cadeia
 * impossíveis de religar ao titular (crypto-shredding), sem quebrar o encadeamento de hashes.
 */
export interface TenantPepperProvider {
  getPepper(organizationId: string): Promise<Buffer>;
}

/** Abstração mínima de KMS: deriva material de chave por contexto (ex.: AWS KMS GenerateMac). */
export interface KmsMacClient {
  generateMac(input: { keyId: string; message: Buffer }): Promise<Buffer>;
}

export class MissingPepperError extends Error {}

/** Pepper por tenant derivado de um segredo de ambiente (`LGPD_SUBJECT_PEPPER_SECRET`). */
export class EnvTenantPepperProvider implements TenantPepperProvider {
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
    if (!this.secret || this.secret.length < 32) {
      throw new MissingPepperError(
        'LGPD_SUBJECT_PEPPER_SECRET ausente ou curto (>= 32 caracteres) — pseudonimização indisponível',
      );
    }
    return createHmac('sha256', this.secret).update(`tenant-pepper:v1:${organizationId}`).digest();
  }
}

/** Pepper por tenant derivado no KMS; o segredo nunca sai do KMS. */
export class KmsTenantPepperProvider implements TenantPepperProvider {
  private cache = new Map<string, Buffer>();
  constructor(
    private readonly kms: KmsMacClient,
    private readonly keyId: string,
  ) {}

  async getPepper(organizationId: string): Promise<Buffer> {
    const hit = this.cache.get(organizationId);
    if (hit) return hit;
    const pepper = await this.kms.generateMac({
      keyId: this.keyId,
      message: Buffer.from(`tenant-pepper:v1:${organizationId}`, 'utf8'),
    });
    this.cache.set(organizationId, pepper);
    return pepper;
  }
}

/** Titular esquecido: a chave foi destruída e NUNCA é recriada (falha fechada). */
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
