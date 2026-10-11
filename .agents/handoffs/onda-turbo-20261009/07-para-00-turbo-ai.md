De: 07 — IA e Automações
Para: 00 — Coordenador, 05 — Prospecção, 24 — Revisão Independente
Onda: turbo-20261009
Status: resolvido
Prioridade: alto
Bloqueador-ref: revisão independente e validação de ambiente
Sprint destino: onda atual

## Problema

O gateway geral usa uma cadeia automática com outros provedores pagos, sem seleção dos modos Turbo e sem teto de saída por chamada. O cliente Ollama existente não descobre modelos nem oferece conexão segura/timeout para esta jornada. Reutilizar indiscriminadamente o gateway geral permitiria consumo externo sem autorização específica.

## Arquivos envolvidos

Base e32bad52d, branch agente/07-turbo-ai, worktree C:/Github/birthub-turbo-07.

Criados: src/lib/ai/turboSearch.ts, src/lib/ai/__tests__/turboSearch.test.ts, src/lib/ai/__tests__/usage-log.test.ts.
Alterados: src/lib/ai/gateway/circuit-breaker.ts, src/lib/ai/gateway/http-client.ts, src/lib/ai/gateway/providers/groq.provider.ts, src/lib/ai/gateway/providers/types.ts, src/lib/ai/usage-log.ts.

## Suposições e plano executado

IA apenas interpreta critérios; não produz empresas/contatos factuais e não executa ferramentas. Modo automático/local prioriza Ollama; modo Groq prioriza Groq, com fallback permitido. Toda chamada requer consentimento explícito e tenant autenticado correspondente. Groq requer autorização adicional de consumo externo. Modelos com preço desconhecido são bloqueados; dois modelos já catalogados são aceitos (openai/gpt-oss-20b e openai/gpt-oss-120b).

1. Auditar gateway/cliente/guardrails/quota → reutilizados adapter Groq, circuit breaker, orçamento/quota, redaction e ledger.
2. Implementar interpretação e discovery → schemas estritos, dados de entrada limitados, resposta somente filtros, health GET sem geração/model pull, redirects Ollama bloqueados, endpoint somente env servidor.
3. Verificar sucesso/falha → testes mocks identificados, validação local e parecer 24 solicitado ao Coordenador.

## Evidência

TESTADO: npx vitest run -c vitest.unit.config.ts src/lib/ai/__tests__/usage-log.test.ts src/lib/ai/__tests__/turboSearch.test.ts src/lib/ai/__tests__/gateway.test.ts src/lib/ai/gateway/__tests__/providers.golden.test.ts src/lib/ai/gateway/__tests__/retry.test.ts → exit0, 61 testes em cinco arquivos, 10.37s. Providers, banco e preço são mocks nos testes novos, não evidência externa.

TESTADO: npm run lint → exit0, 338 warnings e 1 info preexistentes, nenhuma correção automática ampla. git diff --check → exit0.

TESTADO: npm run build → exit0, frontend/server/PWA; build realizado antes dos últimos ajustes de accounting/concorrência, devendo ser confirmado na integração final pelo 00/08.

TESTADO: npx tsc --noEmit → primeira execução encontrou headers opcionais incompatíveis; corrigido com Record<string,string>. Segunda execução exit0. Execução da revisão final exit0, sem diagnósticos (turbo-ai-typecheck-final.log); inclui router final após ajustes de accounting/concorrência. Teste usage-log foi adicionado durante essa execução, executado separadamente com sucesso.

NÃO EXECUTADO: geração externa real; custo adicional não autorizado. Health externo é responsabilidade do 00. Não executados scripts verify:ai/integration/e2e neste worktree por dependerem de serviços/DB e/ou geração; nenhuma aprovação presumida.

## Alteração necessária e contrato

Backend 05 deve copiar somente arquivos IA para sua validação, antes de integração aprovada. Exports interpretTurboSearch({query,mode,consent:true,allowPaidProviders,maxTokens,maxCostUsd,model,organizationId,userId}) e getTurboAIProviderHealth(). Schemas de entrada/filtros exportados. Retorno {filters,provider,model,usage,usageEstimated,warnings,latencyMs}. Endpoint deve autenticar/autorizar/rate-limit, derivar tenant do servidor e registrar consentimento em audit sem query/PII. Export userId é requerido, mas nunca enviado ao provedor.

Limites: query2000 caracteres, saída512 tokens default/max1024, custo estimado por chamada defaultUSD.01/maxUSD1, timeout15s, geração Groq sem retry (0), concorrência local1 e autorizada paga1 por processo. Health timeout5s. Banco do tenant/global deve ser legível antes de geração paga; falhas impedem chamada. Quota usa policy block e inclui estimativa conservadora de tokens na comparação prévia. Contatos/identificadores são removidos antes de enviar ao LLM. Instância remota Ollama exige HTTPS e API key, configurados somente no servidor.

