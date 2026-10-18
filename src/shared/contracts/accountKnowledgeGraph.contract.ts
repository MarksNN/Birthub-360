/**
 * Contrato canônico para o Grafo Semântico de Contas, Empresas e Decisores.
 * Onda 02 — Eixo 6 (Knowledge Graph)
 */

export type GraphNodeType = 'account' | 'company' | 'contact' | 'deal' | 'competitor' | 'product';

export type GraphRelationshipType =
  | 'WORKS_AT'
  | 'REPORTS_TO'
  | 'DECISION_MAKER_FOR'
  | 'INFLUENCES'
  | 'PREVIOUSLY_WORKED_AT'
  | 'PARTICIPATED_IN_MEETING'
  | 'RELATED_TO_DEAL'
  | 'MENTIONED_COMPETITOR'
  | 'REFERRED_BY'
  | 'HAS_COMMERCIAL_INTEREST';

export type RelationshipConfidence = 'confirmed' | 'inferred' | 'hypothesis';

export interface GraphNode {
  id: string;
  organizationId: string;
  type: GraphNodeType;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  organizationId: string;
  sourceId: string;
  targetId: string;
  type: GraphRelationshipType;
  confidence: RelationshipConfidence;
  source: string; // ex: 'crm', 'apollo', 'voicehub_meeting', 'user_input'
  discoveredAt: string;
  validUntil?: string;
  properties?: Record<string, unknown>;
}

export interface MultiThreadingApproach {
  roleCategory: 'technical_buyer' | 'financial_buyer' | 'executive_sponsor' | 'influencer';
  targetContactId: string;
  targetContactName: string;
  targetRole: string;
  strategicAngle: string;
  keyArguments: string[];
  recommendedChannels: ('linkedin' | 'email' | 'call')[];
  suggestedOpeningDraft: string; // Rascunho para aprovação humana (nunca envio autônomo)
}

export interface AccountGraphView {
  account: GraphNode;
  relatedCompanies: GraphNode[];
  contacts: GraphNode[];
  deals: GraphNode[];
  edges: GraphEdge[];
  completenessMetrics: {
    decisionMakerIdentified: boolean;
    championIdentified: boolean;
    blockerRiskDetected: boolean;
    multiThreadingReadiness: number; // 0 a 100
  };
  recommendedApproaches?: MultiThreadingApproach[];
}

export interface IAccountKnowledgeGraphPort {
  getAccountGraph(organizationId: string, accountId: string): Promise<AccountGraphView>;
  addRelationship(edge: Omit<GraphEdge, 'id' | 'discoveredAt'>): Promise<GraphEdge>;
  removeRelationship(organizationId: string, edgeId: string): Promise<boolean>;
  generateMultiThreadingStrategy(organizationId: string, accountId: string): Promise<MultiThreadingApproach[]>;
}
