import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), fetchRetry: vi.fn(), key: vi.fn() }));
vi.mock('../../../../lib/http.js', () => ({ fetchWithTimeout: mocks.fetch }));
vi.mock('../../../../lib/enrichment/providerFetch.js', () => ({
  fetchWithProviderRetry: mocks.fetchRetry,
}));
vi.mock('../../../../config/prospecting-integrations.js', () => ({
  getPaidProspectingKey: mocks.key,
}));
vi.mock('../../../../lib/logger.js', () => ({ logger: { error: vi.fn() } }));

import { searchNominatimCandidates } from '../nominatim.service.js';
import { searchGooglePlacesCandidates } from '../places.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.key.mockReturnValue('test-fixture');
});
describe('Providers: erros não são resultados vazios', () => {
  it('Google 500 rejeita sanitizado sem payload do fornecedor', async () => {
    mocks.fetchRetry.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'secret-token',
    });
    await expect(searchGooglePlacesCandidates('Empresa', 5)).rejects.toThrow(
      'Google Places indisponível',
    );
  });
  it('Nominatim timeout rejeita sanitizado', async () => {
    mocks.fetch.mockRejectedValue(new Error('secret-url'));
    await expect(searchNominatimCandidates('Empresa', 5)).rejects.toThrow('Nominatim indisponível');
  });
  it('Google lista vazia continua sendo resposta válida', async () => {
    mocks.fetchRetry.mockResolvedValue({ ok: true, json: async () => ({ places: [] }) });
    await expect(searchGooglePlacesCandidates('Empresa', 5)).resolves.toEqual([]);
  });
  it('Nominatim vazio continua sendo resposta válida', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => [] });
    await expect(searchNominatimCandidates('Empresa', 5)).resolves.toEqual([]);
  });
});
