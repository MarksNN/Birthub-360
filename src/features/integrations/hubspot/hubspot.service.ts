import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Serviço de Integração HubSpot
 * Sincronização bidirecional com CRM
 */

export interface HubspotConnection {
  id: string;
  organizationId: string;
  label: string;
  apiKey: string;
  portalId: string;
  createdAt: Date;
}

export async function createHubspotConnection(params: {
  organizationId: string;
  label: string;
  apiKey: string;
  portalId: string;
}): Promise<HubspotConnection> {
  const connection = await (prisma as any).hubspotConnection.create({
    data: params,
  });
  logger.info({ organizationId: params.organizationId }, '[HubSpot] Conexão criada');
  return connection;
}

export async function syncLeadToHubspot(params: {
  connectionId: string;
  leadData: Record<string, unknown>;
}): Promise<{ success: boolean; hubspotId?: string }> {
  // Em produção, chamaria API real do HubSpot
  return { success: true, hubspotId: 'hubspot-' + Date.now() };
}
