import { HumanMessage } from "@langchain/core/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestContext } from "../../../../src/lib/async-context.js";
import { AiTokenQuotaExceededError } from "../../../../src/lib/ai/finops/tokenQuota.service.js";

const {
  enforceTokenQuotaMock,
  recordUsageMock,
  assertAiBudgetNotExceededMock,
  isCircuitOpenMock,
  recordCircuitSuccessMock,
  recordCircuitFailureMock,
  recordAiUsageCostMock,
  recordGroqCallMock,
  traceAiGenerationMock,
} = vi.hoisted(() => ({
  enforceTokenQuotaMock: vi.fn(),
  recordUsageMock: vi.fn().mockResolvedValue(undefined),
  assertAiBudgetNotExceededMock: vi.fn().mockResolvedValue(undefined),
  isCircuitOpenMock: vi.fn().mockResolvedValue(false),
  recordCircuitSuccessMock: vi.fn().mockResolvedValue(undefined),
  recordCircuitFailureMock: vi.fn().mockResolvedValue(undefined),
  recordAiUsageCostMock: vi.fn(),
  recordGroqCallMock: vi.fn(),
  traceAiGenerationMock: vi.fn(),
}));

vi.mock("../../../../src/lib/ai/finops/tokenQuota.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../src/lib/ai/finops/tokenQuota.service.js")>();
  return {
    ...actual,
    tokenQuotaService: {
      enforceTokenQuota: enforceTokenQuotaMock,
      recordUsage: recordUsageMock,
    },
  };
});

vi.mock("../../../../src/lib/ai/budget.js", () => ({
  assertAiBudgetNotExceeded: assertAiBudgetNotExceededMock,
}));

vi.mock("../../../../src/lib/ai/gateway/circuit-breaker.js", () => ({
  isCircuitOpen: isCircuitOpenMock,
  recordCircuitSuccess: recordCircuitSuccessMock,
  recordCircuitFailure: recordCircuitFailureMock,
}));

vi.mock("../../../../src/lib/ai/metrics.js", () => ({
  recordAiUsageCost: recordAiUsageCostMock,
  recordAiPricingFallback: vi.fn(),
}));

vi.mock("../../../../src/lib/ai/gateway/groqTelemetry.service.js", () => ({
  groqTelemetryService: {
    recordGroqCall: recordGroqCallMock,
  },
}));

vi.mock("../../../../src/lib/ai/gateway/telemetry.js", () => ({
  traceAiGeneration: traceAiGenerationMock,
}));

import { streamChatCompletion } from "../../../../src/lib/ai/gateway/streaming.js";

describe("streamChatCompletion token quota governance (DEBT-AI-001)", () => {
  const originalGroqKey = process.env.GROQ_API_KEY;
  const fetchSpy = vi.fn();

  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk_test_key";
    vi.stubGlobal("fetch", fetchSpy);
    fetchSpy.mockReset();
    enforceTokenQuotaMock.mockReset();
    recordUsageMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalGroqKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalGroqKey;
    }
    vi.unstubAllGlobals();
  });

  it("blocks streaming before fetch when enforceTokenQuota throws AiTokenQuotaExceededError", async () => {
    enforceTokenQuotaMock.mockRejectedValue(
      new AiTokenQuotaExceededError("org-quota-1", 500_000, 500_000, "starter"),
    );

    await expect(
      requestContext.run({ tenantId: "org-quota-1", requestId: "req-1" }, async () => {
        const gen = streamChatCompletion(
          [new HumanMessage("Olá")],
          "gpt-4o",
          0.3,
          "chatbook",
        );
        await gen.next();
      }),
    ).rejects.toBeInstanceOf(AiTokenQuotaExceededError);

    expect(enforceTokenQuotaMock).toHaveBeenCalledWith({
      organizationId: "org-quota-1",
      requestedModel: expect.any(String),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("applies economical effectiveModel from enforceTokenQuota and records token usage after stream completes", async () => {
    enforceTokenQuotaMock.mockResolvedValue({
      allowed: true,
      status: "exceeded",
      organizationId: "org-quota-2",
      tier: "starter",
      consumedTokens: 500_000,
      quotaTokens: 500_000,
      percentageUsed: 100,
      usageRatio: 1,
      action: "fallback",
      requestedModel: "llama-3.3-70b-versatile",
      effectiveModel: "groq/llama-3.1-8b-instant",
      warningAlertTriggered: false,
      exceededAlertTriggered: true,
    });

    const ssePayload = [
      'data: {"model":"llama-3.1-8b-instant","choices":[{"delta":{"content":"Oi"}}]}\n\n',
      'data: {"model":"llama-3.1-8b-instant","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
      "data: [DONE]\n\n",
    ].join("");

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    });

    const chunks: string[] = [];
    await requestContext.run({ tenantId: "org-quota-2", requestId: "req-2" }, async () => {
      const gen = streamChatCompletion(
        [new HumanMessage("Olá")],
        "llama-3.3-70b-versatile",
        0.3,
        "chatbook",
      );
      while (true) {
        const step = await gen.next();
        if (step.done) break;
        chunks.push(step.value.delta);
      }
    });

    expect(chunks).toEqual(["Oi"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestInit = fetchSpy.mock.calls[0]?.[1] as { body: string };
    expect(JSON.parse(requestInit.body)).toMatchObject({
      model: "groq/llama-3.1-8b-instant",
    });
    expect(recordUsageMock).toHaveBeenCalledWith({
      organizationId: "org-quota-2",
      model: "llama-3.1-8b-instant",
      tokens: 15,
    });
  });
});
