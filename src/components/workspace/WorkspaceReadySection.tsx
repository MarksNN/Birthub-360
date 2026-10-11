import { Bot, Layers, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TabType } from '../layout/tabMeta.js';
import { TAB_META } from '../layout/tabMeta.js';
import { EmptyState } from '../ui/EmptyState.js';
import { VisualState } from '../ui/VisualState.js';
import { cn } from '../../lib/utils.js';
import type { Workspace } from '../../features/workspace/workspace.api.js';

const ACCESS_LEVEL_LABEL: Record<string, string> = {
  EXECUTION: 'Execução Autônoma',
  SUPERVISED: 'Supervisionado',
  ADVISORY: 'Consultivo',
};

const KPI_STATUS_META: Record<string, { label: string; tone: string }> = {
  AVAILABLE: { label: 'Disponível', tone: 'text-success' },
  STALE: { label: 'Desatualizado', tone: 'text-warning' },
  ERROR: { label: 'Erro', tone: 'text-danger' },
  DISABLED: { label: 'Desativado', tone: 'text-ink-2' },
};

function moduleMeta(moduleKey: string) {
  const meta = TAB_META[moduleKey as TabType];
  return meta ?? { label: moduleKey, icon: Layers };
}

export function WorkspaceReadySection({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const goToModule = (moduleKey: string) => navigate(`/app/${moduleKey}` as `/app/${TabType}`);

  const widgets = new Set(workspace.homeWidgets);

  return (
    <div className="w-full max-w-[92rem] space-y-12">
      {/* Header Minimalista */}
      {widgets.has('mission') && workspace.jobRole && (
        <div className="flex flex-col gap-2 pb-6 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3 font-mono">
              {workspace.jobRole.department} ● LIVE
            </p>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            <span className="vancouver-gradient-text">{workspace.jobRole.name}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2 font-sans">
            {workspace.jobRole.description}
          </p>
        </div>
      )}

      {/* Grid Fluido sem Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Coluna Principal: KPIs e Navegação */}
        <div className="col-span-1 lg:col-span-8 space-y-12">
          {/* KPIs borderless */}
          {widgets.has('kpis') && (
            <section aria-labelledby="workspace-kpis-heading" className="space-y-6">
              <h2
                id="workspace-kpis-heading"
                className="text-[11px] font-bold tracking-widest text-ink-3 uppercase font-mono"
              >
                Indicadores Chave
              </h2>
              {workspace.kpis.length === 0 ? (
                <EmptyState
                  title="Nenhum indicador"
                  description="Sem capacidades de leitura."
                  icon={<Sparkles className="h-6 w-6 opacity-50" />}
                />
              ) : (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {workspace.kpis.map((kpi: any) => {
                    const _statusMeta = KPI_STATUS_META[kpi.status];
                    return (
                      <div key={kpi.capabilityCode} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <VisualState
                            state={kpi.status === 'AVAILABLE' ? 'LIVE' : 'NO_DATA'}
                            size="sm"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-3 font-mono">
                            {kpi.domain || 'Métrica'}
                          </p>
                        </div>
                        <p className="text-xl font-bold tracking-tight text-ink font-display">
                          {kpi.label}
                        </p>
                        {kpi.description && (
                          <p className="mt-2 text-xs text-ink-2 font-sans">{kpi.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Navegação Rápida estilo Terminal */}
          {widgets.has('quickActions') && workspace.quickActions.length > 0 && (
            <section aria-labelledby="workspace-quick-actions-heading" className="space-y-6">
              <h2
                id="workspace-quick-actions-heading"
                className="text-[11px] font-bold tracking-widest text-ink-3 uppercase font-mono"
              >
                Ações Rápidas
              </h2>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {workspace.quickActions.map((qa: any) => {
                  const { label, icon: Icon } = moduleMeta(qa.moduleKey);
                  const displayLabel = 'label' in qa ? qa.label : label;
                  return (
                    <button
                      key={qa.moduleKey}
                      type="button"
                      disabled={qa.locked}
                      onClick={() => goToModule(qa.moduleKey)}
                      title={qa.locked ? (qa.lockedReason ?? undefined) : undefined}
                      className={cn(
                        'group flex items-center gap-2 text-sm font-medium transition-colors',
                        !qa.locked
                          ? 'text-ink hover:text-brand cursor-pointer'
                          : 'text-ink-3/40 cursor-not-allowed',
                      )}
                    >
                      <Icon className="h-4 w-4 text-ink-3 group-hover:text-brand transition-colors" />
                      <span>{displayLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Coluna Lateral: Agentes e Módulos */}
        <div className="col-span-1 lg:col-span-4 space-y-12">
          {/* Agentes sem background box */}
          {widgets.has('agentGroups') && (
            <section aria-labelledby="workspace-agents-heading" className="space-y-6">
              <h2
                id="workspace-agents-heading"
                className="text-[11px] font-bold tracking-widest text-ink-3 uppercase font-mono"
              >
                Copilotos Ativos
              </h2>
              {workspace.agentGroups.length === 0 ? (
                <EmptyState
                  title="Nenhum copiloto"
                  description=""
                  icon={<Bot className="h-6 w-6 opacity-50" />}
                />
              ) : (
                <div className="space-y-6">
                  {workspace.agentGroups.map((group: any) => (
                    <div key={group.accessLevel} className="flex flex-col gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-3 font-mono">
                        {ACCESS_LEVEL_LABEL[group.accessLevel]}
                      </p>
                      <div className="flex flex-col gap-2">
                        {group.agents.map((agent: any) => (
                          <div key={agent.code} className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-brand" />
                            <span className="text-sm text-ink font-medium">{agent.name}</span>
                            {agent.requiresApproval && (
                              <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-widest font-mono">
                                Aprovação
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
