# Handoff: Duplicação de chamadas (Dynamic Routing vs Static Fallback) no Gateway de IA

## Para: Agente 01 (Jules 01)
## Status: Descoberta durante a Missão 02 (Trivy), fora de escopo para correção imediata.

## Descrição do Problema
Os testes unitários em `src/lib/ai/__tests__/gateway.test.ts` falharam após a integração do módulo `dynamic-routing.ts`. A causa raiz é uma duplicação na chamada aos provedores quando o provedor selecionado dinamicamente falha.

Em `src/lib/ai/gateway/chat-model.ts`, a função `callWithDynamicRouting` faz o seguinte:
1. Chama `selectDynamicRouting(routingOptions)`, que retorna o melhor provedor (ex: `groq`).
2. Tenta fazer a chamada ao `routingResult.selectedProvider` num bloco `try/catch`.
3. Se a chamada falha, o erro é pego no `catch (routingError)`, gerando um log de aviso: `[DynamicRouting] Falha no routing dinâmico, usando fallback estático`.
4. A execução então **continua** (não retorna nem lança erro) e cai na linha final da função, que chama `callWithFallback(...)`.
5. `callWithFallback` percorre a cadeia completa configurada em `PROVIDER_CHAIN` (onde `groq` é novamente uma das primeiras opções).

**Consequência de Rede/HTTP:**
Se a rede falhar ou a API do Groq estiver offline (`new Error('Groq offline')`), a aplicação fará a requisição HTTP duas vezes para o mesmo provedor falho:
1. Primeira vez pelo `selectedProvider` dinâmico.
2. Segunda vez pela cadeia de `callWithFallback`.

## Sequência HTTP e de Modelo
- **Model solicitado:** `local-llama3`
- **Dynamic Routing:** Seleciona `groq` com base nos pesos de tier/custo/latência.
- **Request 1:** `POST https://api.groq.com/openai/v1/chat/completions` -> Falha (ex: Error).
- **Fallback Estático:** Iteração sobre `PROVIDER_CHAIN`.
- **Request 2:** `POST https://api.groq.com/openai/v1/chat/completions` -> Falha novamente.
- **Request 3:** Próximo da cadeia (ex: LiteLLM, `http://litellm.test/v1/chat/completions`).

Nos testes que simulam o provedor principal offline e validam o redirecionamento imediato para o provedor secundário (LiteLLM), o mock do `fetch` capta as *duas* tentativas em cima do Groq, quebrando asserts de URL como `expect(litellmUrl).toBe('http://litellm.test/v1/chat/completions')`.

## Outros Problemas Identificados
1. Referência a `tierTier` não declarada em `dynamic-routing.ts` (deveria ser `tenantTier`).
2. A importação de `OrganizationTier` em `dynamic-routing.ts` aponta para o diretório errado: `../../finops/tokenQuota.service.js` em vez de `../finops/tokenQuota.service.js`.
3. O teste `Sidebar.test.tsx` estava quebrado pois dividia o texto `Birth Hub 360` em dois spans distintos, e procurava pelo texto todo de uma só vez (isso não pode ser comitado neste PR Trivy por instruções da governança, devendo ser entregue isoladamente).

## Diff Proposto (NÃO APLICADO NESTA BRANCH)

```diff
diff --git a/src/lib/ai/gateway/chat-model.ts b/src/lib/ai/gateway/chat-model.ts
--- a/src/lib/ai/gateway/chat-model.ts
+++ b/src/lib/ai/gateway/chat-model.ts
@@ -12,6 +12,7 @@
 import { tokenQuotaService } from '../finops/tokenQuota.service.js';
 import { detectPII, detectToxicity } from '../guardrails/index.js';
 import { resolveFallbackTimeoutMs } from './http-client.js';
+import { logger } from '../../logger.js';
 import { resolveModelName } from './model-routing.js';
 import { toChatCompletionMessages } from './parsing.js';
 import { estimateCostUsd } from './pricing.js';
@@ -192,6 +193,9 @@
       '[DynamicRouting] Falha no routing dinâmico, usando fallback estático',
     );
+
+    // Opcional: passar routingResult.selectedProvider.name para o callWithFallback ignorar
+    // a primeira iteração, evitando chamar a rede 2x para o mesmo provedor offline.
   }

   // Fallback para cadeia estática se routing dinâmico falhar
diff --git a/src/lib/ai/gateway/dynamic-routing.ts b/src/lib/ai/gateway/dynamic-routing.ts
--- a/src/lib/ai/gateway/dynamic-routing.ts
+++ b/src/lib/ai/gateway/dynamic-routing.ts
@@ -11,7 +11,7 @@
 import { PRICING_PER_MILLION_TOKENS } from './pricing.js';
 import { isCircuitOpen } from './circuit-breaker.js';
 import type { ProviderAdapter } from './providers/types.js';
-import type { OrganizationTier } from '../../finops/tokenQuota.service.js';
+import type { OrganizationTier } from '../finops/tokenQuota.service.js';

 /** Métricas de latência recentes por provider/model (em memória, janela deslizante). */
 interface LatencyMetrics {
@@ -180,7 +180,7 @@
   options: DynamicRoutingOptions,
 ): Promise<DynamicRoutingResult> {
   const { tenantTier, requestedModel, availableProviders } = options;
-  const weights = adjustWeightsForTier(tierTier);
+  const weights = adjustWeightsForTier(tenantTier);

   // Filtra providers configurados
   const configuredProviders = availableProviders.filter((p) => p.isConfigured());
diff --git a/src/lib/ai/gateway/streaming.ts b/src/lib/ai/gateway/streaming.ts
--- a/src/lib/ai/gateway/streaming.ts
+++ b/src/lib/ai/gateway/streaming.ts
@@ -24,7 +24,7 @@
   modelName: string,
   temperature: number,
   agentContext: string,
-): AsyncGenerator<AiStreamChunk, AiStreamResult> {
+): AsyncGenerator<AiStreamChunk, any, undefined> {
   // Usa a implementação com fallback entre provedores
-  yield* streamChatCompletionWithFallback(messages, modelName, temperature, agentContext);
+  return yield* streamChatCompletionWithFallback(messages, modelName, temperature, agentContext);
 }
```
