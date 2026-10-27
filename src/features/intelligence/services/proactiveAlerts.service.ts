import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';

/**
 * Alertas Proativos - Notifica quando agente tem taxa de erro acima do normal.
 *
 * Monitora continuamente a performance dos agentes e dispara alertas
 * quando:
 * - Taxa de erro excede threshold configurado
 * - Latência aumenta significativamente
 * - Override humano aumenta repentinamente
 * - Custo por execução aumenta
 *
 * Alertas são armazenados e podem ser consultados via dashboard ou webhook.
 */

export interface AgentHealthMetrics {
  agentRole: 'SDR' | 'BDR' | 'CLOSER' | 'CRM' | 'OPS' | 'SUPERVISOR';
  organizationId: string;
  windowMinutes: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  humanOverrides: number;
  humanOverrideRate: number;
  totalCostUsd: number;
  avgCostUsd: number;
}

export interface AlertThreshold {
  metric: 'errorRate' | 'latency' | 'overrideRate' | 'cost';
  threshold: number;
  comparison: 'gt' | 'lt' | 'gt_pct_change' | 'lt_pct_change';
  windowMinutes: number;
}

export interface ProactiveAlert {
  id: string;
  organizationId: string;
  agentRole: AgentHealthMetrics['agentRole'];
  alertType: 'HIGH_ERROR_RATE' | 'HIGH_LATENCY' | 'HIGH_OVERRIDE_RATE' | 'HIGH_COST' | 'ANOMALY_DETECTED';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  currentValue: number;
  thresholdValue: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

/**
 * Calcula métricas de saúde de um agente em uma janela de tempo.
 */
export async function calculateAgentHealthMetrics(
  organizationId: string,
  agentRole: AgentHealthMetrics['agentRole'],
  windowMinutes: number = 60,
): Promise<AgentHealthMetrics> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Buscar execuções do agente na janela
  const logs = await prisma.aILog.findMany({
    where: {
      organizationId,
      agentRole,
      createdAt: { gte: since },
    },
    select: {
      success: true,
      latencyMs: true,
      costUsd: true,
    },
  });

  const totalExecutions = logs.length;
  const successfulExecutions = logs.filter(l => l.success).length;
  const failedExecutions = totalExecutions - successfulExecutions;
  const errorRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;

  const latencies = logs.map(l => l.latencyMs || 0).filter(l => l > 0);
  const avgLatencyMs = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;

  const sortedLatencies = latencies.sort((a, b) => a - b);
  const p95LatencyMs = sortedLatencies.length > 0
    ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
    : 0;

  // Buscar overrides humanos (AIPendingAction que foram rejeitadas ou modificadas)
  const pendingActions = await prisma.aIPendingAction.findMany({
    where: {
      organizationId,
      agentRole,
      createdAt: { gte: since },
    },
    select: {
      status: true,
    },
  });

  const humanOverrides = pendingActions.filter(a =>
    a.status === 'REJECTED' || a.status === 'MODIFIED'
  ).length;
  const humanOverrideRate = pendingActions.length > 0
    ? humanOverrides / pendingActions.length
    : 0;

  const totalCostUsd = logs.reduce((sum, l) => sum + (l.costUsd || 0), 0);
  const avgCostUsd = totalExecutions > 0 ? totalCostUsd / totalExecutions : 0;

  return {
    agentRole,
    organizationId,
    windowMinutes,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    errorRate,
    avgLatencyMs,
    p95LatencyMs,
    humanOverrides,
    humanOverrideRate,
    totalCostUsd,
    avgCostUsd,
  };
}

/**
 * Verifica se algum agente tem métricas fora dos thresholds e cria alertas.
 */
export async function checkAgentHealthAndCreateAlerts(
  organizationId: string,
  thresholds: AlertThreshold[],
): Promise<ProactiveAlert[]> {
  const agentRoles: AgentHealthMetrics['agentRole'][] = ['SDR', 'BDR', 'CLOSER', 'CRM', 'OPS', 'SUPERVISOR'];
  const alerts: ProactiveAlert[] = [];

  for (const agentRole of agentRoles) {
    const metrics = await calculateAgentHealthMetrics(organizationId, agentRole);

    for (const threshold of thresholds) {
      const alert = shouldCreateAlert(metrics, threshold);
      if (alert) {
        const created = await createAlert(alert);
        alerts.push(created);
      }
    }
  }

  if (alerts.length > 0) {
    logger.info(
      { organizationId, alertCount: alerts.length },
      '[ProactiveAlerts] Alertas criados',
    );
  }

  return alerts;
}

