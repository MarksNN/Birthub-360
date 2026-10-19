/**
 * Contrato Canônico do ROI Simulator & Business Case — Birth Hub 360°
 * Onda 03: Autonomia Comercial Inteligente
 * Dono: Agente 18 — Contratos e API
 */

export interface RoiSimulationInput {
  organizationId: string;
  prospectName: string;
  segment: string;
  companySize: 'small' | 'medium' | 'enterprise';
  affectedEmployees: number;
  averageHourlyCost: number; // R$/hora
  hoursSpentPerActivityMonthly: number;
  initialInvestment: number; // R$ implantação / setup
  monthlyRecurringCost: number; // R$ mensalidade software / serviço
  currentMonthlyOperationalLoss?: number;
  currentConversionRatePercent?: number;
  expectedEfficiencyGainPercent: number; // ex: 25% de redução de tempo
  expectedConversionLiftPercent?: number;
  deploymentPeriodMonths?: number;
}

export interface ScenarioCalculation {
  scenarioName: 'Conservador' | 'Base' | 'Otimista';
  assumptions: string[];
  monthlyHoursSaved: number;
  monthlyEstimatedSavings: number;
  monthlyNetBenefit: number;
  annualNetBenefit: number;
  roiPercent: number; // percentual anualizado
  paybackMonths: number | null; // null se benefício líquido periódico <= 0
  breakEvenMonth: number | null;
}

export interface RoiSimulationResult {
  simulationId: string;
  organizationId: string;
  prospectName: string;
  calculatedAt: string;
  baseScenario: ScenarioCalculation;
  scenarios: {
    conservative: ScenarioCalculation;
    base: ScenarioCalculation;
    optimistic: ScenarioCalculation;
  };
  sensitivityAnalysis: Array<{
    variableName: string;
    variationPercent: number;
    resultingRoiPercent: number;
    resultingPaybackMonths: number | null;
  }>;
}

export interface BusinessCaseSection {
  title: string;
  content: string;
  metrics?: Record<string, string | number>;
}

export interface BusinessCaseReport {
  id: string;
  organizationId: string;
  prospectName: string;
  executiveDiagnosis: string;
  economicProblemStatement: string;
  inputAssumptions: RoiSimulationInput;
  simulationResult: RoiSimulationResult;
  financialRisksAndMitigations: Array<{
    risk: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigation: string;
  }>;
  dataSourcesAndLimitations: {
    sources: string[];
    limitations: string[];
    isEstimated: true;
  };
  nextStepsProposal: string[];
  generatedAt: string;
}

export interface IRoiSimulatorPort {
  calculateRoi(input: RoiSimulationInput): Promise<RoiSimulationResult>;
  generateBusinessCase(input: RoiSimulationInput): Promise<BusinessCaseReport>;
}
