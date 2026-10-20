import {
  Award,
  Calendar,
  Medal,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { GamificationWidget } from '../../../components/ui/GamificationWidget.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { cn } from '../../../lib/utils.js';
import { gamificationApi } from '../api/gamification.api.js';
import type { LeaderboardPeriod, LeaderboardRanking, SellerScore } from '../domain/Gamification.js';
import { SellerCoachingCard } from './SellerCoachingCard.js';
import { WarRoomArenaView } from './WarRoomArenaView.js';

export function GamificationView() {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'warRoom'>('leaderboard');
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [rankingData, setRankingData] = useState<LeaderboardRanking>({
    period: 'month',
    rankings: [],
  });
  const [profile, setProfile] = useState<SellerScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentSellerName = currentUser?.name || 'Consultor';

  const loadData = useCallback(
    async (selectedPeriod: LeaderboardPeriod = period) => {
      try {
        const [ranking, sellerProfile] = await Promise.all([
          gamificationApi.getLeaderboard(selectedPeriod),
          gamificationApi.getSellerProfile(currentSellerName),
        ]);
        setRankingData(ranking);
        setProfile(sellerProfile);
      } catch (err) {
        console.warn('[GamificationView] Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentSellerName, period],
  );

  useEffect(() => {
    loadData(period);
  }, [loadData, period]);

  const handlePeriodChange = (newPeriod: LeaderboardPeriod) => {
    setPeriod(newPeriod);
    setLoading(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(period);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Executivo & Boas-vindas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-xs font-bold text-brand">
              <Trophy className="h-3.5 w-3.5" /> Cockpit Comercial
            </span>
            <span className="text-xs font-semibold text-ink-2">
              Performance, Conquistas e Ranking
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            Gamificação & Aceleração de Vendas
            <Sparkles className="h-6 w-6 text-brand" />
          </h1>
          <p className="text-sm text-ink-2 mt-0.5">
            Acompanhe sua pontuação real por esforço de prospecção, reuniões, fechamentos e
            conquistas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('leaderboard')}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5',
                activeSubTab === 'leaderboard'
                  ? 'bg-brand text-on-brand shadow-sm font-bold'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              <Trophy className="h-3.5 w-3.5" /> Ranking & Perfil
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('warRoom')}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5',
                activeSubTab === 'warRoom'
                  ? 'bg-brand text-on-brand shadow-sm font-bold'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              <Swords className="h-3.5 w-3.5" /> War Room Arena
            </button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="text-xs font-semibold"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      {activeSubTab === 'warRoom' ? (
        <WarRoomArenaView />
      ) : (
        <>
          {/* Widget Interativo Conectado a Dados Reais */}
          <GamificationWidget
            initialXp={profile?.totalPoints ?? 0}
            level={profile?.level ?? 1}
            streakDays={profile?.streakDays ?? 0}
            sellerScore={profile}
            show3DCore
          />

          {/* Grid Principal: Ranking / Leaderboard + Perfil Individual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Esquerda/Central: Leaderboard Bento (2 colunas em telas grandes) */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 border-line/70 bg-surface-elevated/70 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line/60">
                  <div className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-brand" />
                    <h2 className="font-display text-base font-bold text-ink">
                      Ranking Geral da Equipe
                    </h2>
                  </div>

                  {/* Seletor de Período */}
                  <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handlePeriodChange('week')}
                      className={cn(
                        'rounded-md px-3 py-1 transition-all',
                        period === 'week'
                          ? 'bg-brand text-on-brand shadow-sm font-bold'
                          : 'text-ink-2 hover:text-ink',
                      )}
                    >
                      Esta Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePeriodChange('month')}
                      className={cn(
                        'rounded-md px-3 py-1 transition-all',
                        period === 'month'
                          ? 'bg-brand text-on-brand shadow-sm font-bold'
                          : 'text-ink-2 hover:text-ink',
                      )}
                    >
                      Este Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePeriodChange('all')}
                      className={cn(
                        'rounded-md px-3 py-1 transition-all',
                        period === 'all'
                          ? 'bg-brand text-on-brand shadow-sm font-bold'
                          : 'text-ink-2 hover:text-ink',
                      )}
                    >
                      Histórico Geral
                    </button>
                  </div>
                </div>

                {/* Lista do Leaderboard */}
                <div className="mt-4">
                  {loading ? (
                    <div className="py-12 text-center text-sm text-ink-2">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand" />
                      Calculando pontuações e ranking em tempo real...
                    </div>
                  ) : rankingData.rankings.length === 0 ? (
                    <div className="py-12 text-center text-sm text-ink-2">
                      Nenhuma atividade comercial registrada neste período. Registre ligações,
                      reuniões ou propostas para pontuar!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {rankingData.rankings.map((seller, index) => {
                        const isTop1 = index === 0;
                        const isTop2 = index === 1;
                        const isTop3 = index === 2;
                        const isCurrent =
                          seller.sellerName.toLowerCase() === currentSellerName.toLowerCase();

                        return (
                          <div
                            key={seller.sellerName}
                            className={cn(
                              'flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200',
                              isCurrent
                                ? 'border-brand/60 bg-brand/5 shadow-sm'
                                : 'border-line/60 bg-surface/60 hover:bg-surface-interactive',
                            )}
                          >
                            {/* Posição + Avatar / Nome */}
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black [font-variant-numeric:tabular-nums]',
                                  isTop1
                                    ? 'bg-amber-400 text-slate-950 shadow-glow-amber'
                                    : isTop2
                                      ? 'bg-slate-300 text-slate-950'
                                      : isTop3
                                        ? 'bg-amber-700 text-white'
                                        : 'bg-surface-2 text-ink-2 border border-line',
                                )}
                              >
                                {index + 1}
                              </span>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-ink">
                                    {seller.sellerName}
                                  </span>
                                  {isCurrent && (
                                    <span className="rounded-full bg-brand/20 border border-brand/40 px-1.5 py-0.2 text-[10px] font-bold text-brand">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-ink-2 flex items-center gap-1.5">
                                  Nível {seller.level} · {seller.levelTitle}
                                </span>
                              </div>
                            </div>

                            {/* Métricas de Esforço + Pontuação */}
                            <div className="flex items-center gap-4 text-right">
                              <div className="hidden sm:flex items-center gap-3 text-xs text-ink-2 pr-3 border-r border-line/60">
                                <span title="Ligações">📞 {seller.callsCount}</span>
                                <span title="Reuniões">📅 {seller.meetingsCount}</span>
                                <span title="Negócios Ganhos">🏆 {seller.dealsClosed}</span>
                              </div>

                              <div>
                                <span className="font-extrabold text-sm md:text-base text-brand [font-variant-numeric:tabular-nums]">
                                  {seller.totalPoints.toLocaleString('pt-BR')} pts
                                </span>
                                <p className="text-[10px] text-ink-2">
                                  R${' '}
                                  {seller.wonRevenue.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 0,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

              {/* Coaching Semanal por IA Incorporado */}
              <SellerCoachingCard />
            </div>

            {/* Coluna Direita: Detalhamento do Perfil do Vendedor */}
            <div className="space-y-4">
              <Card className="p-5 border-line/70 bg-surface-elevated/70 backdrop-blur-xl">
                <div className="flex items-center justify-between pb-3 border-b border-line/60">
                  <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand" /> Meu Perfil de Performance
                  </h3>
                  <Badge variant="outline" className="font-bold text-[10px]">
                    Nível {profile?.level ?? 1}
                  </Badge>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Card de Titularidade */}
                  <div className="p-4 rounded-xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent">
                    <span className="text-[10px] uppercase font-bold text-brand tracking-wider">
                      Patente Comercial
                    </span>
                    <h4 className="text-lg font-bold text-ink mt-0.5">
                      {profile?.levelTitle || 'Consultor Trainee'}
                    </h4>
                    <p className="text-xs text-ink-2 mt-1">
                      Ganhe pontos realizando chamadas (+10), agendando reuniões (+30) e fechando
                      contratos (+200).
                    </p>
                  </div>

                  {/* Estatísticas de Conversão e Atividades */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-lg border border-line/60 bg-surface/50">
                      <span className="text-ink-2 flex items-center gap-1 font-semibold">
                        <PhoneCall className="h-3.5 w-3.5 text-brand" /> Ligações
                      </span>
                      <span className="font-bold text-base text-ink mt-1 block [font-variant-numeric:tabular-nums]">
                        {profile?.callsCount ?? 0}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-line/60 bg-surface/50">
                      <span className="text-ink-2 flex items-center gap-1 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-brand" /> Reuniões
                      </span>
                      <span className="font-bold text-base text-ink mt-1 block [font-variant-numeric:tabular-nums]">
                        {profile?.meetingsCount ?? 0}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-line/60 bg-surface/50">
                      <span className="text-ink-2 flex items-center gap-1 font-semibold">
                        <Target className="h-3.5 w-3.5 text-brand" /> Qualificados
                      </span>
                      <span className="font-bold text-base text-ink mt-1 block [font-variant-numeric:tabular-nums]">
                        {profile?.qualifiedCount ?? 0}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-line/60 bg-surface/50">
                      <span className="text-ink-2 flex items-center gap-1 font-semibold">
                        <Trophy className="h-3.5 w-3.5 text-brand" /> Ganhos
                      </span>
                      <span className="font-bold text-base text-ink mt-1 block [font-variant-numeric:tabular-nums]">
                        {profile?.dealsClosed ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Badges Conquistadas */}
                  <div>
                    <h4 className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-brand" /> Badges & Conquistas Desbloqueadas
                    </h4>

                    <div className="space-y-2">
                      {profile?.badges?.map((badge) => (
                        <div
                          key={badge.id}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg border text-xs transition-all',
                            badge.unlocked
                              ? 'border-brand/40 bg-brand/5 text-ink'
                              : 'border-line/40 bg-surface/30 text-ink-2/60 opacity-60',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                              badge.unlocked
                                ? 'bg-brand text-on-brand'
                                : 'bg-surface-2 text-ink-2 border border-line',
                            )}
                          >
                            {badge.unlocked ? '✓' : '🔒'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold block truncate">{badge.title}</span>
                            <span className="text-[10px] text-ink-2 block truncate">
                              {badge.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
