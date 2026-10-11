import { GitBranch, Clock, CheckCircle2, Shield, Users } from 'lucide-react';
import { CommandCenterHeader } from '../../../components/ui/CommandCenterHeader.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '../../../components/ui/Card.js';
import { KpiCard } from '../../../components/ui/KpiCard.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import {
  NO_API_SUBTITLE,
  OrchestrationEmptyState,
  OrchestrationStatusBanner,
} from './DemoDataNotice.js';
import { useOrchestrationOverview } from './useOrchestrationOverview.js';

export function JornadasComerciaisHub() {
  const { data, isTemplate, loading, error, reload } = useOrchestrationOverview();
  const jornadas = data?.jornadas ?? [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--ink)]">
      <CommandCenterHeader
        title="Jornadas Comerciais"
        icon={GitBranch}
        actions={
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              disabled
              title="Em breve — criação ainda não disponível"
            >
              <GitBranch className="w-4 h-4 mr-2" /> Nova Jornada
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold">Mapeamento da Jornada do Comprador</h2>
          <p className="text-sm text-[var(--ink-2)]">
            Acompanhe o caminho percorrido pelo cliente desde a descoberta inicial até a assinatura
            e kickoff, com SLAs e pontos de atrito controlados.
          </p>
        </div>

        <OrchestrationStatusBanner isTemplate={isTemplate} error={error} onRetry={reload} />

        {/* KPIs (P0 #693: sem números fixos — só API ou “Indisponível”) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Ciclo Médio de Venda"
            value="Indisponível"
            icon={Clock}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="Conversão Ponta a Ponta"
            value="Indisponível"
            icon={CheckCircle2}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
          <KpiCard
            title="SLA de Passagem de Bastão"
            value="Indisponível"
            icon={Shield}
            subtitle={NO_API_SUBTITLE}
            variant="default"
          />
        </div>

        {/* Diagrama Visual de Etapas da Jornada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fluxo Operacional da Jornada Padrão</span>
              <Badge
                variant="default"
                className="bg-[var(--nav-c-blue)]/10 text-[var(--nav-c-blue)] font-normal"
              >
                {isTemplate ? 'Modelo de exemplo' : 'Jornada da organização'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Sequência de transições e touchpoints acordados entre pré-vendas, vendas e pós-vendas.
            </CardDescription>
          </CardHeader>
          <CardContent className="border-t border-[var(--line)] pt-6">
            {loading ? (
              <div className="h-64 bg-[var(--surface-2)] rounded-xl animate-pulse" />
            ) : error ? (
              <OrchestrationEmptyState
                title="Jornada indisponível"
                hint="Falha ao carregar dados da API."
              />
            ) : jornadas.length === 0 ? (
              <OrchestrationEmptyState
                title="Nenhuma jornada configurada"
                hint="Ainda não há etapas de jornada cadastradas para a organização."
              />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {jornadas.map((etapa, idx) => (
                    <div
                      key={etapa.id}
                      className="relative p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-[var(--nav-c-blue)]">
                            PASSO {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-[var(--nav-c-green)]">
                            {etapa.conversionRate === null
                              ? 'Conv. indisponível'
                              : `${etapa.conversionRate}% conv.`}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{etapa.name}</h4>
                        <p className="text-xs text-[var(--ink-3)] mb-3">{etapa.personaStage}</p>

                        <div className="space-y-1 mb-4">
                          <span className="text-[10px] font-bold tracking-wider text-[var(--ink-3)] uppercase">
                            Touchpoints
                          </span>
                          {etapa.touchpoints.map((tp) => (
                            <div
                              key={tp}
                              className="text-xs text-[var(--ink-2)] flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--nav-c-blue)]" />
                              {tp}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[var(--line)] pt-3 text-xs flex items-center justify-between text-[var(--ink-3)]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {etapa.ownerRole}
                        </span>
                        <span>SLA: {etapa.slaHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
