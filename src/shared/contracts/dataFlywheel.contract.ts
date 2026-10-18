/**
 * Contrato do Data Flywheel e Aprendizado Contínuo — Birth Hub 360°
 * Onda 01: Fundação da Inteligência Autônoma
 * Dono: Agente 18 — Contratos e API
 */

export type ObjectionCurationStatus =
  | 'DETECTED'
  | 'NORMALIZED'
  | 'REVIEW_REQUIRED'
  | 'VERIFIED'
  | 'PROMOTED'
  | 'REJECTED'
  | 'RETRACTED';

export interface CuratedObjectionItem {
  id: string;
  organizationId: string;
  sourceInteractionId: string;
  sourceType: 'VOICE_CALL' | 'FIELD_MEETING' | 'WHATSAPP' | 'CRM_NOTE';
  category: string;
  commercialContext: string;
  segment: string;
  detectedAt: string;
  confidenceScore: number; // 0.0 a 1.0
  version: number;
  curationStatus: ObjectionCurationStatus;
  anonymizedEvidence: string;
  retentionUntil?: string;
  suggestedResponse?: string;
  reviewNotes?: string;
  promotedToPlaybookAt?: string;
  promotedByUserId?: string;
}

export interface FewShotCopyItem {
  id: string;
  organizationId: string;
  channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL';
  segment: string;
  approachText: string;
  outcomeStatus: 'REPLY_RECEIVED' | 'MEETING_SCHEDULED' | 'DEAL_WON';
  attributionEvidence: {
    leadId: string;
    dealId?: string;
    conversionWindowDays: number;
    metrics: Record<string, unknown>;
  };
  confidence: number;
  promotedAt: string;
  isActive: boolean;
}

export interface ICuratedObjectionPort {
  ingestDetectedObjection(
    objection: Omit<CuratedObjectionItem, 'id' | 'version' | 'curationStatus'>,
  ): Promise<CuratedObjectionItem>;
  promoteObjection(
    organizationId: string,
    id: string,
    userId: string,
  ): Promise<CuratedObjectionItem>;
  retractObjection(
    organizationId: string,
    id: string,
    reason: string,
  ): Promise<CuratedObjectionItem>;
  listEligibleForRoleplay(
    organizationId: string,
    segment?: string,
  ): Promise<CuratedObjectionItem[]>;
}
