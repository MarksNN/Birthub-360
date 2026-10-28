import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { eraseDataSubject } from '../../shared/services/dataSubjectErasure.service.js';
import {
  assertOptOutStatus,
  checkOptOutStatus,
  isOptOutKeyword,
  type OptOutChannel,
  type OptOutCheckResult,
  OptOutSuppressedError,
  recordContactOptOut,
} from './services/optOutCheck.service.js';

export class LgpdService {
  /**
   * Apaga / Anonimiza dados de um titular (LGPD Art. 18)
   */
  async eraseContact(organizationId: string, contactId: string, actorUserId?: string) {
    return await eraseDataSubject({ organizationId, contactId, actorUserId });
  }

  /**
   * Verifica se o contato está bloqueado por opt-out antes de qualquer disparo.
   */
  async checkOptOut(contactId: string, channel: OptOutChannel, organizationId: string) {
    return await checkOptOutStatus(contactId, channel, organizationId);
  }

  /**
   * Registra opt-out instantâneo para o contato e seus canais/leads.
   */
  async recordOptOut(input: {
    organizationId: string;
    contactId: string;
    channel?: OptOutChannel;
    scope?: 'global' | 'email' | 'whatsapp' | 'voice';
    originChannel: string;
    reason?: string;
    evidence?: string;
    actorUserId?: string;
  }) {
    return await recordContactOptOut(input);
  }

  /**
   * Exporta os dados do titular em JSON estruturado (LGPD Portabilidade - Art. 18 V)
   */
  async exportContactData(organizationId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        leads: {
          select: {
            id: true,
            title: true,
            status: true,
            temperature: true,
            createdAt: true,
          },
        },
        whatsAppMessages: {
          select: {
            id: true,
            direction: true,
            receivedAt: true,
          },
        },
      },
    });

    if (!contact) {
      throw new Error('Contato não encontrado.');
    }

    logger.info({ organizationId, contactId }, '[LGPD] Exportação de dados do titular realizada');

    return {
      exportTimestamp: new Date().toISOString(),
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        whatsapp: contact.whatsapp,
        linkedin: contact.linkedin,
        birthDate: contact.birthDate,
        observations: contact.observations,
        customFields: contact.customFields,
        createdAt: contact.createdAt,
      },
      associatedLeads: contact.leads.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        temperature: l.temperature,
        createdAt: l.createdAt,
      })),
      whatsAppMessagesCount: contact.whatsAppMessages.length,
    };
  }
}

export const lgpdService = new LgpdService();

export {
  assertOptOutStatus,
  checkOptOutStatus,
  isOptOutKeyword,
  type OptOutChannel,
  type OptOutCheckResult,
  OptOutSuppressedError,
  recordContactOptOut,
};
