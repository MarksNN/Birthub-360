import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Flame,
  Layers,
  PhoneCall,
  Radar,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GamificationWidget } from '../../../components/ui/GamificationWidget.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { useAuth } from '../../../contexts/AuthContext.js';
import { useBitrixIntegration } from '../../../hooks/useBitrixIntegration.js';
import { useAnalyticsDashboard } from '../../../hooks/useDatabase.js';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus.js';
import {
  metricReveal,
  metricsContainer,
  staggerContainer,
  staggerItem,
} from '../../../lib/motion.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function SinglePageDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: stats, loading, error, refetch } = useAnalyticsDashboard(6);
  const isOnline = useOnlineStatus();
  const { bitrixConnections } = useBitrixIntegration();
  const hasBitrixActive = bitrixConnections.length > 0;

  const overview = stats?.overview;
  const pipelineValue = overview?.pipelineValue ?? 0;
  const totalLeads = overview?.totalLeads ?? 0;
  const winRate =
    overview?.conversionRate != null ? Number(overview.conversionRate).toFixed(1) : '0.0';
  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || 'Gestor';
  const pendingActivities = overview?.pendingActivities ?? 0;
  const closedThisMonth = overview?.closedThisMonth ?? 0;
  const totalCompanies = overview?.totalCompanies ?? 0;

  const funnel = stats?.funnel ?? [];
  const maxFunnelCount = Math.max(...funnel.map((f) => f.count), 1);
  const byTemp = stats?.byTemperature ?? [];

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto bg-bg p-6 lg:p-8">
        <div className="max-w-[48rem] mx-auto mt-12 text-center p-8 bg-surface rounded-2xl border border-line shadow-card space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-ink font-display">
            Falha ao carregar indicadores comerciais
          </h2>
          <p className="text-sm text-ink-2 max-w-md mx-auto">
            {error || 'Não foi possível sincronizar as métricas de pipeline com o servidor.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-on-brand text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-bg p-6 lg:p-8">
        <div className="max-w-[96rem] mx-auto space-y-6 animate-pulse">
          <Skeleton className="h-6 w-36 rounded-full bg-surface-subtle" />
          <Skeleton className="h-10 w-80 rounded-xl bg-surface-subtle" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl bg-surface-subtle" />
            <Skeleton className="h-28 rounded-xl bg-surface-subtle" />
            <Skeleton className="h-28 rounded-xl bg-surface-subtle" />
            <Skeleton className="h-28 rounded-xl bg-surface-subtle" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 rounded-xl bg-surface-subtle lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl bg-surface-subtle" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg text-ink relative">
      <div className="w-full max-w-[98rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ── COMMAND CENTER HEADER ────────────────────────────────────────── */}
        <motion.header
          className="relative overflow-hidden rounded-2xl border border-brand/25 bg-surface/80 p-6 shadow-card backdrop-blur-sm transition-all duration-300 dark:border-brand/30 dark:bg-surface/60 flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          variants={staggerContainer(0.08, 0)}
          initial="hidden"
          animate="show"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
          <motion.div className="space-y-2" variants={staggerItem}>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
                <Radar className="w-3.5 h-3.5 animate-spin-slow" />
                Command Center 360°
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                SISTEMA OPERACIONAL
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-ink dark:text-brand">
              {greeting()}, {firstName}.
            </h1>
            <p className="text-sm text-ink-2 max-w-2xl font-sans">
              Visão consolidada de inteligência comercial, prospecção e pipeline em tempo real.
            </p>
          </motion.div>

          <motion.div className="flex flex-wrap items-center gap-3" variants={staggerItem}>
            <motion.button
              type="button"
              onClick={() => navigate('/app/prospect')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line bg-surface hover:bg-surface-2 text-sm font-semibold transition-all cursor-pointer shadow-sm"
            >
              <Search className="w-4 h-4 text-brand" />
              <span>Buscar Mercado</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => navigate('/app/crm')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand hover:bg-brand/90 text-on-brand text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Abrir Cockpit CRM</span>
            </motion.button>
          </motion.div>
        </motion.header>

        {/* ── KPI EXECUTIVE CARDS ─────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={metricsContainer}
          initial="hidden"
          animate="show"
        >
          {/* Card 1: Pipeline Total */}
          <motion.div
            variants={metricReveal}
            className="group relative bg-surface p-5 rounded-xl border border-line shadow-card hover:shadow-card-hover transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2 font-sans">
                <Target className="w-4 h-4 text-brand" /> Volume em Pipeline
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                Ativo
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink font-display tracking-tight">
              {pipelineValue > 0
                ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    maximumFractionDigits: 0,
                  }).format(pipelineValue)
                : 'R$ 0'}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/40 text-xs text-ink-2">
              <span>{totalLeads} oportunidades ativas</span>
              <button
                type="button"
                className="text-brand font-semibold cursor-pointer hover:underline"
                onClick={() => navigate('/app/crm')}
              >
                Ver kanban &rarr;
              </button>
            </div>
          </motion.div>

          {/* Card 2: Win Rate */}
          <motion.div
            variants={metricReveal}
            className="group relative bg-surface p-5 rounded-xl border border-line shadow-card hover:shadow-card-hover transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2 font-sans">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Taxa de Conversão
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Win Rate
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink font-display tracking-tight">
              {winRate}%
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/40 text-xs text-ink-2">
              <span>{closedThisMonth} fechados no período</span>
              <button
                type="button"
                className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
                onClick={() => navigate('/app/analytics')}
              >
                Métricas &rarr;
              </button>
            </div>
          </motion.div>

          {/* Card 3: Atividades Operacionais */}
          <motion.div
            variants={metricReveal}
            className="group relative bg-surface p-5 rounded-xl border border-line shadow-card hover:shadow-card-hover transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-iris/5 rounded-full blur-2xl group-hover:bg-iris/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2 font-sans">
                <Activity className="w-4 h-4 text-iris" /> Atividades Pendentes
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-iris/10 text-iris">
                Prioridade
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink font-display tracking-tight">
              {pendingActivities}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/40 text-xs text-ink-2">
              <span>Ações na cadência</span>
              <button
                type="button"
                className="text-iris font-semibold cursor-pointer hover:underline"
                onClick={() => navigate('/app/calendar')}
              >
                Agenda &rarr;
              </button>
            </div>
          </motion.div>

          {/* Card 4: Base Corporativa */}
          <motion.div
            variants={metricReveal}
            className="group relative bg-surface p-5 rounded-xl border border-line shadow-card hover:shadow-card-hover transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-2 font-sans">
                <Users className="w-4 h-4 text-amber-500" /> Contas e Empresas
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Ecossistema
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink font-display tracking-tight">
              {totalCompanies}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/40 text-xs text-ink-2">
              <span>Organizações no radar</span>
              <button
                type="button"
                className="text-amber-600 dark:text-amber-400 font-semibold cursor-pointer hover:underline"
                onClick={() => navigate('/app/companies')}
              >
                Ver empresas &rarr;
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* ── CORE OPERATIONAL DISTRIBUTION & LIVE PIPELINE ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PIPELINE FUNNEL (2 COLUMNS) */}
          <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-line shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2 font-display">
                  <BarChart3 className="w-4 h-4 text-brand" />
                  Jornada & Conversão do Funil
                </h2>
                <p className="text-xs text-ink-2 font-sans mt-0.5">
                  Distribuição de oportunidades através das fases de qualificação e fechamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/analytics')}
                className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                Relatório completo &rarr;
              </button>
            </div>

            {funnel.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-surface-2 mx-auto flex items-center justify-center text-ink-2">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-ink">Nenhum dado de funil registrado</h4>
                <p className="text-xs text-ink-2 max-w-sm mx-auto">
                  Inicie o fluxo cadastrando ou importando novos leads através do módulo de
                  prospecção.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/prospect')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-on-brand text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Prospectar Novos Leads
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {funnel.map((stage) => {
                  const percentage = Math.round((stage.count / maxFunnelCount) * 100);
                  return (
                    <div key={stage.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{stage.label}</span>
                          {stage.conversionFromPrevious !== null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 font-mono">
                              {stage.conversionFromPrevious}% conv.
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {stage.amount && stage.amount > 0 ? (
                            <span className="font-mono text-ink-2 text-[11px]">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0,
                              }).format(stage.amount)}
                            </span>
                          ) : null}
                          <span className="font-bold text-ink min-w-8 text-right font-mono">
                            {stage.count} {stage.count === 1 ? 'lead' : 'leads'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden flex">
                        <motion.div
                          className="h-full bg-gradient-to-r from-brand/80 to-brand rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(percentage, 4)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TEMPERATURE & OPERATIONAL PULSE (1 COLUMN) */}
          <div className="bg-surface p-6 rounded-xl border border-line shadow-card space-y-5 flex flex-col justify-between">
            <div>
              <div className="border-b border-line pb-4">
                <h2 className="text-base font-bold text-ink flex items-center gap-2 font-display">
                  <Flame className="w-4 h-4 text-rose-500" />
                  Temperatura dos Leads
                </h2>
                <p className="text-xs text-ink-2 font-sans mt-0.5">
                  Engajamento da base por prioridade de contato.
                </p>
              </div>

              <div className="py-4 space-y-3">
                {byTemp.length === 0 ? (
                  <div className="text-center py-8 text-xs text-ink-2">
                    Sem distribuição de temperatura no momento.
                  </div>
                ) : (
                  byTemp.map((t) => {
                    const isHot = t.label.toLowerCase().includes('quente');
                    const isWarm = t.label.toLowerCase().includes('morno');
                    const colorBadge = isHot
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : isWarm
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';

                    return (
                      <div
                        key={t.label}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-line/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${colorBadge}`}
                          >
                            {t.label}
                          </span>
                        </div>
                        <span className="font-bold text-sm text-ink font-mono">{t.count}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick System Indicators */}
            <div className="pt-4 border-t border-line/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  Status dos Conectores
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app/integrations')}
                  className="text-[10px] font-semibold text-brand hover:underline cursor-pointer"
                >
                  Gerenciar &rarr;
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div
                  className={`flex items-center gap-1.5 ${
                    isOnline
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isOnline ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="text-ink font-medium">
                    {isOnline ? 'Rede Conectada' : 'Modo Offline'}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasBitrixActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-2'
                  }`}
                >
                  {hasBitrixActive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-line flex items-center justify-center text-[8px]">
                      •
                    </span>
                  )}
                  <span className="text-ink font-medium">
                    {hasBitrixActive ? 'Bitrix24 Ativo' : 'Bitrix24 Pendente'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-ink font-medium">PostgreSQL RLS</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-ink font-medium">Copiloto IA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STRATEGIC QUICK LAUNCH BENTO (4 TILES) ────────────────────── */}
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-2 font-sans flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              Cockpits Operacionais & Ações Diretas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Prospecção */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate('/app/prospect')}
              className="group p-5 bg-surface rounded-xl border border-line shadow-card hover:shadow-card-hover hover:border-brand/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-brand transition-colors font-display">
                  Prospecção ICP & Mercado
                </h3>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
                  Varredura de decisores corporativos, enriquecimento de dados e qualificação B2B.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between text-xs font-semibold text-brand">
                <span>Acessar busca</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Tile 2: CRM 360 */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate('/app/crm')}
              className="group p-5 bg-surface rounded-xl border border-line shadow-card hover:shadow-card-hover hover:border-brand/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-emerald-500 transition-colors font-display">
                  Gestão Comercial 360°
                </h3>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
                  Kanban ágil de oportunidades, controle de propostas e avanço de estágios de
                  negociação.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Abrir pipeline</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Tile 3: Cadência */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate('/app/cadence')}
              className="group p-5 bg-surface rounded-xl border border-line shadow-card hover:shadow-card-hover hover:border-brand/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-iris/10 text-iris flex items-center justify-center group-hover:scale-105 transition-transform">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-iris transition-colors font-display">
                  Cadência & Multicanal
                </h3>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
                  Regras automatizadas de follow-up, disparos via WhatsApp, e-mail e ligações
                  inteligentes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between text-xs font-semibold text-iris">
                <span>Ver réguas</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Tile 4: Copiloto IA */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate('/app/intelligence')}
              className="group p-5 bg-surface rounded-xl border border-line shadow-card hover:shadow-card-hover hover:border-brand/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-ink group-hover:text-amber-500 transition-colors font-display">
                  Inteligência & Copiloto IA
                </h3>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
                  Diagnósticos preditivos de fechamento, análise de objeções e relatórios
                  executivos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span>Iniciar Copiloto</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── AI ORCHESTRATION & GAMIFICATION FEED ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 pb-6">
          {/* AI Orchestration Stream */}
          <div className="bg-surface p-6 rounded-xl border border-line shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-iris/10 text-iris rounded-lg">
                  <BrainCircuit className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink font-display">
                    Motor de Inteligência Autônoma
                  </h3>
                  <p className="text-xs text-ink-2 font-sans">
                    Monitorando oportunidades e pontos de inflexão.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-iris/10 text-iris uppercase">
                Active Pulse
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-line/40 text-xs">
                <span className="mt-0.5 text-iris font-bold uppercase tracking-wider text-[10px] w-16 shrink-0">
                  Pipeline
                </span>
                <span className="text-ink leading-relaxed">
                  {totalLeads > 0
                    ? `Análise contínua ativa sobre as ${totalLeads} oportunidades registradas no ecossistema.`
                    : 'Aguardando novas oportunidades para calibração de score e priorização preditiva.'}
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-line/40 text-xs">
                <span className="mt-0.5 text-brand font-bold uppercase tracking-wider text-[10px] w-16 shrink-0">
                  Ação
                </span>
                <span className="text-ink leading-relaxed">
                  {pendingActivities > 0
                    ? `Existem ${pendingActivities} tarefas ou atividades aguardando interação no cockpit.`
                    : 'Nenhuma pendência crítica imediata. Pipeline operando em alta velocidade.'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/app/intelligence')}
                className="inline-flex items-center gap-2 text-xs font-bold text-iris hover:text-ink transition-colors cursor-pointer group font-sans"
              >
                <span>Acessar Central de Inteligência</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Performance & Gamification */}
          <div className="bg-surface p-6 rounded-xl border border-line shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-brand/10 text-brand rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink font-display">
                    Performance da Equipe Comercial
                  </h3>
                  <p className="text-xs text-ink-2 font-sans">
                    Nível de engajamento operacional e consistência.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand/10 text-brand uppercase">
                Gamification
              </span>
            </div>

            <GamificationWidget
              initialXp={totalLeads * 50 + closedThisMonth * 200}
              level={Math.max(1, Math.floor((totalLeads * 50 + closedThisMonth * 200) / 1000) + 1)}
              streakDays={closedThisMonth > 0 ? 1 : 0}
              show3DCore={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
