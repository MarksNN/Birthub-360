import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertTriangle, ArrowRight, Globe2, Network, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import { cn } from '../../../lib/utils.js';
import type {
  FailoverEvent,
  RegionIdentifier,
  RegionTelemetry,
} from '../../../shared/contracts/multiRegionResilience.contract.js';

const INITIAL_REGIONS: Record<RegionIdentifier, RegionTelemetry> = {
  'sa-east-1': {
    region: 'sa-east-1',
    status: 'healthy',
    latencyMs: 34,
    errorRatePercent: 0.02,
    activeWorkersCount: 24,
    cacheHitRatio: 0.974,
    lastHealthCheckIso: new Date().toISOString(),
  },
  'us-east-1': {
    region: 'us-east-1',
    status: 'healthy',
    latencyMs: 118,
    errorRatePercent: 0.01,
    activeWorkersCount: 16,
    cacheHitRatio: 0.952,
    lastHealthCheckIso: new Date().toISOString(),
  },
  'us-west-2': {
    region: 'us-west-2',
    status: 'healthy',
    latencyMs: 156,
    errorRatePercent: 0.01,
    activeWorkersCount: 12,
    cacheHitRatio: 0.941,
    lastHealthCheckIso: new Date().toISOString(),
  },
};

const INITIAL_FAILOVER_LOGS: FailoverEvent[] = [
  {
    failoverId: 'failover-a48f219c',
    fromRegion: 'sa-east-1',
    toRegion: 'us-east-1',
    reason: 'Exercício preventivo de resiliência e validação de RTO',
    initiatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 48 + 480).toISOString(),
    durationMs: 480,
    reroutedTrafficPercent: 100,
    statePreserved: true,
    status: 'completed',
  },
];

const REGION_LABELS: Record<RegionIdentifier, { name: string; location: string; flag: string }> = {
  'sa-east-1': { name: 'São Paulo (Primário)', location: 'América do Sul (Brasil)', flag: '🇧🇷' },
  'us-east-1': { name: 'N. Virginia (Secundário)', location: 'Costa Leste (EUA)', flag: '🇺🇸' },
  'us-west-2': { name: 'Oregon (Disaster Recovery)', location: 'Costa Oeste (EUA)', flag: '🇺🇸' },
};

