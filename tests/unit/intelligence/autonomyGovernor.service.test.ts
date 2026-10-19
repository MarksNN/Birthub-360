import { describe, expect, it } from 'vitest';
import { AutonomyGovernorService } from '../../../src/features/intelligence/services/autonomyGovernor.service.js';

describe('AutonomyGovernorService — Evolução 12 (Governança de Autonomia, Alçadas & SLO)', () => {
  const service = new AutonomyGovernorService();
  const orgId = 'org-governor-tenant-001';

  it('deve aprovar ação autônoma dentro da alçada financeira no nível L2_CONDITIONAL', async () => {
    const evalResult = await service.evaluateAction({
      organizationId: orgId,
      agentRole: 'sdr',
      actionType: 'send_nurture_email',
      actionPayload: { leadId: 'lead-123' },
      estimatedValueCents: 1500000, // R$ 15.000,00 (abaixo do teto de R$ 50.000,00)
    });

    expect(evalResult.isAllowedAutonomously).toBe(true);
    expect(evalResult.requiresHumanReview).toBe(false);
  });

  it('deve reter ação e exigir aprovação humana quando ultrapassar a alçada financeira', async () => {
    const evalResult = await service.evaluateAction({
      organizationId: orgId,
      agentRole: 'closer',
      actionType: 'apply_custom_discount',
      actionPayload: { dealId: 'deal-vip-500' },
      estimatedValueCents: 12000000, // R$ 120.000,00 (acima do teto de R$ 50.000,00)
    });

    expect(evalResult.isAllowedAutonomously).toBe(false);
    expect(evalResult.requiresHumanReview).toBe(true);
    expect(evalResult.reason).toContain('ultrapassa a alçada');
  });

  it('deve bloquear todas as ações autônomas se a organização estiver configurada em L0_MANUAL', async () => {
    await service.updatePolicy({
      organizationId: orgId,
      globalLevel: 'L0_MANUAL',
      maxDailyOutboundCallsPerAgent: 0,
      maxHourlyMessagesPerLead: 0,
      financialAlcadaLimitCents: 0,
      requireApprovalForExternalDispatches: true,
      activeGuardrails: ['pii_masking'],
    });

    const evalResult = await service.evaluateAction({
      organizationId: orgId,
      agentRole: 'sdr',
      actionType: 'send_whatsapp',
      actionPayload: { leadId: 'lead-456' },
    });

    expect(evalResult.isAllowedAutonomously).toBe(false);
    expect(evalResult.requiresHumanReview).toBe(true);
    expect(evalResult.reason).toContain('L0');
  });

  it('deve calcular métricas de SLO consolidadas por tenant', async () => {
    const slo = await service.getSloMetrics(orgId, 'last_hour');
    expect(slo.organizationId).toBe(orgId);
    expect(slo.totalAutonomousActions).toBeDefined();
    expect(slo.humanInterventionsCount).toBeDefined();
    expect(slo.averageResponseLatencyMs).toBeLessThan(500);
  });

  it('deve rejeitar avaliação sem organizationId (Tenancy Guard)', async () => {
    await expect(
      service.evaluateAction({
        organizationId: '',
        agentRole: 'sdr',
        actionType: 'test',
        actionPayload: {},
      }),
    ).rejects.toThrow(/Tenancy violation/);
  });
});
