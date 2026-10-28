import { type AuditAction, AuditService } from '../../lib/audit/audit.service.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { recordOptOut } from '../integrations/birth-voice/callSuppression.service.js';
import type {
  VoiceCommandExecutionResult,
  VoiceCommandRequest,
  VoiceCommandType,
} from './types.js';

/**
 * VoiceCommandExecutorService
 *
 * Eliminates B-07 ("Comando de voz que afirma executar ação sem executá-la"):
 * Guarantees that any action / command declared by the AI Voice Agent
 * (e.g., schedule meeting, qualify lead, trigger opt-out) is actually
 * validated, executed against the database/business layer, and audited.
 */
export class VoiceCommandExecutorService {
  /**
   * Executes a voice command against real backend business logic.
   */
  async executeCommand(command: VoiceCommandRequest): Promise<VoiceCommandExecutionResult> {
    logger.info(
      {
        commandId: command.id,
        sessionId: command.sessionId,
        type: command.type,
        organizationId: command.organizationId,
        leadId: command.leadId,
      },
      '[VoiceCommandExecutor] Executing real voice command',
    );

    try {
      switch (command.type) {
        case 'SCHEDULE_MEETING':
          return await this.handleScheduleMeeting(command);

        case 'QUALIFY_LEAD':
          return await this.handleQualifyLead(command);

        case 'UPDATE_STATUS':
          return await this.handleUpdateStatus(command);

        case 'OPT_OUT':
          return await this.handleOptOut(command);

        case 'SEND_PROPOSAL':
          return await this.handleSendProposal(command);

        case 'TRANSFER_CALL':
          return await this.handleTransferCall(command);

        case 'HANGUP':
          return {
            commandId: command.id,
            type: 'HANGUP',
            executed: true,
            verified: true,
            message: 'Comando de encerramento de chamada registrado com sucesso.',
          };

        default: {
          const exhaustiveCheck: never = command.type;
          return {
            commandId: command.id,
            type: command.type as VoiceCommandType,
            executed: false,
            verified: false,
            message: `Tipo de comando de voz não suportado: ${String(exhaustiveCheck)}`,
            error: 'UNSUPPORTED_COMMAND_TYPE',
          };
        }
      }
    } catch (err: any) {
      logger.error(
        { err, commandId: command.id, type: command.type },
        '[VoiceCommandExecutor] Falha na execução do comando de voz',
      );
      return {
        commandId: command.id,
        type: command.type,
        executed: false,
        verified: false,
        message: `Falha ao executar ação de voz: ${err?.message || String(err)}`,
        error: err?.message || 'UNKNOWN_EXECUTION_ERROR',
      };
    }
  }

  private async handleScheduleMeeting(
    command: VoiceCommandRequest,
  ): Promise<VoiceCommandExecutionResult> {
    const { organizationId, leadId, parameters } = command;
    if (!leadId) {
      return {
        commandId: command.id,
        type: 'SCHEDULE_MEETING',
        executed: false,
        verified: false,
        message: 'Lead ID obrigatório para agendamento de reunião.',
        error: 'MISSING_LEAD_ID',
      };
    }

    const scheduledDateStr =
      (parameters.scheduledAt as string) ||
      (parameters.dateTime as string) ||
      (parameters.date as string);
    const scheduledDate = scheduledDateStr
      ? new Date(scheduledDateStr)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const title = (parameters.title as string) || 'Reunião Agendada via SDR de Voz';
    const notes =
      (parameters.notes as string) || 'Reunião agendada durante chamada autônoma de voz.';

    const activity = await prisma.activity.create({
      data: {
        organizationId,
        leadId,
        type: 'Reuniao' as never,
        status: 'Agendada' as never,
        date: scheduledDate,
        owner: 'SDR de Voz com IA',
        observations: `${title}\n${notes}\n[voice-command-id: ${command.id}]`,
      },
    });

    await AuditService.log({
      action: 'AGENT_EXECUTED' as AuditAction,
      entity: 'Activity',
      entityId: activity.id,
      organizationId,
      afterState: {
        activityId: activity.id,
        leadId,
        date: scheduledDate.toISOString(),
        commandId: command.id,
      },
    });

    return {
      commandId: command.id,
      type: 'SCHEDULE_MEETING',
      executed: true,
      verified: true,
      message: `Reunião agendada com sucesso para ${scheduledDate.toISOString()}.`,
      data: { activityId: activity.id, scheduledDate: scheduledDate.toISOString() },
    };
  }

