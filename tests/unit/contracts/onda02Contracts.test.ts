import { describe, expect, it } from 'vitest';
import type {
  AccountGraphView,
  GraphEdge,
  GraphNode,
  MultiThreadingApproach,
} from '../../../src/shared/contracts/accountKnowledgeGraph.contract.js';
import type {
  CommitteeAnalysis,
  CommitteeMember,
} from '../../../src/shared/contracts/decisionCommittee.contract.js';
import type {
  EnrichedFitScoreResult,
  FitScoreInput,
} from '../../../src/shared/contracts/fitScore.contract.js';
import type {
  MarketSignalEnvelope,
  SignalQueryFilter,
} from '../../../src/shared/contracts/marketSignals.contract.js';
import type {
  AccountExecutiveDossier,
  CommercialPromiseCommitment,
  DevilsAdvocateAnalysis,
} from '../../../src/shared/contracts/tacticalSwarm.contract.js';
import type {
  CuratedLearningCandidate,
  WinLossAutopsyReport,
} from '../../../src/shared/contracts/winLossAutopsy.contract.js';

describe('Onda 02 — Canonical Contracts Type & Structure Validation', () => {
  it('Eixo 6: valida estrutura de tipos do Grafo de Conhecimento e Multi-Threading', () => {
    const node: GraphNode = {
      id: 'acc-100',
      organizationId: 'tenant-test',
      type: 'account',
      label: 'Acme Global',
      properties: { segment: 'Logística' },
    };
    expect(node.type).toBe('account');

    const edge: GraphEdge = {
      id: 'edge-1',
      organizationId: 'tenant-test',
      sourceId: 'cont-1',
      targetId: 'acc-100',
      type: 'DECISION_MAKER_FOR',
      confidence: 'confirmed',
      source: 'crm',
      discoveredAt: new Date().toISOString(),
    };
    expect(edge.confidence).toBe('confirmed');

    const approach: MultiThreadingApproach = {
      roleCategory: 'technical_buyer',
      targetContactId: 'cont-1',
      targetContactName: 'Carlos Silva',
      targetRole: 'CTO',
      strategicAngle: 'Arquitetura e Segurança',
      keyArguments: ['Conectores nativos', 'Conformidade LGPD'],
      recommendedChannels: ['linkedin', 'email'],
      suggestedOpeningDraft: 'Olá Carlos, analisamos sua arquitetura...',
    };
    expect(approach.roleCategory).toBe('technical_buyer');
  });

  it('Eixo 11: valida contratos das 3 competências do Swarm Tático', () => {
    const dossier: AccountExecutiveDossier = {
      companyId: 'comp-10',
      companyName: 'Tech Brasil S/A',
      organizationId: 'tenant-test',
      generatedAt: new Date().toISOString(),
      summary: 'Dossiê estruturado com 10 seções',
      verifiedFacts: [{ label: 'CNPJ', value: '00.000.000/0001-91', source: 'RFB', verifiedAt: '2026-10-18' }],
      recentSignals: [],
      commercialRisks: [],
      identifiedOpportunities: [],
      knownDecisionMakers: [],
      painHypotheses: [{ hypothesis: 'Gargalo operacional', rationale: 'Setorial', isHypothesisOnly: true }],
      recommendedDiscoveryQuestions: ['Qual é a prioridade do trimestre?'],
      sourcesAndConfidence: { sourcesUsed: ['RFB'], overallConfidence: 'high', dataFreshness: '2026-10-18' },
    };
    expect(dossier.painHypotheses[0].isHypothesisOnly).toBe(true);

    const promise: CommercialPromiseCommitment = {
      id: 'prom-1',
      organizationId: 'tenant-test',
      sourceInteractionId: 'meeting-1',
      sourceType: 'meeting',
      promiserName: 'Vendedor 1',
      recipientName: 'Cliente',
      description: 'Envio de proposta comercial',
      commitmentType: 'send_proposal',
      dueDate: new Date().toISOString(),
      evidenceSnippet: 'vou te mandar a proposta até sexta',
      confidence: 'confirmed',
      approvalStatus: 'pending_human_review',
      detectedAt: new Date().toISOString(),
    };
    expect(promise.approvalStatus).toBe('pending_human_review');

    const devilsAdvocate: DevilsAdvocateAnalysis = {
      dealId: 'deal-10',
      dealTitle: 'Contrato Anual ERP',
      organizationId: 'tenant-test',
      currentStage: 'Proposta',
      currentForecastCategory: 'Comprometido',
      declaredCloseDate: '2026-10-30',
      analysisDate: '2026-10-18',
      optimismBiasDetected: true,
      overallHealthScore: 45,
      criticalObjectionsUnresolved: ['Preço acima do budget'],
      competitorThreats: [],
      stagnationMetrics: { daysInCurrentStage: 20, daysSinceLastInteraction: 12, stageAverageDays: 7, isStagnant: true },
      forecastRevisionRecommendation: {
        recommendedAction: 'downgrade_probability',
        currentProbability: 80,
        recommendedProbability: 40,
        rationale: 'Estagnação e objeção pendente',
        evidence: ['20 dias na mesma etapa'],
        uncertaintyLevel: 'low',
      },
    };
    expect(devilsAdvocate.optimismBiasDetected).toBe(true);
  });

  it('Eixo 12: valida envelope e filtros de Sinais de Mercado', () => {
    const signal: MarketSignalEnvelope = {
      id: 'sig-1',
      organizationId: 'tenant-test',
      companyName: 'Logística Express',
      signalType: 'regulatory_change',
      source: 'official_gazette',
      title: 'Resolução ANTT nº 6.000',
      summary: 'Novas exigências de rastreamento de carga',
      confidence: 'high',
      detectedAt: new Date().toISOString(),
    };
    expect(signal.signalType).toBe('regulatory_change');
  });

  it('Eixo 19: valida contrato de Autópsia Forense de Win-Loss com as 9 seções', () => {
    const candidate: CuratedLearningCandidate = {
      title: 'Objeção de Migração de Legado',
      objectionPattern: 'Sistema legado já atende e migração é cara',
      recommendedCounterMeasure: 'Demonstrar API bridge sem desligamento abrupto',
      curationStatus: 'proposed',
      targetAudience: 'closer',
    };
    expect(candidate.curationStatus).toBe('proposed');

    const autopsy: Partial<WinLossAutopsyReport> = {
      id: 'autopsy-1',
      outcome: 'DEAL_LOST',
      sectionA_Timeline: [],
      sectionB_PositiveSignals: ['Interesse na demo'],
      sectionC_NegativeSignalsAndObjections: ['Custo de setup'],
      sectionD_FactorHypotheses: [
        {
          factor: 'Restrição orçamentária',
          category: 'pricing',
          contributionType: 'primary_hypothesis',
          confidenceScore: 0.8,
          evidenceRefs: ['Mensagem WhatsApp do lead'],
        },
      ],
      sectionE_AuditableEvidences: [],
      sectionF_InformationGaps: [],
      sectionG_ProcessRecommendations: [],
      sectionH_CuratedLearningCandidates: [candidate],
      sectionI_ActionPlan: { playbookActions: [], roleplayScenarios: [], revOpsAdjustments: [] },
      humanReviewStatus: 'pending',
    };
    expect(autopsy.outcome).toBe('DEAL_LOST');
    expect(autopsy.sectionD_FactorHypotheses?.[0].contributionType).toBe('primary_hypothesis');
  });
});
