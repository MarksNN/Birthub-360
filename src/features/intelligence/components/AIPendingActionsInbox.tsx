import {
  ArrowUpDown,
  Bot,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  Filter,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';
import { clientLogger } from '../../../lib/clientLogger.js';

export interface PendingActionPayload {
  to?: string;
  subject?: string;
  body?: string;
  leadId?: string;
  synthesis?: string;
  trigger?: string;
  triggerDetail?: string;
  role?: string;
  date?: string;
  observations?: string;
}

export interface PendingAction {
  id: string;
  entity: string;
  action: string;
  payload: PendingActionPayload;
  agentRole?: string | null;
  riskLevel?: string;
  confidence?: number | null;
  createdAt?: string;
  executedAt?: string | null;
}

interface ActionPresentation {
  title: string;
  approveLabel: string;
  approveTitle: string;
  icon: ReactNode;
  badgeClass: string;
}

function presentationFor(action: PendingAction): ActionPresentation {
  if (action.action === 'send_email') {
    return {
      title: 'Primeiro contato do SDR (E-mail)',
      approveLabel: 'Aprovar e enviar',
      approveTitle: 'Envia via SMTP ou abre cliente de e-mail local.',
      icon: <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />,
      badgeClass:
        'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    };
  }
  if (action.action === 'send_whatsapp_reply') {
    const isFirstContact = action.payload.trigger === 'first_contact';
    return {
      title: isFirstContact
        ? 'Primeiro contato do SDR (WhatsApp)'
        : 'Negociador de IA · réplica sugerida',
      approveLabel: 'Aprovar e enviar',
      approveTitle: 'Envia mensagem pelo canal oficial conectado.',
      icon: (
        <MessageCircle
          className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      ),
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    };
  }
  if (action.action === 'create_follow_up') {
    return {
      title: 'Atividade de follow-up recomendada',
      approveLabel: 'Criar atividade',
      approveTitle: 'Agenda a atividade no CRM para o responsável.',
      icon: (
        <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      ),
      badgeClass:
        'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
  }
  return {
    title: `${action.agentRole || action.payload.role || 'IA'} · recomendação estratégica`,
    approveLabel: 'Salvar no CRM',
    approveTitle: 'Registra a recomendação no dossiê auditável do lead.',
    icon: (
      <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
    ),
    badgeClass:
      'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  };
}

export function AIPendingActionsInbox() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [awaitingOutcome, setAwaitingOutcome] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [recordingOutcomeId, setRecordingOutcomeId] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState<string>('');

  // Filters
  const [activeTab, setActiveTab] = useState<'pending' | 'outcome'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'risk' | 'confidence'>('newest');

  const announce = (message: string) => {
    setAnnouncement(message);
    const timer = setTimeout(() => setAnnouncement(''), 4000);
    return () => clearTimeout(timer);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [pendingRes, outcomeRes] = await Promise.allSettled([
        api.get<PendingAction[]>('/api/intelligence/pending'),
        api.get<{ actions: PendingAction[] }>('/api/intelligence/pending/awaiting-outcome'),
      ]);

      if (pendingRes.status === 'fulfilled') {
        setActions(Array.isArray(pendingRes.value) ? pendingRes.value : []);
      }
      if (outcomeRes.status === 'fulfilled') {
        setAwaitingOutcome(outcomeRes.value.actions || []);
      }
    } catch (error: any) {
      clientLogger.error({ err: error }, 'Erro ao carregar ações pendentes da IA');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleApprove = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      const result = await api.post<{ execution: { sent: boolean; reason?: string } }>(
        `/api/intelligence/pending/${action.id}/approve`,
      );

      if (!result.execution.sent && action.action === 'send_email') {
        const to = encodeURIComponent(action.payload.to || '');
        const subject = encodeURIComponent(action.payload.subject || '');
        const body = encodeURIComponent(action.payload.body || '');
        window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
      }

      setActions((prev) => prev.filter((item) => item.id !== action.id));
      announce(`Ação para "${action.entity}" aprovada e executada com sucesso.`);
    } catch (error: any) {
      clientLogger.error({ err: error }, 'Erro ao aprovar ação da IA');
      announce(`Falha ao aprovar ação para "${action.entity}".`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDiscard = async (action: PendingAction) => {
    setProcessingId(action.id);
    try {
      await api.delete(`/api/intelligence/pending/${action.id}`);
      setActions((prev) => prev.filter((item) => item.id !== action.id));
      announce(`Ação para "${action.entity}" descartada.`);
    } catch (error: any) {
      clientLogger.error({ err: error }, 'Erro ao descartar ação da IA');
      announce(`Falha ao descartar ação para "${action.entity}".`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRecordOutcome = async (id: string, status: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL') => {
    setRecordingOutcomeId(id);
    try {
      await api.post(`/api/intelligence/pending/${id}/outcome`, {
        status,
        notes: outcomeNotes[id]?.trim() || undefined,
      });
      setAwaitingOutcome((prev) => prev.filter((item) => item.id !== id));
      announce('Resultado registrado no Flywheel com sucesso.');
    } catch (error: any) {
      clientLogger.error({ err: error }, 'Erro ao registrar outcome');
      announce('Falha ao registrar feedback do aprendizado.');
    } finally {
      setRecordingOutcomeId(null);
    }
  };

  // Filtered & Sorted Actions
  const filteredActions = useMemo(() => {
    return actions
      .filter((act) => {
        // Channel
        if (channelFilter !== 'all') {
          if (channelFilter === 'recommendation') {
            if (['send_email', 'send_whatsapp_reply', 'create_follow_up'].includes(act.action)) {
              return false;
            }
          } else if (act.action !== channelFilter) {
            return false;
          }
        }

        // Risk
        if (riskFilter !== 'all') {
          const level = act.riskLevel || 'medium';
          if (level !== riskFilter) return false;
        }

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesEntity = act.entity?.toLowerCase().includes(q);
          const matchesTo = act.payload.to?.toLowerCase().includes(q);
          const matchesSubject = act.payload.subject?.toLowerCase().includes(q);
          const matchesBody = act.payload.body?.toLowerCase().includes(q);
          const matchesSynthesis = act.payload.synthesis?.toLowerCase().includes(q);
          if (
            !matchesEntity &&
            !matchesTo &&
            !matchesSubject &&
            !matchesBody &&
            !matchesSynthesis
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk') {
          const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
          const rankA = rank[a.riskLevel || 'medium'] || 0;
          const rankB = rank[b.riskLevel || 'medium'] || 0;
          return rankB - rankA;
        }
        if (sortBy === 'confidence') {
          const confA = a.confidence ?? 0;
          const confB = b.confidence ?? 0;
          return confB - confA;
        }
        // Newest
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [actions, channelFilter, riskFilter, searchQuery, sortBy]);

  const highRiskCount = useMemo(
    () => actions.filter((a) => a.riskLevel === 'high').length,
    [actions],
  );

  return (
    <main
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
      aria-label="Inbox de Ações Pendentes de IA"
    >
      {/* Live Region for Screen Readers & Status Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="a11y-announcement"
      >
        {announcement}
      </div>

      {/* Header with Navigation and Metrics */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Bot className="w-5 h-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Inbox de Ações da IA</h1>
          </div>
          <p className="text-sm text-ink-2 mt-1">
            Supervisão humana em 1-clique com justificativa, risco e confiança antes da execução.
          </p>
        </div>

        {/* Action Counters / Tabs */}
        <nav className="flex items-center gap-2 flex-wrap" aria-label="Abas do Inbox">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 hover:bg-surface text-ink hover:text-ink'
            }`}
            aria-current={activeTab === 'pending' ? 'page' : undefined}
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Pendentes
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-line text-ink-2'
              }`}
            >
              {actions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outcome')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
              activeTab === 'outcome'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-2 hover:bg-surface text-ink hover:text-ink'
            }`}
            aria-current={activeTab === 'outcome' ? 'page' : undefined}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Aguardando Desfecho
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'outcome' ? 'bg-white/20 text-white' : 'bg-line text-ink-2'
              }`}
            >
              {awaitingOutcome.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-surface-2 hover:bg-line text-ink-2 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
            aria-label="Atualizar lista de ações"
            title="Atualizar"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </nav>
      </header>

      {/* Visual Toast Feedback if any */}
      {announcement && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-in fade-in duration-200"
        >
          <CheckCircle2
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>{announcement}</span>
        </div>
      )}

      {/* TAB 1: PENDING ACTIONS */}
      {activeTab === 'pending' && (
        <section aria-labelledby="pending-actions-heading" className="space-y-4">
          <h2 id="pending-actions-heading" className="sr-only">
            Ações aguardando aprovação
          </h2>

          {/* Controls Bar: Search, Filters, Order */}
          <div className="bg-surface rounded-card border border-line p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <label htmlFor="search-input" className="sr-only">
                Buscar por lead, canal ou destinatário
              </label>
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por lead, destinatário ou assunto..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-2 rounded-lg border border-line text-ink placeholder:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            {/* Filter selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-ink-2">
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-medium">Canal:</span>
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                aria-label="Filtrar por canal ou tipo de ação"
                className="text-xs bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                <option value="all">Todos os canais ({actions.length})</option>
                <option value="send_email">E-mail SDR</option>
                <option value="send_whatsapp_reply">WhatsApp</option>
                <option value="create_follow_up">Follow-up / CRM</option>
                <option value="recommendation">Recomendações</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-ink-2 ml-1">
                <span className="font-medium">Risco:</span>
              </div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                aria-label="Filtrar por nível de risco"
                className="text-xs bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                <option value="all">Qualquer risco</option>
                <option value="high">Risco Alto ({highRiskCount})</option>
                <option value="medium">Risco Médio</option>
                <option value="low">Risco Baixo</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-ink-2 ml-1">
                <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-medium">Ordenar:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Critério de ordenação"
                className="text-xs bg-surface-2 border border-line rounded-lg px-2.5 py-1.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
              >
                <option value="newest">Mais recentes</option>
                <option value="risk">Maior risco primeiro</option>
                <option value="confidence">Maior confiança</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div
              className="p-12 text-center text-ink-2 space-y-3"
              role="status"
              data-testid="loading-state"
            >
              <div className="animate-spin inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
              <p className="text-sm font-medium">Carregando ações pendentes...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredActions.length === 0 && (
            <div
              className="bg-surface rounded-card border border-line p-12 text-center flex flex-col items-center justify-center space-y-3"
              data-testid="empty-state"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                <Check className="w-8 h-8" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-ink">
                {actions.length === 0
                  ? 'Nenhuma ação pendente de aprovação'
                  : 'Nenhuma ação corresponde aos filtros selecionados'}
              </h3>
              <p className="text-sm text-ink-2 max-w-md">
                {actions.length === 0
                  ? 'O Enxame segue operando em segundo plano. Novas sugestões aparecerão aqui para sua revisão.'
                  : 'Tente alterar ou limpar os filtros de busca para visualizar as outras ações.'}
              </p>
              {actions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setChannelFilter('all');
                    setRiskFilter('all');
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-2 hover:bg-line text-ink transition-colors cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {/* Grid of Pending Action Cards */}
          {!loading && filteredActions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="actions-grid">
              {filteredActions.map((action) => {
                const presentation = presentationFor(action);
                const isEmail = action.action === 'send_email';
                const isWhatsApp = action.action === 'send_whatsapp_reply';
                const busy = processingId === action.id;
                const isHighRisk = action.riskLevel === 'high';

                return (
                  <article
                    key={action.id}
                    data-testid={`action-card-${action.id}`}
                    className="bh-platform-card bg-surface rounded-card border border-line flex flex-col overflow-hidden hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-brand"
                  >
                    {/* Card Header */}
                    <header className="bg-surface-elevated border-b border-line px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {presentation.icon}
                        <span className="font-semibold text-sm text-ink truncate">
                          {presentation.title}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                          isHighRisk
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isHighRisk ? (
                          <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                        )}
                        {action.riskLevel === 'high' ? 'Alto risco' : 'Auditado'}
                      </span>
                    </header>

                    {/* Card Body */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-sm">
                      <div className="space-y-2.5">
                        {/* Target Entity / Lead */}
                        <div className="flex items-center justify-between gap-2 text-xs text-ink-2">
                          <span className="font-medium truncate">{action.entity}</span>
                          {action.confidence != null && (
                            <span
                              className="font-semibold text-indigo-600 dark:text-indigo-400"
                              title={`Confiança estatística do modelo: ${Math.round(action.confidence * 100)}%`}
                            >
                              {Math.round(action.confidence * 100)}% confiança
                            </span>
                          )}
                        </div>

                        {/* Email Payload View */}
                        {isEmail && (
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-xs text-ink-2 font-medium">Destinatário: </span>
                              <span className="text-xs font-semibold text-ink">
                                {action.payload.to || 'Não especificado'}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-ink-2 font-medium">Assunto: </span>
                              <span className="text-xs font-semibold text-ink">
                                {action.payload.subject || 'Sem assunto'}
                              </span>
                            </div>
                            <div className="mt-2 bg-surface-2 p-2.5 rounded-lg border border-line max-h-32 overflow-y-auto text-xs text-ink whitespace-pre-wrap">
                              {action.payload.body}
                            </div>
                          </div>
                        )}

                        {/* WhatsApp Payload View */}
                        {isWhatsApp && (
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-xs text-ink-2 font-medium">Contato: </span>
                              <span className="text-xs font-semibold text-ink">
                                {action.payload.to || 'Número não especificado'}
                              </span>
                            </div>
                            {action.payload.triggerDetail && (
                              <p className="text-xs text-ink-2 italic">
                                Gatilho: {action.payload.triggerDetail}
                              </p>
                            )}
                            <div className="mt-2 bg-surface-2 p-2.5 rounded-lg border border-line max-h-32 overflow-y-auto text-xs text-ink whitespace-pre-wrap">
                              {action.payload.body}
                            </div>
                          </div>
                        )}

                        {/* Generic / Strategy Recommendation Payload */}
                        {!isEmail && !isWhatsApp && (
                          <div className="space-y-1.5">
                            {action.payload.triggerDetail && (
                              <div className="text-xs text-ink-2 bg-surface-2 p-2 rounded border border-line">
                                <span className="font-semibold text-ink">Gatilho:</span>{' '}
                                {action.payload.triggerDetail}
                              </div>
                            )}
                            <div className="bg-surface-2 p-2.5 rounded-lg border border-line max-h-32 overflow-y-auto text-xs text-ink whitespace-pre-wrap">
                              {action.payload.synthesis ||
                                action.payload.observations ||
                                'Ação recomendada pelo agente.'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: 1-Click Action Buttons */}
                      <footer className="pt-3 border-t border-line flex items-center gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => void handleApprove(action)}
                          disabled={busy}
                          aria-label={`Aprovar e executar ação para ${action.entity}`}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          {busy ? 'Processando...' : presentation.approveLabel}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDiscard(action)}
                          disabled={busy}
                          aria-label={`Descartar ação para ${action.entity}`}
                          className="py-2 px-2.5 rounded-lg text-xs font-medium bg-surface-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-ink-2 hover:text-rose-600 dark:hover:text-rose-400 border border-line transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
                          title="Descartar ação"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </footer>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: AWAITING OUTCOME (FLYWHEEL LEARNING LOOP) */}
      {activeTab === 'outcome' && (
        <section aria-labelledby="outcome-heading" className="space-y-4">
          <div className="bg-surface p-4 rounded-card border border-line space-y-1">
            <h2 id="outcome-heading" className="text-lg font-bold text-ink flex items-center gap-2">
              <Sparkles
                className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
              Ciclo de Aprendizagem · Feedback de Desfecho Real
            </h2>
            <p className="text-sm text-ink-2">
              Estas ações foram executadas recentemente. Registrar o desfecho real alimenta o
              Flywheel de Aprendizagem, treinando os modelos a replicar o que converte e evitar o
              que falha.
            </p>
          </div>

          {awaitingOutcome.length === 0 ? (
            <div
              className="bg-surface rounded-card border border-line p-12 text-center flex flex-col items-center justify-center space-y-3"
              data-testid="empty-outcome"
            >
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-ink">
                Todos os desfechos foram registrados
              </h3>
              <p className="text-sm text-ink-2 max-w-md">
                Nenhuma ação executada está pendente de feedback no momento. Excelente trabalho!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {awaitingOutcome.map((action) => {
                const presentation = presentationFor(action);
                const busy = recordingOutcomeId === action.id;

                return (
                  <article
                    key={action.id}
                    data-testid={`outcome-card-${action.id}`}
                    className="bh-platform-card bg-surface rounded-card border border-line p-4 space-y-3 flex flex-col justify-between"
                  >
                    <header className="flex items-center justify-between gap-2 border-b border-line pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {presentation.icon}
                        <span className="font-semibold text-xs text-ink truncate">
                          {presentation.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-2">
                        {action.executedAt
                          ? new Date(action.executedAt).toLocaleDateString('pt-BR')
                          : 'Executada'}
                      </span>
                    </header>

                    <div className="space-y-2 text-xs">
                      <p className="font-medium text-ink truncate">Entidade: {action.entity}</p>
                      <label htmlFor={`outcome-note-${action.id}`} className="sr-only">
                        Observações do que aconteceu
                      </label>
                      <textarea
                        id={`outcome-note-${action.id}`}
                        value={outcomeNotes[action.id] || ''}
                        onChange={(e) =>
                          setOutcomeNotes((prev) => ({ ...prev, [action.id]: e.target.value }))
                        }
                        placeholder="O que aconteceu após a ação? (Opcional)"
                        rows={2}
                        className="w-full text-xs p-2 rounded-lg bg-surface-2 border border-line text-ink placeholder:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
                      />
                    </div>

                    <footer className="pt-2 border-t border-line flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRecordOutcome(action.id, 'POSITIVE')}
                        aria-label={`Registrar desfecho positivo para ${action.entity}`}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                        Converteu
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRecordOutcome(action.id, 'NEGATIVE')}
                        aria-label={`Registrar desfecho negativo para ${action.entity}`}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                        Não converteu
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRecordOutcome(action.id, 'NEUTRAL')}
                        aria-label={`Registrar desfecho neutro para ${action.entity}`}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-surface-2 hover:bg-line text-ink-2 hover:text-ink transition-colors cursor-pointer"
                        title="Sem alteração perceptível"
                      >
                        Neutro
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default AIPendingActionsInbox;
