/**
 * Wiring de produção da cadeia de consentimento (P1-2 / F1).
 *
 * - Produção/homologação: repositório Prisma + store de chaves Prisma, resolvidos sob demanda
 *   a partir do client real. Se os models do Agente 01 ainda não existirem no client gerado,
 *   a cadeia falha FECHADA (`ConsentChainUnavailableError` → 503), nunca cai silenciosamente
 *   para memória.
 * - Testes (`NODE_ENV=test`): memória, a menos que um client seja injetado explicitamente.
 */
import { randomBytes } from 'node:crypto';
import { logger } from '../logger.js';
import {
  type ChainLockContext,
  type ConsentAuditChainRepository,
  ConsentAuditChainService,
  ConsentChainUnavailableError,
  InMemoryConsentAuditChainRepository,
} from './consentAuditChain.service.js';
import {
  CONSENT_CHAIN_PRISMA_DELEGATES,
  type ConsentChainPrismaLike,
  PrismaConsentAuditChainRepository,
  PrismaSubjectKeyStore,
  type RunInTransaction,
  type SubjectKeyPrismaLike,
} from './prismaConsentAuditChain.repository.js';
import {
  EnvTenantPepperProvider,
  InMemorySubjectKeyStore,
  MissingPepperError,
  KmsEnvelopeTenantKeyProvider,
  type KmsEnvelopeClient,
  type WrappedTenantKeyStore,
  UnavailableTenantKeyProvider,
  type SubjectKeyStore,
  SubjectTokenizer,
  type TenantPepperProvider,
} from './subjectTokenizer.js';

/** Sinais de ambiente produtivo independentes de NODE_ENV. */
export function looksLikeProduction(env: NodeJS.ProcessEnv): boolean {
  return [
    env.APP_ENV,
    env.DEPLOY_ENV,
    env.ENVIRONMENT,
    env.RAILWAY_ENVIRONMENT,
    env.VERCEL_ENV,
  ].some((v) => (v ?? '').toLowerCase() === 'production');
}

const isProd = (env: NodeJS.ProcessEnv) =>
  env.NODE_ENV === 'production' || looksLikeProduction(env);

/**
 * Validação de boot (produção): exige KMS (LGPD_KMS_KEY_ID). Segredo global de ambiente NÃO é
 * aceito em produção. Lança — o bootstrap registra e a cadeia falha fechada (503).
 */
export function assertConsentChainBootConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (!isProd(env)) return;
  if (!env.LGPD_KMS_KEY_ID) {
    throw new MissingPepperError(
      'LGPD_KMS_KEY_ID ausente: produção exige segredo por tenant via KMS (envelope)',
    );
  }
}

export function hasConsentChainDelegates(client: unknown): boolean {
  if (!client || typeof client !== 'object') return false;
  const c = client as Record<string, unknown>;
  return CONSENT_CHAIN_PRISMA_DELEGATES.every((d) => c[d] !== undefined && c[d] !== null);
}

type Resolved = { repo: ConsentAuditChainRepository; keys: SubjectKeyStore };
type ClientLoader = () => Promise<unknown>;

class LazyRepo implements ConsentAuditChainRepository {
  constructor(private readonly get: () => Promise<Resolved>) {}
  async withTenantLock<T>(o: string, fn: (ctx: ChainLockContext) => Promise<T>) {
    return (await this.get()).repo.withTenantLock(o, fn);
  }
  async listChain(o: string) {
    return (await this.get()).repo.listChain(o);
  }
  async getHead(o: string) {
    return (await this.get()).repo.getHead(o);
  }
  async listTenants() {
    return (await this.get()).repo.listTenants();
  }
  async withNextDuePurge(
    o: string,
    n: Date,
    fn: Parameters<ConsentAuditChainRepository['withNextDuePurge']>[2],
  ) {
    return (await this.get()).repo.withNextDuePurge(o, n, fn);
  }
  async deleteExpiredPurges(o: string, n: Date) {
    return (await this.get()).repo.deleteExpiredPurges(o, n);
  }
  async deleteDetailsForSubject(o: string, l: string) {
    return (await this.get()).repo.deleteDetailsForSubject(o, l);
  }
}

export interface ConsentChainFactoryOptions {
  env?: NodeJS.ProcessEnv;
  /** Client Prisma (ou carregador). Ausente em teste → memória. */
  prisma?: unknown;
  loadPrisma?: ClientLoader;
  /** #40: unidade de trabalho do client estendido (lock/head/insert/outbox na mesma conexão). */
  runInTransaction?: RunInTransaction;
  loadRunInTransaction?: () => Promise<RunInTransaction | undefined>;
  pepperProvider?: TenantPepperProvider;
  /** Produção: cliente KMS + store da DEK cifrada por tenant (envelope). */
  kms?: { client: KmsEnvelopeClient; store: WrappedTenantKeyStore };
  broadcastPurge?: (organizationId: string, subjectRef: string) => Promise<void>;
  /**
   * Descoberta de organizações para o worker. Padrão: `organization.findMany` sob
   * `requestContext {bypassRls:true}` (mesmo padrão da outbox REMED-05/#32) — o bypass vale só
   * para Organization; as tabelas LGPD são sempre acessadas com o tenant setado.
   */
  listTenants?: (client: unknown) => Promise<string[]>;
}

