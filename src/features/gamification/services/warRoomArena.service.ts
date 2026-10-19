import { randomUUID } from 'node:crypto';
import type {
  ArenaParticipant,
  ArenaPedagogicalScore,
  IWarRoomArenaPort,
  ObjectionRound,
  WarRoomArenaRoom,
  WarRoomMode,
} from '../../../shared/contracts/warRoomArena.contract.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';

export class WarRoomArenaService implements IWarRoomArenaPort {
  private rooms = new Map<string, WarRoomArenaRoom>(); // key: `${orgId}:${roomId}`

  async createRoom(params: {
    organizationId: string;
    roomName: string;
    mode: WarRoomMode;
    creatorUserId: string;
    creatorName: string;
  }): Promise<WarRoomArenaRoom> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para criar sala na War Room');
    }

    const roomId = `room-${randomUUID().substring(0, 8)}`;
    const now = new Date().toISOString();

    const creator: ArenaParticipant = {
      userId: params.creatorUserId,
      name: params.creatorName,
      role: 'challenger',
      currentScore: 0,
      roundsWon: 0,
    };

    const room: WarRoomArenaRoom = {
      roomId,
      organizationId: params.organizationId,
      roomName: params.roomName,
      mode: params.mode,
      status: 'LOBBY',
      participants: [creator],
      rounds: [],
      currentRoundNumber: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(`${params.organizationId}:${roomId}`, room);
    logger.info(
      `[WarRoomArena] Sala "${room.roomName}" (${roomId}) criada no modo ${room.mode} para tenant ${params.organizationId}.`,
    );

    return room;
  }

  async joinRoom(params: {
    organizationId: string;
    roomId: string;
    userId: string;
    name: string;
    role: ArenaParticipant['role'];
  }): Promise<WarRoomArenaRoom> {
    const key = `${params.organizationId}:${params.roomId}`;
    const room = this.rooms.get(key);

    if (!room) {
      throw new Error(`Sala ${params.roomId} não encontrada no tenant.`);
    }

    const exists = room.participants.some((p: ArenaParticipant) => p.userId === params.userId);
    if (!exists) {
      room.participants.push({
        userId: params.userId,
        name: params.name,
        role: params.role,
        currentScore: 0,
        roundsWon: 0,
      });
    }

    // Se houver desafiante e defensor, avança para ACTIVE_ROUND
    const hasChallenger = room.participants.some((p: ArenaParticipant) => p.role === 'challenger');
    const hasDefender = room.participants.some((p: ArenaParticipant) => p.role === 'defender');

    if (hasChallenger && hasDefender && room.status === 'LOBBY') {
      room.status = 'ACTIVE_ROUND';
    }

    room.updatedAt = new Date().toISOString();
    return room;
  }

  async submitObjectionRound(params: {
    organizationId: string;
    roomId: string;
    challengerId: string;
    defenderId: string;
    objectionPrompt: string;
    defenderResponseText: string;
    timeTakenSeconds: number;
  }): Promise<{ round: ObjectionRound; updatedRoom: WarRoomArenaRoom }> {
    const key = `${params.organizationId}:${params.roomId}`;
    const room = this.rooms.get(key);

    if (!room) {
      throw new Error(`Sala ${params.roomId} não encontrada.`);
    }

    const roundNumber = room.currentRoundNumber;
    const round: ObjectionRound = {
      roundNumber,
      objectionPrompt: params.objectionPrompt,
      challengerId: params.challengerId,
      defenderId: params.defenderId,
      defenderResponseText: params.defenderResponseText,
      timeTakenSeconds: params.timeTakenSeconds,
    };

    room.rounds.push(round);
    room.status = 'EVALUATING';
    room.updatedAt = new Date().toISOString();

    return { round, updatedRoom: room };
  }

  async resolveRoundEvaluation(params: {
    organizationId: string;
    roomId: string;
    roundNumber: number;
  }): Promise<{ score: ArenaPedagogicalScore; updatedRoom: WarRoomArenaRoom }> {
    const key = `${params.organizationId}:${params.roomId}`;
    const room = this.rooms.get(key);

    if (!room) {
      throw new Error(`Sala ${params.roomId} não encontrada.`);
    }

    const round = room.rounds.find((r: ObjectionRound) => r.roundNumber === params.roundNumber);
    if (!round) {
      throw new Error(`Rodada ${params.roundNumber} não encontrada na sala.`);
    }

    // Avaliação pedagógica dos 4 critérios
    const defenderText = round.defenderResponseText || '';
    const lower = defenderText.toLowerCase();
    const hasSpin =
      lower.includes('impacto') || lower.includes('custo') || lower.includes('gargalo');
    const hasPlaybook =
      lower.includes('roi') || lower.includes('tco') || lower.includes('benefício');
    const hasEmpathy =
      lower.includes('compreendo') || lower.includes('entendo') || lower.includes('perfeito');
    const hasNextStep =
      lower.includes('quando') ||
      lower.includes('próximo') ||
      lower.includes('reunião') ||
      lower.includes('passo');

    const spinClarity = hasSpin ? 25 : 15;
    const playbookAccuracy = hasPlaybook ? 25 : 15;
    const empathyTonality = hasEmpathy ? 25 : 20;
    const nextStepProposed = hasNextStep;

    const overallScore =
      spinClarity + playbookAccuracy + empathyTonality + (nextStepProposed ? 25 : 0);
    const rewardXp = Math.round(overallScore * 2); // Ex: nota 90 -> 180 XP

    const score: ArenaPedagogicalScore = {
      roundNumber: params.roundNumber,
      needIdentificationScore: spinClarity,
      valueAnchoringScore: playbookAccuracy,
      playbookAdherenceScore: playbookAccuracy,
      clarityEmpathyScore: empathyTonality,
      compositeScore: overallScore,
      overallScore,
      rewardXp,
      criteriaScores: {
        spinClarity,
        playbookAccuracy,
        empathyTonality,
        nextStepProposed,
      },
      awardedXp: rewardXp,
      feedback:
        overallScore >= 80
          ? 'Excelente resposta à objeção com articulação de valor e encaminhamento de próximo passo.'
          : 'Resposta aceitável. Reforçar o cálculo de ROI e garantir a confirmação de uma data para o próximo contato.',
    };

    round.evaluation = score;

    // Atualizar pontuação do participante defensor
    const defender = room.participants.find((p: ArenaParticipant) => p.userId === round.defenderId);
    if (defender) {
      defender.currentScore += overallScore;
      if (overallScore >= 75) {
        defender.roundsWon = (defender.roundsWon ?? 0) + 1;
      }
    }

    room.currentRoundNumber += 1;
    room.status = 'ACTIVE_ROUND';
    room.updatedAt = new Date().toISOString();

    return { score, updatedRoom: room };
  }

  async closeRoomAndReward(params: { organizationId: string; roomId: string }): Promise<{
    room: WarRoomArenaRoom;
    winnerUserId: string | null;
    totalXpDistributed: number;
  }> {
    const key = `${params.organizationId}:${params.roomId}`;
    const room = this.rooms.get(key);

    if (!room) {
      throw new Error(`Sala ${params.roomId} não encontrada.`);
    }

    room.status = 'COMPLETED';
    room.updatedAt = new Date().toISOString();

    // Determinar vencedor baseado no total de pontos
    let winner: ArenaParticipant | null = null;
    let highestScore = -1;
    let totalXp = 0;

    for (const p of room.participants) {
      if (p.currentScore > highestScore) {
        highestScore = p.currentScore;
        winner = p;
      }
    }

    for (const r of room.rounds) {
      const roundEval = r.evaluation;
      if (roundEval && typeof roundEval.awardedXp === 'number') {
        totalXp += roundEval.awardedXp;
      }
    }

    await domainEventMesh.publish({
      eventType: 'WAR_ROOM_DUEL_RESOLVED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `duel-${room.roomId}`,
      producer: 'war-room-arena-service',
      aggregateId: room.roomId,
      payload: {
        roomId: room.roomId,
        winnerUserId: winner?.userId ?? null,
        winnerName: winner?.name ?? null,
        roundsPlayed: room.rounds.length,
        totalXpDistributed: totalXp,
      },
    });

    logger.info(
      `[WarRoomArena] Sala ${room.roomId} encerrada. Vencedor: ${winner?.name ?? 'Empate'}. XP total concedido: ${totalXp}.`,
    );

    return {
      room,
      winnerUserId: winner?.userId ?? null,
      totalXpDistributed: totalXp,
    };
  }

  getRoom(organizationId: string, roomId: string): WarRoomArenaRoom | undefined {
    return this.rooms.get(`${organizationId}:${roomId}`);
  }

  async getLeaderboard(organizationId: string): Promise<any[]> {
    const leaderMap = new Map<
      string,
      { sellerId: string; sellerName: string; wins: number; totalXp: number }
    >();
    for (const [key, room] of this.rooms.entries()) {
      if (key.startsWith(`${organizationId}:`)) {
        for (const p of room.participants) {
          const sellerId = p.userId ?? p.sellerId ?? 'unknown';
          const sellerName = p.name ?? p.sellerName ?? 'Vendedor';
          const existing = leaderMap.get(sellerId) ?? { sellerId, sellerName, wins: 0, totalXp: 0 };
          existing.wins += p.roundsWon ?? 0;
          existing.totalXp += p.currentScore ?? 0;
          leaderMap.set(sellerId, existing);
        }
      }
    }
    return Array.from(leaderMap.values()).sort((a, b) => b.totalXp - a.totalXp);
  }

  clear(): void {
    this.rooms.clear();
  }
}

export const warRoomArenaService = new WarRoomArenaService();
