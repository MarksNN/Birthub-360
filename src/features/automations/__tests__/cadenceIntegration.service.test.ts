import { beforeEach, describe, expect, it } from 'vitest';
import { adaptiveMultichannelCadenceService } from '../../cadence/services/adaptiveMultichannelCadence.service.js';
import { cadenceIntegrationService } from '../cadenceIntegration.service.js';

describe('CadenceIntegrationService (P3.4)', () => {
  beforeEach(() => {
    adaptiveMultichannelCadenceService.clear();
  });

  it('exige organizationId válido (tenancy check)', async () => {
    await expect(
      cadenceIntegrationService.executeCadenceAction('', 'lead-1', {
        cadenceId: 'cad-1',
        action: 'move_to_step',
        stepIndex: 1,
      }),
    ).rejects.toThrow('Tenancy violation: organizationId obrigatório');
  });

  it('exige leadId válido', async () => {
    await expect(
      cadenceIntegrationService.executeCadenceAction('org-1', '', {
        cadenceId: 'cad-1',
        action: 'move_to_step',
        stepIndex: 1,
      }),
    ).rejects.toThrow('leadId obrigatório para integração com cadência');
  });

  it('move_to_step: matricula e posiciona o lead no passo desejado', async () => {
    const result = await cadenceIntegrationService.executeCadenceAction(
      'org-enterprise',
      'lead-alpha',
      {
        cadenceId: 'default-b2b-cadence',
        action: 'move_to_step',
        stepIndex: 2,
      },
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe('move_to_step');
    expect(result.details?.currentStep).toBe(2);

    const enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
      'org-enterprise',
      'lead-alpha',
    );
    expect(enrollment).toBeDefined();
    expect(enrollment?.currentStep).toBe(2);
  });

  it('pause: pausa a cadência para o lead', async () => {
    // Matricular primeiro
    await cadenceIntegrationService.executeCadenceAction('org-1', 'lead-beta', {
      cadenceId: 'default-b2b-cadence',
      action: 'move_to_step',
      stepIndex: 1,
    });

    const result = await cadenceIntegrationService.executeCadenceAction('org-1', 'lead-beta', {
      cadenceId: 'default-b2b-cadence',
      action: 'pause',
      pauseDays: 5,
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('pause');
    expect(result.details?.pausedDays).toBe(5);

    const enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
      'org-1',
      'lead-beta',
    );
    expect(enrollment?.status).toBe('paused');
  });

  it('resume: retoma uma cadência pausada', async () => {
    await cadenceIntegrationService.executeCadenceAction('org-1', 'lead-gamma', {
      cadenceId: 'default-b2b-cadence',
      action: 'move_to_step',
      stepIndex: 1,
    });
    await cadenceIntegrationService.executeCadenceAction('org-1', 'lead-gamma', {
      cadenceId: 'default-b2b-cadence',
      action: 'pause',
    });

    const result = await cadenceIntegrationService.executeCadenceAction('org-1', 'lead-gamma', {
      cadenceId: 'default-b2b-cadence',
      action: 'resume',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('resume');

    const enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
      'org-1',
      'lead-gamma',
    );
    expect(enrollment?.status).toBe('active');
  });

  it('restart: reinicia a cadência no passo 1', async () => {
    const result = await cadenceIntegrationService.executeCadenceAction('org-1', 'lead-delta', {
      cadenceId: 'default-b2b-cadence',
      action: 'restart',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('restart');
    expect(result.details?.currentStep).toBe(1);

    const enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
      'org-1',
      'lead-delta',
    );
    expect(enrollment?.status).toBe('active');
    expect(enrollment?.currentStep).toBe(1);
  });
});
