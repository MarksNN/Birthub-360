import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Serviço de Integração Calendly
 *
 * Permite agendamento automático de demos e reuniões via Calendly.
 * Usa OAuth 2.0 para autenticação e webhooks para sincronização.
 */

export interface CalendlyConnection {
  id: string;
  organizationId: string;
  label: string;
  accessToken: string;
  refreshToken: string | null;
  calendlyUserId: string;
  defaultEventTypeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendlyEvent {
  id: string;
  name: string;
  start: string;
  end: string;
  status: 'active' | 'canceled';
  location: string | null;
  inviteesEmails: string[];
}

/**
 * Cria conexão Calendly para uma organização
 */
export async function createCalendlyConnection(params: {
  organizationId: string;
  label: string;
  accessToken: string;
  refreshToken?: string;
  calendlyUserId: string;
}): Promise<CalendlyConnection> {
  const connection = await prisma.calendlyConnection.create({
    data: {
      organizationId: params.organizationId,
      label: params.label,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken || null,
      calendlyUserId: params.calendlyUserId,
    },
  });

  logger.info(
    { organizationId: params.organizationId, connectionId: connection.id },
    '[Calendly] Conexão criada',
  );

  return connection;
}

/**
 * Lista conexões Calendly de uma organização
 */
export async function listCalendlyConnections(
  organizationId: string,
): Promise<CalendlyConnection[]> {
  return prisma.calendlyConnection.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Busca eventos disponíveis do Calendly
 */
export async function listCalendlyEventTypes(connectionId: string): Promise<any[]> {
  const connection = await prisma.calendlyConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error('Conexão Calendly não encontrada');
  }

  try {
    const response = await fetch('https://api.calendly.com/event_types', {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Calendly API error: ${response.status}`);
    }

    const data = await response.json();
    return data.collection || [];
  } catch (error: any) {
    logger.error({ err: error, connectionId }, '[Calendly] Erro ao buscar eventos');
    throw error;
  }
}

/**
 * Cria evento de agendamento no Calendly
 */
export async function createCalendlyEvent(params: {
  connectionId: string;
  eventTypeId: string;
  startTime: string;
  durationMinutes: number;
  inviteeEmail: string;
  inviteeName: string;
  notes?: string;
}): Promise<CalendlyEvent> {
  const connection = await prisma.calendlyConnection.findUnique({
    where: { id: params.connectionId },
  });

  if (!connection) {
    throw new Error('Conexão Calendly não encontrada');
  }

  try {
    const response = await fetch('https://api.calendly.com/scheduled_events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type_uuid: params.eventTypeId,
        start_time: params.startTime,
        duration_minutes: params.durationMinutes,
        location: { type: 'online' },
        invitees: [
          {
            email: params.inviteeEmail,
            name: params.inviteeName,
          },
        ],
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Calendly API error: ${response.status}`);
    }

    const data = await response.json();

    const event: CalendlyEvent = {
      id: data.resource.uuid,
      name: data.resource.name,
      start: data.resource.start_time,
      end: data.resource.end_time,
      status: data.resource.status,
      location: data.resource.location?.type || null,
      inviteesEmails: data.resource.invitees.map((i: any) => i.email),
    };

    logger.info(
      { connectionId: params.connectionId, eventId: event.id },
      '[Calendly] Evento criado',
    );

    return event;
  } catch (error: any) {
    logger.error(
      { err: error, connectionId: params.connectionId },
      '[Calendly] Erro ao criar evento',
    );
    throw error;
  }
}

/**
 * Atualiza conexão Calendly (refresh token)
 */
export async function updateCalendlyConnection(
  connectionId: string,
  updates: {
    accessToken?: string;
    refreshToken?: string;
    defaultEventTypeId?: string;
  },
): Promise<CalendlyConnection> {
  const connection = await prisma.calendlyConnection.update({
    where: { id: connectionId },
    data: updates,
  });

  logger.info({ connectionId }, '[Calendly] Conexão atualizada');

  return connection;
}

/**
 * Deleta conexão Calendly
 */
export async function deleteCalendlyConnection(connectionId: string): Promise<void> {
  await prisma.calendlyConnection.delete({
    where: { id: connectionId },
  });

  logger.info({ connectionId }, '[Calendly] Conexão deletada');
}
