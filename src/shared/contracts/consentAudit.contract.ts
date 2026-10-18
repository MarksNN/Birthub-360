/**
 * Contrato de Auditoria Criptográfica de Consentimento e Privacidade — Birth Hub 360°
 * Onda 01: Fundação da Inteligência Autônoma
 * Dono: Agente 18 — Contratos e API
 */

export interface ConsentAuditEvent {
  id: string;
  organizationId: string;
  subjectRef: string;
  purpose: string;
  termsVersion: string;
  previousHash: string;
  currentHash: string;
  occurredAt: string;
  operatorUserId?: string;
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  retentionUntil?: string;
}

export interface IConsentAuditChainPort {
  recordConsent(event: {
    organizationId: string;
    subjectRef: string;
    purpose: string;
    termsVersion: string;
    operatorUserId?: string;
    retentionDays?: number;
  }): Promise<ConsentAuditEvent>;

  revokeConsent(
    organizationId: string,
    subjectRef: string,
    reason: string,
    operatorUserId?: string,
  ): Promise<ConsentAuditEvent>;

  verifyChainIntegrity(organizationId: string): Promise<{
    valid: boolean;
    totalRecords: number;
    brokenAtId?: string;
  }>;
}
