import { randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  CadenceChannel,
  CadenceStep,
  IMultichannelCadencePort,
  MultichannelCadenceEnrollment,
  StepDispatchResult,
} from '../../../shared/contracts/multichannelCadence.contract.js';

export class AdaptiveMultichannelCadenceService implements IMultichannelCadencePort {
  private enrollmentsStore = new Map<string, MultichannelCadenceEnrollment>();
  private cadenceStepsStore = new Map<string, CadenceStep[]>();
  private optOutRegistry = new Map<string, Set<string>>(); // organizationId:leadId -> Set de canais bloqueados

  constructor() {
    // Configurar uma cadência modelo padrão (Passo 1: E-mail -> Passo 2: WhatsApp -> Passo 3: Voz)
    this.cadenceStepsStore.set('default-b2b-cadence', [
      {
        stepNumber: 1,
        channel: 'email',
        action: 'send_email',
        delayHoursAfterPrevious: 0,
        condition: 'always',
      },
      {
        stepNumber: 2,
        channel: 'whatsapp',
        action: 'send_whatsapp',
        delayHoursAfterPrevious: 24,
        condition: 'no_reply',
      },
      {
        stepNumber: 3,
        channel: 'voice',
        action: 'initiate_voice_call',
        delayHoursAfterPrevious: 48,
        condition: 'no_reply',
      },
    ]);
  }

