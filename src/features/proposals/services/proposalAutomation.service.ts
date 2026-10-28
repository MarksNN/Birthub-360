import { createHash, randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  CommercialProposalDraft,
  IProposalAutomationPort,
  ProposalItem,
} from '../../../shared/contracts/proposalAutomation.contract.js';

export class ProposalAutomationService implements IProposalAutomationPort {
  private proposalsStore = new Map<string, CommercialProposalDraft>();

  // Alçada comercial padrão da organização: desconto acima de 15% requer aprovação de gestor
  private maxAllowedDiscountWithoutApprovalPercent = 15;

  /**
   * Gera rascunho de proposta comercial a partir dos termos e itens negociados.
   */
  async generateDraftProposal(params: {
    organizationId: string;
    dealId: string;
    customerId: string;
    customerName: string;
    customerDocument: string;
    title: string;
    items: ProposalItem[];
    paymentTerms: string;
    validityDays?: number;
  }): Promise<CommercialProposalDraft> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para geração de proposta');
    }

    let subtotalCents = 0;
    let totalCents = 0;
    let hasHighDiscount = false;

    const validatedItems: ProposalItem[] = params.items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPriceCents;
      const discount = item.discountPercent ?? 0;
      if (discount > this.maxAllowedDiscountWithoutApprovalPercent) {
        hasHighDiscount = true;
      }
      const itemTotal = Math.round(itemSubtotal * (1 - discount / 100));
      subtotalCents += itemSubtotal;
      totalCents += itemTotal;
      return {
        ...item,
        totalPriceCents: itemTotal,
      };
    });

    const discountCents = subtotalCents - totalCents;
    const effectiveDiscountPercent =
      subtotalCents > 0 ? Math.round((discountCents / subtotalCents) * 100) : 0;

    const requiresAlcadaApproval =
      hasHighDiscount || effectiveDiscountPercent > this.maxAllowedDiscountWithoutApprovalPercent;

    const id = `prop-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const status = requiresAlcadaApproval ? 'pending_manager_approval' : 'draft';

    const proposal: CommercialProposalDraft = {
      id,
      organizationId: params.organizationId,
      dealId: params.dealId,
      customerId: params.customerId,
      customerName: params.customerName,
      customerDocument: params.customerDocument,
      title: params.title,
      items: validatedItems,
      subtotalCents,
      discountCents,
      totalCents,
      paymentTerms: params.paymentTerms,
      validityDays: params.validityDays ?? 15,
      createdAt,
      status,
      requiresAlcadaApproval,
      alcadaApprovalReason: requiresAlcadaApproval
        ? `Desconto de ${effectiveDiscountPercent}% excede o limite máximo permitido sem aprovação (15%).`
        : undefined,
    };

    const key = `${params.organizationId}:${id}`;
    this.proposalsStore.set(key, proposal);

    await domainEventMesh.publish({
      eventType: 'COMMERCIAL_PROPOSAL_DRAFTED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `prop-${id}`,
      producer: 'proposal-automation-service',
      aggregateId: params.dealId,
      payload: {
        proposalId: id,
        dealId: params.dealId,
        totalCents,
        requiresAlcadaApproval,
        status,
      },
    });

    logger.info(
      `[ProposalAutomation] Proposta ${id} gerada para o deal ${params.dealId} no tenant ${params.organizationId}. Status: ${status}.`,
    );

    return proposal;
  }

  /**
   * Aprovação formal de alçada por gestor comercial.
   */
  async approveProposal(
    organizationId: string,
    proposalId: string,
    managerId: string,
  ): Promise<CommercialProposalDraft> {
    const key = `${organizationId}:${proposalId}`;
    const proposal = this.proposalsStore.get(key);

    if (!proposal) {
      throw new Error(`Proposta ${proposalId} não encontrada no tenant ${organizationId}`);
    }

    proposal.status = 'approved';
    proposal.requiresAlcadaApproval = false;
    proposal.alcadaApprovalReason = `Aprovado pelo gestor ${managerId} em ${new Date().toISOString()}`;
    this.proposalsStore.set(key, proposal);

    logger.info(
      `[ProposalAutomation] Proposta ${proposalId} aprovada pelo gestor ${managerId} no tenant ${organizationId}.`,
    );

    return proposal;
  }

  /**
   * Encaminha proposta aprovada para assinatura digital e sela com hash SHA-256.
   */
  async sendForDigitalSignature(params: {
    organizationId: string;
    proposalId: string;
    signerEmail: string;
    provider?: 'clicksign' | 'docusign' | 'native_vault';
  }): Promise<CommercialProposalDraft> {
    const key = `${params.organizationId}:${params.proposalId}`;
    const proposal = this.proposalsStore.get(key);

    if (!proposal) {
      throw new Error(
        `Proposta ${params.proposalId} não encontrada no tenant ${params.organizationId}`,
      );
    }

    if (proposal.status === 'pending_manager_approval') {
      throw new Error(
        `Alçada pendente: Proposta ${params.proposalId} não pode ser enviada para assinatura sem aprovação do gestor.`,
      );
    }

    // Gerar hash criptográfico determinístico do documento comercial
    const documentPayload = JSON.stringify({
      id: proposal.id,
      organizationId: proposal.organizationId,
      dealId: proposal.dealId,
      totalCents: proposal.totalCents,
      items: proposal.items,
      paymentTerms: proposal.paymentTerms,
    });
    const documentHashSha256 = createHash('sha256').update(documentPayload).digest('hex');

    const envelopeId = `env-${randomUUID()}`;
    const provider = params.provider || 'clicksign';

    proposal.status = 'sent_to_customer';
    proposal.digitalSignatureRef = {
      provider,
      envelopeId,
      documentHashSha256,
      signerEmail: params.signerEmail,
      signatureUrl: `https://${provider}.com/sign/${envelopeId}`,
    };

    this.proposalsStore.set(key, proposal);

    logger.info(
      `[ProposalAutomation] Proposta ${params.proposalId} enviada para assinatura digital (${provider}) para ${params.signerEmail}. Hash: ${documentHashSha256.substring(0, 12)}...`,
    );

    return proposal;
  }

  getProposal(organizationId: string, proposalId: string): CommercialProposalDraft | undefined {
    return this.proposalsStore.get(`${organizationId}:${proposalId}`);
  }

  clear(): void {
    this.proposalsStore.clear();
  }
}

export const proposalAutomationService = new ProposalAutomationService();