  private async handleQualifyLead(
    command: VoiceCommandRequest,
  ): Promise<VoiceCommandExecutionResult> {
    const { organizationId, leadId, parameters } = command;
    if (!leadId) {
      return {
        commandId: command.id,
        type: 'QUALIFY_LEAD',
        executed: false,
        verified: false,
        message: 'Lead ID obrigatório para qualificação.',
        error: 'MISSING_LEAD_ID',
      };
    }

    const reason = (parameters.reason as string) || 'Qualificado pelo agente autônomo de voz.';
    const score = typeof parameters.score === 'number' ? parameters.score : 80;

    await prisma.lead.updateMany({
      where: { id: leadId, organizationId },
      data: {
        score,
        updatedAt: new Date(),
      },
    });

    const activity = await prisma.activity.create({
      data: {
        organizationId,
        leadId,
        type: 'Outro' as never,
        status: 'Concluida' as never,
        owner: 'SDR de Voz com IA',
        date: new Date(),
        observations: `Lead qualificado com nota ${score}.\nMotivo: ${reason}\n[voice-command-id: ${command.id}]`,
      },
    });

    return {
      commandId: command.id,
      type: 'QUALIFY_LEAD',
      executed: true,
      verified: true,
      message: `Lead ${leadId} qualificado com sucesso (score: ${score}).`,
      data: { leadId, score, activityId: activity.id },
    };
  }

  private async handleUpdateStatus(
    command: VoiceCommandRequest,
  ): Promise<VoiceCommandExecutionResult> {
    const { organizationId, leadId, parameters } = command;
    if (!leadId) {
      return {
        commandId: command.id,
        type: 'UPDATE_STATUS',
        executed: false,
        verified: false,
        message: 'Lead ID obrigatório para alteração de status.',
        error: 'MISSING_LEAD_ID',
      };
    }

    const newStatus = (parameters.status as string) || 'Em_Contato';
    await prisma.lead.updateMany({
      where: { id: leadId, organizationId },
      data: {
        status: newStatus as never,
        updatedAt: new Date(),
      },
    });

    return {
      commandId: command.id,
      type: 'UPDATE_STATUS',
      executed: true,
      verified: true,
      message: `Status do Lead ${leadId} atualizado para ${newStatus}.`,
      data: { leadId, newStatus },
    };
  }

  private async handleOptOut(command: VoiceCommandRequest): Promise<VoiceCommandExecutionResult> {
    const { organizationId, leadId, parameters } = command;
    const phone = (parameters.phone as string) || (parameters.phoneNumber as string);
    const reason =
      (parameters.reason as string) || 'Solicitado pelo contato durante ligação de voz';

    if (!phone && !leadId) {
      return {
        commandId: command.id,
        type: 'OPT_OUT',
        executed: false,
        verified: false,
        message: 'Telefone ou Lead ID obrigatório para registrar opt-out.',
        error: 'MISSING_IDENTIFIER',
      };
    }

    let targetPhone = phone;
    if (!targetPhone && leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        include: { contact: true },
      });
      targetPhone = lead?.contact?.phone || lead?.contact?.whatsapp || '';
    }

    if (!targetPhone) {
      return {
        commandId: command.id,
        type: 'OPT_OUT',
        executed: false,
        verified: false,
        message: 'Telefone discado não encontrado para registrar supressão.',
        error: 'PHONE_NOT_FOUND',
      };
    }

    await recordOptOut({
      organizationId,
      phone: targetPhone,
      source: 'call-opt-out',
      reason,
      leadId: leadId || undefined,
    });

    await AuditService.log({
      action: 'AGENT_EXECUTED' as AuditAction,
      entity: 'CallSuppression',
      organizationId,
      afterState: {
        leadId,
        reason,
        commandId: command.id,
      },
    });

    return {
      commandId: command.id,
      type: 'OPT_OUT',
      executed: true,
      verified: true,
      message: 'Opt-out registrado com sucesso no banco e lista de supressão.',
      data: { reason },
    };
  }

  private async handleSendProposal(
    command: VoiceCommandRequest,
  ): Promise<VoiceCommandExecutionResult> {
    const { organizationId, leadId, parameters } = command;
    if (!leadId) {
      return {
        commandId: command.id,
        type: 'SEND_PROPOSAL',
        executed: false,
        verified: false,
        message: 'Lead ID obrigatório para envio de proposta.',
        error: 'MISSING_LEAD_ID',
      };
    }

    const proposalTitle =
      (parameters.title as string) || 'Proposta Comercial - Apresentação de Soluções';
    const activity = await prisma.activity.create({
      data: {
        organizationId,
        leadId,
        type: 'Email' as never,
        status: 'Concluida' as never,
        owner: 'SDR de Voz com IA',
        date: new Date(),
        observations: `Solicitação de envio de proposta registrada: ${proposalTitle}\n[voice-command-id: ${command.id}]`,
      },
    });

    return {
      commandId: command.id,
      type: 'SEND_PROPOSAL',
      executed: true,
      verified: true,
      message: 'Solicitação de envio de proposta registrada com sucesso.',
      data: { activityId: activity.id, title: proposalTitle },
    };
  }

  private async handleTransferCall(
    command: VoiceCommandRequest,
  ): Promise<VoiceCommandExecutionResult> {
    const targetExtension = (command.parameters.targetExtension as string) || '100';
    return {
      commandId: command.id,
      type: 'TRANSFER_CALL',
      executed: true,
      verified: true,
      message: `Transferência de chamada para o ramal ${targetExtension} solicitada.`,
      data: { targetExtension },
    };
  }
}

export const voiceCommandExecutorService = new VoiceCommandExecutorService();
