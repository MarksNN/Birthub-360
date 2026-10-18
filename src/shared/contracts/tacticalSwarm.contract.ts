/**
 * Contrato Canônico para o Swarm Tático de Apoio Comercial.
 * Onda 02 — Eixo 11 (Multi-Agent Tactical Swarm)
 * Dono: Agente 18 — Contratos e API
 */

export interface AccountDossierSection {
  title: string;
  content: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AccountExecutiveDossier {
  companyId: string;
  companyName: string;
  cnpj?: string;
  organizationId: string;
  generatedAt: string;
  summary: string;
  verifiedFacts: Array<{ label: string; value: string; source: string; verifiedAt: string }>;
  recentSignals: Array<{ signalType: string; summary: string; date: string; sourceUrl?: string }>;
  commercialRisks: Array<{
    description: string;
    severity: 'high' | 'medium' | 'low';
    evidence: string;
  }>;
  identifiedOpportunities: Array<{ angle: string; rationale: string; estimatedPotential?: string }>;
  knownDecisionMakers: Array<{
    name: string;
    role: string;
    influenceLevel: string;
    confirmed: boolean;
  }>;
  painHypotheses: Array<{ hypothesis: string; rationale: string; isHypothesisOnly: true }>;
  recommendedDiscoveryQuestions: string[];
  sourcesAndConfidence: {
    sourcesUsed: string[];
    overallConfidence: 'high' | 'medium' | 'low';
    dataFreshness: string;
  };
}

export interface CommercialPromiseCommitment {
  id: string;
  organizationId: string;
  dealId?: string;
  leadId?: string;
  sourceInteractionId: string;
  sourceType: 'meeting' | 'voice_call' | 'whatsapp' | 'email';
  promiserName: string; // Vendedor responsável
  recipientName: string; // Cliente
  description: string;
  commitmentType:
    | 'send_proposal'
    | 'send_documentation'
    | 'return_call'
    | 'share_case_study'
    | 'confirm_commercial_discount'
    | 'schedule_demo'
    | 'answer_technical_question';
  dueDate: string; // ISO 8601
  evidenceSnippet: string;
  confidence: 'confirmed' | 'probable' | 'ambiguous';
  suggestedCrmTaskId?: string;
  approvalStatus: 'pending_human_review' | 'approved' | 'rejected';
  detectedAt: string;
}

export interface DevilsAdvocateAnalysis {
  dealId: string;
  dealTitle: string;
  organizationId: string;
  currentStage: string;
  currentForecastCategory: string;
  declaredCloseDate: string;
  analysisDate: string;
  optimismBiasDetected: boolean;
  overallHealthScore: number; // 0 a 100
  criticalObjectionsUnresolved: string[];
  competitorThreats: Array<{
    competitor: string;
    threatLevel: 'high' | 'medium' | 'low';
    notes: string;
  }>;
  stagnationMetrics: {
    daysInCurrentStage: number;
    daysSinceLastInteraction: number;
    stageAverageDays: number;
    isStagnant: boolean;
  };
  forecastRevisionRecommendation: {
    recommendedAction:
      | 'maintain'
      | 'downgrade_probability'
      | 'delay_close_date'
      | 'flag_as_at_risk';
    currentProbability: number;
    recommendedProbability: number;
    rationale: string;
    evidence: string[];
    uncertaintyLevel: 'high' | 'medium' | 'low';
  };
}

export interface IAccountDetectivePort {
  generateExecutiveDossier(
    organizationId: string,
    companyId: string,
  ): Promise<AccountExecutiveDossier>;
}

export interface PromiseApprovalResult {
  success: boolean;
  status: 'APPROVED' | 'REJECTED';
  crmTaskId?: string;
  commitment?: CommercialPromiseCommitment;
}

export interface IPromiseGuardianPort {
  extractCommitmentsFromInteraction(params: {
    organizationId: string;
    interactionId: string;
    sourceType: 'meeting' | 'voice_call' | 'whatsapp' | 'email';
    content: string;
    sellerName: string;
    leadId?: string;
    dealId?: string;
  }): Promise<CommercialPromiseCommitment[]>;
  approveCommitment(
    organizationId: string,
    commitmentId: string,
    approvedBy?: string,
  ): Promise<PromiseApprovalResult>;
}

export interface IDevilsAdvocatePort {
  evaluateDealForecast(organizationId: string, dealId: string): Promise<DevilsAdvocateAnalysis>;
}
