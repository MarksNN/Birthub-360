/**
 * Algoritmo de Rebalanceamento de Carteiras (Passo 47 / Agente 04)
 * Distribui oportunidades considerando capacidade máxima e histórico de conversão.
 */

export interface SalesRep {
  id: string;
  name: string;
  currentDeals: number;
  maxCapacity: number;
  historicalWinRate: number;
}

export interface UnassignedDeal {
  id: string;
  value: number;
}

export interface RebalanceAssignment {
  dealId: string;
  assignedRepId: string;
}

export class PortfolioRebalancerService {
  public rebalance(reps: SalesRep[], deals: UnassignedDeal[]): RebalanceAssignment[] {
    const assignments: RebalanceAssignment[] = [];
    const repLoad = reps.map((r) => ({ ...r, activeDeals: r.currentDeals }));

    for (const deal of deals) {
      // Rep com menor carga relativa e que não estourou capacidade
      const availableReps = repLoad.filter((r) => r.activeDeals < r.maxCapacity);
      if (availableReps.length === 0) break;

      // Ordena por menor carga e maior taxa histórica
      availableReps.sort((a, b) => {
        const loadRatioA = a.activeDeals / a.maxCapacity;
        const loadRatioB = b.activeDeals / b.maxCapacity;
        if (loadRatioA !== loadRatioB) return loadRatioA - loadRatioB;
        return b.historicalWinRate - a.historicalWinRate;
      });

      const selected = availableReps[0];
      selected.activeDeals += 1;

      assignments.push({
        dealId: deal.id,
        assignedRepId: selected.id,
      });
    }

    return assignments;
  }
}

export const portfolioRebalancer = new PortfolioRebalancerService();
