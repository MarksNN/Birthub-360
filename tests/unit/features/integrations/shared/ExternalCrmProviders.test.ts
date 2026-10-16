import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCrmProvider, registerCrmProvider, listCrmProviders } from '@/features/integrations/shared/CrmProvider.js';
import { HubSpotProvider } from '@/features/integrations/hubspot/HubspotProvider.js';
import { RdStationProvider } from '@/features/integrations/rdstation/RdStationProvider.js';

// Global fetch mock
const fetchMock = vi.fn();

describe('External CRM Providers (HubSpot, RD Station)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    if (typeof window !== 'undefined') {
      window.fetch = fetchMock;
    }
    registerCrmProvider(HubSpotProvider);
    registerCrmProvider(RdStationProvider);
  });

  it('should register and retrieve providers correctly', () => {
    const hubspot = getCrmProvider('hubspot');
    expect(hubspot).toBeDefined();
    expect(hubspot.providerKey).toBe('hubspot');

    const providers = listCrmProviders();
    expect(providers.length).toBeGreaterThanOrEqual(2);
  });

  it('HubSpotProvider.listLeads should fetch and normalize deals', async () => {
    const mockResponse = {
      results: [
        {
          id: '123',
          properties: {
            dealname: 'Deal Test',
            amount: '5000',
            dealstage: 'appointmentscheduled'
          }
        }
      ],
      paging: { next: { after: 'cursor123' } }
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const provider = getCrmProvider('hubspot');
    const result = await provider.listLeads({ accessToken: 'test-token' }, null);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/crm/v3/objects/deals'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      })
    );

    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].externalId).toBe('123');
    expect(result.leads[0].name).toBe('Deal Test');
    expect(result.leads[0].amount).toBe(5000);
    expect(result.nextCursor).toBe('cursor123');
  });

  it('RdStationProvider.pushLead should create deal successfully', async () => {
    const mockCreated = {
      deal: { _id: 'rd-456' }
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreated,
    });

    const provider = getCrmProvider('rdstation');
    const result = await provider.pushLead({ accessToken: 'rd-token' }, {
      externalId: '',
      name: 'New RD Deal',
      amount: 1200
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/deals'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New RD Deal')
      })
    );

    expect(result.externalId).toBe('rd-456');
  });
});
