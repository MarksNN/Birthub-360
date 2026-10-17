import {
  Award,
  CalendarCheck,
  Flame,
  PhoneCall,
  RefreshCw,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { GamificationWidget } from '../../../components/ui/GamificationWidget.js';
import { PageHeader } from '../../../components/ui/PageHeader.js';
import { Select } from '../../../components/ui/Select.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { SellerCoachingCard } from '../../dashboard/components/SellerCoachingCard.js';
import { gamificationApi } from '../api/gamification.api.js';
import type { LeaderboardPeriod, LeaderboardRanking, SellerScore } from '../domain/Gamification.js';

export function GamificationView() {
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRanking | null>(null);
  const [myProfile, setMyProfile] = useState<SellerScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [lbData, profileData] = await Promise.all([
        gamificationApi.getLeaderboard(period),
        gamificationApi.getSellerProfile(currentUser?.name || undefined),
      ]);
      setLeaderboard(lbData);
      setMyProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar ranking de gamificação.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, currentUser?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    SoundFX.play('click');
    loadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <PageHeader
        title="Cockpit de Gamificação & Performance"
        description="Acompanhamento dinâmico de metas, ranking comercial por esforço e fechamento, conquistas desbloqueadas e desenvolvimento por IA."
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={period}
              onChange={(val) => setPeriod(val as LeaderboardPeriod)}
              options={[
                { value: 'week', label: 'Esta Semana' },
                { value: 'month', label: 'Este Mês' },
                { value: 'all', label: 'Todo o Período' },
              ]}
              aria-label="Filtrar por período"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      {error && (
        <Card
          variant="bento"
          padding="default"
          className="border-danger/30 bg-danger/10 text-danger"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Top Bento Grid: Perfil Pessoal & Widget Gamificado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="bento" padding="lg" spotlight>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
                  <Trophy className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-ink font-display">
                      {myProfile?.sellerName || currentUser?.name || 'Seu Desempenho'}
                    </h2>
                    <Badge variant="outline" className="text-brand border-brand/30">
                      Nível {myProfile?.level || 1}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-2 font-medium">
                    {myProfile?.levelTitle || 'Consultor Comercial'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ink-2">
                    Streak Ativo
                  </span>
                  <p className="text-base font-extrabold text-brand flex items-center gap-1 justify-end">
                    <Flame className="w-4 h-4 text-warning" />
                    {myProfile?.streakDays || 0} dias
                  </p>
                </div>
                <div className="text-right border-l border-line pl-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ink-2">
                    Total XP
                  </span>
                  <p className="text-base font-extrabold text-ink">
                    {(myProfile?.totalPoints || 0).toLocaleString('pt-BR')} pts
                  </p>
                </div>
              </div>
            </div>

            {/* Métricas Operacionais Reais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-surface-2 border border-line">
                <div className="flex items-center gap-2 text-ink-2 text-xs mb-1">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ligações</span>
                </div>
                <p className="text-xl font-bold text-ink font-mono">{myProfile?.callsCount || 0}</p>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-line">
                <div className="flex items-center gap-2 text-ink-2 text-xs mb-1">
                  <CalendarCheck className="w-3.5 h-3.5 text-teal-500" />
                  <span>Reuniões</span>
                </div>
                <p className="text-xl font-bold text-ink font-mono">
                  {myProfile?.meetingsCount || 0}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-line">
                <div className="flex items-center gap-2 text-ink-2 text-xs mb-1">
                  <Target className="w-3.5 h-3.5 text-brand" />
                  <span>Fechamentos</span>
                </div>
                <p className="text-xl font-bold text-ink font-mono">
                  {myProfile?.dealsClosed || 0}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-2 border border-line">
                <div className="flex items-center gap-2 text-ink-2 text-xs mb-1">
                  <Zap className="w-3.5 h-3.5 text-warning" />
                  <span>Receita Ganha</span>
                </div>
                <p className="text-xl font-bold text-success font-mono">
                  {(myProfile?.wonRevenue || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            </div>

            {/* Badges / Conquistas */}
            <div className="mt-6 pt-5 border-t border-line">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-2 mb-3">
                Conquistas Desbloqueadas ({myProfile?.badges?.filter((b) => b.unlocked).length || 0}
                /{myProfile?.badges?.length || 6})
              </h3>
              <div className="flex flex-wrap gap-2">
                {myProfile?.badges?.map((badge) => (
                  <div
                    key={badge.id}
                    title={`${badge.title}: ${badge.description}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      badge.unlocked
                        ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                        : 'bg-surface-2 border-line text-ink-2/60 opacity-60'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{badge.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Gamification Widget com orbe 3D opcional */}
        <div className="lg:col-span-1">
          <GamificationWidget profile={myProfile} show3DCore={false} />
        </div>
      </div>

      {/* Leaderboard Table / Ranking Oficial */}
      <Card variant="bento" padding="lg">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-brand/10 text-brand rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink font-display">
                Ranking Oficial da Equipe Comercial
              </h3>
              <p className="text-xs text-ink-2">
                Pontuação ponderada por atividades, reuniões, oportunidades qualificadas e receita
                ganha.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="uppercase font-mono text-[10px]">
            {period === 'week' ? 'Semanal' : period === 'month' ? 'Mensal' : 'Geral'}
          </Badge>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-ink-2 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-brand" />
            <p className="text-sm">Carregando classificação do time...</p>
          </div>
        ) : !leaderboard?.rankings?.length ? (
          <EmptyState
            title="Nenhuma pontuação registrada no período"
            description="As atividades de ligações, reuniões e negócios fechados pontuarão automaticamente os consultores aqui."
            icon={Trophy}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold text-ink-2 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Pos.</th>
                  <th className="py-3 px-4">Consultor</th>
                  <th className="py-3 px-4">Nível</th>
                  <th className="py-3 px-4 text-center">Ligações</th>
                  <th className="py-3 px-4 text-center">Reuniões</th>
                  <th className="py-3 px-4 text-center">Fechamentos</th>
                  <th className="py-3 px-4 text-right">Taxa Conv.</th>
                  <th className="py-3 px-4 text-right">Ticket Médio</th>
                  <th className="py-3 px-4 text-right">Pontos XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leaderboard.rankings.map((seller, index) => {
                  const isCurrentUser =
                    seller.sellerName.toLowerCase() === (currentUser?.name || '').toLowerCase();

                  return (
                    <tr
                      key={seller.sellerName}
                      className={`transition-colors hover:bg-surface-2/60 ${
                        isCurrentUser ? 'bg-brand/5 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        {index === 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold text-xs">
                            🥇
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-300 font-bold text-xs">
                            🥈
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-700 font-bold text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-ink-2 text-xs font-mono">{index + 1}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-ink font-medium">{seller.sellerName}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-brand">
                              Você
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-ink-2">
                          Nv. {seller.level} · {seller.levelTitle}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-ink-2">
                        {seller.callsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-ink-2">
                        {seller.meetingsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-ink">
                        {seller.dealsClosed}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-ink-2">
                        {seller.performance?.conversionRatePercent !== undefined
                          ? `${seller.performance.conversionRatePercent}%`
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-ink-2">
                        {seller.performance?.avgTicket
                          ? seller.performance.avgTicket.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              maximumFractionDigits: 0,
                            })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-brand text-sm">
                        {seller.totalPoints.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Seção de Coaching Semanal IA */}
      <SellerCoachingCard />
    </div>
  );
}
export default GamificationView;
