/**
 * warRoomArena.contract.ts
 *
 * Contrato tipado para a War Room Arena (Eixo 14).
 * Duelos de objeções, simulações em equipe, torneios sazonais,
 * critérios pedagógicos objetivos e gamificação idempotente.
 */

export type WarRoomMode =
  | 'objection_duel'
  | 'team_challenge'
  | 'seasonal_tournament'
  | 'OBJECTION_DUEL'
  | 'TEAM_CHALLENGE'
  | 'SEASONAL_TOURNAMENT';

export type ArenaMode = WarRoomMode;

export type ArenaSessionStatus =
  | 'LOBBY'
  | 'ACTIVE_ROUND'
  | 'IN_PROGRESS'
  | 'EVALUATING'
  | 'EVALUATED'
  | 'COMPLETED'
  | 'CONTESTED';

export interface ArenaParticipant {
  userId?: string;
  sellerId?: string;
  name?: string;
  sellerName?: string;
  role: 'challenger' | 'defender' | 'team_member' | 'CHALLENGER' | 'DEFENDER' | 'TEAM_MEMBER';
  currentScore: number;
  roundsWon?: number;
  joinedAt?: number;
}

export interface ArenaPedagogicalScore {
  roundNumber: number;
  needIdentificationScore: number;
  valueAnchoringScore: number;
  playbookAdherenceScore: number;
  clarityEmpathyScore: number;
  compositeScore: number;
  overallScore?: number;
  rewardXp?: number;
  criteriaScores?: {
    spinClarity: number;
    playbookAccuracy: number;
    empathyTonality: number;
    nextStepProposed: boolean;
  };
  awardedXp: number;
  feedback: string;
}

export interface ObjectionRound {
  roundNumber: number;
  objectionPrompt: string;
  challengerId: string;
  defenderId: string;
  defenderResponseText: string;
  timeTakenSeconds: number;
  score?: number;
  evaluatedAt?: string;
  evaluation?: ArenaPedagogicalScore;
}

export interface WarRoomArenaRoom {
  roomId: string;
  organizationId: string;
  roomName: string;
  mode: WarRoomMode;
  status: ArenaSessionStatus;
  participants: ArenaParticipant[];
  rounds: ObjectionRound[];
  currentRoundNumber: number;
  winnerUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArenaRound {
  roundNumber: number;
  objectionText: string;
  responseAttemptText: string;
  submittedBySellerId: string;
  pedagogicalScore: number;
  criteriaBreakdown: {
    clarityScore: number;
    empathyScore: number;
    valueAnchoringScore: number;
    playbookAdherenceScore: number;
  };
  feedback: string;
}

export interface ArenaMatch {
  matchId: string;
  organizationId: string;
  mode: ArenaMode;
  status: ArenaSessionStatus;
  participants: ArenaParticipant[];
  rounds: ArenaRound[];
  winnerSellerId?: string;
  xpAwarded: number;
  idempotencyKey: string;
  startedAt: number;
  completedAt?: number;
}

export interface StartArenaMatchInput {
  organizationId: string;
  mode: ArenaMode;
  challengerSellerId: string;
  challengerName: string;
  defenderSellerId?: string;
  defenderName?: string;
  scenarioTheme: string;
}

export interface SubmitRoundTurnInput {
  organizationId: string;
  matchId: string;
  sellerId: string;
  roundNumber: number;
  objection: string;
  responseAttempt: string;
}

export interface IWarRoomArenaPort {
  createRoom?(params: {
    organizationId: string;
    roomName: string;
    mode: WarRoomMode;
    creatorUserId: string;
    creatorName: string;
  }): Promise<WarRoomArenaRoom>;

  joinRoom?(params: {
    organizationId: string;
    roomId: string;
    userId: string;
    name: string;
    role: ArenaParticipant['role'];
  }): Promise<WarRoomArenaRoom>;

  submitObjectionRound?(params: {
    organizationId: string;
    roomId: string;
    challengerId: string;
    defenderId: string;
    objectionPrompt: string;
    defenderResponseText: string;
    timeTakenSeconds: number;
  }): Promise<{ round: ObjectionRound; updatedRoom: WarRoomArenaRoom }>;

  resolveRoundEvaluation?(params: {
    organizationId: string;
    roomId: string;
    roundNumber: number;
  }): Promise<{ score: ArenaPedagogicalScore; updatedRoom: WarRoomArenaRoom }>;

  finalizeDuel?(params: {
    organizationId: string;
    roomId: string;
  }): Promise<{ winnerUserId: string; awardedXp: number; updatedRoom: WarRoomArenaRoom }>;

  contestEvaluation?(params: {
    organizationId: string;
    roomId: string;
    roundNumber: number;
    contestedByUserId: string;
    justification: string;
  }): Promise<{ status: string; message: string }>;

  createMatch?(input: StartArenaMatchInput): Promise<ArenaMatch>;
  submitTurn?(
    input: SubmitRoundTurnInput,
  ): Promise<{ round: ArenaRound; matchStatus: ArenaSessionStatus }>;
  finalizeMatch?(
    organizationId: string,
    matchId: string,
  ): Promise<{ match: ArenaMatch; xpDistributed: boolean }>;
  contestResult?(
    organizationId: string,
    matchId: string,
    sellerId: string,
    reason: string,
  ): Promise<ArenaMatch>;
  getLeaderboard?(organizationId: string): Promise<any[]>;
}
