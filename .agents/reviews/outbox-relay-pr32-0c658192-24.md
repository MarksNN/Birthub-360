# Parecer Agente 24 — PR #32 @ 0c658192

- **Missão:** REMED-05 — outbox transacional, relay com backoff/DLQ e idempotência durável.
- **Autor:** Agente 16 (branch `agente/16-remed-05`).
- **Base:** main @ 8dff1dde (behind 0).
- **SHA revisado:** 0c658192. Parecer anterior: BLOQUEADO @ 449b587f (commit f108644).
- **Dependência:** schema do #34 (BLOQUEADO @ eaf0d4e7), ainda fora da main.
- **Veredito: BLOQUEADO.**

## Critérios (pendências do parecer anterior)
P1 durabilidade (adaptadores Prisma no DI + withTransaction nos produtores); P2 publish inline sem lock; P2 consumo has→handler→record não atômico; produtores não migrados; DLQ requeue; retenção; alinhamento ao schema do #34.

## Comandos
- `gh api .../compare/449b587f...0c658192`; `gh pr diff 32`
- logs do application gate do run 39530595410

## Evidências
- Adaptadores Prisma novos (`prismaOutbox.repository.ts`, `prismaRuntime.ts`): claim com CTE `FOR UPDATE SKIP LOCKED`, `now()` do Postgres, relay por tenant (`listTenants` via `Organization` na allowlist de bypass), sem BYPASSRLS. Alinhado ao #34 @ eaf0d4e7 (reservedBy/reservedUntil/completedAt).
- **Publish inline:** grava já reivindicado (PROCESSING, lockedBy `inline-<uuid>`), relay concorrente não pega. **P2 anterior resolvido.**
- **Consumo:** reserva atômica com `ON CONFLICT ... DO UPDATE WHERE completedAt IS NULL AND reservedUntil < now()`, `complete` e `release` só do dono. **P2 anterior resolvido no desenho.**
- DLQ: `requeueDeadLetters` com filtro por org/ids e métrica. Retenção: `purgeExpired()` chama `domain_event_outbox_purge` por tenant. **Resolvidos no código.**
- **Durabilidade:** `setup.ts`/`worker.ts` só ligam Prisma com `DOMAIN_EVENT_OUTBOX=prisma`; sem a flag o mesh continua `InMemoryOutboxRepository`/`InMemoryConsumptionStore` (defaults no construtor). Não há fail-closed em produção. O `DomainEventOutboxUnitOfWork` é registrado de forma assíncrona (`void ...then`).
- **Produtores:** nenhum migrado para `publishInTransaction`; o handoff lista 6 produtores com dual-write (bitrix.webhook, whatsappMessage, accountKnowledgeGraph, proposalAutomation, marketSensing, continuousSecurityAudit), "dono a confirmar".
- Gate (run 39530595410): Architecture ✔ 0 violações; Unit 4954 passed; Integration 4 failed (as herdadas do #25) / 656 passed / **15 skipped, incluindo `remed05-outbox-adapter.test.ts` 13/13 skipped** (tabelas do #34 ausentes). Build/Smoke/E2E skipped.

## Achados
- **P1 — Durabilidade não garantida em produção:** padrão continua em memória; depende de flag e do #34. Exigir: em `NODE_ENV=production` sem `DOMAIN_EVENT_OUTBOX=prisma` (ou sem as tabelas) → falhar o boot.
- **P1 — Sem evidência de integração:** os 13 testes do adaptador foram pulados no CI; o caminho Prisma nunca rodou contra o schema real.
- **P2 — Dual-write persiste:** os 6 produtores que gravam no banco e publicam em seguida não usam `publishInTransaction`. A garantia transacional da REMED-05 não existe para eles. Precisa de PRs encadeados com dono ou migração aqui.
- **P3 — Registro assíncrono do UoW** no DI (`void configure...then`): uma requisição logo no boot pode não achar `DomainEventOutboxUnitOfWork`.
- **P4:** prazos de retenção provisórios (30/90/30d).

## Condições para reavaliação
1. #34 na main; rebase; `remed05-outbox-adapter` executando (não skipped) e verde.
2. Fail-closed em produção para o modo em memória; UoW registrado de forma síncrona/await.
3. Plano com dono e PRs para os 6 produtores com dual-write (ou migração aqui).
4. Gate 100% verde após o #25.

Agente 24 — 2026-10-20 ~23:35 BRT. Sem comentários públicos no PR.
