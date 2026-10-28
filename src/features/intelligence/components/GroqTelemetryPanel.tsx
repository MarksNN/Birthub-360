/**
 * GroqTelemetryPanel — Painel de telemetria em tempo real para modelos da Groq Cloud.
 * Exibe métricas de TTFT (Time to First Token), consumo de tokens e custo estimado das chamadas.
 */

import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  DollarSign,
  Gauge,
  Layers,
  LineChart,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { api } from '../../../lib/api.js';
import { fadeInUp, staggerContainer, staggerItem } from '../../../lib/motion.js';
import { SoundFX } from '../../../lib/soundEffects.js';
import { toast } from '../../../lib/toast.js';

interface GroqCallRecord {
  id: string;
  model: string;
  ttftMs: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  timestamp: string;
}

interface GroqModelMetric {
  model: string;
  displayName: string;
  requests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  avgTtftMs: number;
  totalCostUsd: number;
}

interface GroqTelemetrySnapshot {
  provider: 'Groq Cloud';
  status: 'online' | 'configured' | 'offline';
  avgTtftMs: number;
  minTtftMs: number;
  maxTtftMs: number;
  p95TtftMs: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  totalRequests: number;
  models: GroqModelMetric[];
  recentCalls: GroqCallRecord[];
  generatedAt: string;
}

