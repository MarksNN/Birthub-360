import { logger } from '../../lib/logger.js';
import { adaptiveMultichannelCadenceService } from '../cadence/services/adaptiveMultichannelCadence.service.js';
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
        let enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
          organizationId,
          leadId,
        );
        if (!enrollment) {
          enrollment = await adaptiveMultichannelCadenceService.enrollLead({
            organizationId,
            cadenceId: config.cadenceId,
            leadId,
            contactEmail: '',
            contactPhone: '',
          });
        }
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
        const enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
          organizationId,
          leadId,
        );
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
        const enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
          organizationId,
          leadId,
        );
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
        let enrollment = adaptiveMultichannelCadenceService.findEnrollmentByLead(
          organizationId,
          leadId,
        );
        if (!enrollment) {
          enrollment = await adaptiveMultichannelCadenceService.enrollLead({
            organizationId,
            cadenceId: config.cadenceId,
            leadId,
            contactEmail: '',
            contactPhone: '',
          });
        }
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
