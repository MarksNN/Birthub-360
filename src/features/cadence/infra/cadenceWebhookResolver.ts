import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { advanceCadenceRunPendingTouch } from '../application/cadenceService.js';
import { buildDeps, parseCadenceSequenceDefinition } from '../jobs/cadenceRun.worker.js';

export async function resolveCadencePendingVoiceTouch(
  organizationId: string,
  leadId: string,
  providerMessageId: string,
  outcome: { result: 'sent' | 'failed'; error?: string | null },
): Promise<void> {
  // Find any active or paused cadence run for this lead that has this providerMessageId as a pending attempt
  const runs = await prisma.cadenceRun.findMany({
    where: {
      organizationId,
      leadId,
      status: { in: ['Active', 'Paused'] },
    },
    select: { id: true, sequenceId: true, attempts: true },
  });

  for (const row of runs) {
    const attempts = row.attempts as any[];
    const hasPending = attempts.some(
      (a) => a.result === 'pending' && a.providerMessageId === providerMessageId,
    );
    if (!hasPending) continue;

    const sequenceRow = await prisma.cadenceSequence.findUnique({
      where: { id: row.sequenceId },
      select: { id: true, name: true, touches: true },
    });
    if (!sequenceRow) continue;

    const sequence = parseCadenceSequenceDefinition(sequenceRow);
    if (!sequence) continue;

    const deps = buildDeps();
    try {
      await advanceCadenceRunPendingTouch(
        deps,
        organizationId,
        row.id,
        sequence,
        providerMessageId,
        new Date(),
        outcome,
      );
    } catch (err) {
      logger.error({ err, runId: row.id }, 'Falha ao resolver toque pendente de voz via webhook');
    }
  }
}
