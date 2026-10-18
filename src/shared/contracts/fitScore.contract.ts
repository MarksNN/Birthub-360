/**
 * Contrato canônico para o subsistema de FitScore Preditivo e Calibração ICP.
 * Onda 02 — Evolução 07
 */

import type {
  FitScoreInput,
  ScoreBreakdownItem,
} from '../../features/prospecting/services/enrichment/fitScore.js';

export type FitScoreGrade = 'A' | 'B' | 'C' | 'D';

export interface EnrichedFitScoreResult {
  score: number;
  temperature: 'Quente' | 'Morno' | 'Frio';
  grade: FitScoreGrade;
  breakdown: ScoreBreakdownItem[];
  explanation: string;
  calculatedAt: string;
}

export interface IFitScorePort {
  calculateScore(input: FitScoreInput): EnrichedFitScoreResult;
  batchCalculateScores(
    inputs: Array<{ id: string; data: FitScoreInput }>,
  ): Record<string, EnrichedFitScoreResult>;
}
