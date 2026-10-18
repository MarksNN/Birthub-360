import { logger } from '../../logger.js';
import { resolveModelName } from './model-routing.js';

export type TaskComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ModelCascadeRecommendation {
  selectedModel: string;
  fallbackModel: string;
  complexity: TaskComplexity;
  estimatedCostPer1kTokensUsd: number;
  expectedLatencyMs: number;
  reasoning: string;
}

const COMPLEXITY_MAP: Record<string, TaskComplexity> = {
  // Baixa complexidade: tagging, extração simples, classificação de tom
  intent: 'LOW',
  classification: 'LOW',
  tagging: 'LOW',
  sentiment: 'LOW',
  'pii-detection': 'LOW',

  // Média complexidade: sumarização, copy de abordagem, análise de notas
  summarization: 'MEDIUM',
  'social-selling': 'MEDIUM',
  'meeting-notes': 'MEDIUM',
  'email-draft': 'MEDIUM',

  // Alta complexidade: raciocínio avançado, avaliação profunda de Roleplay, síntese multi-evidência
  'roleplay-eval': 'HIGH',
  'win-loss-synthesis': 'HIGH',
  'complex-reasoning': 'HIGH',
  'objection-deep-analysis': 'HIGH',
};

export class ModelCascadeRouter {
  /**
   * Determina a complexidade de uma tarefa comercial.
   */
  inferComplexity(taskType: string, userHint?: TaskComplexity): TaskComplexity {
    if (userHint) return userHint;
    const normalized = taskType.toLowerCase().trim();
    return COMPLEXITY_MAP[normalized] || 'MEDIUM';
  }

  /**
   * Roteia a requisição para o modelo com melhor custo-benefício (Predictive FinOps Model Cascade).
   */
  route(taskType: string, userHint?: TaskComplexity): ModelCascadeRecommendation {
    const complexity = this.inferComplexity(taskType, userHint);

    switch (complexity) {
      case 'LOW':
        return {
          selectedModel: resolveModelName('local-llama3-fast'),
          fallbackModel: resolveModelName('local-llama3'),
          complexity: 'LOW',
          estimatedCostPer1kTokensUsd: 0.0001,
          expectedLatencyMs: 250,
          reasoning: 'Tarefa de baixa complexidade roteada para modelo rápido/econômico',
        };

      case 'MEDIUM':
        return {
          selectedModel: resolveModelName('local-llama3'),
          fallbackModel: resolveModelName('gpt-4o-mini'),
          complexity: 'MEDIUM',
          estimatedCostPer1kTokensUsd: 0.0006,
          expectedLatencyMs: 600,
          reasoning: 'Tarefa de média complexidade com geração contextual balanceada',
        };

      case 'HIGH':
      default:
        return {
          selectedModel: resolveModelName('gpt-4o'),
          fallbackModel: resolveModelName('claude-sonnet'),
          complexity: 'HIGH',
          estimatedCostPer1kTokensUsd: 0.005,
          expectedLatencyMs: 1400,
          reasoning: 'Tarefa de alta complexidade com raciocínio analítico profundo e avaliação pedagógica',
        };
    }
  }
}

export const modelCascadeRouter = new ModelCascadeRouter();
