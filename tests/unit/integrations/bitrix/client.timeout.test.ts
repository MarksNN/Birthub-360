import { describe, expect, it, vi } from 'vitest';
import { BitrixClient } from '../../../../src/features/integrations/bitrix/client.js';

describe('BitrixClient Rate Limiting & Retry (Passo 053)', () => {
  const webhookUrl = 'https://mock.bitrix24.com/rest/1/webhook-token';

  it('deve respeitar o intervalo mínimo de 500ms entre requisições consecutivas', async () => {
    const client = new BitrixClient({ webhookUrl, minIntervalMs: 50 }); // 50ms para teste ágil

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { id: 101 } }),
    });

    const start = Date.now();
    await client.callMethod('crm.lead.get', { id: 1 }, mockFetch as any);
    await client.callMethod('crm.lead.get', { id: 2 }, mockFetch as any);
    const elapsed = Date.now() - start;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it('deve recuperar com sucesso de resposta HTTP 429 via retry com backoff', async () => {
    const client = new BitrixClient({ webhookUrl, minIntervalMs: 10, maxRetries: 2 });

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 429, statusText: 'Too Many Requests' };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: { id: 202 } }),
      };
    });

    const res = await client.callMethod('crm.deal.get', { id: 202 }, mockFetch as any);

    expect(callCount).toBe(2);
    expect(res.result).toEqual({ id: 202 });
  });

  it('deve falhar se os retries excederem o limite configurado', async () => {
    const client = new BitrixClient({ webhookUrl, minIntervalMs: 5, maxRetries: 1 });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(
      client.callMethod('crm.lead.list', {}, mockFetch as any),
    ).rejects.toThrow(/rate limit excedido/i);
  });
});