Uso Groq ausente ou timeout após envio conserva estimativa em ledger marcada promptId turbo-search-interpret-estimated; output usageEstimated=true diferencia estimativa de uso real. Ollama registra custo de fornecedor zero (não significa custo de infraestrutura zero). Logs não incluem prompt/resposta/PII/segredos.

## Teste esperado e pendências

24 deve revisar hashes exatos e gates de integração. 00/05 deve verificar endpoint/audit e conectividade real quando serviços disponíveis. A limitação remanescente de orçamento é concorrência distribuída: há exclusão por processo, mas não reserva transacional entre múltiplas instâncias. Rate-limit do endpoint e limites por chamada reduzem risco, sem garantir teto mensal atômico em vários servidores. O ledger legado é best-effort e pode falhar após geração; Turbo bloqueia chamadas seguintes quando banco não pode ser lido, sem inventar persistência do lançamento anterior.

Nenhum arquivo de prospecting, schema, package, server.ts ou prompt foi alterado. Nenhum commit/push/merge/install/generate executado. Fora de escopo: atualizar preços desconhecidos, ferramentas factuais/crawler/embeddings em lote, rotas e UI.

## Revisão exata SHA256

src/lib/ai/turboSearch.ts 9714BE2438833BB0B406A013CBB882D213EB5791C165CF4F09297D3DB6A232D5
src/lib/ai/__tests__/turboSearch.test.ts 15FAC632F758F7D457795CC8EAB37635E97F2A96E2533B14FEC79467D894AB40
src/lib/ai/__tests__/usage-log.test.ts EFBCC783BE0E8C5BE4A5266FAB177B134CD6A749CC42BD1774FED63D65DCA47A
src/lib/ai/gateway/circuit-breaker.ts 8523C6FAB78CACF257049958B6347A3FD0099A549021EDF09BF62DA412569D60
src/lib/ai/gateway/http-client.ts A44B3B253B71EEF00DAF8C084E97AA53A927326AB0CD8ED232519FBA7F00A658
src/lib/ai/gateway/providers/groq.provider.ts 50019058452D5125992A677F80FD444274AF0DCCA70AF8BCA9C14A4B81577E6D
src/lib/ai/gateway/providers/types.ts 4B354ED98E70D30AD2137681CE400D14BB088E8BD0C465643BC949F958B7D190
src/lib/ai/usage-log.ts 7FEDEEBAF4AF39C5FE6E94B8BA19C00D66B92549501BCBB5B628471075C40979

## Aprendizado reutilizável

Orçamento legado é fail-open por indisponibilidade DB, e estimatedTokens da quota não é utilizado internamente; o Turbo exige leitura estrita e compara consumedTokens+estimativa ao limite. logAiUsage anteriormente ignorava costInUsd, atribuindo preço aproximado a execução local: agora honra custo explícito e conserva comportamento anterior quando ausente. Mocks de custo/provedores nunca demonstram autorização/conectividade real.

## Resolução (2026-10-10, validação 07)

- Entrega já integrada em `main`: merge `d95c97d` ("Merge branch 'agente/07-turbo-ai'"), tip da branch `87b8d6e0cdbfe435aa2b571eba8267be54518b19`, ancestral de `origin/main` (`36cea20` no momento desta validação).
- Hashes SHA-256 dos 8 arquivos da seção "Revisão exata SHA256" conferidos: idênticos em `origin/main` e no tip `87b8d6e`.
- Revalidação em worktree limpo de `origin/main` (`36cea20`, após `npm ci`):
  - `npx vitest run -c vitest.unit.config.ts src/lib/ai/__tests__/usage-log.test.ts src/lib/ai/__tests__/turboSearch.test.ts src/lib/ai/__tests__/gateway.test.ts src/lib/ai/gateway/__tests__/providers.golden.test.ts src/lib/ai/gateway/__tests__/retry.test.ts` → exit 0, 5 arquivos / 61 testes passaram, 4.32s.
  - `npx tsc --noEmit` → exit 2, 1 diagnóstico fora do domínio IA: `src/components/ui/KpiCard.tsx(231,11): TS2349` (não relacionado a esta entrega; registrado para o dono de UI/00).
- Parecer 24 existente: `.agents/reviews/turbo-ai-2026-10-09-24.md` — APROVADO para integração técnica; release/deploy BLOQUEADO naquele parecer.
- Se o Coordenador 00 pediu review fresco pós-merge, o 24 deve reconfirmar contra `origin/main` (hashes acima e o comando de testes desta seção).
- Pendências do handoff original (endpoint/audit/conectividade real pelo 00/05, concorrência distribuída do orçamento) continuam válidas e fora deste fechamento.
