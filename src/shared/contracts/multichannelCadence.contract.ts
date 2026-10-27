/**
 * Contrato canônico para o subsistema de Cadência Multicanal Adaptativa com Opt-Out Unificado.
 * Onda 03 — Evolução 10
 */

export type CadenceChannel = 'email' | 'whatsapp' | 'voice';

export type CadenceStepAction =
  | 'send_email'
  | 'send_whatsapp'
  | 'initiate_voice_call'
  | 'wait_delay';

export interface CadenceStep {
  stepNumber: number;
  channel: CadenceChannel;
  action: CadenceStepAction;
  delayHoursAfterPrevious: number;
  templateId?: string;
  condition?: 'no_reply' | 'email_opened' | 'call_unanswered' | 'always';
}

export interface MultichannelCadenceEnrollment {
  enrollmentId: string;
  organizationId: string;
  cadenceId: string;
  leadId: string;
  contactEmail: string;
  contactPhone: string;
  currentStep: number;
  status: 'active' | 'completed' | 'paused' | 'opted_out' | 'failed';
  enrolledAt: string;
  lastActionAt?: string;
}

export interface StepDispatchResult {
  stepNumber: number;
  channel: CadenceChannel;
  executedAt: string;
  success: boolean;
  suppressedByOptOut: boolean;
  suppressionReason?: string;
  messageId?: string;
  callId?: string;
}

export interface IMultichannelCadencePort {
  enrollLead(params: {
    organizationId: string;
    cadenceId: string;
    leadId: string;
    contactEmail: string;
    contactPhone: string;
  }): Promise<MultichannelCadenceEnrollment>;
  executeNextStep(enrollmentId: string, organizationId: string): Promise<StepDispatchResult>;
  registerOptOutAndHalt(params: {
    organizationId: string;
    leadId: string;
    channelSource: CadenceChannel;
    reason: string;
  }): Promise<{ halted: boolean; channelsSuppressed: CadenceChannel[] }>;
}

export const sharedCadenceEnrollmentsStore = new Map<string, MultichannelCadenceEnrollment>();
