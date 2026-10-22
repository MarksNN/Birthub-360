/**
 * Calculador de MAPE (Mean Absolute Percentage Error) (Passo 45 / Agente 04)
 * Calcula acurácia do Oracle preditivo comparando previsto vs realizado.
 */

export interface ForecastPair {
  actual: number;
  forecast: number;
}

export class MapeCalculatorService {
  public calculateMape(pairs: ForecastPair[]): number {
    const validPairs = pairs.filter((p) => p.actual !== 0);
    if (validPairs.length === 0) return 0;

    const sumPercentageErrors = validPairs.reduce((sum, p) => {
      const error = Math.abs((p.actual - p.forecast) / p.actual);
      return sum + error;
    }, 0);

    return (sumPercentageErrors / validPairs.length) * 100;
  }
}

export const mapeCalculator = new MapeCalculatorService();
