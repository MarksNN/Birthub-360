import { MailerNotConfiguredError, sendEmail } from '../../../../lib/email/mailer.js';
import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';
import { sendWhatsAppMessage } from '../../../integrations/whatsapp/whatsapp.service.js';
import { syncActivityToBitrix } from '../../../integrations/bitrix/service/outboundSync.js';
import type { CadenceDispatcher } from '../../application/cadenceService.js';
import type { CadenceRunState, CadenceTouch } from '../../domain/cadence.js';
import { checkOptOutStatus } from '../../../../shared/services/optOutCheck.service.js';

/**
 * Dispatchers reais de canal (CYC-008, onda-19) — a peça que faltava para `advanceCadenceRun`
 * (dom\u00ednio puro, entregue na Onda 10) sair do papel: até aqui a única implementação de
 * `CadenceDispatcher` do repo era `ScriptedDispatcher`, só em teste.
 *
 * Limitação conhecida e ainda real: `CadenceTouch.templateRef` não tem nenhum sistema de
 * template por trás — é tratado aqui como o texto final da mensagem (corpo, ou
 * "assunto\n\ncorpo" para e-mail). Autoria de conteúdo de cadência é uma decisão de produto que
 * este runtime não toma sozinho.
 */

// ─── Contrato de porta para voz (CYC-004/ACH-17-03) ────────────────────────
// Espelha só o método que o dispatcher de cadência consome de `birthVoice.service.ts::callLead`.
// Seguindo o mesmo padrão de `booking.routes.ts` × `google.service.ts`: interface local resolvida
// via DI em `cadenceRun.worker.ts`, sem import direto de src/features/integrations/** (regra
// no-cross-feature-imports). O tipo agentType é fixo em 'sdr' para toques de cadência — futuros
// tipos (nps, reactivation) entram no CadenceTouch se o produto decidir.
export interface VoiceCallPort {
  callLead(
    organizationId: string,
    leadId: string,
    agentType?: 'sdr' | 'nps' | 'reactivation',
  ): Promise<{ sessionId: string; callSid: string; status: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────

async function resolveLeadPhone(organizationId: string, leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { contact: { select: { whatsapp: true, phone: true } } },
  });
  return lead?.contact?.whatsapp ?? lead?.contact?.phone ?? null;
}

async function resolveLeadEmail(organizationId: string, leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { contact: { select: { email: true } } },
  });
  return lead?.contact?.email ?? null;
}

async function resolveLeadContactId(
  organizationId: string,
  leadId: string,
): Promise<string | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { contactId: true },
  });
  return lead?.contactId ?? null;
}

/** Rotas para WhatsApp real. Opt-out é verificado pelo interceptor checkOptOutStatus antes do envio para assegurar bloqueio instantâneo e ausência de vazamento multi-tenant (B-13 e §27). */
export const whatsAppCadenceDispatcher: Pick<CadenceDispatcher, 'dispatch'> = {
  async dispatch(touch: CadenceTouch, run: CadenceRunState) {
    if (!touch.templateRef?.trim()) {
      return {
        result: 'failed' as const,
        error: 'Conteúdo da mensagem de cadência não configurado.',
      };
    }
    const contactId = await resolveLeadContactId(run.organizationId, run.leadId);
    if (contactId) {
      const optOutCheck = await checkOptOutStatus(contactId, 'whatsapp', run.organizationId);
      if (optOutCheck.blocked) {
        logger.warn(
          {
            organizationId: run.organizationId,
            leadId: run.leadId,
            contactId,
            code: optOutCheck.code,
          },
          'Toque de cadência WhatsApp barrado: contato suprimido por opt-out (OPT_OUT_SUPPRESSED).',
        );
        return {
          result: 'failed' as const,
          error: `[OPT_OUT_SUPPRESSED] ${optOutCheck.reason}`,
        };
      }
    }

    const phone = await resolveLeadPhone(run.organizationId, run.leadId);
    if (!phone) {
      return {
        result: 'failed' as const,
        error: 'Lead sem telefone/WhatsApp cadastrado no contato.',
      };
    }
    try {
      await sendWhatsAppMessage(
        run.organizationId,
        phone,
        touch.templateRef ?? '(mensagem de cadência sem conteúdo configurado)',
        undefined,
        { leadId: run.leadId },
      );

      // Registra Activity e TimelineEvent de saída para visualização no CRM
      await prisma.activity
        .create({
          data: {
            organizationId: run.organizationId,
            leadId: run.leadId,
            type: 'WhatsApp' as never,
            status: 'Concluida' as never,
            owner: 'Cadência Multicanal',
            date: new Date(),
            observations: `Toque de cadência WhatsApp enviado (ordem ${touch.order}):\n${touch.templateRef}`,
          },
        })
        .catch((err) =>
          logger.warn(
            { err, leadId: run.leadId },
            'Falha ao registrar Activity de WhatsApp da cadência',
          ),
        );

      await prisma.timelineEvent
        .create({
          data: {
            type: 'whatsapp',
            description: `Disparo de cadência via WhatsApp: "${(touch.templateRef || '').slice(0, 150)}"`,
            leadId: run.leadId,
          },
        })
        .catch((err) =>
          logger.warn(
            { err, leadId: run.leadId },
            'Falha ao registrar TimelineEvent de WhatsApp da cadência',
          ),
        );

      syncActivityToBitrix(run.organizationId, run.leadId, {
        type: 'whatsapp',
        subject: `Cadência: WhatsApp toque #${touch.order}`,
        description: touch.templateRef ?? undefined,
        completed: true,
        direction: 'outbound',
      }).catch((err) =>
        logger.warn(
          { err, leadId: run.leadId },
          'Falha ao espelhar atividade de WhatsApp da cadência no Bitrix24',
        ),
      );

      return { result: 'sent' as const, providerMessageId: null };
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { err, organizationId: run.organizationId, leadId: run.leadId, touchOrder: touch.order },
        'Falha ao despachar toque de cadência via WhatsApp.',
      );
      return { result: 'failed' as const, error: message };
    }
  },
};

