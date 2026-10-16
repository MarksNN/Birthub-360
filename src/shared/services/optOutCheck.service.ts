import { logger } from '../../lib/logger.js';
import { toE164BR } from '../../lib/phone.js';
import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { ANONYMIZED_CONTACT_NAME } from './dataSubjectErasure.service.js';

export type OptOutChannel = 'email' | 'whatsapp' | 'voice' | (string & {});

export interface OptOutCheckResult {
  blocked: boolean;
  allowed: boolean;
  code: 'OPT_OUT_SUPPRESSED' | null;
  reason: string | null;
  scope?: string;
  evidence?: string | null;
  originChannel?: string;
  matchedBy?:
    | 'anonymized'
    | 'contact_flag'
    | 'lead_flag'
    | 'opt_out_record'
    | 'missing_params'
    | 'tenant_mismatch';
}

export interface CheckOptOutOptions {
  throwOnBlocked?: boolean;
  prisma?: any;
}

export class OptOutSuppressedError extends Error {
  readonly code = 'OPT_OUT_SUPPRESSED';
  readonly statusCode = 403;

  constructor(
    public readonly contactId: string,
    public readonly channel: string,
    public readonly reason: string = 'Contato suprimido por solicitação de opt-out/LGPD.',
  ) {
    super(
      `[OPT_OUT_SUPPRESSED] Envio suprimido para o contato '${contactId}' no canal '${channel}': ${reason}`,
    );
    this.name = 'OptOutSuppressedError';
    Object.setPrototypeOf(this, OptOutSuppressedError.prototype);
  }
}

function requireOptOutReason(result: OptOutCheckResult): string {
  if (typeof result.reason !== 'string' || result.reason.length === 0) {
    throw new Error('Blocked opt-out result is missing a reason.');
  }
  return result.reason;
}

/**
 * Palavras-chave padronizadas de opt-out multicanal.
 * Cobre termos em português e inglês ("SAIR", "STOP", "CANCELAR", "DESCADASTRO", etc.),
 * com tolerância a pontuação no final e frases de prefixo ("sair por favor", "stop messages").
 */
const OPT_OUT_TERMS = [
  'sair',
  'parar',
  'stop',
  'cancelar',
  'cancela',
  'descadastro',
  'descadastrar',
  'unsubscribe',
  'optout',
  'opt-out',
  'nao quero mais',
  'não quero mais',
  'remover meu numero',
  'remover meu número',
  'remover contato',
  'fim',
];

export function isOptOutKeyword(rawText: string | null | undefined): boolean {
  if (!rawText || typeof rawText !== 'string') return false;
  const text = rawText.trim().toLowerCase();
  const punctuation = '!?.#-_*';
  let start = 0;
  let end = text.length;
  // Scan each edge once: a suffix regex can retry every position on untrusted text.
  while (start < end && punctuation.includes(text[start])) start += 1;
  while (end > start && punctuation.includes(text[end - 1])) end -= 1;
  const normalized = text.slice(start, end).trim();

  if (!normalized) return false;

  return OPT_OUT_TERMS.some((term) => {
    if (normalized === term) return true;
    if (normalized.startsWith(`${term} `) || normalized.startsWith(`${term},`)) return true;
    return false;
  });
}

/**
 * Interceptor central de checagem pré-envio de opt-out (B-13 e §27).
 *
 * Avalia se o contato especificado está bloqueado para envios no canal solicitado:
 * 1. Isolamento estrito por tenant: garante que o contato pertence a `organizationId`.
 * 2. Exercício do direito de exclusão (LGPD Art. 18): bloqueia contatos anonimizados ou deletados.
 * 3. Flag de opt-out no contato (`contact.customFields.optOut`).
 * 4. Flag de opt-out em leads associados (`lead.customFields.optOutWhatsApp`).
 * 5. Registro unificado de opt-out (`OptOutRecord`) por leadId, e-mail ou telefone.
 */
