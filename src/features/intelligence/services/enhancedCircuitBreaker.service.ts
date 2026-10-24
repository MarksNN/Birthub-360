import { logger } from '../../../lib/logger.js';

/**
 * Circuit Breaker Melhorado
 * Degradação automática com múltiplos níveis e recuperação inteligente
 */

export interface CircuitBreakerState {
  organizationId: string;
  agentType: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  degradationLevel: 0 | 1 | 2 | 3; // 0=normal, 1=reduced, 2=readonly, 3=blocked
}

const states = new Map<string, CircuitBreakerState>();

export function getEnhancedCircuitBreakerState(
  organizationId: string,
  agentType: string,
): CircuitBreakerState {
  const key = `${organizationId}:${agentType}`;
  return states.get(key) || {
    organizationId,
    agentType,
    state: 'CLOSED',
    failureCount: 0,
    successCount: 0,
    lastFailureAt: null,
    lastSuccessAt: null,
    degradationLevel: 0,
  };
}

export function recordEnhancedFailure(
  organizationId: string,
  agentType: string,
): void {
  const key = `${organizationId}:${agentType}`;
  const state = states.get(key) || getEnhancedCircuitBreakerState(organizationId, agentType);
  
  state.failureCount++;
  state.lastFailureAt = new Date().toISOString();
  
  if (state.failureCount >= 5) {
    state.state = 'OPEN';
    state.degradationLevel = Math.min(state.degradationLevel + 1, 3);
  }
  
  states.set(key, state);
  logger.warn({ organizationId, agentType, state }, '[EnhancedCircuitBreaker] Falha registrada');
}

export function recordEnhancedSuccess(
  organizationId: string,
  agentType: string,
): void {
  const key = `${organizationId}:${agentType}`;
  const state = states.get(key) || getEnhancedCircuitBreakerState(organizationId, agentType);
  
  state.successCount++;
  state.lastSuccessAt = new Date().toISOString();
  
  if (state.state === 'OPEN' && state.successCount >= 3) {
    state.state = 'HALF_OPEN';
  }
  
  if (state.state === 'HALF_OPEN' && state.successCount >= 5) {
    state.state = 'CLOSED';
    state.degradationLevel = Math.max(state.degradationLevel - 1, 0);
    state.failureCount = 0;
    state.successCount = 0;
  }
  
  states.set(key, state);
}