function splitSubjectAndBody(
  templateRef: string | null | undefined,
  sequenceName: string,
): { subject: string; body: string } {
  if (!templateRef)
    return {
      subject: `Continuando nosso contato — ${sequenceName}`,
      body: '(mensagem de cadência sem conteúdo configurado)',
    };
  const [firstLine, ...rest] = templateRef.split('\n');
  if (rest.length === 0)
    return { subject: `Continuando nosso contato — ${sequenceName}`, body: firstLine };
  return { subject: firstLine, body: rest.join('\n').trimStart() };
}

/** Rotas para e-mail real via SMTP (`sendEmail`). Interceptor checkOptOutStatus valida opt-out e consentimento antes do disparo (B-13 e §27). */
export const emailCadenceDispatcher: Pick<CadenceDispatcher, 'dispatch'> = {
  async dispatch(touch: CadenceTouch, run: CadenceRunState) {
    if (!touch.templateRef?.trim()) {
      return {
        result: 'failed' as const,
        error: 'Conteúdo da mensagem de cadência não configurado.',
      };
    }
    const contactId = await resolveLeadContactId(run.organizationId, run.leadId);
    if (contactId) {
      const optOutCheck = await checkOptOutStatus(contactId, 'email', run.organizationId);
      if (optOutCheck.blocked) {
        logger.warn(
          {
            organizationId: run.organizationId,
            leadId: run.leadId,
            contactId,
            code: optOutCheck.code,
          },
          'Toque de cadência e-mail barrado: contato suprimido por opt-out (OPT_OUT_SUPPRESSED).',
        );
        return {
          result: 'failed' as const,
          error: `[OPT_OUT_SUPPRESSED] ${optOutCheck.reason}`,
        };
      }
    }

    const email = await resolveLeadEmail(run.organizationId, run.leadId);
    if (!email) {
      return { result: 'failed' as const, error: 'Lead sem e-mail cadastrado no contato.' };
    }
    const { subject, body } = splitSubjectAndBody(touch.templateRef, run.sequenceId);
    try {
      const { messageId } = await sendEmail({ to: email, subject, text: body });

      // Registra Activity e TimelineEvent de saída para visualização no CRM
      await prisma.activity
        .create({
          data: {
            organizationId: run.organizationId,
            leadId: run.leadId,
            type: 'Email' as never,
            status: 'Concluida' as never,
            owner: 'Cadência Multicanal',
            date: new Date(),
            observations: `Toque de cadência E-mail enviado (ordem ${touch.order}):\nAssunto: ${subject}\n\n${body}`,
          },
        })
        .catch((err) =>
          logger.warn(
            { err, leadId: run.leadId },
            'Falha ao registrar Activity de E-mail da cadência',
          ),
        );

      await prisma.timelineEvent
        .create({
          data: {
            type: 'email',
            description: `Disparo de cadência via E-mail: "${subject}"`,
            leadId: run.leadId,
          },
        })
        .catch((err) =>
          logger.warn(
            { err, leadId: run.leadId },
            'Falha ao registrar TimelineEvent de E-mail da cadência',
          ),
        );

      syncActivityToBitrix(run.organizationId, run.leadId, {
        type: 'email',
        subject: `Cadência: E-mail - ${subject}`,
        description: body,
        completed: true,
        direction: 'outbound',
      }).catch((err) =>
        logger.warn(
          { err, leadId: run.leadId },
          'Falha ao espelhar atividade de E-mail da cadência no Bitrix24',
        ),
      );

      return { result: 'sent' as const, providerMessageId: messageId };
    } catch (err: any) {
      const message =
        err instanceof MailerNotConfiguredError
          ? 'Envio de e-mail não configurado (SMTP_HOST ausente).'
          : err instanceof Error
            ? err.message
            : String(err);
      logger.warn(
        { err, organizationId: run.organizationId, leadId: run.leadId, touchOrder: touch.order },
        'Falha ao despachar toque de cadência via e-mail.',
      );
      return { result: 'failed' as const, error: message };
    }
  },
};

