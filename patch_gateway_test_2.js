const fs = require('fs');

const path = 'src/lib/ai/__tests__/gateway.test.ts';
let code = fs.readFileSync(path, 'utf8');

// The issue is that dynamic routing is making calls[1] something else, probably openrouter or openai?
// Actually wait. `process.env.GROQ_API_KEY = 'gsk...'`
// `fetchMock.mock.calls` has 2 calls.
// For "não reexecuta em erro 4xx", it expects calls[0] to be Groq, calls[1] to be litellm.
// But litellm is the LAST provider in the chain (PROVIDER_CHAIN = vllm, groq, openai, openrouter, litellm).
// Since only Groq is configured, the chain tries Groq. If it fails, why does it call groq AGAIN instead of litellm?
// Or maybe it calls something else? Let's print out what `fetchMock.mock.calls[1][0]` is!
