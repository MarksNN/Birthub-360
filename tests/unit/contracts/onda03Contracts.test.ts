import { describe, expect, it } from 'vitest';
import type {
  ScheduledMeetingProposal,
  SdrCallExecutionResult,
  SdrCallInput,
} from '../../../src/shared/contracts/autonomousSdr.contract.js';
import type {
  CadenceStep,
  MultichannelCadenceEnrollment,
  StepDispatchResult,
} from '../../../src/shared/contracts/multichannelCadence.contract.js';
import type {
  CommercialProposalDraft,
  ProposalItem,
} from '../../../src/shared/contracts/proposalAutomation.contract.js';
import type {
  AgentActionEvaluation,
  AgentSloMetrics,
  AutonomyPolicyConfig,
} from '../../../src/shared/contracts/autonomyLimits.contract.js';

describe('Onda 03 — Canonical Contracts Type & Structure Validation', () => {
  it('Evolução 09: valida contratos de SDR Autônomo e Agendamento', () => {
    const input: SdrCallInput = {
      organizationId: 'org-test',
      leadId: 'lead-123',
      leadName: 'Carlos Diretor',
      companyName: 'Transportes Expresso',
      phoneNumber: '+5511999998888',
      sellerId: 'user-seller-1',
      sellerEmail: 'seller@birthhub.com',
    };
    expect(input.organizationId).toBe('org-test');

    const result: SdrCallExecutionResult = {
      callId: 'call-1',
      organizationId: 'org-test',
      leadId: 'lead-123',
      executedAt: new Date().toISOString(),
      durationSeconds: 180,
      disposition: 'meeting_scheduled',
      qualification: 'qualified',
      qualificationNotes: 'Lead qualificado com interesse em telemetria',
      wasWithinAllowedHours: true,
    };
    expect(result.disposition).toBe('meeting_scheduled');
    expect(result.wasWithinAllowedHours).toBe(true);
  });

  it('Evolução 10: valida contratos de Cadência Multicanal Adaptativa e Opt-Out', () => {
    const enrollment: MultichannelCadenceEnrollment = {
      enrollmentId: 'enr-1',
      organizationId: 'org-test',
      cadenceId: 'cad-b2b',
      leadId: 'lead-456',
      contactEmail: 'cliente@frota.com.br',
      contactPhone: '+5511988887777',
      currentStep: 1,
      status: 'active',
      enrolledAt: new Date().toISOString(),
    };
    expect(enrollment.status).toBe('active');

    const dispatch: StepDispatchResult = {
      stepNumber: 1,
      channel: 'email',
      executedAt: new Date().toISOString(),
      success: true,
      suppressedByOptOut: false,
    };
    expect(dispatch.suppressedByOptOut).toBe(false);
  });

  it('Evolução 11: valida contratos de Rascunho de Propostas e Assinatura Digital', () => {
    const item: ProposalItem = {
      id: 'item-1',
      sku: 'SKU-TELEMETRIA-PRO',
      name: 'Licença Anual Telemetria',
      quantity: 50,
      unitPriceCents: 10000,
      totalPriceCents: 500000,
    };

    const draft: CommercialProposalDraft = {
      id: 'prop-1',
      organizationId: 'org-test',
      dealId: 'deal-789',
      customerId: 'cust-1',
      customerName: 'Logística Rápida',
      customerDocument: '12.345.678/0001-90',
      title: 'Proposta Comercial Telemetria',
      items: [item],
      subtotalCents: 500000,
      discountCents: 0,
      totalCents: 500000,
      paymentTerms: 'Boleto 30 dias',
      validityDays: 15,
      createdAt: new Date().toISOString(),
      status: 'draft',
      requiresAlcadaApproval: false,
    };

    expect(draft.totalCents).toBe(500000);
    expect(draft.requiresAlcadaApproval).toBe(false);
  });

  it('Evolução 12: valida contratos de Limites de Autonomia e Painel de SLO', () => {
    const policy: AutonomyPolicyConfig = {
      organizationId: 'org-test',
      globalLevel: 'L2_CONDITIONAL',
      maxDailyOutboundCallsPerAgent: 100,
      maxHourlyMessagesPerLead: 3,
      financialAlcadaLimitCents: 5000000,
      requireApprovalForExternalDispatches: true,
      activeGuardrails: ['pii_masking', 'commercial_alcada'],
    };
    expect(policy.globalLevel).toBe('L2_CONDITIONAL');

    const evalResult: AgentActionEvaluation = {
      actionId: 'eval-1',
      organizationId: 'org-test',
      agentRole: 'sdr',
      actionType: 'send_proposal',
      isAllowedAutonomously: false,
      requiresHumanReview: true,
      reason: 'Excede alçada',
      evaluatedAt: new Date().toISOString(),
    };
    expect(evalResult.requiresHumanReview).toBe(true);
  });
});
