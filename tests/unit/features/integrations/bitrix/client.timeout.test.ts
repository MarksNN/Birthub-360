import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { safeFetchMock, assertSafeExternalUrlMock } = vi.hoisted(() => ({
  safeFetchMock: vi.fn(),
  assertSafeExternalUrlMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../src/shared/security/urlGuard.js", () => ({
  safeFetch: safeFetchMock,
  assertSafeExternalUrl: assertSafeExternalUrlMock,
}));

vi.mock("../../../../../src/lib/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  __resetBitrixCircuitBreakerForTests,
  callBitrix,
  testWebhook,
} from "../../../../../src/features/integrations/bitrix/service/client.js";

describe("Bitrix client body read timeout (DEBT-INT-001)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    safeFetchMock.mockReset();
    assertSafeExternalUrlMock.mockReset().mockResolvedValue(undefined);
    __resetBitrixCircuitBreakerForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts testWebhook with 504 when headers arrive in time but response.json() hangs past 15s", async () => {
    safeFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => new Promise(() => {}),
    });

    const promise = testWebhook("https://example.bitrix24.com.br/rest/1/secret/");
    const rejection = expect(promise).rejects.toMatchObject({
      statusCode: 504,
      message: expect.stringContaining("Tempo limite esgotado ao testar essa URL"),
    });

    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;
  });

  it("aborts callBitrix with 504 when headers arrive in time but response.json() hangs past 15s", async () => {
    safeFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => new Promise(() => {}),
    });

    const promise = callBitrix(
      "https://example.bitrix24.com.br/rest/1/secret/",
      "crm.lead.list",
      {},
      { maxAttempts: 1 },
    );
    const rejection = expect(promise).rejects.toMatchObject({
      statusCode: 504,
      message: expect.stringContaining("Não foi possível comunicar com o Bitrix24"),
    });

    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;
  });
});
