export type BadgeId =
  | 'FIRST_BLOOD'
  | 'CALL_MASTER'
  | 'MEETING_PRO'
  | 'CLOSER_ELITE'
  | 'DISCIPLINE_STREAK'
  | 'QUALIFICATION_HERO';

export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface SellerScore {
  sellerName: string;
  userId?: string;
  totalPoints: number;
  level: number;
  levelTitle: string;
  callsCount: number;
  meetingsCount: number;
  qualifiedCount: number;
  dealsClosed: number;
  wonRevenue: number;
  badges: Badge[];
  streakDays: number;
  performance?: import('./SellerPerformance.js').AggregatedSellerPerformance;
}

export type LeaderboardPeriod = 'all' | 'month' | 'week';

export interface LeaderboardRanking {
  period: LeaderboardPeriod;
  rankings: SellerScore[];
}

export const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'unlocked'>> = {
  FIRST_BLOOD: {
    id: 'FIRST_BLOOD',
    title: 'Primeiro Fechamento',
    description: 'Fechou o primeiro negócio ganho no CRM',
    icon: 'Trophy',
  },
  CALL_MASTER: {
    id: 'CALL_MASTER',
    title: 'Mestre da Conexão',
    description: 'Realizou 50 ou mais ligações comerciais registradas',
    icon: 'PhoneCall',
  },
  MEETING_PRO: {
    id: 'MEETING_PRO',
    title: 'Agenda Blindada',
    description: 'Conduziu 10 ou mais reuniões de vendas agendadas',
    icon: 'CalendarCheck',
  },
  CLOSER_ELITE: {
    id: 'CLOSER_ELITE',
    title: 'Closer de Elite',
    description: 'Superou R$ 100.000 em volume de negócios fechados',
    icon: 'Flame',
  },
  DISCIPLINE_STREAK: {
    id: 'DISCIPLINE_STREAK',
    title: 'Disciplina Implacável',
    description: 'Mantém atividades diárias em dia sem pendências vencidas',
    icon: 'Zap',
  },
  QUALIFICATION_HERO: {
    id: 'QUALIFICATION_HERO',
    title: 'Herói da Qualificação',
    description: 'Qualificou 20 ou mais oportunidades no funil',
    icon: 'Target',
  },
};

export function calculateSellerPoints(metrics: {
  callsCount: number;
  meetingsCount: number;
  qualifiedCount: number;
  dealsClosed: number;
  wonRevenue: number;
}): number {
  const pointsFromCalls = metrics.callsCount * 10;
  const pointsFromMeetings = metrics.meetingsCount * 30;
  const pointsFromQualified = metrics.qualifiedCount * 50;
  const pointsFromClosed = metrics.dealsClosed * 200;
  const pointsFromRevenue = Math.floor(metrics.wonRevenue / 1000);

  return (
    pointsFromCalls +
    pointsFromMeetings +
    pointsFromQualified +
    pointsFromClosed +
    pointsFromRevenue
  );
}

export function calculateSellerLevel(points: number): { level: number; title: string } {
  if (points >= 7000) return { level: 5, title: 'Titã Comercial' };
  if (points >= 3500) return { level: 4, title: 'Especialista de Receita' };
  if (points >= 1500) return { level: 3, title: 'Closer Sênior' };
  if (points >= 500) return { level: 2, title: 'Consultor Pleno' };
  return { level: 1, title: 'Consultor Trainee' };
}

export function evaluateBadges(metrics: {
  callsCount: number;
  meetingsCount: number;
  qualifiedCount: number;
  dealsClosed: number;
  wonRevenue: number;
  overdueCount?: number;
}): Badge[] {
  return [
    { ...BADGE_DEFINITIONS.FIRST_BLOOD, unlocked: metrics.dealsClosed >= 1 },
    { ...BADGE_DEFINITIONS.CALL_MASTER, unlocked: metrics.callsCount >= 50 },
    { ...BADGE_DEFINITIONS.MEETING_PRO, unlocked: metrics.meetingsCount >= 10 },
    { ...BADGE_DEFINITIONS.CLOSER_ELITE, unlocked: metrics.wonRevenue >= 100000 },
    {
      ...BADGE_DEFINITIONS.DISCIPLINE_STREAK,
      unlocked:
        metrics.callsCount + metrics.meetingsCount >= 5 && (metrics.overdueCount ?? 0) === 0,
    },
    { ...BADGE_DEFINITIONS.QUALIFICATION_HERO, unlocked: metrics.qualifiedCount >= 20 },
  ];
}

export interface GamificationRepository {
  getLeaderboard(organizationId: string, since?: Date): Promise<SellerScore[]>;
  getSellerScore(organizationId: string, owner: string, since?: Date): Promise<SellerScore | null>;
}