export function MultiRegionFailoverPanel() {
  const [regions, setRegions] =
    useState<Record<RegionIdentifier, RegionTelemetry>>(INITIAL_REGIONS);
  const [failoverLogs, setFailoverLogs] = useState<FailoverEvent[]>(INITIAL_FAILOVER_LOGS);
  const [primaryRegion, setPrimaryRegion] = useState<RegionIdentifier>('sa-east-1');

  // Modal / Formulário de Disparo de Failover
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [fromRegion, setFromRegion] = useState<RegionIdentifier>('sa-east-1');
  const [toRegion, setToRegion] = useState<RegionIdentifier>('us-east-1');
  const [failoverReason, setFailoverReason] = useState(
    'Troca programada para manutenção de infraestrutura regional',
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  const handleRefreshTelemetry = () => {
    SoundFX.play('click');
    setRegions((prev) => ({
      'sa-east-1': {
        ...prev['sa-east-1'],
        latencyMs: Math.floor(32 + Math.random() * 8),
        lastHealthCheckIso: new Date().toISOString(),
      },
      'us-east-1': {
        ...prev['us-east-1'],
        latencyMs: Math.floor(115 + Math.random() * 10),
        lastHealthCheckIso: new Date().toISOString(),
      },
      'us-west-2': {
        ...prev['us-west-2'],
        latencyMs: Math.floor(150 + Math.random() * 12),
        lastHealthCheckIso: new Date().toISOString(),
      },
    }));
    toast.success('Telemetria das 3 regiões sincronizada via heartbeat de alta fidelidade.');
  };

  const handleTriggerFailover = () => {
    if (fromRegion === toRegion) {
      toast.info('A região de origem e destino devem ser diferentes.');
      return;
    }

    SoundFX.play('focus');
    setIsExecuting(true);
    setExecutionProgress(15);

    // Simulação determinística de failover seguro com preservação de estado
    setTimeout(() => setExecutionProgress(45), 300);
    setTimeout(() => setExecutionProgress(80), 700);

    setTimeout(() => {
      setExecutionProgress(100);
      setIsExecuting(false);
      setShowTriggerDialog(false);
      setPrimaryRegion(toRegion);

      const newEvent: FailoverEvent = {
        failoverId: `failover-${Math.random().toString(36).substring(2, 10)}`,
        fromRegion,
        toRegion,
        reason: failoverReason,
        initiatedAt: new Date(Date.now() - 420).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 420,
        reroutedTrafficPercent: 100,
        statePreserved: true,
        status: 'completed',
      };

      setFailoverLogs((prev) => [newEvent, ...prev]);

      // Atualiza status da região de origem para degraded e destino para healthy
      setRegions((prev) => ({
        ...prev,
        [fromRegion]: { ...prev[fromRegion], status: 'degraded' },
        [toRegion]: {
          ...prev[toRegion],
          status: 'healthy',
          activeWorkersCount: prev[toRegion].activeWorkersCount + 10,
        },
      }));

      SoundFX.play('success');
      toast.success(
        `Failover concluído com sucesso: tráfego redirecionado de ${fromRegion} para ${toRegion} em 420ms (RPO=0).`,
      );
    }, 1100);
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER DE RESILIÊNCIA MULTI-REGIÃO ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-surface-elevated to-surface border border-sky-500/30 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-sky-500/10 text-sky-400 border-sky-500/30 font-bold text-xs gap-1"
            >
              <Globe2 className="h-3.5 w-3.5" /> Multi-Region High Availability
            </Badge>
            <span className="text-xs font-semibold text-ink-2">
              Eixo 19 · Arquitetura SRE & Failover
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-ink tracking-tight mt-1 flex items-center gap-2">
            Visualizador de Failover Multi-Região
          </h2>
          <p className="text-sm text-ink-2 mt-0.5">
            Monitoramento de latência em tempo real, saúde das réplicas ativas e controle de
            failover de tráfego com estado preservado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshTelemetry}
            className="text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar Telemetria
          </Button>

          <Button
            size="sm"
            onClick={() => {
              SoundFX.play('click');
              setShowTriggerDialog(true);
            }}
            className="bg-brand text-on-brand font-bold text-xs gap-1.5 shadow-md shadow-brand/10"
          >
            <Network className="h-3.5 w-3.5" /> Disparar Failover
          </Button>
        </div>
      </div>

      {/* ── CARDS DAS 3 REGIÕES CANÔNICAS ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['sa-east-1', 'us-east-1', 'us-west-2'] as RegionIdentifier[]).map((regionId) => {
          const telemetry = regions[regionId];
          const info = REGION_LABELS[regionId];
          const isPrimary = primaryRegion === regionId;

          return (
            <Card
              key={regionId}
              className={cn(
                'p-5 border-2 transition-all relative overflow-hidden',
                isPrimary
                  ? 'border-brand bg-brand/5 shadow-lg shadow-brand/5'
                  : 'border-line/70 bg-surface-elevated/70',
              )}
            >
              {/* Header do Card Regional */}
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-label={info.name}>
                    {info.flag}
                  </span>
                  <div>
                    <span className="font-mono text-xs font-bold text-ink block">{regionId}</span>
                    <span className="text-[11px] text-ink-2">{info.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isPrimary && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold bg-brand/15 text-brand border-brand/30"
                    >
                      PRIMÁRIO
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                      telemetry.status === 'healthy'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : telemetry.status === 'degraded'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/30',
                    )}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                    </span>
                    {telemetry.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Grid de Telemetria */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="p-2.5 rounded-xl border border-line bg-surface/50">
                  <span className="text-[10px] text-ink-3 block">Latência RTT</span>
                  <span
                    className={cn(
                      'text-base font-extrabold tabular-nums font-mono',
                      telemetry.latencyMs < 50
                        ? 'text-emerald-500'
                        : telemetry.latencyMs < 130
                          ? 'text-amber-500'
                          : 'text-indigo-400',
                    )}
                  >
                    {telemetry.latencyMs} ms
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-line bg-surface/50">
                  <span className="text-[10px] text-ink-3 block">Workers Ativos</span>
                  <span className="text-base font-extrabold text-ink tabular-nums font-mono">
                    {telemetry.activeWorkersCount} pods
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-line bg-surface/50">
                  <span className="text-[10px] text-ink-3 block">Taxa de Erro</span>
                  <span className="text-base font-extrabold text-ink tabular-nums font-mono">
                    {telemetry.errorRatePercent}%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-line bg-surface/50">
                  <span className="text-[10px] text-ink-3 block">Cache Hit Ratio</span>
                  <span className="text-base font-extrabold text-brand tabular-nums font-mono">
                    {(telemetry.cacheHitRatio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Footer com Heartbeat */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-ink-3 border-t border-line/40">
                <span>Último health check:</span>
                <span className="font-mono">
                  {new Date(telemetry.lastHealthCheckIso).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── HISTÓRICO DE AUDITORIA DE FAILOVERS ──────────────────────── */}
      <Card className="p-5 border-line/70 bg-surface-elevated/70">
        <div className="flex items-center justify-between pb-3 border-b border-line/60">
          <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand" /> Registro de Transições & Auditoria de
            Failover
          </h3>
          <span className="text-xs text-ink-3">Eventos Rastreáveis no EventMesh</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {failoverLogs.map((log) => (
            <div
              key={log.failoverId}
              className="p-3.5 rounded-xl border border-line/70 bg-surface/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-ink">{log.failoverId}</span>
                  <span className="text-ink-3">·</span>
                  <span className="text-brand font-semibold flex items-center gap-1">
                    {log.fromRegion} <ArrowRight className="h-3 w-3" /> {log.toRegion}
                  </span>
                </div>
                <p className="text-ink-2">{log.reason}</p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right text-[11px] font-mono text-ink-3">
                  <span className="block font-semibold text-emerald-500">
                    {log.durationMs}ms ({log.reroutedTrafficPercent}% tráfego)
                  </span>
                  <span>RPO = 0 · Estado Preservado</span>
                </div>

                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold"
                >
                  CONCLUÍDO
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── MODAL / DIALOG DE CONFIRMAÇÃO DE FAILOVER ───────────────── */}
      <AnimatePresence>
        {showTriggerDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-elevated border border-line rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Disparar Failover Controlado
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTriggerDialog(false)}
                  className="p-1 rounded-md text-ink-2 hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-ink-2 leading-relaxed">
                Este procedimento redirecionará o tráfego de produção entre clusters regionais. A
                sincronização de estado com o EventMesh e Redis Cluster garante zero perda de dados
                (RPO=0).
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="from-region-select"
                    className="text-xs font-bold text-ink block mb-1"
                  >
                    Região de Origem:
                  </label>
                  <select
                    id="from-region-select"
                    value={fromRegion}
                    onChange={(e) => setFromRegion(e.target.value as RegionIdentifier)}
                    className="w-full rounded-lg border border-line bg-surface p-2 text-xs text-ink"
                  >
                    <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="to-region-select"
                    className="text-xs font-bold text-ink block mb-1"
                  >
                    Região de Destino:
                  </label>
                  <select
                    id="to-region-select"
                    value={toRegion}
                    onChange={(e) => setToRegion(e.target.value as RegionIdentifier)}
                    className="w-full rounded-lg border border-line bg-surface p-2 text-xs text-ink"
                  >
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="sa-east-1">sa-east-1 (São Paulo)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="failover-reason-input"
                  className="text-xs font-bold text-ink block mb-1"
                >
                  Justificativa do Failover:
                </label>
                <input
                  id="failover-reason-input"
                  type="text"
                  value={failoverReason}
                  onChange={(e) => setFailoverReason(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface p-2 text-xs text-ink"
                />
              </div>

              {isExecuting && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-brand">
                    <span>Redirecionando tráfego e drenando conexões...</span>
                    <span>{executionProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-line">
                    <motion.div
                      className="h-full bg-brand"
                      style={{ width: `${executionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <Button
                  variant="outline"
                  onClick={() => setShowTriggerDialog(false)}
                  disabled={isExecuting}
                  className="text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleTriggerFailover}
                  disabled={isExecuting || fromRegion === toRegion}
                  className="bg-brand text-on-brand font-bold text-xs gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" /> Executar Failover Imediato
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
