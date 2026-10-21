# Parecer Agente 24 — PR #32 REMED-05 (outbox transacional, relay, idempotência durável)

- **Missão:** REMED-05: outbox transacional, relay com backoff/DLQ, idempotência durável
- **Autor:** Agente 16 — Runtime Workers e Escala
- **PR:** https://github.com/MarksNN/Birthub-360/pull/32 (branch `agente/16-remed-05`, OPEN, não-draft)
- **SHA auditado:** `449b587fe2adc72407a8e8babadeee7346247e17` (tip atual = o reportado)
- **Base:** merge-base `3a1611f5`; main atual `91bffdf6` (o PR está atrás da main)
- **Data:** 2026-10-20 (UTC-3)
- **Veredito:** **BLOQUEADO**. Qualquer commit novo invalida este parecer.

## Escopo do diff
7 arquivos: `domainEventMesh.service.ts` (refatorado), `outbox/{backoff,inMemory,outbox.ports,outboxRelay.service}.ts`, `tests/unit/queue/outbox.remed05.test.ts` e o handoff `.agents/handoffs/16-para-01-remed-05-outbox.md`. Sem migration, sem `schema.prisma`, sem adaptador Prisma e sem wiring no DI (`src/shared/di/setup.ts` não foi alterado).

## Critérios e resultado
| Critério | Resultado |
|---|---|
| Atomicidade outbox + escrita de negócio | **Não demonstrada.** Só existem a porta `OutboxUnitOfWork` e um `InMemoryUnitOfWork`. Nenhum caso de uso real usa `withTransaction`/`publishInTransaction`, e não há `prisma.$transaction`. |
| Claim concorrente (SKIP LOCKED) | **Não implementado.** O SQL com `FOR UPDATE SKIP LOCKED` aparece só como especificação no handoff. A versão em memória é single-process. |
| Backoff, limite de tentativas, DLQ | Lógica correta na versão em memória: full jitter, cap de 5 min, 8 tentativas, `DEAD_LETTER`, lease com recuperação. **Não existe reprocessamento de DLQ** (requeue/admin). |
| Idempotência durável | **Não durável.** Na produção, o default continua `InMemory*`. O UNIQUE só existe como especificação. |
| Tenancy/RLS | Tabelas inexistentes. RLS ficou "conforme padrão do 01A", sem SQL. |
| LGPD | `envelope` jsonb guarda o payload completo, com possível PII. A retenção é só uma sugestão (30 dias) e não há purge implementado. |
| Migrations/drift | Não há migrations. Depende das tabelas do Agente 01. |
| Ciclos | Análise estática: os imports novos (`outbox/*` → `logger`, `shared/contracts`; mesh → `outbox/*`) não criam ciclo aparente. **Não verificado com depcruise.** |
| Testes | Os 144 linhas de unitários exercitam só os adaptadores em memória. Não há teste de integração nem de concorrência real. |

## Comandos e evidências
- `gh pr view 32` / `git fetch pull/32/head`: o tip confere com 449b587f.
- `npm ci` local: **morto por OOM** (exit 137). O parent mandou parar. Nenhum gate local foi executado.
- CI do tip (run 39522343732): `application gate` **FAIL no step 7, "Audit for vulnerabilities (waiver-aware)"**. É o vite herdado da main antiga, corrigido pelo #24. Os steps seguintes (typecheck, lint, vitest, arquitetura, drift) **não rodaram**. `build`/consolidação: FAIL por consequência. Passaram: CodeQL, Trivy, secret scan, dependency review, bundle budget e visual regression. SonarQube estava pendente.
- **Gates não executados:** typecheck, biome format:check/lint:ci, check:hotspots, vitest, test:architecture (Node 22), verify:migration-drift, verify:openapi-drift e integração em Postgres 17. A integração também é impossível, porque as tabelas do 01 não existem. Os "27/27 unitários e tsc ok" do autor **não foram reproduzidos**.

## Achados
- **P1:** não há implementação durável. O default de produção continua `InMemoryOutboxRepository`/`InMemoryConsumptionStore`, então os eventos e a deduplicação se perdem a cada restart e não são compartilhados entre réplicas. Os objetivos centrais do REMED-05 (atomicidade, SKIP LOCKED, unique durável) estão só especificados. Bloqueado pelas tabelas do Agente 01.
- **P2:** o `publish()` inline grava o registro como `PENDING` com `nextAttemptAt=createdAt`, sem lock. Um relay concorrente pode reivindicá-lo durante a entrega inline e gerar entrega dupla. O `markDispatched('inline')` também não verifica o lock. Sugestão: gravar como `PROCESSING` com `lockedBy='inline'` e um lease.
- **P2:** em `deliver`, a sequência `has()`, depois o handler, depois `record()` não é atômica. Duas instâncias (ou uma reentrega após lease expirado) executam o handler duas vezes, então o resultado é at-least-once, não o "exactly-once efetivo" declarado. Os handlers precisam ser idempotentes, ou o registro precisa ser feito na mesma transação do efeito do handler.
- **P2:** nenhum caso de uso de negócio foi migrado para `withTransaction`, então o problema de dual-write continua em todos os produtores atuais.
- **P3:** falta reprocessamento de DLQ (requeue/admin) e métrica/alerta de DLQ.
- **P3 (LGPD):** o envelope com payload completo fica no jsonb, sem retenção nem purge implementados e sem mascaramento de `lastError`.
- **P3:** o PR está atrás da main (91bffdf6). O CI precisa rodar de novo após o rebase sobre #24/#30.
- **P4:** o `InMemoryUnitOfWork` copia e substitui o mapa inteiro, perdendo escritas concorrentes de fora da UoW. Aceitável só em dev/teste. Também há casts `as unknown as` repetidos no envelope.

## Condições para reavaliação
1. O Agente 01 entrega a migration das tabelas `DomainEventOutbox`/`DomainEventConsumption`, com UNIQUEs, índices parciais, FK, RLS e o `verify:migration-drift` verde.
2. Adaptadores Prisma (claim com `FOR UPDATE SKIP LOCKED`, `ON CONFLICT DO NOTHING`) com wiring no DI de produção.
3. Correção dos P2: lock no publish inline e consumo atômico, ou idempotência documentada como at-least-once.
4. Teste de integração em Postgres: rollback descarta o evento, 2 relays concorrentes não duplicam, DLQ e unique de consumo.
5. Rebase sobre a main com o #24 e o #30, e o gate completo de CI verde.
6. Política de retenção e purge (LGPD) definida com o 01A.
