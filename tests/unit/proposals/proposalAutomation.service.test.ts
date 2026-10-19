import { describe, expect, it } from 'vitest';
import { ProposalAutomationService } from '../../../src/features/proposals/services/proposalAutomation.service.js';

describe('ProposalAutomationService — Evolução 11 (Automação de Propostas & Assinatura Digital)', () => {
  const service = new ProposalAutomationService();
  const orgId = 'org-propostas-tenant-001';

  it('deve gerar rascunho de proposta sem exceder alçada', async () => {
    const proposal = await service.generateDraftProposal({
      organizationId: orgId,
      dealId: 'deal-prop-101',
      customerId: 'cust-trans-44',
      customerName: 'TransPaulista Distribuidora',
      customerDocument: '11.222.333/0001-44',
      title: 'Plataforma Birth Hub 360 - 40 Licenças Telemetria',
      items: [
        {
          id: 'item-1',
          sku: 'SKU-PLAT-360',
          name: 'Licença Anual Birth Hub 360',
          quantity: 40,
          unitPriceCents: 20000, // R$ 200,00
          discountPercent: 10, // 10% (dentro da alçada de 15%)
          totalPriceCents: 720000,
        },
      ],
      paymentTerms: '12 parcelas mensais via boleto bancário',
      validityDays: 15,
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('draft');
    expect(proposal.requiresAlcadaApproval).toBe(false);
    expect(proposal.totalCents).toBe(720000);
    expect(proposal.discountCents).toBe(80000);
  });

  it('deve reter proposta em pending_manager_approval quando desconto excede alçada (15%)', async () => {
    const proposal = await service.generateDraftProposal({
      organizationId: orgId,
      dealId: 'deal-prop-high-discount',
      customerId: 'cust-trans-55',
      customerName: 'Viação Rio Express',
      customerDocument: '22.333.444/0001-55',
      title: 'Condição Especial Fechamento Trimestre',
      items: [
        {
          id: 'item-1',
          sku: 'SKU-PLAT-360',
          name: 'Licença Anual Birth Hub 360',
          quantity: 100,
          unitPriceCents: 20000,
          discountPercent: 25, // 25% (excede alçada de 15%)
          totalPriceCents: 1500000,
        },
      ],
      paymentTerms: 'À vista com desconto especial',
    });

    expect(proposal.status).toBe('pending_manager_approval');
    expect(proposal.requiresAlcadaApproval).toBe(true);
    expect(proposal.alcadaApprovalReason).toContain('excede o limite');

    // Tentativa de enviar para assinatura deve falhar por alçada pendente
    await expect(
      service.sendForDigitalSignature({
        organizationId: orgId,
        proposalId: proposal.id,
        signerEmail: 'diretor@viacaorio.com.br',
      }),
    ).rejects.toThrow(/Alçada pendente/);

    // Gestor aprova formalmente
    const approved = await service.approveProposal(orgId, proposal.id, 'gestor-carlos-12');
    expect(approved.status).toBe('approved');
    expect(approved.requiresAlcadaApproval).toBe(false);

    // Agora o envio para assinatura digital deve ter sucesso
    const signedRef = await service.sendForDigitalSignature({
      organizationId: orgId,
      proposalId: proposal.id,
      signerEmail: 'diretor@viacaorio.com.br',
      provider: 'clicksign',
    });

    expect(signedRef.status).toBe('sent_to_customer');
    expect(signedRef.digitalSignatureRef).toBeDefined();
    expect(signedRef.digitalSignatureRef?.documentHashSha256).toBeDefined();
    expect(signedRef.digitalSignatureRef?.envelopeId).toBeDefined();
  });

  it('deve rejeitar geração sem organizationId (Tenancy Guard)', async () => {
    await expect(
      service.generateDraftProposal({
        organizationId: '',
        dealId: 'deal-invalid',
        customerId: 'cust-1',
        customerName: 'Empresa',
        customerDocument: '123',
        title: 'Proposta',
        items: [],
        paymentTerms: '30 dias',
      }),
    ).rejects.toThrow(/Tenancy violation/);
  });
});
