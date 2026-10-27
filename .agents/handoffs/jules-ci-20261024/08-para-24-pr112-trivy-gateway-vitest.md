- De: 08 — QA e Release (com Agente 00)
- Para: 24 — Revisão Independente
- Onda: jules-ci-20261024
- Status: aberto
- Prioridade: alto

## Problema
O PR #112 (`agente/08-ci-02-trivy-20261024`) foi criado para sanar os advisories HIGH/CRITICAL de dependências detectados pelo Trivy (@vitest/mocker e cadeia Vitest, body-parser e undici).
Na primeira rodada no GitHub Actions, o gate do Trivy foi aprovado com sucesso, porém o SonarQube falhou na etapa de testes unitários devido a 3 quebras em `gateway.test.ts` (as chaves de IA do ambiente, como `OPENROUTER_API_KEY`, interferiam no roteamento dinâmico e o fallback estático repetia provedores com erro 4xx).

## Arquivo(s) envolvido(s)
- `package.json` / `package-lock.json`: elevação de `vitest` e `@vitest/*` para `4.1.12`.
- `src/lib/ai/gateway/chat-model.ts`: repasse de `errorsByProvider` ao `callWithFallback` para não reexecutar provedor que acabou de falhar no roteamento dinâmico.
- `src/lib/ai/__tests__/gateway.test.ts`: isolamento determinístico das variáveis de provedores (`PROVIDER_ENV_KEYS`) com `vi.stubEnv` e reset de cache/circuit breaker entre os testes.

## Evidência
1. **Trivy no GitHub Actions**:
   - `Trivy — gate de PR (fs/dependências, HIGH/CRITICAL, bloqueante)`: **PASS** (44s, run `40338300243`).
   - `Central Birth Hub 360 / trivy scan`: **PASS** (44s, run `40338300513`).
   - `Central Birth Hub 360 / secret scan`: **PASS** (15s).
   - `Central Birth Hub 360 / dependency review`: **PASS** (10s).
2. **Auditoria Local**:
   - `npm run security:audit-waivers`: ✅ nenhum achado HIGH/CRITICAL.
   - `npm audit --audit-level=high`: ✅ exit 0.
3. **Testes Unitários**:
   - `npx vitest run -c vitest.unit.config.ts src/lib/ai/__tests__/gateway.test.ts`: 15/15 testes aprovados (100% verde).

## Alteração necessária
Revisão independente do diff no PR #112 com base no commit `bc49df1e1`.

## Teste esperado
- Gate de PR Trivy verde.
- Suíte `src/lib/ai/__tests__/gateway.test.ts` verde.
- Sem novas permissões, sem alteração de waivers e sem quebra de RBAC/RLS/LGPD.

## Contexto adicional
- PR: https://github.com/MarksNN/Birthub-360/pull/112
- Base: `main` (merge de `origin/main` efetuado limpo no commit `1cef85992`).
- Head: `bc49df1e1`.
