import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, type BadgeProps } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import type {
  CommercialAgentCatalogEntry,
  CommercialAgentResultV3,
  CommercialSkillDefinition,
  CommercialV3AgentId,
} from '../../intelligence/commercial-v3/contracts/commercialAgentV3.types.js';
import {
  type CommercialAgentDefinition,
  type CommercialAgentStatus,
  commercialAgentCellApi,
} from '../commercialAgentCell.api.js';
import {
  type CommercialV3AgentDetailResponse,
  commercialV3Api,
} from '../commercialV3.api.js';

const STATUS_CONFIG: Record<
  CommercialAgentStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  REAL_EM_PRODUCAO: { label: 'Em produção', variant: 'success' },
  NOVO_SOBRE_SERVICO_REAL: { label: 'Novo · dado real', variant: 'info' },
  NOVO_FONTE_PARCIAL: { label: 'Fonte parcial', variant: 'warning' },
  MAPEADO_NAO_IMPLEMENTADO: { label: 'Não implementado', variant: 'outline' },
};

function AgentStatusBadge({ status }: { status: CommercialAgentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function CommercialAgentCellPanel() {
  const [activeTab, setActiveTab] = useState<'v3' | 'legacy'>('v3');

  // Estados Célula Legada (12)
  const [legacyAgents, setLegacyAgents] = useState<CommercialAgentDefinition[] | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);

  // Estados Suíte V3.1 (19 agentes, 463 habilidades)
  const [v3Agents, setV3Agents] = useState<CommercialAgentCatalogEntry[] | null>(null);
  const [v3Loading, setV3Loading] = useState(false);
  const [v3Error, setV3Error] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Seleção de Agente V3.1
  const [selectedAgentId, setSelectedAgentId] = useState<CommercialV3AgentId | null>(null);
  const [agentDetails, setAgentDetails] = useState<CommercialV3AgentDetailResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Playground Consultivo
  const [missionInput, setMissionInput] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [missionResult, setMissionResult] = useState<CommercialAgentResultV3 | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    commercialAgentCellApi
      .list()
      .then((data) => {
        if (!cancelled) setLegacyAgents(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLegacyError(err instanceof Error ? err.message : 'Falha ao carregar a Célula Legada.');
        }
      });

    setV3Loading(true);
    commercialV3Api
      .listAgents()
      .then((res) => {
        if (!cancelled && res.success) {
          setV3Agents(res.data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setV3Error(err instanceof Error ? err.message : 'Falha ao carregar a Suíte Comercial V3.1.');
        }
      })
      .finally(() => {
        if (!cancelled) setV3Loading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedAgentId) {
      setAgentDetails(null);
      setMissionResult(null);
      setDispatchError(null);
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);
    setMissionResult(null);
    setDispatchError(null);

    commercialV3Api
      .getAgent(selectedAgentId)
      .then((res) => {
        if (!cancelled && res.success) {
          setAgentDetails(res.data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDispatchError(err instanceof Error ? err.message : 'Falha ao buscar detalhes do agente.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  const handleDispatchMission = async () => {
    if (!selectedAgentId || !missionInput.trim()) return;

    setDispatching(true);
    setDispatchError(null);
    setMissionResult(null);

    try {
      const res = await commercialV3Api.dispatchMission({
        agentId: selectedAgentId,
        mission: missionInput,
      });
      if (res.success) {
        setMissionResult(res.data);
      } else {
        setDispatchError('Não foi possível concluir a missão.');
      }
    } catch (err: unknown) {
      setDispatchError(err instanceof Error ? err.message : 'Erro ao processar a missão comercial.');
    } finally {
      setDispatching(false);
    }
  };

  const filteredV3Agents = (v3Agents || []).filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <section aria-labelledby="hub-agentes-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2
            id="hub-agentes-heading"
            className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-2"
          >
            Equipe IA Comercial
          </h2>
          <span
            className="h-px w-16 bg-gradient-to-r from-line to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="inline-flex rounded-lg border border-line bg-surface p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('v3')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'v3'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suíte V3.1 (19 Agentes · 463 Skills)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('legacy')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'legacy'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Célula Legada (12 Agentes)
          </button>
        </div>
      </div>

      {activeTab === 'v3' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-card border border-primary/20 bg-primary/5 p-4">
            <div>
              <p className="text-xs font-bold text-ink">
                Arquitetura Comercial V3.1 Reconstruída
              </p>
              <p className="text-[11px] text-ink-2">
                19 Especialistas integrados, 463 habilidades canônicas, 99 playbooks operacionais sob demanda e envelope de governança LGPD/B2B.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-2" />
              <input
                type="text"
                placeholder="Buscar especialista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-line bg-surface pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-2 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {v3Error && (
            <div className="flex items-center gap-2 rounded-card border border-danger/25 bg-danger/5 p-4 text-sm text-danger-active dark:text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{v3Error}</span>
            </div>
          )}

          {v3Loading && (
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando Suíte V3.1…
            </div>
          )}

          {!v3Loading && filteredV3Agents.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredV3Agents.map((agent) => (
                <li
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`group cursor-pointer rounded-card border transition-all p-4 shadow-card hover:border-primary/50 hover:shadow-md ${
                    selectedAgentId === agent.id
                      ? 'border-primary bg-primary/5'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-ok-solid" />
                        <p className="font-display text-xs font-bold text-ink group-hover:text-primary transition-colors">
                          {agent.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-ink-2 font-mono mt-0.5">ID: {agent.id}</p>
                    </div>
                    <Badge variant="info">V3.1</Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-2 border-t border-line/50 pt-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Sparkles className="h-3 w-3 text-primary" /> {agent.skills} skills
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <BookOpen className="h-3 w-3 text-ink-2" /> {agent.playbooks} playbooks
                    </span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-ink-2 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'legacy' && (
        <div className="space-y-4">
          {legacyError && (
            <div className="flex items-center gap-2 rounded-card border border-danger/25 bg-danger/5 p-4 text-sm text-danger-active dark:text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{legacyError}</span>
            </div>
          )}

          {!legacyAgents && !legacyError && (
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando agentes legados…
            </div>
          )}

          {legacyAgents && legacyAgents.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {legacyAgents.map((agent) => (
                <li
                  key={agent.id}
                  className="rounded-card border border-line bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-xs font-bold text-ink">{agent.name}</p>
                      <p className="text-[11px] text-ink-2">{agent.role}</p>
                    </div>
                    <AgentStatusBadge status={agent.status} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-2">{agent.mission}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedAgentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-subtle">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ok-solid" />
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">
                    {agentDetails?.agent.name || selectedAgentId}
                  </h3>
                  <p className="text-xs text-ink-2 font-mono">Agente ID: {selectedAgentId} · Suíte Comercial V3.1</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                className="rounded-md p-1.5 text-ink-2 hover:bg-surface hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails && (
                <div className="flex items-center justify-center py-12 text-sm text-ink-2">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando habilidades e playbooks...
                </div>
              )}

              {!loadingDetails && agentDetails && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-line p-4 bg-surface">
                      <p className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Habilidades ({agentDetails.skillsCount})
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {agentDetails.skills.slice(0, 10).map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-2 p-1.5 rounded bg-surface-subtle text-[11px]">
                            <span className="truncate text-ink font-medium">{s.name}</span>
                            <Badge variant="outline">{s.playbookId}</Badge>
                          </div>
                        ))}
                        {agentDetails.skills.length > 10 && (
                          <p className="text-[10px] text-ink-2 text-center pt-1">
                            + {agentDetails.skills.length - 10} outras habilidades no índice
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-line p-4 bg-surface">
                      <p className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
                        <BookOpen className="h-3.5 w-3.5 text-ink-2" /> Playbooks ({agentDetails.playbooksCount})
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {agentDetails.playbooks.map((p) => (
                          <div key={p.id} className="p-1.5 rounded bg-surface-subtle text-[11px] font-mono text-ink-2 truncate">
                            {p.id}: {p.path}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {agentDetails.handoffs.length > 0 && (
                    <div className="rounded-xl border border-line/60 bg-surface-subtle/40 p-4">
                      <p className="text-xs font-bold text-ink mb-2">Handoffs Sugeridos (Via Supervisor)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {agentDetails.handoffs.map(([to, reason]) => (
                          <div key={to} className="p-2 rounded-lg border border-line bg-surface text-[11px]">
                            <span className="font-bold text-primary">→ {to}</span>
                            <p className="text-ink-2 mt-0.5 line-clamp-2">{reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-primary/20 bg-surface p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-primary" /> Testar Demanda Consultiva
                      </p>
                      <Badge variant="info">Modo Consultivo Seguro</Badge>
                    </div>

                    <textarea
                      rows={2}
                      placeholder={`Ex: Formule a estratégia consultiva de ${agentDetails.agent.name} para o segmento financeiro...`}
                      value={missionInput}
                      onChange={(e) => setMissionInput(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface-subtle p-2.5 text-xs text-ink placeholder:text-ink-2 focus:border-primary focus:outline-none"
                    />

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={dispatching || !missionInput.trim()}
                        onClick={handleDispatchMission}
                        className="gap-1.5"
                      >
                        {dispatching ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" /> Executar Demanda
                          </>
                        )}
                      </Button>
                    </div>

                    {dispatchError && (
                      <div className="text-xs text-danger flex items-center gap-1.5 pt-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {dispatchError}
                      </div>
                    )}

                    {missionResult && (
                      <div className="mt-3 rounded-lg border border-ok-solid/30 bg-ok-solid/5 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-ok-solid">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Envelope V3.1 Validado ({missionResult.status})
                          </span>
                          <span className="font-mono text-[10px] text-ink-2">
                            ID: {missionResult.missionId}
                          </span>
                        </div>

                        <div className="rounded bg-surface p-2.5 border border-line text-[11px] text-ink leading-relaxed">
                          <p className="font-semibold text-ink-2 mb-1">Resumo Humano (Supervisor):</p>
                          {missionResult.resumo_humano}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-ink-2">
                          <div>
                            <strong>Conformidade Canal:</strong> {missionResult.compliance.channel} (Elegível: {String(missionResult.compliance.sendEligible)})
                          </div>
                          <div>
                            <strong>Execução Real:</strong> {missionResult.execution.performed ? 'SIM' : 'NÃO (Rascunho Seguro)'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-line px-6 py-3 bg-surface-subtle flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedAgentId(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
