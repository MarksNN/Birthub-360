/**
 * Contrato canônico para o subsistema de Rascunho Automático de Propostas Comerciais e Assinatura Digital.
 * Onda 03 — Evolução 11
 */

export interface ProposalItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  discountPercent?: number;
  totalPriceCents: number;
}

export type ProposalStatus =
  | 'draft'
  | 'pending_manager_approval'
  | 'approved'
  | 'sent_to_customer'
  | 'signed'
  | 'rejected';

export interface CommercialProposalDraft {
  id: string;
  organizationId: string;
  dealId: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  title: string;
  items: ProposalItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentTerms: string;
  validityDays: number;
  createdAt: string;
  status: ProposalStatus;
  requiresAlcadaApproval: boolean;
  alcadaApprovalReason?: string;
  digitalSignatureRef?: {
    provider: 'clicksign' | 'docusign' | 'native_vault';
    envelopeId: string;
    documentHashSha256: string;
    signerEmail: string;
    signatureUrl?: string;
  };
}

export interface IProposalAutomationPort {
  generateDraftProposal(params: {
    organizationId: string;
    dealId: string;
    customerId: string;
    customerName: string;
    customerDocument: string;
    title: string;
    items: ProposalItem[];
    paymentTerms: string;
    validityDays?: number;
  }): Promise<CommercialProposalDraft>;
  approveProposal(
    organizationId: string,
    proposalId: string,
    managerId: string,
  ): Promise<CommercialProposalDraft>;
  sendForDigitalSignature(params: {
    organizationId: string;
    proposalId: string;
    signerEmail: string;
    provider?: 'clicksign' | 'docusign' | 'native_vault';
  }): Promise<CommercialProposalDraft>;
}
