import { randomUUID } from 'node:crypto';
import { logger } from '../../lib/logger.js';
import {
  type MultichannelCadenceEnrollment,
  sharedCadenceEnrollmentsStore,
} from '../../shared/contracts/multichannelCadence.contract.js';
import type { CadenceActionConfig } from './automation.types.js';

export interface CadenceActionResult {
  success: boolean;
  action: CadenceActionConfig['action'];
  leadId: string;
  cadenceId: string;
  details?: Record<string, unknown>;
}

/**
 * P3.4: Serviço de integração entre o motor de automações e o motor de cadências multicanal.
 * Permite que regras automatizadas avancem passos, pausem, retomem ou reiniciem cadências de vendas.
 */
export class CadenceIntegrationService {
  private findEnrollmentByLead(
    organizationId: string,
    leadId: string,
  ): MultichannelCadenceEnrollment | undefined {
    for (const enrollment of sharedCadenceEnrollmentsStore.values()) {
      if (enrollment.organizationId === organizationId && enrollment.leadId === leadId) {
        return enrollment;
      }
    }
    return undefined;
  }

  private enrollLead(params: {
    organizationId: string;
    cadenceId: string;
    leadId: string;
  }): MultichannelCadenceEnrollment {
    const enrollmentId = `enr-${randomUUID()}`;
    const enrollment: MultichannelCadenceEnrollment = {
      enrollmentId,
      organizationId: params.organizationId,
      cadenceId: params.cadenceId,
      leadId: params.leadId,
      contactEmail: '',
      contactPhone: '',
      currentStep: 1,
      status: 'active',
      enrolledAt: new Date().toISOString(),
    };
    sharedCadenceEnrollmentsStore.set(`${params.organizationId}:${enrollmentId}`, enrollment);
    return enrollment;
  }

  async executeCadenceAction(
    organizationId: string,
    leadId: string,
    config: CadenceActionConfig,
  ): Promise<CadenceActionResult> {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }
    if (!leadId || leadId.trim() === '') {
      throw new Error('leadId obrigatório para integração com cadência');
    }

    logger.info(
      { organizationId, leadId, cadenceId: config.cadenceId, action: config.action },
      'Executando ação de cadência via automação',
    );

    switch (config.action) {
      case 'move_to_step': {
        const step = config.stepIndex ?? 1;
        const enrollment =
          this.findEnrollmentByLead(organizationId, leadId) ??
          this.enrollLead({
            organizationId,
            cadenceId: config.cadenceId,
            leadId,
          });
        enrollment.currentStep = step;
        return {
          success: true,
          action: 'move_to_step',
          leadId,
          cadenceId: config.cadenceId,
          details: { currentStep: step },
        };
      }

      case 'pause': {
        const pausedDays = config.pauseDays ?? 7;
        const enrollment = this.findEnrollmentByLead(organizationId, leadId);
        if (enrollment) {
          enrollment.status = 'paused';
        }
        return {
          success: true,
          action: 'pause',
          leadId,
          cadenceId: config.cadenceId,
          details: { pausedDays },
        };
      }

      case 'resume': {
        const enrollment = this.findEnrollmentByLead(organizationId, leadId);
        if (enrollment) {
          enrollment.status = 'active';
        }
        return {
          success: true,
          action: 'resume',
          leadId,
          cadenceId: config.cadenceId,
        };
      }

      case 'restart': {
        const enrollment =
          this.findEnrollmentByLead(organizationId, leadId) ??
          this.enrollLead({
            organizationId,
            cadenceId: config.cadenceId,
            leadId,
          });
        enrollment.currentStep = 1;
        enrollment.status = 'active';
        return {
          success: true,
          action: 'restart',
          leadId,
          cadenceId: config.cadenceId,
          details: { currentStep: 1 },
        };
      }

      default:
        throw new Error(`Ação de cadência não suportada: ${(config as any).action}`);
    }
  }
}

export const cadenceIntegrationService = new CadenceIntegrationService();
