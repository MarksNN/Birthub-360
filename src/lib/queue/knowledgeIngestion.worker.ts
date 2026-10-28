import { type Job, Worker } from 'bullmq';
import {
  type IngestOptions,
  ingestionService,
} from '../../features/knowledge/ingestion.service.js';
import { requestContext } from '../async-context.js';
import { logger } from '../logger.js';
import { isFinalAttempt, recordDeadLetter } from './deadLetter.js';
import { KNOWLEDGE_INGESTION_QUEUE_NAME } from './knowledgeIngestion.queue.js';
import { recordQueueJobCompleted } from './metrics.js';
import { connection } from './redis.js';

export function createKnowledgeIngestionWorker() {
  const worker = new Worker<IngestOptions>(
    KNOWLEDGE_INGESTION_QUEUE_NAME,
    async (job: Job<IngestOptions>) => {
      const options = job.data;
      logger.info(
        { jobId: job.id, organizationId: options.organizationId, title: options.title },
        'Processing knowledge ingestion job',
      );

      return await requestContext.run({ tenantId: options.organizationId }, async () => {
        try {
          const result = await ingestionService.ingestText(options);
          logger.info(
            { organizationId: options.organizationId, title: options.title },
            'Knowledge ingestion job completed successfully',
          );
          return result;
        } catch (error: any) {
          logger.error(
            { err: error, jobId: job.id, organizationId: options.organizationId },
            'Knowledge ingestion job failed',
          );
          throw error;
        }
      });
    },
    { connection, concurrency: 2 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Knowledge ingestion worker job permanently failed');
    if (!job || !isFinalAttempt(job.attemptsMade, job.opts.attempts)) return;
    void recordDeadLetter({
      queue: KNOWLEDGE_INGESTION_QUEUE_NAME,
      jobId: job.id,
      jobName: job.name,
      organizationId: job.data?.organizationId ?? null,
      attemptsMade: job.attemptsMade,
      error: err,
      data: job.data,
    });
  });

  worker.on('completed', () => recordQueueJobCompleted(KNOWLEDGE_INGESTION_QUEUE_NAME));

  return worker;
}
