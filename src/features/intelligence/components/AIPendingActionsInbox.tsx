import {
  AlertCircle,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Filter,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import { api } from '../../../lib/api.js';
import { clientLogger } from '../../../lib/clientLogger.js';

export interface PendingActionPayload {
  to?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  message?: string;
  leadId?: string;
  dealId?: string;
  synthesis?: string;
  trigger?: string;
  triggerDetail?: string;
  role?: string;
  date?: string;
  observations?: string;
  owner?: string;
  commitmentType?: string;
  evidenceSnippet?: string;
  requiresApproval?: boolean;
  cadenceType?: string;
  channels?: string[];
  [key: string]: unknown;
}

export interface AIPendingActionItem {
  id: string;
  entity: string;
  action: string;
  payload: PendingActionPayload;
  agentRole?: string | null;
  riskLevel?: 'low' | 'medium' | 'high' | string;
  confidence?: number | null;
  createdAt?: string;
  executedAt?: string | null;
  executionError?: string | null;
}

export interface ActionPresentation {
  title: string;
  approveLabel: string;
  approveTitle: string;
  icon: ReactNode;
  category: 'email' | 'whatsapp' | 'task' | 'recommendation' | 'other';
}

export function presentationFor(action: AIPendingActionItem): ActionPresentation {
  const act = action.action || '';
  if (act === 'send_email') {
    return {
      title: 'E-mail Comercial (SDR / Closer)',
      approveLabel: 'Aprovar e Enviar',
      approveTitle: 'Envia o e-mail pelo provedor SMTP corporativo conectado.',
      icon: <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />,
      category: 'email',
    };
  }
  if (act === 'send_whatsapp_reply' || act === 'send_whatsapp') {
    const isFirstContact = action.payload?.trigger === 'first_contact';
    return {
      title: isFirstContact ? 'Primeiro Contato (WhatsApp)' : 'Negociador de IA · Réplica WhatsApp',
      approveLabel: 'Aprovar e Enviar',
      approveTitle: 'Envia a réplica imediatamente pelo WhatsApp oficial.',
      icon: <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
      category: 'whatsapp',
    };
  }
  if (act === 'create_follow_up') {
    return {
      title: 'Atividade de Follow-up / Tarefa',
      approveLabel: 'Criar Tarefa',
      approveTitle: 'Cria a atividade no CRM com data e responsável.',
      icon: <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
      category: 'task',
    };
  }
  if (act === 'notify_team') {
    return {
      title: 'Notificação Interna de Equipe',
      approveLabel: 'Notificar Equipe',
      approveTitle: 'Dispara a notificação de alerta para o time.',
      icon: <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />,
      category: 'other',
    };
  }
  if (act === 'start_cadence') {
    return {
      title: 'Cadência Multicanal Autônoma',
      approveLabel: 'Iniciar Cadência',
      approveTitle: 'Inicia a régua de abordagem multicanal.',
      icon: <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />,
      category: 'other',
    };
  }
  return {
    title: `${action.agentRole || action.payload?.role || 'Agente de IA'} · Recomendação`,
    approveLabel: 'Salvar no CRM',
    approveTitle: 'Salva a nota auditável no histórico do lead.',
    icon: <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />,
    category: 'recommendation',
  };
}

function normalizeRisk(level?: string): 'low' | 'medium' | 'high' {
  if (level === 'high') return 'high';
  if (level === 'low') return 'low';
  return 'medium';
}

function riskBadgeClasses(level: 'low' | 'medium' | 'high'): string {
  if (level === 'low') {
    return 'text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800';
  }
  if (level === 'high') {
    return 'text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800';
  }
  return 'text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800';
}

function riskLabel(level: 'low' | 'medium' | 'high'): string {
  if (level === 'low') return 'Baixo Risco';
  if (level === 'high') return 'Alto Risco';
  return 'Médio Risco';
}

export interface AIPendingActionsInboxProps {
  /** Callback opcional quando uma ação for processada com sucesso */
  onActionProcessed?: (actionId: string, decision: 'approved' | 'rejected') => void;
  className?: string;
}

export function AIPendingActionsInbox({ onActionProcessed, className = '' }: AIPendingActionsInboxProps) {
  const [actions, setActions] = useState<AIPendingActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtros
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'email' | 'whatsapp' | 'task' | 'recommendation'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const searchInputId = useId();

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let items: AIPendingActionItem[] = [];

      try {
        // 1. Tenta endpoint primário da célula comercial (HITL)
        const res = await api.get<{ success?: boolean; data?: AIPendingActionItem[] } | AIPendingActionItem[]>(
          '/api/agent/commercial-cell/pending-actions',
        );
        if (Array.isArray(res)) {
          items = res;
        } else if (res && Array.isArray((res as any).data)) {
          items = (res as any).data;
        }
      } catch {
        // 2. Fallback resiliente para o endpoint canônico de inteligência
        try {
          const fallbackRes = await api.get<AIPendingActionItem[]>('/api/intelligence/pending');
          items = Array.isArray(fallbackRes) ? fallbackRes : [];
        } catch (innerErr: any) {
          throw new Error(innerErr?.message || 'Falha ao buscar ações de IA no servidor.');
        }
      }

      setActions(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar lista de ações pendentes.');
      clientLogger.error({ err }, 'Error fetching pending AI actions in inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActions();
  }, [fetchActions]);

  // Limpa feedback temporário após alguns segundos
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleApprove = async (action: AIPendingActionItem) => {
    setProcessingId(action.id);
    try {
      let result: { execution?: { sent: boolean; reason?: string } } = {};
      try {
        result = await api.post(`/api/agent/commercial-cell/pending-actions/${action.id}/approve`);
      } catch {
        result = await api.post(`/api/intelligence/pending/${action.id}/approve`);
      }

      // Se falhou envio de e-mail e estiver no navegador, abre cliente local com prefill seguro
      if (result?.execution && !result.execution.sent && action.action === 'send_email') {
        const to = encodeURIComponent(action.payload?.to || action.payload?.recipient || '');
        const subject = encodeURIComponent(action.payload?.subject || '');
        const body = encodeURIComponent(action.payload?.body || action.payload?.message || '');
        if (typeof window !== 'undefined') {
          window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
        }
      }

      setActions((prev) => prev.filter((item) => item.id !== action.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });

      const presentation = presentationFor(action);
      setFeedback(`Ação "${presentation.title}" aprovada e executada.`);
      onActionProcessed?.(action.id, 'approved');
    } catch (err: any) {
      clientLogger.error({ err, actionId: action.id }, 'Error approving AI action');
      setFeedback(`Falha ao aprovar ação: ${err?.message || 'Erro de execução'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (action: AIPendingActionItem) => {
    setProcessingId(action.id);
    try {
      try {
        await api.post(`/api/agent/commercial-cell/pending-actions/${action.id}/reject`);
      } catch {
        await api.delete(`/api/intelligence/pending/${action.id}`);
      }

      setActions((prev) => prev.filter((item) => item.id !== action.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });

      const presentation = presentationFor(action);
      setFeedback(`Ação "${presentation.title}" rejeitada e descartada.`);
      onActionProcessed?.(action.id, 'rejected');
    } catch (err: any) {
      clientLogger.error({ err, actionId: action.id }, 'Error rejecting AI action');
      setFeedback(`Falha ao rejeitar ação: ${err?.message || 'Erro ao descartar'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBatchProcessing(true);
    let successCount = 0;

    for (const id of ids) {
      const action = actions.find((a) => a.id === id);
      if (!action) continue;
      try {
        try {
          await api.post(`/api/agent/commercial-cell/pending-actions/${id}/approve`);
        } catch {
          await api.post(`/api/intelligence/pending/${id}/approve`);
        }
        successCount++;
        onActionProcessed?.(id, 'approved');
      } catch (err) {
        clientLogger.error({ err, id }, 'Failed to approve batch item');
      }
    }

    setActions((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setBatchProcessing(false);
    setFeedback(`${successCount} ação(ões) aprovada(s) em lote.`);
  };

  const handleBatchReject = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBatchProcessing(true);
    let successCount = 0;

    for (const id of ids) {
      const action = actions.find((a) => a.id === id);
      if (!action) continue;
      try {
        try {
          await api.post(`/api/agent/commercial-cell/pending-actions/${id}/reject`);
        } catch {
          await api.delete(`/api/intelligence/pending/${id}`);
        }
        successCount++;
        onActionProcessed?.(id, 'rejected');
      } catch (err) {
        clientLogger.error({ err, id }, 'Failed to reject batch item');
      }
    }

    setActions((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setBatchProcessing(false);
    setFeedback(`${successCount} ação(ões) rejeitada(s) em lote.`);
  };

  const toggleSelectAction = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtragem dos itens
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const risk = normalizeRisk(action.riskLevel);
      if (riskFilter !== 'all' && risk !== riskFilter) {
        return false;
      }

      const presentation = presentationFor(action);
      if (typeFilter !== 'all' && presentation.category !== typeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const payloadText = JSON.stringify(action.payload || {}).toLowerCase();
        const agentText = (action.agentRole || '').toLowerCase();
        const titleText = presentation.title.toLowerCase();
        return (
          payloadText.includes(query) ||
          agentText.includes(query) ||
          titleText.includes(query) ||
          action.action.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [actions, riskFilter, typeFilter, searchQuery]);

  const toggleSelectAllFiltered = () => {
    if (selectedIds.size === filteredActions.length && filteredActions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActions.map((a) => a.id)));
    }
  };

  // Métricas de contagem
  const riskCounts = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 };
    for (const action of actions) {
      const risk = normalizeRisk(action.riskLevel);
      counts[risk]++;
    }
    return counts;
  }, [actions]);

  return (
    <section
      aria-labelledby="hitl-inbox-heading"
      className={`relative w-full rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm ${className}`}
    >
      {/* Live Region para leitores de tela */}
      <div role="status" aria-live="polite" className="sr-only">
        {feedback || (loading ? 'Carregando ações pendentes de IA...' : `${filteredActions.length} ações pendentes disponíveis.`)}
      </div>

      {/* Cabeçalho da Inbox HITL */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20">
              <Inbox className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="hitl-inbox-heading"
                className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink"
              >
                Inbox de Aprovação Humana (HITL)
              </h2>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Supervisão de ações táticas propostas pelos agentes de IA antes da execução no CRM.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchActions}
            disabled={loading || batchProcessing}
            aria-label="Atualizar lista de ações pendentes"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Atualizar</span>
          </Button>
        </div>
      </header>

      {/* Notificação de Feedback Inline */}
      {feedback && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-xs sm:text-sm text-ink font-medium animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-ok shrink-0" aria-hidden="true" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Fechar notificação de status"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Alerta de Erro */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-critical/30 bg-critical/10 p-4 text-ink"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-critical shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-critical">Erro na comunicação com a Célula de IA</p>
              <p className="text-xs text-ink-2 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={fetchActions}
            className="self-end sm:self-auto text-xs"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Cartões de Resumo / Filtros Rápidos de Risco */}
      <section className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Resumo por nível de risco">
        <button
          type="button"
          onClick={() => setRiskFilter('all')}
          aria-pressed={riskFilter === 'all'}
          className={`flex flex-col rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            riskFilter === 'all'
              ? 'border-brand bg-brand/5 shadow-sm'
              : 'border-line bg-surface-2 hover:border-line-strong'
          }`}
        >
          <span className="text-xs font-medium text-ink-2">Total Pendente</span>
          <span className="font-display text-xl font-bold text-ink mt-0.5">{actions.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('low')}
          aria-pressed={riskFilter === 'low'}
          className={`flex flex-col rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            riskFilter === 'low'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
              : 'border-line bg-surface-2 hover:border-line-strong'
          }`}
        >
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Baixo Risco
          </span>
          <span className="font-display text-xl font-bold text-ink mt-0.5">{riskCounts.low}</span>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('medium')}
          aria-pressed={riskFilter === 'medium'}
          className={`flex flex-col rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            riskFilter === 'medium'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm'
              : 'border-line bg-surface-2 hover:border-line-strong'
          }`}
        >
          <span className="text-xs font-medium text-amber-900 dark:text-amber-300 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            Médio Risco
          </span>
          <span className="font-display text-xl font-bold text-ink mt-0.5">{riskCounts.medium}</span>
        </button>

        <button
          type="button"
          onClick={() => setRiskFilter('high')}
          aria-pressed={riskFilter === 'high'}
          className={`flex flex-col rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            riskFilter === 'high'
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm'
              : 'border-line bg-surface-2 hover:border-line-strong'
          }`}
        >
          <span className="text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
            Alto Risco
          </span>
          <span className="font-display text-xl font-bold text-ink mt-0.5">{riskCounts.high}</span>
        </button>
      </section>

      {/* Barra de Filtros e Busca */}
      <div className="mb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca Acessível */}
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Buscar por lead, agente ou conteúdo da ação
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" aria-hidden="true" />
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por lead, agente, assunto ou canal..."
            className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-9 pr-8 text-xs sm:text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
              aria-label="Limpar termo de busca"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filtros de Tipo */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0" role="toolbar" aria-label="Filtrar por canal ou tipo de ação">
          <span className="text-xs font-semibold text-ink-2 shrink-0 flex items-center gap-1">
            <Filter className="h-3 w-3" aria-hidden="true" /> Tipo:
          </span>
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'email', label: 'E-mail' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'task', label: 'Tarefas' },
              { id: 'recommendation', label: 'Insights' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              aria-pressed={typeFilter === t.id}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                typeFilter === t.id
                  ? 'bg-brand text-on-brand font-bold'
                  : 'bg-surface-2 text-ink-2 hover:bg-surface-interactive hover:text-ink border border-line'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Ações em Lote */}
      {filteredActions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2.5 text-xs text-ink">
          <div className="flex items-center gap-2">
            <input
              id="select-all-actions-checkbox"
              type="checkbox"
              checked={selectedIds.size === filteredActions.length && filteredActions.length > 0}
              onChange={toggleSelectAllFiltered}
              className="h-4 w-4 rounded border-line text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
            />
            <label htmlFor="select-all-actions-checkbox" className="font-medium cursor-pointer">
              Selecionar todos ({selectedIds.size} de {filteredActions.length} selecionados)
            </label>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleBatchApprove}
                disabled={batchProcessing}
                className="h-7 text-xs px-2.5"
                aria-label={`Aprovar ${selectedIds.size} ações selecionadas`}
              >
                {batchProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                )}
                Aprovar Selecionados ({selectedIds.size})
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBatchReject}
                disabled={batchProcessing}
                className="h-7 text-xs px-2.5 text-critical border-critical/30 hover:bg-critical/10"
                aria-label={`Rejeitar ${selectedIds.size} ações selecionadas`}
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                Rejeitar ({selectedIds.size})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo Principal — Lista de Ações ou Estados Vazios / Carregando */}
      <div className="space-y-4">
        {loading ? (
          // Estado de Loading Acessível com Skeletons
          <div className="space-y-3 py-6" role="status" aria-label="Carregando ações pendentes">
            <div className="flex items-center justify-center gap-2 text-sm text-ink-2 pb-4">
              <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" />
              <span>Buscando ações suspensas para aprovação humana...</span>
            </div>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-line bg-surface-2/40 p-4 animate-pulse space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-40 rounded bg-line" />
                  <div className="h-5 w-20 rounded-full bg-line" />
                </div>
                <div className="h-3 w-3/4 rounded bg-line/60" />
                <div className="h-14 rounded-lg bg-line/30" />
                <div className="flex justify-end gap-2 pt-2">
                  <div className="h-8 w-24 rounded-lg bg-line/60" />
                  <div className="h-8 w-32 rounded-lg bg-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActions.length === 0 ? (
          // Estado Vazio Acessível
          <div
            role="status"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/30 px-6 py-12 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ok/10 text-ok border border-ok/20 mb-3">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-ink">
              Nenhuma ação pendente de aprovação humana
            </h3>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-ink-2 leading-relaxed">
              {searchQuery || riskFilter !== 'all' || typeFilter !== 'all'
                ? 'Nenhuma ação corresponde aos filtros selecionados. Tente ajustar a busca ou os filtros de risco.'
                : 'O enxame de IA está operando normalmente. Todas as ações táticas com requisição de supervisão foram revisadas.'}
            </p>
            {(searchQuery || riskFilter !== 'all' || typeFilter !== 'all') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setRiskFilter('all');
                  setTypeFilter('all');
                }}
                className="mt-4 text-xs"
              >
                Limpar todos os filtros
              </Button>
            )}
          </div>
        ) : (
          // Lista de Cards de Ações com role="feed" contendo apenas artigos
          <div
            className="space-y-4"
            role="feed"
            aria-busy={loading}
            aria-label="Lista de ações de IA pendentes"
          >
            {filteredActions.map((action) => {
            const presentation = presentationFor(action);
            const risk = normalizeRisk(action.riskLevel);
            const isProcessing = processingId === action.id;
            const isSelected = selectedIds.has(action.id);
            const confidencePercent = action.confidence != null ? Math.round(action.confidence * 100) : null;
            const targetRecipient =
              action.payload?.to ||
              action.payload?.recipient ||
              action.payload?.leadId ||
              'Lead do CRM';

            return (
              <article
                key={action.id}
                aria-labelledby={`action-title-${action.id}`}
                className={`relative rounded-xl border transition-all ${
                  isSelected
                    ? 'border-brand/50 bg-brand/[0.02] shadow-sm'
                    : 'border-line bg-surface hover:border-line-strong shadow-xs'
                } p-4 sm:p-5`}
              >
                {/* Linha superior: Seleção, Tipo de Ação, Badges e Risco */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
                  <div className="flex items-center gap-3">
                    <input
                      id={`checkbox-action-${action.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectAction(action.id)}
                      className="h-4 w-4 rounded border-line text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
                      aria-label={`Selecionar ação ${presentation.title} para ${targetRecipient}`}
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 border border-line">
                        {presentation.icon}
                      </div>
                      <div>
                        <h3
                          id={`action-title-${action.id}`}
                          className="font-display text-sm sm:text-base font-bold text-ink leading-tight"
                        >
                          {presentation.title}
                        </h3>
                        <span className="text-[11px] text-ink-3">
                          Origem: {action.agentRole || action.payload?.role || 'Agente Tático'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {/* Confiança */}
                    {confidencePercent !== null && (
                      <span
                        className="inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2"
                        title="Nível de confiança estatística da IA nesta sugestão"
                      >
                        {confidencePercent}% conf.
                      </span>
                    )}

                    {/* Badge de Risco WCAG 2.2 AA */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${riskBadgeClasses(
                        risk,
                      )}`}
                    >
                      {risk === 'high' ? (
                        <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                      <span>{riskLabel(risk)}</span>
                    </span>
                  </div>
                </div>

                {/* Corpo do Card: Detalhes, Contexto e Conteúdo */}
                <div className="py-3.5 space-y-3">
                  {/* Destinatário ou Entidade Alvo */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
                    {action.payload?.leadId && (
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                        <strong className="font-semibold text-ink">Lead ID:</strong>{' '}
                        <code className="font-mono text-[11px] bg-surface-2 px-1.5 py-0.5 rounded border border-line">
                          {action.payload.leadId}
                        </code>
                      </span>
                    )}
                    {(action.payload?.to || action.payload?.recipient) && (
                      <span>
                        <strong className="font-semibold text-ink">Destinatário:</strong>{' '}
                        {action.payload.to || action.payload.recipient}
                      </span>
                    )}
                    {action.payload?.date && (
                      <span>
                        <strong className="font-semibold text-ink">Data Sugerida:</strong>{' '}
                        {action.payload.date}
                      </span>
                    )}
                  </div>

                  {/* Evidência / Gatilho / Promessa Comercial Detectada */}
                  {(action.payload?.evidenceSnippet || action.payload?.triggerDetail || action.payload?.trigger) && (
                    <div className="rounded-lg border border-brand/20 bg-brand/[0.04] p-3 text-xs">
                      <div className="font-semibold text-ink flex items-center gap-1.5 mb-1 text-[11px]">
                        <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                        <span>Gatilho Detectado pela IA:</span>
                      </div>
                      <p className="text-ink-2 italic leading-relaxed">
                        {action.payload.evidenceSnippet ||
                          action.payload.triggerDetail ||
                          `Disparado pelo gatilho: ${action.payload.trigger}`}
                      </p>
                    </div>
                  )}

                  {/* Prévia da Mensagem ou Conteúdo da Ação */}
                  {(action.payload?.body ||
                    action.payload?.message ||
                    action.payload?.synthesis ||
                    action.payload?.observations) && (
                    <div className="rounded-lg border border-line bg-surface-2/60 p-3 text-xs space-y-1">
                      {action.payload?.subject && (
                        <p className="font-semibold text-ink mb-1">
                          Assunto:{' '}
                          <span className="font-normal text-ink-2">{action.payload.subject}</span>
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-ink leading-relaxed font-sans line-clamp-4">
                        {action.payload?.body ||
                          action.payload?.message ||
                          action.payload?.synthesis ||
                          action.payload?.observations}
                      </p>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card: Ações em 1 Clique (Aprovar / Rejeitar) */}
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
                  <span className="text-[11px] text-ink-3">
                    {action.createdAt
                      ? `Proposta em: ${new Date(action.createdAt).toLocaleString('pt-BR')}`
                      : 'Ação em fila de aprovação'}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Botão de Rejeição em 1 clique */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(action)}
                      disabled={isProcessing || batchProcessing}
                      className="text-xs text-critical border-critical/30 hover:bg-critical/10 hover:border-critical/50 focus-visible:ring-critical"
                      aria-label={`Rejeitar e descartar ${presentation.title} para ${targetRecipient}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                      )}
                      Rejeitar
                    </Button>

                    {/* Botão de Aprovação em 1 clique */}
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(action)}
                      disabled={isProcessing || batchProcessing}
                      title={presentation.approveTitle}
                      className="text-xs font-semibold shadow-xs"
                      aria-label={`${presentation.approveLabel} para ${targetRecipient}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                      )}
                      {presentation.approveLabel}
                    </Button>
                  </div>
                </footer>
              </article>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}
