import { prisma } from '../../../lib/prisma.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import { logger } from '../../../lib/logger.js';
import { autonomyGovernorService } from './autonomyGovernor.service.js';

/**
 * Circuit Breaker para degradação automática de autonomia sob alta taxa de erro.
 * 
 * Monitora a taxa de erro dos agentes e reduz automaticamente o nível de autonomia
 * quando thresholds são ultrapassados, evitando que agentes com problemas continuem
 * operando em nível alto de autonomia.
 * 
 * Thresholds:
 * - Taxa de erro > 5% em janela de 15 minutos → downgrade de autonomia
 * - Taxa de erro < 2% em janela de 15 minutos → upgrade de autonomia (recovery)
 * 
 * Estados:
 * - CLOSED: operação normal, monitorando
 * - OPEN: circuito aberto, autonomia reduzida
 * - HALF_OPEN: testando recuperação
 */

interface CircuitBreakerState {
  organizationId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastDowngradeAt: string | null;
  lastUpgradeAt: string | null;
  lastErrorRate: number;
  consecutiveChecks: number;
}

const CIRCUIT_BREAKER_STORE = new Map<string, CircuitBreakerState>();

const ERROR_RATE_THRESHOLD_DOWNGRADE = 0.05; // 5%
const ERROR_RATE_THRESHOLD_UPGRADE = 0.02; // 2%
const WINDOW_MINUTES = 15;
const HALF_OPEN_CHECKS = 3; // Quantas checks consecutivos com baixa taxa antes de recovery

/**
 * Calcula a taxa de erro real dos agentes de uma organização na janela especificada.
 */
async function calculateRealErrorRate(
  organizationId: string,
  windowMinutes: number = WINDOW_MINUTES,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const totalAttempted = await prisma.aIPendingAction.count({
    where: {
      organizationId,
      createdAt: { gte: since },
      attempts: { gt: 0 },
    },
  });

  if (totalAttempted === 0) return 0;

  const totalErrors = await prisma.aIPendingAction.count({
    where: {
      organizationId,
      createdAt: { gte: since },
      attempts: { gt: 0 },
      executionError: { not: null },
    },
  });

  return totalErrors / totalAttempted;
}

/**
 * Verifica se o circuit breaker deve acionar para uma organização.
 * Se a taxa de erro for alta, reduz o nível de autonomia automaticamente.
 */
