import { getUserId } from '../../../lib/async-context.js';
import { withRlsContext } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { callBitrix } from '../../integrations/bitrix/service/client.js';

/**
 * Executa uma AccountRecommendation.
 *
 * Tenancy (AGENTS.md §26): além do RLS de `withRlsContext`, a busca filtra explicitamente por
 * `organizationId` da sessão e pela conta `{id}` da URL. Recomendação de outro tenant ou de outra
 * conta → 404 idêntico (sem oráculo de enumeração).
 *
 * Pré-condições (já executada, Bitrix não conectado, sem lead, sem sequência ativa, cadência já
 * ativa) devolvem o erro SEM alterar o status da recomendação. Só falha da execução em si (chamada
 * ao Bitrix, persistência da cadência) marca `Failed`.
 */
type ExecOutcome =
  | { ok: { success: true; taskId?: string | number; message?: string } }
  | { failed: unknown };

export const actionExecutorService = {
  async executeAction(recommendationId: string, expectedCompanyId: string, organizationId: string) {
    if (!organizationId) throw new AppError('Organização autenticada não informada.', 403);

    // Falha real da execução não pode marcar Failed dentro da mesma transação: o throw faz
    // rollback e o status nunca persistiria. A transação devolve a falha e o Failed é gravado
    // numa transação própria, escopada pelo tenant, antes de relançar o erro.
    const outcome = await withRlsContext(async (prisma): Promise<ExecOutcome> => {
      const recommendation = await prisma.accountRecommendation.findFirst({
        where: { id: recommendationId, organizationId, companyId: expectedCompanyId },
        include: {
          company: { include: { organization: { include: { bitrixConnections: true } } } },
        },
      });

      if (!recommendation) throw new AppError('Recomendação não encontrada', 404);
      if (recommendation.status === 'Executed')
        throw new AppError('Recomendação já executada', 400);

      const company = recommendation.company;

      if (recommendation.actionType === 'CREATE_BITRIX_TASK') {
        const webhookUrl = company?.organization?.bitrixConnections?.[0]?.webhookUrl;
        if (!webhookUrl) throw new AppError('Bitrix não conectado nesta organização', 400);

        const currentUser = await prisma.user.findUnique({ where: { id: getUserId() } });
        const responsibleId = currentUser?.bitrixUserId || 1;

        let response: { result?: { task?: { id?: string | number } } } | undefined;
        try {
          response = await callBitrix<{ result?: { task?: { id?: string | number } } }>(
            webhookUrl,
            'tasks.task.add',
            {
              fields: {
                TITLE: recommendation.title,
                DESCRIPTION: `${recommendation.rationale}\n\nCriado via Central Birth Hub 360 para a conta: ${company.legalName}`,
                RESPONSIBLE_ID: responsibleId,
              },
            },
          );
        } catch (error: unknown) {
          return { failed: error };
        }

        await prisma.accountRecommendation.update({
          where: { id: recommendationId },
          data: {
            status: 'Executed',
            executedAt: new Date(),
            externalRef: response?.result?.task?.id?.toString(),
          },
        });
        return { ok: { success: true, taskId: response?.result?.task?.id } };
      }

      if (recommendation.actionType === 'START_SDR_CADENCE') {
        const lead = await prisma.lead.findFirst({
          where: { companyId: company.id, organizationId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        if (!lead)
          throw new AppError('Nenhum lead associado a esta conta para iniciar cadência.', 400);

        const sequenceRow = await prisma.cadenceSequence.findFirst({
          where: { organizationId, active: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        if (!sequenceRow)
          throw new AppError('Nenhuma sequência ativa encontrada para iniciar cadência.', 400);

        const userId = getUserId();
        const { startCadenceRun } = await import('../../cadence/domain/cadence.js');
        const { prismaCadenceRunRepository } = await import(
          '../../cadence/infra/PrismaCadenceRunRepository.js'
        );
        const { randomUUID } = await import('node:crypto');

        const run = startCadenceRun({
          id: randomUUID(),
          organizationId,
          leadId: lead.id,
          sequenceId: sequenceRow.id,
          startedAt: new Date(),
          createdBy: userId || 'system',
        });

        try {
          await prismaCadenceRunRepository.save(run);
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            // Pré-condição (cadência já ativa): não é falha da recomendação.
            throw new AppError('Este lead já tem uma cadência ativa em andamento.', 409);
          }
          return { failed: error };
        }

        await prisma.accountRecommendation.update({
          where: { id: recommendationId },
          data: { status: 'Executed', executedAt: new Date() },
        });
        return { ok: { success: true, message: 'Cadência iniciada.' } };
      }

      await prisma.accountRecommendation.update({
        where: { id: recommendationId },
        data: { status: 'Executed', executedAt: new Date() },
      });
      return { ok: { success: true, message: 'Ação executada.' } };
    });

    if ('ok' in outcome) return outcome.ok;

    await withRlsContext((prisma) =>
      prisma.accountRecommendation.updateMany({
        where: { id: recommendationId, organizationId, companyId: expectedCompanyId },
        data: { status: 'Failed' },
      }),
    );
    throw outcome.failed;
  },
};
