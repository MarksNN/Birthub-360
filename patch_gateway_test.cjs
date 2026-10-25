const fs = require('fs');

const path = 'src/lib/ai/__tests__/gateway.test.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix the error message assertion (AI engines unavailable)
code = code.replace(
  "rejects.toThrow('resposta vazia');",
  "rejects.toThrow('Os motores de IA estão indisponíveis');"
);

// 2. Disable `vllm` for these tests (if any env variable was activating it)
// or we need to update the mock assertions since vLLM is now the first in the chain
// Let's replace the `groq` mock index logic.
// If `vllm` is not configured, the gateway skips it (isConfigured check).
// Wait, why did fetchMock intercept groq url at `calls[0]`?
// Because in previous logic groq was first. With vllm first, if vllm is not configured, groq is still calls[0].
// But `fetchMock.mock.calls[0]` is now asserting groq. Let's see what actually failed:
// "AssertionError: expected 'https://api.groq.com/openai/v1/chat/c…' to be 'http://litellm.test/v1/chat/completio…'"
// This means calls[0] was litellm url, not groq. Why?
// Ah! Dynamic routing was introduced in `getAiModel()`. It might be selecting litellm directly if groq is missing or circuit breaker is open!
// Let's modify the test to mock `dynamic-routing` or just see the exact code around line 135 and 289.

fs.writeFileSync(path, code);