export function GroqTelemetryPanel() {
  const [data, setData] = useState<GroqTelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTelemetry = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: GroqTelemetrySnapshot }>(
        '/api/intelligence/telemetry/groq',
      );
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar métricas de telemetria.';
      setError(msg);
      if (!isSilent) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchTelemetry();
  }, [fetchTelemetry]);

  // Auto-refresh a cada 10s quando ativo
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchTelemetry(true);
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTelemetry]);

  const handleManualRefresh = () => {
    SoundFX.play('click');
    void fetchTelemetry();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center rounded-2xl border border-line bg-surface-2 space-y-4">
        <AlertCircle className="w-10 h-10 text-danger mx-auto" />
        <h3 className="text-base font-bold text-ink">Erro ao carregar telemetria da Groq Cloud</h3>
        <p className="text-xs text-ink-2 max-w-md mx-auto">{error}</p>
        <Button onClick={handleManualRefresh} variant="outline" size="sm">
          Tentar novamente
        </Button>
      </div>
    );
  }

  const snapshot = data!;

  return (
    <div className="space-y-6">
      {/* Top Header / Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-line bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-lg shadow-sm">
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Groq Cloud Inference Engine</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LPU LPUs Ativas
              </span>
            </div>
            <p className="text-xs text-ink-2">
              Telemetria de ultra-baixa latência, consumo de tokens e custo dos modelos Llama 3 &
              Qwen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoRefresh
                ? 'bg-brand/10 text-brand border-brand/30 shadow-xs'
                : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
            }`}
          >
            {autoRefresh ? 'Auto-refresh (10s)' : 'Pausado'}
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* 4 Bento Metrics Cards */}
      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: TTFT (Time to First Token) */}
        <motion.div variants={staggerItem}>
          <Card
            padding="default"
            variant="bento"
            spotlight
            className="relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-xs font-medium text-ink-2 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-ink">
                <Gauge className="w-4 h-4 text-orange-500" /> TTFT Médio
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-bold font-mono">
                p95: {snapshot.p95TtftMs}ms
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-ink tracking-tight [font-variant-numeric:tabular-nums]">
                {snapshot.avgTtftMs}
              </span>
              <span className="text-xs font-bold text-ink-2">ms</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-2 border-t border-line/60 pt-2">
              <span>
                Mínimo: <strong className="text-ink font-mono">{snapshot.minTtftMs}ms</strong>
              </span>
              <span>
                Máximo: <strong className="text-ink font-mono">{snapshot.maxTtftMs}ms</strong>
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: Consumo de Tokens */}
        <motion.div variants={staggerItem}>
          <Card
            padding="default"
            variant="bento"
            spotlight
            className="relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-xs font-medium text-ink-2 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-ink">
                <Coins className="w-4 h-4 text-sky-500" /> Consumo de Tokens
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold">
                Total
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-ink tracking-tight [font-variant-numeric:tabular-nums]">
                {snapshot.totalTokens.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-ink-2">tokens</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-2 border-t border-line/60 pt-2">
              <span>
                Prompt:{' '}
                <strong className="text-ink font-mono">
                  {snapshot.promptTokens.toLocaleString('pt-BR')}
                </strong>
              </span>
              <span>
                Saída:{' '}
                <strong className="text-ink font-mono">
                  {snapshot.completionTokens.toLocaleString('pt-BR')}
                </strong>
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Custo Estimado */}
        <motion.div variants={staggerItem}>
          <Card
            padding="default"
            variant="bento"
            spotlight
            className="relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-xs font-medium text-ink-2 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-ink">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Custo Estimado
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                Acumulado
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-emerald-500">US$</span>
              <span className="text-3xl font-black font-display text-ink tracking-tight [font-variant-numeric:tabular-nums]">
                {snapshot.totalCostUsd.toFixed(4)}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-2 border-t border-line/60 pt-2">
              <span>
                Média/chamada:{' '}
                <strong className="text-ink font-mono">
                  US$ {(snapshot.totalCostUsd / Math.max(1, snapshot.totalRequests)).toFixed(5)}
                </strong>
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Volume de Requisições */}
        <motion.div variants={staggerItem}>
          <Card
            padding="default"
            variant="bento"
            spotlight
            className="relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-xs font-medium text-ink-2 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-ink">
                <Activity className="w-4 h-4 text-violet-500" /> Requisições
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 font-bold">
                Invocadas
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-ink tracking-tight [font-variant-numeric:tabular-nums]">
                {snapshot.totalRequests.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-ink-2">chamadas</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-2 border-t border-line/60 pt-2">
              <span>
                Status: <strong className="text-emerald-500 font-semibold">100% Saudável</strong>
              </span>
              <span>
                Provedor: <strong className="text-ink">Groq Cloud</strong>
              </span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Model Breakdown Section */}
      <Card padding="default" variant="bento" className="overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">Desempenho por Modelo na Groq Cloud</h3>
          </div>
          <span className="text-xs text-ink-2">
            Comparativo de TTFT, volume e custo por arquitetura
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-2 border-b border-line text-left">
                <th className="py-2.5 pr-4 font-semibold">Modelo</th>
                <th className="py-2.5 pr-4 font-semibold text-center">Requisições</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Tokens Totais</th>
                <th className="py-2.5 pr-4 font-semibold text-right">TTFT Médio</th>
                <th className="py-2.5 font-semibold text-right">Custo Estimado</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.models.map((m) => (
                <tr
                  key={m.model}
                  className="border-b border-line/50 hover:bg-surface-2 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="font-bold text-ink">{m.displayName}</div>
                    <div className="text-[11px] text-ink-2 font-mono">{m.model}</div>
                  </td>
                  <td className="py-3 pr-4 text-center font-mono font-medium text-ink">
                    {m.requests}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-medium text-ink">
                    {m.totalTokens.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      <Zap className="w-3 h-3" />
                      {m.avgTtftMs} ms
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    US$ {m.totalCostUsd.toFixed(5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Calls Log Stream */}
      <Card padding="default" variant="bento" className="overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">
              Histórico de Chamadas Recentes (Live Stream)
            </h3>
          </div>
          <span className="text-xs text-ink-2">Últimas inferências registradas</span>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {snapshot.recentCalls.map((call) => (
            <div
              key={call.id}
              className="p-3 rounded-xl border border-line bg-surface-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-brand/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{call.model}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-1 border border-line text-ink-2 font-mono">
                      {new Date(call.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-2 mt-0.5">
                    Latência total: <span className="font-mono text-ink">{call.latencyMs}ms</span> ·
                    Tokens: <span className="font-mono text-ink">{call.totalTokens}</span> (
                    {call.promptTokens} in / {call.completionTokens} out)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    TTFT: {call.ttftMs}ms
                  </div>
                  <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    US$ {call.costUsd.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
