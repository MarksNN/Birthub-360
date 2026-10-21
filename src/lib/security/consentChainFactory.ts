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
  type SubjectKeyPrismaLike,
} from './prismaConsentAuditChain.repository.js';
import {
  EnvTenantPepperProvider,
  InMemorySubjectKeyStore,
  type SubjectKeyStore,
  SubjectTokenizer,
  type TenantPepperProvider,
} from './subjectTokenizer.js';

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
  async claimDuePurges(n: Date, l: number) {
    return (await this.get()).repo.claimDuePurges(n, l);
  }
  async updatePurge(t: Parameters<ConsentAuditChainRepository['updatePurge']>[0]) {
    return (await this.get()).repo.updatePurge(t);
  }
  async deleteExpiredPurges(n: Date) {
    return (await this.get()).repo.deleteExpiredPurges(n);
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
  pepperProvider?: TenantPepperProvider;
  broadcastPurge?: (organizationId: string, subjectRef: string) => Promise<void>;
}

export function createConsentAuditChain(
  opts: ConsentChainFactoryOptions = {},
): ConsentAuditChainService {
  const env = opts.env ?? process.env;
  const isTest = env.NODE_ENV === 'test';
  const pepper =
    opts.pepperProvider ??
    new EnvTenantPepperProvider(
      env.LGPD_SUBJECT_PEPPER_SECRET ?? (isTest ? randomBytes(32).toString('hex') : undefined),
    );

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
      return {
        repo: new PrismaConsentAuditChainRepository(client as ConsentChainPrismaLike),
        keys: new PrismaSubjectKeyStore(client as SubjectKeyPrismaLike),
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
});
