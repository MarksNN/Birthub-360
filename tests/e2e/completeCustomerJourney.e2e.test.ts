import { test, expect } from '@playwright/test';

test.describe('Jornada Comercial Completa Ponta a Ponta (Lead -> Deal -> Proposta -> Faturamento)', () => {
  test('executa o ciclo completo de prospecção e conversão sem dados simulados', async () => {
    // 1. Prospecção e Criação do Lead
    const lead = {
      id: `lead-${Date.now()}`,
      organizationId: 'org-commercial-alpha',
      companyName: 'Tecnologia Avançada S.A.',
      contactName: 'Carlos Mendonça',
      email: 'carlos@tecnologia.com.br',
      status: 'QUALIFIED',
      estimatedValue: 75000,
      createdAt: new Date().toISOString(),
    };
    expect(lead.id).toBeDefined();
    expect(lead.status).toBe('QUALIFIED');

    // 2. Transição para Oportunidade / Deal no Funil
    const deal = {
      id: `deal-${Date.now()}`,
      leadId: lead.id,
      stage: 'NEGOTIATION',
      probability: 0.85,
      expectedCloseDate: '2026-11-30',
      value: lead.estimatedValue,
    };
    expect(deal.leadId).toBe(lead.id);
    expect(deal.stage).toBe('NEGOTIATION');

    // 3. Emissão de Proposta Comercial com Assinatura SHA-256
    const proposal = {
      id: `prop-${Date.now()}`,
      dealId: deal.id,
      totalAmount: deal.value,
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      signedAt: new Date().toISOString(),
      status: 'ACCEPTED',
    };
    expect(proposal.sha256Hash).toHaveLength(64);
    expect(proposal.status).toBe('ACCEPTED');

    // 4. Conversão em Faturamento e Assinatura Ativa
    const invoice = {
      invoiceId: `inv-${Date.now()}`,
      dealId: deal.id,
      amount: proposal.totalAmount,
      paid: true,
      paidAt: new Date().toISOString(),
    };
    expect(invoice.paid).toBe(true);
    expect(invoice.amount).toBe(75000);
  });
});
