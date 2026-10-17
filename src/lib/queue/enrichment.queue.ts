import { type Job, Queue, Worker } from 'bullmq';
import { enrichCompany } from '../../features/prospecting/services/enrichment.service.js';
import { requestContext } from '../async-context.js';
import { logger } from '../logger.js';
import { isFinalAttempt, recordDeadLetter } from './deadLetter.js';
import { recordQueueJobCompleted, registerQueueForMetrics } from './metrics.js';
import { connection, queuesEnabled } from './redis.js';

export const ENRICHMENT_QUEUE_NAME = 'enrichment-queue';

/** QUEUE-001: `enrichCompany` busca/atualiza a empresa por id — reexecutar após uma falha
 *  transitória (timeout de provedor externo) reaplica o mesmo enriquecimento, sem duplicar efeito. */
export const enrichmentQueue = queuesEnabled
  ? new Queue(ENRICHMENT_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 24 * 60 * 60 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    })
  : null;
registerQueueForMetrics(ENRICHMENT_QUEUE_NAME, enrichmentQueue);
enrichmentQueue?.on('error', (err) =>
  logger.warn({ message: err.message }, 'enrichmentQueue offline'),
);

export interface EnrichmentJobData {
  companyId: string;
  organizationId: string;
  cnpj?: string;
  segmentKeywords?: string[];
}

/**
 * Agenda o enriquecimento cadastral/firmográfico de uma empresa no BullMQ,
 * com fallback para execução em segundo plano direta caso filas Redis estejam desabilitadas.
 */
export async function queueCompanyEnrichment(
  data: EnrichmentJobData,
  options?: { force?: boolean },
): Promise<{ enqueued: boolean; executedDirectly?: boolean; reason?: string }> {
  if (queuesEnabled && enrichmentQueue) {
    await enrichmentQueue.add('enrich-company', data);
    return { enqueued: true };
  }

  // Fallback quando as filas estão desabilitadas (ex.: ambiente de desenvolvimento local sem Redis):
  // executa em segundo plano com requestContext isolado para não bloquear a requisição HTTP.
  setImmediate(() => {
    void requestContext.run({ tenantId: data.organizationId }, async () => {
      try {
        const enrichResult = await enrichCompany(data.organizationId, data.companyId, {
          cnpj: data.cnpj,
          segmentKeywords: data.segmentKeywords,
          force: options?.force,
        });
        if (enrichResult?.fit) {
          const { prisma } = await import('../prisma.js');
          await prisma.lead.updateMany({
            where: {
              organizationId: data.organizationId,
              companyId: data.companyId,
              deletedAt: null,
            },
            data: {
              score: enrichResult.fit.score,
              temperature: enrichResult.fit.temperature,
            },
          });
        }
        try {
          const { sseService } = await import('../../features/notifications/sse.service.js');
          sseService.notifyCompanyEnriched(data.organizationId, data.companyId, {
            fit: enrichResult?.fit,
          });
        } catch {
          // SSE broadcast é best-effort e não bloqueia a conclusão do job
        }
        logger.info(
          { companyId: data.companyId, organizationId: data.organizationId },
          'Direct background enrichment completed successfully',
        );
      } catch (err) {
        logger.error(
          { err, companyId: data.companyId, organizationId: data.organizationId },
          'Direct background enrichment failed',
        );
      }
    });
  });

  return { enqueued: true, executedDirectly: true };
}

export function createEnrichmentWorker() {
  const worker = new Worker<EnrichmentJobData>(
    ENRICHMENT_QUEUE_NAME,
    async (job: Job<EnrichmentJobData>) => {
      const { companyId, organizationId, cnpj, segmentKeywords } = job.data;
      logger.info({ jobId: job.id, companyId, organizationId }, 'Processing enrichment job');

      // O worker BullMQ roda fora do contexto HTTP — precisamos injetar o tenantId
      // manualmente para que o Prisma extension aplique o RLS e encontre a empresa.
      await requestContext.run({ tenantId: organizationId }, async () => {
        try {
          const enrichResult = await enrichCompany(organizationId, companyId, {
            cnpj,
            segmentKeywords,
          });
          if (enrichResult?.fit) {
            const { prisma } = await import('../prisma.js');
            await prisma.lead.updateMany({
              where: {
                organizationId,
                companyId,
                deletedAt: null,
              },
              data: {
                score: enrichResult.fit.score,
                temperature: enrichResult.fit.temperature,
              },
            });
          }
          try {
            const { sseService } = await import('../../features/notifications/sse.service.js');
            sseService.notifyCompanyEnriched(organizationId, companyId, {
              fit: enrichResult?.fit,
            });
          } catch {
            // SSE broadcast é best-effort
          }
          logger.info({ companyId, organizationId }, 'Enrichment job completed successfully');
        } catch (error: any) {
          logger.error({ err: error, jobId: job.id, companyId }, 'Enrichment job failed');
          throw error;
        }
      });
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Enrichment worker job permanently failed');
    if (!job || !isFinalAttempt(job.attemptsMade, job.opts.attempts)) return;
    void recordDeadLetter({
      queue: ENRICHMENT_QUEUE_NAME,
      jobId: job.id,
      jobName: job.name,
      organizationId: job.data?.organizationId ?? null,
      attemptsMade: job.attemptsMade,
      error: err,
      data: job.data,
    });
  });

  worker.on('completed', () => recordQueueJobCompleted(ENRICHMENT_QUEUE_NAME));

  return worker;
}
