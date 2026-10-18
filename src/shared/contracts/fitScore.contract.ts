/**
 * Contrato canônico para o subsistema de FitScore Preditivo e Calibração ICP.
 * Onda 02 — Evolução 07
 */

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  detail: string;
}

export interface FitScoreInput {
  situacaoCadastral?: string | null;
  capitalSocial?: number | null;
  employeeCountEstimate?: number | null;
  size?: string | null;
  cnaeDescription?: string | null;
  segmentKeywords?: string[];
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  fleetSizeHint?: string | null;
  technologies?: string[] | null;
}

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