export async function checkCircuitBreaker(organizationId: string): Promise<void> {
  const currentState = CIRCUIT_BREAKER_STORE.get(organizationId) || {
    organizationId,
    state: 'CLOSED',
    lastDowngradeAt: null,
    lastUpgradeAt: null,
    lastErrorRate: 0,
    consecutiveChecks: 0,
  };

  const errorRate = await calculateRealErrorRate(organizationId);
  currentState.lastErrorRate = errorRate;

  logger.info(
    { organizationId, errorRate, state: currentState.state },
    '[CircuitBreaker] Verificando taxa de erro dos agentes',
  );

  let newState: CircuitBreakerState = { ...currentState };

  if (currentState.state === 'CLOSED' || currentState.state === 'HALF_OPEN') {
    // Verifica se deve abrir o circuito (downgrade)
    if (errorRate > ERROR_RATE_THRESHOLD_DOWNGRADE) {
      const policy = await autonomyGovernorService.getSloMetrics(organizationId, 'last_hour');
      
      // Só faz downgrade se não estiver no nível mais baixo (L0)
      if (policy.humanInterventionRatePercent < 100) {
        const previousLevel = policy.humanInterventionRatePercent === 100 ? 'L0' : 'L1';
        const newLevel = 'L0'; // Downgrade para manual total
        
        await autonomyGovernorService.updatePolicy({
          organizationId,
          globalLevel: 'L0_MANUAL',
          maxDailyOutboundCallsPerAgent: 10,
          maxHourlyMessagesPerLead: 1,
          financialAlcadaLimitCents: 1000000, // R$ 10.000,00
          requireApprovalForExternalDispatches: true,
          activeGuardrails: ['pii_masking', 'commercial_alcada', 'tone_compliance'],
        });

        newState.state = 'OPEN';
        newState.lastDowngradeAt = new Date().toISOString();
        newState.consecutiveChecks = 0;

        await domainEventMesh.publish({
          eventType: 'AUTONOMY_CIRCUIT_BREAKER_TRIPPED',
          eventVersion: '1.0.0',
          organizationId,
          correlationId: `circuit-breaker-${organizationId}`,
          producer: 'autonomy-circuit-breaker',
          aggregateId: organizationId,
          payload: {
            previousLevel,
            newLevel,
            errorRate,
            threshold: ERROR_RATE_THRESHOLD_DOWNGRADE,
            reason: `Taxa de erro (${(errorRate * 100).toFixed(1)}%) ultrapassou threshold (${(ERROR_RATE_THRESHOLD_DOWNGRADE * 100)}%)`,
          },
        });

        logger.warn(
          { organizationId, errorRate, previousLevel, newLevel },
          '[CircuitBreaker] Circuit breaker TRIPPED: autonomia reduzida devido a alta taxa de erro',
        );
      }
    } else if (errorRate < ERROR_RATE_THRESHOLD_UPGRADE) {
      // Verifica se deve fechar o circuito (upgrade/recovery)
      if (currentState.state === 'HALF_OPEN') {
        newState.consecutiveChecks++;
        
        if (newState.consecutiveChecks >= HALF_OPEN_CHECKS) {
          // Recovery: volta ao nível anterior
          await autonomyGovernorService.updatePolicy({
            organizationId,
            globalLevel: 'L2_CONDITIONAL',
            maxDailyOutboundCallsPerAgent: 100,
            maxHourlyMessagesPerLead: 3,
            financialAlcadaLimitCents: 5000000, // R$ 50.000,00
            requireApprovalForExternalDispatches: true,
            activeGuardrails: ['pii_masking', 'commercial_alcada', 'tone_compliance'],
          });

          newState.state = 'CLOSED';
          newState.lastUpgradeAt = new Date().toISOString();
          newState.consecutiveChecks = 0;

          await domainEventMesh.publish({
            eventType: 'AUTONOMY_CIRCUIT_BREAKER_RECOVERED',
            eventVersion: '1.0.0',
            organizationId,
            correlationId: `circuit-breaker-${organizationId}`,
            producer: 'autonomy-circuit-breaker',
            aggregateId: organizationId,
            payload: {
              previousLevel: 'L0',
              newLevel: 'L2',
              errorRate,
              consecutiveChecks: newState.consecutiveChecks,
              reason: `Taxa de erro estabilizada (${(errorRate * 100).toFixed(1)}%) abaixo de threshold (${(ERROR_RATE_THRESHOLD_UPGRADE * 100)}%)`,
            },
          });

          logger.info(
            { organizationId, errorRate },
            '[CircuitBreaker] Circuit breaker RECOVERED: autonomia restaurada',
          );
        }
      } else {
        // Transição de CLOSED para HALF_OPEN
        newState.state = 'HALF_OPEN';
        newState.consecutiveChecks = 1;
      }
    }
  } else if (currentState.state === 'OPEN') {
    // Em estado OPEN, tenta transitionar para HALF_OPEN se a taxa melhorou
    if (errorRate < ERROR_RATE_THRESHOLD_UPGRADE) {
      newState.state = 'HALF_OPEN';
      newState.consecutiveChecks = 1;
      
      logger.info(
        { organizationId, errorRate },
        '[CircuitBreaker] Transição OPEN → HALF_OPEN: testando recuperação',
      );
    }
  }

  CIRCUIT_BREAKER_STORE.set(organizationId, newState);
}

/**
 * Retorna o estado atual do circuit breaker para uma organização.
 */
export function getCircuitBreakerState(organizationId: string): CircuitBreakerState | null {
  return CIRCUIT_BREAKER_STORE.get(organizationId) || null;
}

/**
 * Limpa o estado do circuit breaker (útil para testes ou reset manual).
 */
export function clearCircuitBreakerState(organizationId: string): void {
  CIRCUIT_BREAKER_STORE.delete(organizationId);
}

/**
 * Executa o check do circuit breaker para todas as organizações ativas.
 * Chamado periodicamente pelo scheduler.
 */
export async function checkAllCircuitBreakers(): Promise<void> {
  const organizations = await prisma.organization.findMany({
    where: { active: true },
    select: { id: true },
  });

  for (const org of organizations) {
    try {
      await checkCircuitBreaker(org.id);
    } catch (error: any) {
      logger.error(
        { err: error, organizationId: org.id },
        '[CircuitBreaker] Falha ao verificar circuit breaker para organização',
      );
    }
  }
}
