/**
 * ExternalCrmService — Serviço de aplicação para gerenciar conexões com CRMs externos.
 * Usada pelas rotas da API e pela fila de sync.
 */

import { prisma } from '@/lib/prisma';
import { type CrmConnectionConfig, getCrmProvider, listCrmProviders } from './CrmProvider.js';

// Ensure all providers are registered before use
import '../hubspot/HubspotProvider.js';
import '../pipedrive/PipedriveProvider.js';
import '../rdstation/RdStationProvider.js';
import '../monday/MondayProvider.js';

export interface CreateCrmConnectionInput {
  organizationId: string;
  provider: string;
  label: string;
  config: CrmConnectionConfig;
  inboundEventsEnabled?: boolean;
}

export const ExternalCrmService = {
  /**
   * List all available CRM providers that can be connected.
   */
  listAvailableProviders() {
    return listCrmProviders().map((p) => ({
      key: p.providerKey,
      name: p.displayName,
      authType: p.authType,
    }));
  },

  /**
   * List all active connections for an organization.
   */
  async listConnections(organizationId: string) {
    return prisma.externalCrmConnection.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        label: true,
        inboundEventsEnabled: true,
        createdAt: true,
        updatedAt: true,
        // NOTE: config is encrypted, do NOT include it in listings
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Create a new CRM connection. The `config` object (containing tokens/keys)
   * is encrypted at rest by the Prisma extension (piiFields.ts).
   */
  async createConnection(input: CreateCrmConnectionInput) {
    // Validate provider exists
    getCrmProvider(input.provider);

    return prisma.externalCrmConnection.create({
      data: {
        organizationId: input.organizationId,
        provider: input.provider,
        label: input.label,
        config: JSON.stringify(input.config), // Encrypted by Prisma extension
        inboundEventsEnabled: input.inboundEventsEnabled ?? false,
      },
    });
  },

  /**
   * Delete a connection and all its sync rules/logs.
   */
  async deleteConnection(connectionId: string, organizationId: string) {
    return prisma.externalCrmConnection.deleteMany({
      where: { id: connectionId, organizationId },
    });
  },

  /**
   * Validate that an existing connection's credentials are still valid.
   */
  async validateConnection(connectionId: string, organizationId: string): Promise<boolean> {
    const conn = await prisma.externalCrmConnection.findFirst({
      where: { id: connectionId, organizationId },
    });

    if (!conn) return false;

    const provider = getCrmProvider(conn.provider);
    const config: CrmConnectionConfig = JSON.parse(conn.config); // Decrypted by Prisma extension

    return provider.validateConnection(config);
  },

  /**
   * Pull leads from a connected CRM and return normalized results.
   * Does NOT persist to the database — caller is responsible for upsert.
   */
  async importLeads(connectionId: string, organizationId: string, cursor?: string) {
    const conn = await prisma.externalCrmConnection.findFirst({
      where: { id: connectionId, organizationId },
    });

    if (!conn) throw new Error(`Connection ${connectionId} not found`);

    const provider = getCrmProvider(conn.provider);
    const config: CrmConnectionConfig = JSON.parse(conn.config);

    const rule = await prisma.externalCrmSyncRule.findFirst({
      where: { connectionId, active: true },
      orderBy: { createdAt: 'asc' },
    });

    const lastImportedAt = rule?.lastRunAt ?? null;

    return provider.listLeads(config, lastImportedAt, cursor);
  },

  /**
   * Push a lead to all active connections of the org that support outbound sync.
   * Used by the crm-outbound-sync queue worker.
   *
   * Regras Onda 16 (Coordenador 00 / Agente 06):
   * 1. Conexões filtradas por status='active' E outboundEnabled=true.
   * 2. ID externo lido e gravado em ExternalEntityLink (fonte de verdade).
   * 3. ExternalCrmSyncLog gerado para auditoria.
   */
  async pushLeadToAllConnections(
    organizationId: string,
    leadId: string,
    normalizedLead: { name: string; amount?: number; stageLabel?: string },
  ) {
    const connections = await prisma.externalCrmConnection.findMany({
      where: {
        organizationId,
        status: 'active',
        outboundEnabled: true,
      },
    });

    const results = await Promise.allSettled(
      connections.map(async (conn) => {
        const provider = getCrmProvider(conn.provider);
        const config: CrmConnectionConfig = JSON.parse(conn.config);

        // Fonte de verdade estável: ExternalEntityLink
        const existingLink = await prisma.externalEntityLink.findUnique({
          where: {
            connectionId_entityType_internalId: {
              connectionId: conn.id,
              entityType: 'lead',
              internalId: leadId,
            },
          },
        });

        const externalIdToUse = existingLink?.externalId;

        const result = await provider.pushLead(
          config,
          { externalId: externalIdToUse ?? '', ...normalizedLead },
          externalIdToUse ?? undefined,
        );

        const now = new Date();

        // Grava/atualiza vínculo em ExternalEntityLink
        await prisma.externalEntityLink.upsert({
          where: {
            connectionId_externalType_externalId: {
              connectionId: conn.id,
              externalType: 'deal',
              externalId: result.externalId,
            },
          },
          update: {
            lastSyncedAt: now,
            lastDirection: 'outbound',
            internalId: leadId,
            entityType: 'lead',
          },
          create: {
            organizationId,
            connectionId: conn.id,
            entityType: 'lead',
            internalId: leadId,
            externalType: 'deal',
            externalId: result.externalId,
            lastSyncedAt: now,
            lastDirection: 'outbound',
          },
        });

        // Atualiza lastSyncAt da conexão
        await prisma.externalCrmConnection.update({
          where: { id: conn.id },
          data: { lastSyncAt: now },
        });

        // Auditoria em ExternalCrmSyncLog
        await prisma.externalCrmSyncLog.create({
          data: {
            organizationId,
            connectionId: conn.id,
            leadId,
            direction: 'outbound',
            status: 'success',
            entityType: 'lead',
            externalEntityId: result.externalId,
          },
        });

        return { provider: conn.provider, externalId: result.externalId };
      }),
    );

    return results;
  },
};