  /**
   * Matricula um lead em uma cadência multicanal.
   */
  async enrollLead(params: {
    organizationId: string;
    cadenceId: string;
    leadId: string;
    contactEmail: string;
    contactPhone: string;
  }): Promise<MultichannelCadenceEnrollment> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para matrícula em cadência');
    }

    const enrollmentId = `enr-${randomUUID()}`;
    const enrollment: MultichannelCadenceEnrollment = {
      enrollmentId,
      organizationId: params.organizationId,
      cadenceId: params.cadenceId,
      leadId: params.leadId,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      currentStep: 1,
      status: 'active',
      enrolledAt: new Date().toISOString(),
    };

    const key = `${params.organizationId}:${enrollmentId}`;
    this.enrollmentsStore.set(key, enrollment);

    logger.info(
      `[MultichannelCadence] Lead ${params.leadId} matriculado na cadência ${params.cadenceId} no tenant ${params.organizationId}.`,
    );

    return enrollment;
  }

  /**
   * Executa o próximo passo da cadência, respeitando a trava de opt-out unificado.
   */
  async executeNextStep(enrollmentId: string, organizationId: string): Promise<StepDispatchResult> {
    const key = `${organizationId}:${enrollmentId}`;
    const enrollment = this.enrollmentsStore.get(key);

    if (!enrollment) {
      throw new Error(`Enrollment ${enrollmentId} não encontrado no tenant ${organizationId}`);
    }

    if (enrollment.status === 'opted_out' || enrollment.status === 'completed') {
      return {
        stepNumber: enrollment.currentStep,
        channel: 'email',
        executedAt: new Date().toISOString(),
        success: false,
        suppressedByOptOut: true,
        suppressionReason: `Cadência já finalizada ou suspensa por opt-out prévio (status: ${enrollment.status})`,
      };
    }

    const steps = this.cadenceStepsStore.get(enrollment.cadenceId) || [];
    const step = steps.find((s) => s.stepNumber === enrollment.currentStep);

    if (!step) {
      enrollment.status = 'completed';
      this.enrollmentsStore.set(key, enrollment);
      return {
        stepNumber: enrollment.currentStep,
        channel: 'email',
        executedAt: new Date().toISOString(),
        success: true,
        suppressedByOptOut: false,
      };
    }

    // Checagem de Opt-Out Cross-Channel
    const optOutKey = `${organizationId}:${enrollment.leadId}`;
    const blockedChannels = this.optOutRegistry.get(optOutKey);

    if (blockedChannels && (blockedChannels.has('all') || blockedChannels.has(step.channel))) {
      logger.warn(
        `[MultichannelCadence] Disparo suprimido no canal [${step.channel}] para lead ${enrollment.leadId} por solicitação de opt-out unificado.`,
      );

      enrollment.status = 'opted_out';
      this.enrollmentsStore.set(key, enrollment);

      await domainEventMesh.publish({
        eventType: 'CROSS_CHANNEL_OPTOUT_ENFORCED',
        eventVersion: '1.0.0',
        organizationId,
        correlationId: `optout-${enrollment.leadId}`,
        producer: 'multichannel-cadence-engine',
        aggregateId: enrollment.leadId,
        payload: {
          leadId: enrollment.leadId,
          channel: step.channel,
          reason: 'Opt-out unificado detectado e aplicado a todos os canais',
        },
      });

      return {
        stepNumber: step.stepNumber,
        channel: step.channel,
        executedAt: new Date().toISOString(),
        success: false,
        suppressedByOptOut: true,
        suppressionReason: `Disparo retido: titular solicitou opt-out cross-channel para o canal ${step.channel}.`,
      };
    }

    // Execução simulada bem-sucedida do passo
    const executedAt = new Date().toISOString();
    enrollment.currentStep += 1;
    enrollment.lastActionAt = executedAt;
    this.enrollmentsStore.set(key, enrollment);

    logger.info(
      `[MultichannelCadence] Passo ${step.stepNumber} (${step.channel}) executado com sucesso para lead ${enrollment.leadId}.`,
    );

    return {
      stepNumber: step.stepNumber,
      channel: step.channel,
      executedAt,
      success: true,
      suppressedByOptOut: false,
      messageId: `msg-${randomUUID()}`,
    };
  }

  /**
   * Registra opt-out formal e bloqueia imediatamente todos os canais para o lead.
   */
  async registerOptOutAndHalt(params: {
    organizationId: string;
    leadId: string;
    channelSource: CadenceChannel;
    reason: string;
  }): Promise<{ halted: boolean; channelsSuppressed: CadenceChannel[] }> {
    if (!params.organizationId) {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const optOutKey = `${params.organizationId}:${params.leadId}`;
    let blockedChannels = this.optOutRegistry.get(optOutKey);
    if (!blockedChannels) {
      blockedChannels = new Set<string>();
      this.optOutRegistry.set(optOutKey, blockedChannels);
    }

    // Regra LGPD / Art. 18: Opt-out em um canal cessa imediatamente todos os canais da organização
    blockedChannels.add('all');
    blockedChannels.add('email');
    blockedChannels.add('whatsapp');
    blockedChannels.add('voice');

    // Pausar todas as matrículas ativas do lead no tenant
    for (const [key, enrollment] of this.enrollmentsStore.entries()) {
      if (
        enrollment.organizationId === params.organizationId &&
        enrollment.leadId === params.leadId
      ) {
        enrollment.status = 'opted_out';
        this.enrollmentsStore.set(key, enrollment);
      }
    }

    await domainEventMesh.publish({
      eventType: 'CROSS_CHANNEL_OPTOUT_ENFORCED',
      eventVersion: '1.0.0',
      organizationId: params.organizationId,
      correlationId: `optout-${params.leadId}`,
      producer: 'multichannel-cadence-engine',
      aggregateId: params.leadId,
      payload: {
        leadId: params.leadId,
        channelSource: params.channelSource,
        reason: params.reason,
      },
    });

    logger.info(
      `[MultichannelCadence] Opt-out cross-channel registrado para lead ${params.leadId} via ${params.channelSource}. Todos os canais bloqueados.`,
    );

    return {
      halted: true,
      channelsSuppressed: ['email', 'whatsapp', 'voice'],
    };
  }

  getEnrollment(
    organizationId: string,
    enrollmentId: string,
  ): MultichannelCadenceEnrollment | undefined {
    return this.enrollmentsStore.get(`${organizationId}:${enrollmentId}`);
  }

  findEnrollmentByLead(
    organizationId: string,
    leadId: string,
  ): MultichannelCadenceEnrollment | undefined {
    for (const enrollment of this.enrollmentsStore.values()) {
      if (enrollment.organizationId === organizationId && enrollment.leadId === leadId) {
        return enrollment;
      }
    }
    return undefined;
  }

  isLeadOptedOut(organizationId: string, leadId: string): boolean {
    const optOutKey = `${organizationId}:${leadId}`;
    const blockedChannels = this.optOutRegistry.get(optOutKey);
    return Boolean(blockedChannels && blockedChannels.size > 0);
  }

  clear(): void {
    this.enrollmentsStore.clear();
    this.optOutRegistry.clear();
  }
}

export const adaptiveMultichannelCadenceService = new AdaptiveMultichannelCadenceService();
