import { describe, expect, it } from 'vitest';
import { autonomousSdrService } from '../../../src/features/ai-voice/server/autonomousSdr.service.js';
import { adaptiveMultichannelCadenceService } from '../../../src/features/cadence/services/adaptiveMultichannelCadence.service.js';
import { proposalAutomationService } from '../../../src/features/proposals/services/proposalAutomation.service.js';
import { autonomyGovernorService } from '../../../src/features/intelligence/services/autonomyGovernor.service.js';

describe('Onda 03 — Teste de Homologação E2E da Jornada de Autonomia Comercial', () => {
  const tenantA = 'tenant-enterprise-logistica-001';
  const tenantB = 'tenant-concorrente-varejo-002';

  it('deve executar o fluxo integrado de Autonomia Comercial ponta a ponta', async () => {
    // 1. SDR Autônomo conduz chamada ativa de qualificação dentro do horário comercial
    const sdrCall = await autonomousSdrService.initiateOutboundCall({
      organizationId: tenantA,
      leadId: 'lead-corp-100',
      leadName: 'Fernanda Diretora de Operações',
      companyName: 'TransGlobal Logística S/A',
      phoneNumber: '+5511999887766',
      sellerId: 'user-closer-ana',
      sellerEmail: 'ana.closer@birthhub.com',
      callGoal: 'Modernização de frotas e automação de roteirização',
      referenceTimestamp: new Date('2026-10-21T17:00:00Z'), // Quarta-feira 14:00 BRT
    });

    expect(sdrCall.disposition).toBe('meeting_scheduled');
    expect(sdrCall.meetingScheduled).toBeDefined();
    expect(sdrCall.meetingScheduled?.googleMeetLink).toMatch(/^https:\/\/meet\.google\.com\//);

    // 2. Matrícula na Cadência Multicanal Adaptativa
    const enrollment = await adaptiveMultichannelCadenceService.enrollLead({
      organizationId: tenantA,
      cadenceId: 'default-b2b-cadence',
      leadId: 'lead-corp-100',
      contactEmail: 'fernanda@transglobal.com.br',
      contactPhone: '+5511999887766',
    });

    expect(enrollment.status).toBe('active');
    const step1 = await adaptiveMultichannelCadenceService.executeNextStep(enrollment.enrollmentId, tenantA);
    expect(step1.success).toBe(true);
    expect(step1.channel).toBe('email');

    // 3. Geração Automática de Proposta Comercial com itens e alçada
    const proposal = await proposalAutomationService.generateDraftProposal({
      organizationId: tenantA,
      dealId: 'deal-transglobal-2026',
      customerId: 'cust-transglobal',
      customerName: 'TransGlobal Logística S/A',
      customerDocument: '33.444.555/0001-66',
      title: 'Contrato Anual Birth Hub 360 + AI Swarm',
      items: [
        {
          id: 'item-1',
          sku: 'SKU-CORE-360',
          name: 'Plataforma Core Birth Hub 360',
          quantity: 1,
          unitPriceCents: 5000000, // R$ 50.000,00
          discountPercent: 20, // 20% (excede a alçada permitida de 15%)
          totalPriceCents: 4000000,
        },
      ],
      paymentTerms: 'Faturamento em 12x via boleto bancário',
    });

    expect(proposal.status).toBe('pending_manager_approval');
    expect(proposal.requiresAlcadaApproval).toBe(true);

    // 4. Governador de Autonomia avalia a alçada financeira da proposta
    const evalResult = await autonomyGovernorService.evaluateAction({
      organizationId: tenantA,
      agentRole: 'proposal_generator',
      actionType: 'send_high_value_proposal',
      actionPayload: { proposalId: proposal.id },
      estimatedValueCents: proposal.totalCents,
    });

    expect(evalResult.requiresHumanReview).toBe(false); // R$ 40.000,00 está dentro do teto de R$ 50.000,00 do governador

    // 5. Gestor aprova formalmente a proposta e sela para assinatura digital
    const approvedProposal = await proposalAutomationService.approveProposal(
      tenantA,
      proposal.id,
      'gestor-executivo-marcelo',
    );
    expect(approvedProposal.status).toBe('approved');

    const signedProposal = await proposalAutomationService.sendForDigitalSignature({
      organizationId: tenantA,
      proposalId: approvedProposal.id,
      signerEmail: 'fernanda@transglobal.com.br',
      provider: 'clicksign',
    });

    expect(signedProposal.status).toBe('sent_to_customer');
    expect(signedProposal.digitalSignatureRef?.documentHashSha256).toBeDefined();

    // 6. Teste de Opt-Out Unificado e Supressão Cross-Channel
    const optOut = await adaptiveMultichannelCadenceService.registerOptOutAndHalt({
      organizationId: tenantA,
      leadId: 'lead-corp-100',
      channelSource: 'email',
      reason: 'Solicitação de cancelamento de envio via e-mail corporativo',
    });

    expect(optOut.halted).toBe(true);
    const suppressedStep = await adaptiveMultichannelCadenceService.executeNextStep(
      enrollment.enrollmentId,
      tenantA,
    );
    expect(suppressedStep.suppressedByOptOut).toBe(true);

    // 7. Auditoria do Painel de SLO de Autonomia do Tenant
    const slo = await autonomyGovernorService.getSloMetrics(tenantA, 'last_hour');
    expect(slo.organizationId).toBe(tenantA);
    expect(slo.averageResponseLatencyMs).toBeLessThan(500);
  });

  it('deve assegurar isolamento multi-tenant estrito entre Tenant A e Tenant B', async () => {
    const proposalA = await proposalAutomationService.generateDraftProposal({
      organizationId: tenantA,
      dealId: 'deal-tenant-a',
      customerId: 'cust-a',
      customerName: 'Empresa A',
      customerDocument: '111',
      title: 'Proposta Segredo Comercial A',
      items: [
        {
          id: 'item-1',
          sku: 'SKU-A',
          name: 'Item A',
          quantity: 1,
          unitPriceCents: 100000,
          totalPriceCents: 100000,
        },
      ],
      paymentTerms: 'À vista',
    });

    // Tenant B não pode encontrar ou consultar proposta do Tenant A
    const retrievedByB = proposalAutomationService.getProposal(tenantB, proposalA.id);
    expect(retrievedByB).toBeUndefined();

    // Tenant B não pode aprovar proposta de Tenant A
    await expect(
      proposalAutomationService.approveProposal(tenantB, proposalA.id, 'hacker-tenant-b'),
    ).rejects.toThrow(/não encontrada/);
  });
});
