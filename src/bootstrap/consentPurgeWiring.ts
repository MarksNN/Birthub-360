/**
 * Wiring explícito (P3-3) dos consumidores de expurgo da cadeia de consentimento, do worker de
 * reconciliação da outbox (F4/P2-3) e da invalidação entre instâncias via Redis pub/sub (P2-5).
 */

import type { FlywheelPersistencePurger } from '../features/intelligence/services/commercialLearningFlywheel.service.js';
import { commercialLearningFlywheel } from '../features/intelligence/services/commercialLearningFlywheel.service.js';
import { winLossAutopsyService } from '../features/intelligence/services/winLossAutopsy.service.js';
import { semanticCache } from '../lib/ai/cache/semanticCache.service.js';
import { logger } from '../lib/logger.js';
import type { ConsentAuditChainService } from '../lib/security/consentAuditChain.service.js';

export const CONSENT_PURGE_CHANNEL = 'lgpd:consent-purge:v1';

/** Expurgos locais (memória do processo) — também executados por outras instâncias via pub/sub. */
export async function purgeLocalSubjectState(organizationId: string, subjectRef: string) {
  const flywheel = await commercialLearningFlywheel.purgeSubject(organizationId, subjectRef);
  const autopsy = await winLossAutopsyService.purgeSubject(organizationId, subjectRef);
  // O cache semântico não indexa por titular: invalidação conservadora do tenant inteiro.
  const cacheEntries = await semanticCache.invalidateTenant(organizationId);
  return {
    approaches: flywheel.approachesPurged + flywheel.persistedApproachesPurged,
    fewShot: flywheel.fewShotPurged + flywheel.persistedFewShotPurged,
    autopsyReports: autopsy.reports,
    semanticCacheEntries: cacheEntries,
  };
}

export function registerConsentPurgers(chain: ConsentAuditChainService): void {
  chain.registerPurger('subject-state', purgeLocalSubjectState);
}

function hasFlywheelDelegates(client: unknown): client is FlywheelPersistencePurger {
  const c = client as Record<string, unknown> | null;
  return !!c && !!c.flywheelApproachRecord && !!c.flywheelFewShotExample;
}

export interface PubSubLike {
  publish(channel: string, message: string): Promise<unknown>;
  subscribe(channel: string): Promise<unknown>;
  on(event: 'message', cb: (channel: string, message: string) => void): unknown;
}

export type Pseudonymize = (organizationId: string, subjectRef: string) => Promise<string>;

/**
 * Publica pedido de invalidação. A mensagem leva SÓ o pseudônimo HMAC do titular (nunca o
 * subjectRef/leadId cru): `{ organizationId, subject: <hmac>, from }`.
 */
export function makeBroadcaster(
  publisher: PubSubLike | undefined,
  instanceId: string,
  pseudonymize: Pseudonymize,
) {
  return async (organizationId: string, subjectRef: string) => {
    if (!publisher) return;
    const subject = await pseudonymize(organizationId, subjectRef);
    await publisher.publish(
      CONSENT_PURGE_CHANNEL,
      JSON.stringify({ v: 2, organizationId, subject, from: instanceId }),
    );
  };
}

/** Titulares presentes no estado em memória desta instância (candidatos ao casamento HMAC). */
export function localSubjectRefs(organizationId: string): string[] {
  return [
    ...new Set([
      ...commercialLearningFlywheel.localSubjectRefs(organizationId),
      ...winLossAutopsyService.localSubjectRefs(organizationId),
    ]),
  ];
}

/** Recebe pseudônimo, recalcula HMAC dos titulares locais e expurga só os que casam. */
export async function purgeLocalByPseudonym(
  organizationId: string,
  subject: string,
  pseudonymize: Pseudonymize,
  purge: (o: string, s: string) => Promise<unknown> = purgeLocalSubjectState,
): Promise<number> {
  let n = 0;
  for (const ref of localSubjectRefs(organizationId)) {
    if ((await pseudonymize(organizationId, ref)) === subject) {
      await purge(organizationId, ref);
      n++;
    }
  }
  return n;
}

export async function subscribeToPurgeBroadcasts(
  subscriber: PubSubLike,
  instanceId: string,
  pseudonymize: Pseudonymize,
): Promise<void> {
  subscriber.on('message', (channel, message) => {
    if (channel !== CONSENT_PURGE_CHANNEL) return;
    try {
      const { organizationId, subject, from } = JSON.parse(message) as Record<string, string>;
      if (from === instanceId || !organizationId || !subject) return;
      purgeLocalByPseudonym(organizationId, subject, pseudonymize).catch((err) =>
        logger.error({ err, organizationId }, 'LGPD: invalidação remota falhou'),
      );
    } catch {
      logger.warn('LGPD: mensagem de purge inválida ignorada');
    }
  });
  await subscriber.subscribe(CONSENT_PURGE_CHANNEL);
}

/**
 * Bootstrap de produção. Idempotente. Retorna função de parada.
 * - registra consumidores de expurgo;
 * - liga persistência do Flywheel quando os models existirem;
 * - assina o canal de invalidação (se Redis configurado);
 * - roda a reconciliação da outbox periodicamente (LGPD_PURGE_INTERVAL_MS, padrão 60s).
 */
export async function startConsentPurgeRuntime(
  chain: ConsentAuditChainService,
): Promise<() => void> {
  registerConsentPurgers(chain);
  const { prisma, runInTransaction } = await import('../lib/prisma.js');
  commercialLearningFlywheel.setPersistence(
    hasFlywheelDelegates(prisma) ? prisma : undefined,
    runInTransaction as never,
  );

  const { redisConfigured, cacheConnection } = await import('../lib/queue/redis.js');
  let subscriberQuit: (() => void) | undefined;
  if (redisConfigured) {
    const instanceId = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
    const subscriber = cacheConnection.duplicate();
    subscriberQuit = () => {
      subscriber.disconnect();
    };
    const pseudonymize: Pseudonymize = (o, r) => chain.subjectPseudonym(o, r);
    await subscribeToPurgeBroadcasts(subscriber as unknown as PubSubLike, instanceId, pseudonymize);
    chain.setPurgeBroadcaster(
      makeBroadcaster(cacheConnection as unknown as PubSubLike, instanceId, pseudonymize),
    );
  } else {
    logger.warn('LGPD: Redis não configurado — invalidação entre instâncias desativada');
  }

  const interval = Number(process.env.LGPD_PURGE_INTERVAL_MS ?? 60_000);
  const timer = setInterval(() => {
    // Sem bypass de RLS: o serviço itera por organização e seta o tenant em cada transação.
    chain
      .processPendingPurges()
      .catch((err) => logger.error({ err }, 'LGPD: reconciliação da outbox de expurgo falhou'));
  }, interval);
  timer.unref();
  return () => {
    clearInterval(timer);
    subscriberQuit?.();
  };
}