export async function checkOptOutStatus(
  contactId: string,
  channel: OptOutChannel,
  organizationId: string,
  options?: CheckOptOutOptions,
): Promise<OptOutCheckResult> {
  const prismaClient = options?.prisma ?? defaultPrisma;

  if (!contactId || !channel || !organizationId) {
    const result: OptOutCheckResult = {
      blocked: true,
      allowed: false,
      code: 'OPT_OUT_SUPPRESSED',
      reason:
        'Parâmetros obrigatórios ausentes para verificação de opt-out (contactId, channel e organizationId).',
      matchedBy: 'missing_params',
    };
    if (options?.throwOnBlocked) {
      throw new OptOutSuppressedError(
        contactId || 'unknown',
        channel || 'unknown',
        requireOptOutReason(result),
      );
    }
    return result;
  }

  // 1. Busca do contato com isolamento de tenant rigoroso
  const contact = await prismaClient.contact.findFirst({
    where: { id: contactId, organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      deletedAt: true,
      customFields: true,
      leads: {
        select: {
          id: true,
          customFields: true,
        },
      },
    },
  });

  if (!contact) {
    const result: OptOutCheckResult = {
      blocked: true,
      allowed: false,
      code: 'OPT_OUT_SUPPRESSED',
      reason: `Contato ${contactId} não encontrado na organização ${organizationId} (violação de tenant ou registro inexistente).`,
      matchedBy: 'tenant_mismatch',
    };
    if (options?.throwOnBlocked) {
      throw new OptOutSuppressedError(contactId, channel, requireOptOutReason(result));
    }
    return result;
  }

  // 2. Bloqueio instantâneo para contato anonimizado ou excluído (LGPD Art. 18)
  const isAnonymized = contact.name === ANONYMIZED_CONTACT_NAME || contact.deletedAt !== null;
  if (isAnonymized) {
    const result: OptOutCheckResult = {
      blocked: true,
      allowed: false,
      code: 'OPT_OUT_SUPPRESSED',
      reason: 'Contato anonimizado ou excluído a pedido do titular (LGPD Art. 18).',
      matchedBy: 'anonymized',
    };
    if (options?.throwOnBlocked) {
      throw new OptOutSuppressedError(contactId, channel, requireOptOutReason(result));
    }
    return result;
  }

  const channelNorm = channel.toLowerCase();

  // 3. Checagem de flags de opt-out em customFields do contato
  const contactCustom = (contact.customFields as Record<string, unknown>) || {};
  const contactOptedOut =
    contactCustom.optOut === true ||
    contactCustom.optedOut === true ||
    (channelNorm === 'whatsapp' && contactCustom.optOutWhatsApp === true) ||
    (channelNorm === 'email' && contactCustom.optOutEmail === true) ||
    (channelNorm === 'voice' && contactCustom.optOutVoice === true);

  if (contactOptedOut) {
    const result: OptOutCheckResult = {
      blocked: true,
      allowed: false,
      code: 'OPT_OUT_SUPPRESSED',
      reason: `Contato possui registro de opt-out no cadastro (canal: ${channel}).`,
      matchedBy: 'contact_flag',
    };
    if (options?.throwOnBlocked) {
      throw new OptOutSuppressedError(contactId, channel, requireOptOutReason(result));
    }
    return result;
  }

  // 4. Checagem de flags em leads associados ao titular
  if (Array.isArray(contact.leads)) {
    for (const lead of contact.leads) {
      const leadCustom = (lead.customFields as Record<string, unknown>) || {};
      const leadOptedOut =
        leadCustom.optOut === true ||
        (channelNorm === 'whatsapp' && leadCustom.optOutWhatsApp === true) ||
        (channelNorm === 'email' && leadCustom.optOutEmail === true) ||
        (channelNorm === 'voice' && leadCustom.optOutVoice === true);

      if (leadOptedOut) {
        const result: OptOutCheckResult = {
          blocked: true,
          allowed: false,
          code: 'OPT_OUT_SUPPRESSED',
          reason: `Lead vinculado (${lead.id}) possui registro de opt-out para o canal '${channel}'.`,
          matchedBy: 'lead_flag',
        };
        if (options?.throwOnBlocked) {
          throw new OptOutSuppressedError(contactId, channel, requireOptOutReason(result));
        }
        return result;
      }
    }
  }

  // 5. Consulta na tabela unificada de opt-out (OptOutRecord) por leadId, e-mail e telefone
  const leadIds = Array.isArray(contact.leads)
    ? contact.leads.map((l: { id: string }) => l.id)
    : [];
  const orConditions: Array<Record<string, unknown>> = [];

  if (leadIds.length > 0) {
    orConditions.push({ leadId: { in: leadIds } });
  }

  if (contact.email) {
    orConditions.push({ email: contact.email.trim().toLowerCase() });
  }

  const phoneE164 = toE164BR(contact.whatsapp ?? contact.phone ?? undefined);
  if (phoneE164) {
    orConditions.push({ phoneE164 });
  }

  if (orConditions.length > 0) {
    const records = await prismaClient.optOutRecord.findMany({
      where: {
        organizationId,
        OR: orConditions,
      },
    });

    if (Array.isArray(records)) {
      const match = records.find((rec: any) => {
        const scopeNorm = String(rec.scope).toLowerCase();
        return scopeNorm === 'global' || scopeNorm === channelNorm;
      });

      if (match) {
        const result: OptOutCheckResult = {
          blocked: true,
          allowed: false,
          code: 'OPT_OUT_SUPPRESSED',
          reason:
            match.reason ||
            `Contato suprimido por registro de opt-out unificado (canal: ${channel}, escopo: ${match.scope}).`,
          scope: match.scope,
          evidence: match.evidence,
          originChannel: match.originChannel,
          matchedBy: 'opt_out_record',
        };
        if (options?.throwOnBlocked) {
          throw new OptOutSuppressedError(contactId, channel, requireOptOutReason(result));
        }
        return result;
      }
    }
  }

  // Contato liberado para envio
  return {
    blocked: false,
    allowed: true,
    code: null,
    reason: null,
  };
}

