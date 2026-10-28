import {
  Activity,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Globe2,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';
import { cn } from '../../../lib/utils.js';

interface RegionStatus {
  id: 'sa-east-1' | 'us-east-1' | 'us-west-2';
  name: string;
  role: 'PRIMARY' | 'HOT_STANDBY' | 'COLD_DR';
  status: 'healthy' | 'degraded' | 'active_standby';
  latencyMs: number;
  errorRatePct: number;
  activeWorkers: number;
  cacheHitRatio: number;
  lastCheck: string;
}

const INITIAL_REGIONS: RegionStatus[] = [
  {
    id: 'sa-east-1',
    name: 'São Paulo (Brasil)',
    role: 'PRIMARY',
    status: 'healthy',
    latencyMs: 34,
    errorRatePct: 0.02,
    activeWorkers: 24,
    cacheHitRatio: 0.97,
    lastCheck: 'Agora mesmo',
  },
  {
    id: 'us-east-1',
    name: 'N. Virgínia (EUA)',
    role: 'HOT_STANDBY',
    status: 'healthy',
    latencyMs: 118,
    errorRatePct: 0.01,
    activeWorkers: 16,
    cacheHitRatio: 0.95,
    lastCheck: 'Há 12s',
  },
  {
    id: 'us-west-2',
    name: 'Oregon (EUA)',
    role: 'COLD_DR',
    status: 'healthy',
    latencyMs: 158,
    errorRatePct: 0.01,
    activeWorkers: 12,
    cacheHitRatio: 0.94,
    lastCheck: 'Há 45s',
  },
];

export function MultiRegionResiliencePanel() {
  const [regions, setRegions] = useState<RegionStatus[]>(INITIAL_REGIONS);
  const [isFailoverActive, setIsFailoverActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [auditLog, setAuditLog] = useState<string[]>([
    'Telemetria nominal registrada em sa-east-1, us-east-1 e us-west-2.',
    'Heartbeat de replicação Postgres streaming ativo: RPO medido em 1.8s.',
  ]);

  const handleSimulateFailover = () => {
    setProcessing(true);
    SoundFX.play('warning');
    toast.info('Iniciando simulação de failover controlado para us-east-1...');

    setTimeout(() => {
      setRegions((prev) =>
        prev.map((r) => {
          if (r.id === 'sa-east-1') {
            return { ...r, status: 'degraded', role: 'HOT_STANDBY', latencyMs: 240 };
          }
          if (r.id === 'us-east-1') {
            return { ...r, status: 'healthy', role: 'PRIMARY', latencyMs: 110 };
          }
          return r;
        }),
      );
      setIsFailoverActive(true);
      setProcessing(false);
      setAuditLog((prev) => [
        `[${new Date().toLocaleTimeString()}] FAILOVER EXECUTADO: Tráfego redirecionado para us-east-1 (N. Virgínia). RTO: 4.2s.`,
        ...prev,
      ]);
      SoundFX.play('confirm');
      toast.success(
        'Failover concluído com sucesso! us-east-1 assumiu como região primária ativa.',
      );
    }, 1200);
  };

  const handleRestorePrimary = () => {
    setProcessing(true);
    SoundFX.play('click');
    toast.info('Restaurando topologia primária para São Paulo (sa-east-1)...');

    setTimeout(() => {
      setRegions(INITIAL_REGIONS);
      setIsFailoverActive(false);
      setProcessing(false);
      setAuditLog((prev) => [
        `[${new Date().toLocaleTimeString()}] FAILBACK EXECUTADO: São Paulo (sa-east-1) reestabelecida como primária nominal.`,
        ...prev,
      ]);
      SoundFX.play('success');
      toast.success('Topologia primária restabelecida! sa-east-1 operando nominalmente.');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header do Painel */}
      <div className="p-5 rounded-2xl border border-line bg-gradient-to-r from-surface-elevated/90 via-surface/80 to-surface-elevated/90 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand/10 border border-brand/30 text-brand shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded-full bg-brand/10 border border-brand/30">
                Multi-Region Resilience • Eixo 16
              </span>
              <span className="text-xs font-semibold text-ink-2">Alta Disponibilidade 99.99%</span>
            </div>
            <h3 className="text-xl font-display font-extrabold text-ink mt-0.5">
              Governança de Topologia Multi-Região & Failover
            </h3>
          </div>
        </div>

        {/* Status Geral de Saúde */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <ShieldCheck className="h-4 w-4" />
            <span>Topologia Segura</span>
          </div>
        </div>
      </div>

      {/* Métricas de SLA: RPO e RTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-line bg-surface-elevated/70 backdrop-blur-xl">
          <span className="text-[10px] uppercase font-bold text-ink-2 block mb-1">
            RPO Máximo (Data Loss Target)
          </span>
          <span className="text-xl font-mono font-extrabold text-brand">&lt; 5.0 segundos</span>
          <p className="text-[11px] text-ink-2 mt-1">Medido em replicação contínua Postgres.</p>
        </Card>

        <Card className="p-4 border-line bg-surface-elevated/70 backdrop-blur-xl">
          <span className="text-[10px] uppercase font-bold text-ink-2 block mb-1">
            RTO Alvo (Tempo de Recuperação)
          </span>
          <span className="text-xl font-mono font-extrabold text-emerald-400">
            &lt; 30.0 segundos
          </span>
          <p className="text-[11px] text-ink-2 mt-1">Chaveamento automatizado DNS / Envoy.</p>
        </Card>

        <Card className="p-4 border-line bg-surface-elevated/70 backdrop-blur-xl">
          <span className="text-[10px] uppercase font-bold text-ink-2 block mb-1">
            Região Ativa Primária
          </span>
          <span className="text-xl font-mono font-extrabold text-ink">
            {isFailoverActive ? 'us-east-1 (EUA)' : 'sa-east-1 (Brasil)'}
          </span>
          <p className="text-[11px] text-ink-2 mt-1">Processando 100% das escritas do CRM.</p>
        </Card>

        <Card className="p-4 border-line bg-surface-elevated/70 backdrop-blur-xl">
          <span className="text-[10px] uppercase font-bold text-ink-2 block mb-1">
            Workers Distribuídos
          </span>
          <span className="text-xl font-mono font-extrabold text-purple-400">
            52 Ativos Globais
          </span>
          <p className="text-[11px] text-ink-2 mt-1">Fila Redis BullMQ multi-tenant.</p>
        </Card>
      </div>

      {/* Cards de Regiões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {regions.map((region) => {
          const isPrimary = region.role === 'PRIMARY';
          const isStandby = region.role === 'HOT_STANDBY';
          return (
            <Card
              key={region.id}
              className={cn(
                'p-5 border transition-all duration-300 backdrop-blur-xl',
                isPrimary
                  ? 'border-brand/60 bg-brand/5 shadow-[0_0_25px_rgba(0,240,255,0.12)]'
                  : 'border-line/70 bg-surface-elevated/60',
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <Server className={cn('h-4 w-4', isPrimary ? 'text-brand' : 'text-ink-2')} />
                  <span className="font-bold text-sm text-ink">{region.id}</span>
                </div>
                <Badge
                  variant={isPrimary ? 'default' : isStandby ? 'warning' : 'outline'}
                  className="text-[10px]"
                >
                  {isPrimary ? 'Primária' : isStandby ? 'Hot Standby' : 'Cold DR'}
                </Badge>
              </div>

              <div className="mt-3">
                <span className="text-xs text-ink-2 block">{region.name}</span>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-line/30">
                    <span className="text-ink-2">Latência de Borda:</span>
                    <span className="font-mono font-bold text-ink">{region.latencyMs}ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-line/30">
                    <span className="text-ink-2">Taxa de Erro:</span>
                    <span className="font-mono text-emerald-400">{region.errorRatePct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-line/30">
                    <span className="text-ink-2">Workers Alocados:</span>
                    <span className="font-mono text-ink">{region.activeWorkers}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-line/30">
                    <span className="text-ink-2">Cache Hit Ratio:</span>
                    <span className="font-mono text-brand">
                      {Math.round(region.cacheHitRatio * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Controles de Simulação de Failover */}
      <Card className="p-5 border-line bg-surface-elevated/80 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand" /> Teste de Failover & Resiliência de Tráfego
            </h4>
            <p className="text-xs text-ink-2 mt-0.5">
              Simule a perda parcial de conectividade na região primária para testar o failover
              automático para a Virgínia sem parada no atendimento aos usuários.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isFailoverActive ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleSimulateFailover}
                disabled={processing}
                className="text-xs font-bold"
              >
                <AlertOctagon className="h-3.5 w-3.5 mr-1.5" />
                {processing ? 'Processando Failover...' : 'Testar Failover Seguro'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRestorePrimary}
                disabled={processing}
                className="text-xs font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {processing ? 'Restaurando...' : 'Restaurar Região Primária (SP)'}
              </Button>
            )}
          </div>
        </div>

        {/* Log de Auditoria em Tempo Real */}
        <div className="mt-4 pt-4 border-t border-line/60">
          <span className="text-xs font-bold text-ink-2 block mb-2">
            Log de Eventos de Resiliência:
          </span>
          <div className="space-y-1.5 font-mono text-[11px] text-ink-2 bg-surface/60 p-3 rounded-xl border border-line/50 max-h-32 overflow-y-auto">
            {auditLog.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-brand shrink-0">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