/**
 * Dispatcher de voz (CYC-004/ACH-17-03). Recebe uma porta `VoiceCallPort` via injeção — o
 * worker passa a implementação real (`birthVoice.service.ts::callLead`) sem que este arquivo
 * precise importar diretamente `src/features/integrations/birth-voice/**`. Opt-out e PII
 * consent são verificados pelo interceptor checkOptOutStatus e callLead (B-13 e §27).
 */
export function buildVoiceCadenceDispatcher(
  voicePort: VoiceCallPort,
): Pick<CadenceDispatcher, 'dispatch'> {
  return {
    async dispatch(touch: CadenceTouch, run: CadenceRunState) {
      const contactId = await resolveLeadContactId(run.organizationId, run.leadId);
      if (contactId) {
        const optOutCheck = await checkOptOutStatus(contactId, 'voice', run.organizationId);
        if (optOutCheck.blocked) {
          logger.warn(
            {
              organizationId: run.organizationId,
              leadId: run.leadId,
              contactId,
              code: optOutCheck.code,
            },
            'Toque de cadência voz barrado: contato suprimido por opt-out (OPT_OUT_SUPPRESSED).',
          );
          return {
            result: 'failed' as const,
            error: `[OPT_OUT_SUPPRESSED] ${optOutCheck.reason}`,
          };
        }
      }

      try {
        const result = await voicePort.callLead(run.organizationId, run.leadId, 'sdr');
        return {
          result: 'pending' as const,
          providerMessageId: result.callSid ?? result.sessionId ?? null,
        };
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(
          { err, organizationId: run.organizationId, leadId: run.leadId, touchOrder: touch.order },
          'Falha ao despachar toque de cadência via voz (Birth Voices).',
        );
        return { result: 'failed' as const, error: message };
      }
    },
  };
}

/**
 * Roteia pelo canal do toque. `voicePort` é opcional: se não injetado (ambientes sem Birth
 * Voices configurado), voz continua falhando de forma honesta em vez de silenciosa.
 */
export function buildProductionCadenceDispatcher(voicePort?: VoiceCallPort): CadenceDispatcher {
  const voiceDispatcher = voicePort ? buildVoiceCadenceDispatcher(voicePort) : null;

  return {
    async dispatch(touch, run) {
      switch (touch.channel) {
        case 'whatsapp':
          return whatsAppCadenceDispatcher.dispatch(touch, run);
        case 'email':
          return emailCadenceDispatcher.dispatch(touch, run);
        case 'voice':
          if (voiceDispatcher) {
            return voiceDispatcher.dispatch(touch, run);
          }
          return {
            result: 'failed',
            error: 'Canal de voz não configurado neste ambiente (BIRTH_VOICES_API_KEY ausente).',
          };
      }
    },
  };
}

/**
 * @deprecated Use `buildProductionCadenceDispatcher(voicePort)` para ter voz real.
 * Mantido para retrocompatibilidade enquanto `cadenceRun.worker.ts` é migrado para injetar o voicePort.
 */
export const productionCadenceDispatcher: CadenceDispatcher = buildProductionCadenceDispatcher();