/**
 * Atalho que executa a checagem e lança `OptOutSuppressedError` caso o envio esteja bloqueado.
 */
export async function assertOptOutStatus(
  contactId: string,
  channel: OptOutChannel,
  organizationId: string,
  options?: Omit<CheckOptOutOptions, 'throwOnBlocked'>,
): Promise<void> {
  await checkOptOutStatus(contactId, channel, organizationId, {
    ...options,
    throwOnBlocked: true,
  });
}

/**
 * Registra o opt-out de um contato instantaneamente no banco de dados:
 * atualiza customFields do contato e cria linha na tabela unificada OptOutRecord.
 */
export async function recordContactOptOut(input: {
  organizationId: string;
  contactId: string;
  channel?: OptOutChannel;
  scope?: 'global' | 'email' | 'whatsapp' | 'voice';
  originChannel: string;
  reason?: string;
  evidence?: string;
  actorUserId?: string;
  prisma?: any;
}): Promise<void> {
  const prismaClient = input.prisma ?? defaultPrisma;
  const scope = input.scope ?? 'global';

  const contact = await prismaClient.contact.findFirst({
    where: { id: input.contactId, organizationId: input.organizationId },
    include: { leads: { select: { id: true, customFields: true } } },
  });

  if (!contact) {
    logger.warn(
      { organizationId: input.organizationId, contactId: input.contactId },
      '[opt-out] Tentativa de registrar opt-out para contato não encontrado ou de outro tenant.',
    );
    return;
  }

  const existingFields = (contact.customFields as Record<string, unknown>) || {};
  const channelNorm = (input.channel || 'global').toLowerCase();

  const updatedCustomFields: Record<string, unknown> = {
    ...existingFields,
    optOut: scope === 'global' || existingFields.optOut === true,
    optedOutAt: new Date().toISOString(),
    optOutReason: input.reason ?? 'Solicitação de opt-out',
  };

  if (scope === 'global' || channelNorm === 'whatsapp') {
    updatedCustomFields.optOutWhatsApp = true;
  }
  if (scope === 'global' || channelNorm === 'email') {
    updatedCustomFields.optOutEmail = true;
  }
  if (scope === 'global' || channelNorm === 'voice') {
    updatedCustomFields.optOutVoice = true;
  }

  await prismaClient.contact.update({
    where: { id: contact.id },
    data: {
      customFields: updatedCustomFields,
    },
  });

  // Atualiza leads vinculados
  if (Array.isArray(contact.leads)) {
    for (const lead of contact.leads) {
      const leadFields = (lead.customFields as Record<string, unknown>) || {};
      await prismaClient.lead.update({
        where: { id: lead.id },
        data: {
          customFields: {
            ...leadFields,
            optOut: true,
            optOutWhatsApp: true,
          },
        },
      });
    }
  }

  // Cria OptOutRecord na tabela unificada
  const phoneE164 = toE164BR(contact.whatsapp ?? contact.phone ?? undefined);
  const scopeDb =
    scope === 'email'
      ? 'Email'
      : scope === 'whatsapp'
        ? 'WhatsApp'
        : scope === 'voice'
          ? 'Voice'
          : 'Global';

  const leadId = contact.leads?.[0]?.id ?? null;

  await prismaClient.optOutRecord.create({
    data: {
      organizationId: input.organizationId,
      scope: scopeDb,
      leadId,
      email: contact.email ? contact.email.trim().toLowerCase() : null,
      phoneE164,
      originChannel: input.originChannel,
      reason: input.reason ?? null,
      evidence: input.evidence ?? null,
      requestedBy: input.actorUserId ?? null,
    },
  });

  logger.info(
    {
      organizationId: input.organizationId,
      contactId: contact.id,
      scope,
      originChannel: input.originChannel,
    },
    '[opt-out] Opt-out de contato registrado com sucesso.',
  );
}