async function defaultListTenants(client: unknown): Promise<string[]> {
  const { requestContext } = await import('../async-context.js');
  const db = client as { organization: { findMany(a: unknown): Promise<Array<{ id: string }>> } };
  return requestContext.run({ bypassRls: true }, async () =>
    (await db.organization.findMany({ select: { id: true } })).map((o) => o.id),
  );
}

function resolveTenantKeyProvider(
  env: NodeJS.ProcessEnv,
  opts: ConsentChainFactoryOptions,
  isTest: boolean,
): TenantPepperProvider {
  if (env.LGPD_KMS_KEY_ID && opts.kms) {
    return new KmsEnvelopeTenantKeyProvider(opts.kms.client, opts.kms.store, env.LGPD_KMS_KEY_ID);
  }
  if (isProd(env)) {
    // Fail-closed: nada de derivar de variável global em produção.
    return new UnavailableTenantKeyProvider(
      'KMS não configurado (LGPD_KMS_KEY_ID + cliente/store): pseudonimização indisponível',
    );
  }
  return new EnvTenantPepperProvider(
    env.LGPD_SUBJECT_PEPPER_SECRET ?? (isTest ? randomBytes(32).toString('hex') : undefined),
  );
}

export function createConsentAuditChain(
  opts: ConsentChainFactoryOptions = {},
): ConsentAuditChainService {
  const env = opts.env ?? process.env;
  const isTest = env.NODE_ENV === 'test';
  if (isTest && looksLikeProduction(env)) {
    throw new Error('NODE_ENV=test recusado em ambiente de produção (cadeia de consentimento)');
  }
  const pepper = opts.pepperProvider ?? resolveTenantKeyProvider(env, opts, isTest);
  if (isProd(env) && pepper instanceof EnvTenantPepperProvider) {
    throw new MissingPepperError(
      'Produção exige KmsTenantPepperProvider; provider por env recusado',
    );
  }

  if (isTest && !opts.prisma && env.CONSENT_CHAIN_USE_PRISMA !== '1') {
    return new ConsentAuditChainService({
      repo: new InMemoryConsentAuditChainRepository(),
      tokenizer: new SubjectTokenizer(pepper, new InMemorySubjectKeyStore()),
      broadcastPurge: opts.broadcastPurge,
    });
  }

  let resolved: Promise<Resolved> | undefined;
  const resolve = (): Promise<Resolved> => {
    resolved ??= (async () => {
      const client = opts.prisma ?? (await opts.loadPrisma?.());
      if (!hasConsentChainDelegates(client)) {
        logger.error(
          { missing: CONSENT_CHAIN_PRISMA_DELEGATES },
          'ConsentAuditChain: models Prisma ausentes (migração do Agente 01 pendente) — cadeia indisponível',
        );
        throw new ConsentChainUnavailableError(
          'Cadeia de consentimento indisponível: migração ConsentAuditRecord pendente',
        );
      }
      const run = opts.runInTransaction ?? (await opts.loadRunInTransaction?.());
      return {
        repo: new PrismaConsentAuditChainRepository(
          client as ConsentChainPrismaLike,
          () => (opts.listTenants ?? defaultListTenants)(client),
          run,
        ),
        keys: new PrismaSubjectKeyStore(client as SubjectKeyPrismaLike, run),
      };
    })();
    // Não memoriza falha: permite recuperar após deploy da migração sem restart.
    resolved.catch(() => {
      resolved = undefined;
    });
    return resolved;
  };

  const keys: SubjectKeyStore = {
    get: async (o, l) => (await resolve()).keys.get(o, l),
    getOrCreate: async (o, l, c) => (await resolve()).keys.getOrCreate(o, l, c),
    destroy: async (o, l) => (await resolve()).keys.destroy(o, l),
  };
  return new ConsentAuditChainService({
    repo: new LazyRepo(resolve),
    tokenizer: new SubjectTokenizer(pepper, keys),
    purgeTaskRetentionDays: Number(env.LGPD_PURGE_TASK_RETENTION_DAYS ?? 1825),
    broadcastPurge: opts.broadcastPurge,
  });
}

/** Singleton de produção: Prisma real carregado sob demanda (evita ciclo de import). */
export const consentAuditChain = createConsentAuditChain({
  loadPrisma: async () => (await import('../prisma.js')).prisma,
  loadRunInTransaction: async () =>
    (await import('../prisma.js')).runInTransaction as unknown as RunInTransaction,
});