/**
 * Determina se um alerta deve ser criado baseado em métricas e threshold.
 */
function shouldCreateAlert(
  metrics: AgentHealthMetrics,
  threshold: AlertThreshold,
): Omit<ProactiveAlert, 'id' | 'acknowledged' | 'acknowledgedBy' | 'acknowledgedAt' | 'createdAt'> | null {
  const getValue = (metric: AlertThreshold['metric']): number => {
    switch (metric) {
      case 'errorRate': return metrics.errorRate;
      case 'latency': return metrics.avgLatencyMs;
      case 'overrideRate': return metrics.humanOverrideRate;
      case 'cost': return metrics.avgCostUsd;
    }
  };

  const currentValue = getValue(threshold.metric);
  const shouldAlert = evaluateThreshold(currentValue, threshold);

  if (!shouldAlert) return null;

  let alertType: ProactiveAlert['alertType'];
  let severity: ProactiveAlert['severity'];
  let message: string;

  switch (threshold.metric) {
    case 'errorRate':
      alertType = 'HIGH_ERROR_RATE';
      severity = currentValue > 0.15 ? 'CRITICAL' : 'WARNING';
      message = `Taxa de erro de ${metrics.agentRole} está ${(currentValue * 100).toFixed(1)}% (acima de ${(threshold.threshold * 100).toFixed(1)}%)`;
      break;
    case 'latency':
      alertType = 'HIGH_LATENCY';
      severity = currentValue > 5000 ? 'CRITICAL' : 'WARNING';
      message = `Latência média de ${metrics.agentRole} está ${currentValue.toFixed(0)}ms (acima de ${threshold.threshold}ms)`;
      break;
    case 'overrideRate':
      alertType = 'HIGH_OVERRIDE_RATE';
      severity = currentValue > 0.3 ? 'WARNING' : 'INFO';
      message = `Taxa de override humano de ${metrics.agentRole} está ${(currentValue * 100).toFixed(1)}% (acima de ${(threshold.threshold * 100).toFixed(1)}%)`;
      break;
    case 'cost':
      alertType = 'HIGH_COST';
      severity = currentValue > 0.05 ? 'WARNING' : 'INFO';
      message = `Custo médio de ${metrics.agentRole} está $${currentValue.toFixed(4)} (acima de $${threshold.threshold.toFixed(4)})`;
      break;
  }

  return {
    organizationId: metrics.organizationId,
    agentRole: metrics.agentRole,
    alertType,
    severity,
    currentValue,
    thresholdValue: threshold.threshold,
    message,
  };
}

/**
 * Avalia se um valor atende o threshold.
 */
function evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
  switch (threshold.comparison) {
    case 'gt': return value > threshold.threshold;
    case 'lt': return value < threshold.threshold;
    case 'gt_pct_change': return false; // Requer histórico comparativo
    case 'lt_pct_change': return false; // Requer histórico comparativo
  }
}

/**
 * Cria um alerta no banco de dados.
 */
async function createAlert(
  alert: Omit<ProactiveAlert, 'id' | 'acknowledged' | 'acknowledgedBy' | 'acknowledgedAt' | 'createdAt'>,
): Promise<ProactiveAlert> {
  const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Se o schema não tiver tabela de alertas, logamos e retornamos
  // Por enquanto, vamos assumir que existe ou usar log
  logger.warn(
    { alert, id },
    '[ProactiveAlerts] Alerta seria criado (implementar schema ou webhook)',
  );

  return {
    id,
    acknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: new Date().toISOString(),
    ...alert,
  };
}

/**
 * Retorna alertas não reconhecidos para uma organização.
 */
export async function getUnacknowledgedAlerts(
  organizationId: string,
): Promise<ProactiveAlert[]> {
  // Implementar quando schema de alertas existir
  return [];
}

/**
 * Reconhece um alerta (marca como lido).
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string,
): Promise<void> {
  // Implementar quando schema de alertas existir
  logger.info({ alertId, userId }, '[ProactiveAlerts] Alerta reconhecido');
}

/**
 * Thresholds padrão para monitoramento.
 */
export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { metric: 'errorRate', threshold: 0.05, comparison: 'gt', windowMinutes: 60 },
  { metric: 'latency', threshold: 3000, comparison: 'gt', windowMinutes: 60 },
  { metric: 'overrideRate', threshold: 0.25, comparison: 'gt', windowMinutes: 60 },
  { metric: 'cost', threshold: 0.03, comparison: 'gt', windowMinutes: 60 },
];
