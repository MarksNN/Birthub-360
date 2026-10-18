import { beforeEach, describe, expect, it } from 'vitest';
import { CommercialLearningFlywheelService } from '../../../../src/features/intelligence/services/commercialLearningFlywheel.service.js';

describe('CommercialLearningFlywheelService Unit Tests', () => {
  let flywheel: CommercialLearningFlywheelService;

  beforeEach(() => {
    flywheel = new CommercialLearningFlywheelService();
    flywheel.clear();
  });

  it('should record sent approach with tracking details', async () => {
    const record = await flywheel.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-100',
      channel: 'LINKEDIN',
      segment: 'Saúde',
      approachText: 'Olá Dr., vimos a recente expansão da sua clínica...',
    });

    expect(record.id).toMatch(/^appr-/);
    expect(record.leadId).toBe('lead-100');
    expect(record.channel).toBe('LINKEDIN');
  });

  it('should qualify approach as few-shot when outcome is within attribution window', async () => {
    await flywheel.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-200',
      channel: 'WHATSAPP',
      segment: 'Logística',
      approachText: 'Reduza sinistros em 35% com monitoramento em tempo real',
    });

    // Reunião agendada 3 dias após a abordagem
    const outcome = await flywheel.evaluateCommercialOutcome({
      organizationId: 'org-1',
      leadId: 'lead-200',
      outcomeType: 'MEETING_SCHEDULED',
    });

    expect(outcome).not.toBeNull();
    expect(outcome?.outcomeStatus).toBe('MEETING_SCHEDULED');
    expect(outcome?.attributionEvidence.leadId).toBe('lead-200');
    expect(outcome?.attributionEvidence.conversionWindowDays).toBeLessThanOrEqual(1);

    const fewShots = await flywheel.getFewShotExamples('org-1', 'WHATSAPP', 'Logística');
    expect(fewShots).toHaveLength(1);
    expect(fewShots[0].approachText).toContain('Reduza sinistros');
  });

  it('should reject qualification when outcome is beyond the attribution window (>30 days)', async () => {
    await flywheel.recordApproachSent({
      organizationId: 'org-1',
      leadId: 'lead-300',
      channel: 'EMAIL',
      segment: 'Varejo',
      approachText: 'Otimização de checkout omnicanal',
    });

    // Simula evento 45 dias depois
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);

    const outcome = await flywheel.evaluateCommercialOutcome({
      organizationId: 'org-1',
      leadId: 'lead-300',
      outcomeType: 'DEAL_WON',
      occurredAt: futureDate.toISOString(),
    });

    expect(outcome).toBeNull();
  });

  it('should prevent cross-tenant leakage of few-shot examples', async () => {
    await flywheel.recordApproachSent({
      organizationId: 'org-A',
      leadId: 'lead-A',
      channel: 'LINKEDIN',
      segment: 'Fintech',
      approachText: 'Abordagem confidencial da Empresa A',
    });

    await flywheel.evaluateCommercialOutcome({
      organizationId: 'org-A',
      leadId: 'lead-A',
      outcomeType: 'DEAL_WON',
    });

    const tenantBExamples = await flywheel.getFewShotExamples('org-B', 'LINKEDIN', 'Fintech');
    expect(tenantBExamples).toHaveLength(0);

    const tenantAExamples = await flywheel.getFewShotExamples('org-A', 'LINKEDIN', 'Fintech');
    expect(tenantAExamples).toHaveLength(1);
  });
});
