import { beforeEach, describe, expect, it } from 'vitest';
import { warRoomArenaService } from '../../../src/features/gamification/services/warRoomArena.service.js';

describe('Eixo 14: War Room Arena Service (Agentes 02, 03, 07 & 13)', () => {
  const orgA = 'org-birthub-tenant-alpha';
  const orgB = 'org-birthub-tenant-beta';

  beforeEach(() => {
    warRoomArenaService.clear();
  });

  it('deve criar sala de duelo de objeções e permitir entrada de desafiante e defensor', async () => {
    const room = await warRoomArenaService.createRoom({
      organizationId: orgA,
      roomName: 'Duelo Semanal: Objeções Críticas de Preço',
      mode: 'objection_duel',
      creatorUserId: 'seller-challenger',
      creatorName: 'Lucas Desafiante',
    });

    expect(room.roomId).toBeDefined();
    expect(room.status).toBe('LOBBY');
    expect(room.participants.length).toBe(1);

    const updated = await warRoomArenaService.joinRoom({
      organizationId: orgA,
      roomId: room.roomId,
      userId: 'seller-defender',
      name: 'Rodrigo Defensor',
      role: 'defender',
    });

    expect(updated.participants.length).toBe(2);
    expect(updated.status).toBe('ACTIVE_ROUND'); // Transição automática ao completar papéis
  });

  it('deve submeter rodada de objeção e avaliar pedagogicamente com concessão de XP', async () => {
    const room = await warRoomArenaService.createRoom({
      organizationId: orgA,
      roomName: 'Torneio Mensal de Negociação',
      mode: 'seasonal_tournament',
      creatorUserId: 'seller-challenger',
      creatorName: 'Lucas Desafiante',
    });

    await warRoomArenaService.joinRoom({
      organizationId: orgA,
      roomId: room.roomId,
      userId: 'seller-defender',
      name: 'Rodrigo Defensor',
      role: 'defender',
    });

    const roundSubmission = await warRoomArenaService.submitObjectionRound({
      organizationId: orgA,
      roomId: room.roomId,
      challengerId: 'seller-challenger',
      defenderId: 'seller-defender',
      objectionPrompt: 'O preço da solução está 30% acima do nosso concorrente direto.',
      defenderResponseText: 'Compreendo perfeitamente. No entanto, quando analisamos o TCO e o impacto do custo das falhas de integração da concorrência, o nosso benefício líquido gera um ROI comprovado. Quando podemos demonstrar a simulação com os seus dados?',
      timeTakenSeconds: 28,
    });

    expect(roundSubmission.round.roundNumber).toBe(1);
    expect(roundSubmission.updatedRoom.status).toBe('EVALUATING');

    const evalResult = await warRoomArenaService.resolveRoundEvaluation({
      organizationId: orgA,
      roomId: room.roomId,
      roundNumber: 1,
    });

    expect(evalResult.score.overallScore).toBeGreaterThanOrEqual(80);
    expect(evalResult.score.rewardXp).toBeGreaterThanOrEqual(160);
    expect(evalResult.score.criteriaScores.nextStepProposed).toBe(true);

    const defender = evalResult.updatedRoom.participants.find((p) => p.userId === 'seller-defender');
    expect(defender?.currentScore).toBeGreaterThan(0);
    expect(defender?.roundsWon).toBe(1);
  });

  it('deve encerrar sala e calcular vencedor e XP total distribuído', async () => {
    const room = await warRoomArenaService.createRoom({
      organizationId: orgA,
      roomName: 'Duelo Rápido',
      mode: 'objection_duel',
      creatorUserId: 'seller-a',
      creatorName: 'Vendedor A',
    });

    await warRoomArenaService.joinRoom({
      organizationId: orgA,
      roomId: room.roomId,
      userId: 'seller-b',
      name: 'Vendedor B',
      role: 'defender',
    });

    await warRoomArenaService.submitObjectionRound({
      organizationId: orgA,
      roomId: room.roomId,
      challengerId: 'seller-a',
      defenderId: 'seller-b',
      objectionPrompt: 'Não temos urgência para trocar de sistema.',
      defenderResponseText: 'Entendo perfeitamente. Qual o custo mensal de manter o gargalo atual até o próximo ano?',
      timeTakenSeconds: 20,
    });

    await warRoomArenaService.resolveRoundEvaluation({
      organizationId: orgA,
      roomId: room.roomId,
      roundNumber: 1,
    });

    const closeResult = await warRoomArenaService.closeRoomAndReward({
      organizationId: orgA,
      roomId: room.roomId,
    });

    expect(closeResult.room.status).toBe('COMPLETED');
    expect(closeResult.winnerUserId).toBe('seller-b');
    expect(closeResult.totalXpDistributed).toBeGreaterThan(0);
  });

  it('deve garantir isolamento multi-tenant de salas da War Room', async () => {
    const room = await warRoomArenaService.createRoom({
      organizationId: orgA,
      roomName: 'Sala Privada Tenant Alpha',
      mode: 'objection_duel',
      creatorUserId: 'user-a',
      creatorName: 'User A',
    });

    // Usuário do Tenant B não pode ingressar na sala do Tenant A
    await expect(
      warRoomArenaService.joinRoom({
        organizationId: orgB,
        roomId: room.roomId,
        userId: 'user-b',
        name: 'User B',
        role: 'defender',
      }),
    ).rejects.toThrow(/não encontrada/);
  });
});
