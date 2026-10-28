import { Queue, QueueEvents } from 'bullmq';
import { logger } from '../logger.js';
import { registerQueueForMetrics } from './metrics.js';
import { connection, queuesEnabled } from './redis.js';

export const KNOWLEDGE_INGESTION_QUEUE_NAME = 'knowledge-ingestion-queue';

export const knowledgeIngestionQueueEvents = queuesEnabled
  ? new QueueEvents(KNOWLEDGE_INGESTION_QUEUE_NAME, { connection })
  : null;

export const knowledgeIngestionQueue = queuesEnabled
  ? new Queue(KNOWLEDGE_INGESTION_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 24 * 60 * 60 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    })
  : null;

registerQueueForMetrics(KNOWLEDGE_INGESTION_QUEUE_NAME, knowledgeIngestionQueue);
knowledgeIngestionQueue?.on('error', (err) =>
  logger.warn({ message: err.message }, 'knowledgeIngestionQueue offline'),
);
