import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalCrmService } from '@/features/integrations/shared/ExternalCrmService.js';
import { prisma } from '@/lib/prisma.js';
import * as CrmProviderModule from '@/features/integrations/shared/CrmProvider.js';

vi.mock('@/lib/prisma.js', () => ({
  prisma: {
    externalCrmConnection: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    externalEntityLink: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    externalCrmSyncLog: {
      create: vi.fn(),
    },
  },
}));

describe('ExternalCrmService.pushLeadToAllConnections', () => {
  const orgId = 'org-test-123';
  const leadId = 'lead-test-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve filtrar conexões com status=active e outboundEnabled=true, usando ExternalEntityLink como fonte de verdade', async () => {
    const mockProvider = {
      providerKey: 'hubspot',
      displayName: 'HubSpot',
      authType: 'oauth2' as const,
      listLeads: vi.fn(),
      pushLead: vi.fn().mockResolvedValue({ externalId: 'ext-deal-999' }),
    };

    vi.spyOn(CrmProviderModule, 'getCrmProvider').mockReturnValue(mockProvider as any);

    (prisma.externalCrmConnection.findMany as any).mockResolvedValue([
      {
        id: 'conn-1',
        organizationId: orgId,
        provider: 'hubspot',
        status: 'active',
        outboundEnabled: true,
        config: JSON.stringify({ accessToken: 'valid-token' }),
      },
    ]);

    (prisma.externalEntityLink.findUnique as any).mockResolvedValue({
      externalId: 'ext-deal-prior',
    });

    const results = await ExternalCrmService.pushLeadToAllConnections(orgId, leadId, {
      name: 'Negócio ACME Corp',
      amount: 15000,
    });

    expect(prisma.externalCrmConnection.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: orgId,
        status: 'active',
        outboundEnabled: true,
      },
    });

    expect(prisma.externalEntityLink.findUnique).toHaveBeenCalledWith({
      where: {
        connectionId_entityType_internalId: {
          connectionId: 'conn-1',
          entityType: 'lead',
          internalId: leadId,
        },
      },
    });

    expect(mockProvider.pushLead).toHaveBeenCalledWith(
      { accessToken: 'valid-token' },
      expect.objectContaining({ externalId: 'ext-deal-prior', name: 'Negócio ACME Corp' }),
      'ext-deal-prior',
    );

    expect(prisma.externalEntityLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          connectionId_externalType_externalId: {
            connectionId: 'conn-1',
            externalType: 'deal',
            externalId: 'ext-deal-999',
          },
        },
      }),
    );

    expect(prisma.externalCrmSyncLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: orgId,
        connectionId: 'conn-1',
        leadId,
        direction: 'outbound',
        status: 'success',
        entityType: 'lead',
        externalEntityId: 'ext-deal-999',
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('fulfilled');
  });
});
