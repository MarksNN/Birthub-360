# Parecer Agente 24 — PR #34 REMED-05 schema da outbox

- **Missão:** revisão independente do schema da outbox transacional e da idempotência durável (handoff 16→01, base para o #32).
- **Autor:** Agente 01 — Plataforma Segurança e Dados
- **PR:** https://github.com/MarksNN/Birthub-360/pull/34 (branch `agente/01-remed-05-outbox-schema`)
- **SHA revisado:** `2c7ccb28acb02367715531432fea0d91a3bb5a6d` (tip conferido em 2026-10-20 22:10 BRT)
- **Base:** main `91bffdf6` (ainda vermelha em Architecture tests; ciclos herdados do #15, que o #30 resolve)
- **Veredito:** **BLOQUEADO** @ 2c7ccb28

## Critérios
1. Atende aos achados do #32 (parecer f108644): claim SKIP LOCKED, unique de consumo, lease, attempts, next_attempt_at, DLQ.
2. RLS FORCE por organizationId, sem bypass, sem policy permissiva aberta.
3. Índices parciais adequados, FKs, retenção/purge (LGPD).
4. Migration segura em produção.
5. Ordem de merge com #18/#28 e contagem final.
6. Testes de integração provam o que dizem.
7. CI do tip verde.

## Comandos
- `gh pr view 34 --json headRefOid,files,statusCheckRollup,mergeable`
- `gh pr diff 34` (5 arquivos: migration.sql +79, schema.prisma +73, teste de integração +114, 2 testes unitários)
- `gh pr diff 18 | grep toBe(` → 132; `gh pr diff 28 | grep toBe(` → 130
- `gh pr checks 34`
- Leitura de `src/lib/prisma.ts@2c7ccb28` (mecanismo `bypassRls`)
- Sem `npm ci` nem execução local (box com pouca memória, por ordem do Marks).

## Evidências
- Enum `DomainEventOutboxStatus` (PENDING, PROCESSING, DISPATCHED, FAILED, DEAD_LETTER): DLQ coberta por status.
- `DomainEventOutbox`: retryCount, maxAttempts (8), nextAttemptAt, lockedBy, lockedUntil, lastError, dispatchedAt. Lease e attempts cobertos.
- UNIQUE global `eventId`; UNIQUE parcial `(organizationId, idempotencyKey) WHERE idempotencyKey IS NOT NULL`.
- Parciais `relay_due (status,nextAttemptAt) WHERE status IN (PENDING,FAILED)` e `lease_recovery (status,lockedUntil) WHERE status='PROCESSING'`.
- `DomainEventConsumption` UNIQUE `(organizationId,eventId,consumer)`: serve para `ON CONFLICT DO NOTHING`.
- FKs `organizationId → Organization ON DELETE CASCADE` nas duas tabelas.
- RLS ENABLE + FORCE, policy `tenant_isolation` USING/WITH CHECK `organizationId = current_setting('app.current_tenant_id', true)`, sem cláusula `app.bypass_rls`. "AS PERMISSIVE" é só o tipo padrão da policy; o predicado é estrito. OK.
- Contagem tenantScoped: base 129; #18 +3 (132), #28 +1 (130), #34 +2 (131). Soma 129+3+1+2 = **135**, consistente com o autor.
- Tabelas novas: CONCURRENTLY não é necessário (não há lock em tabela existente, exceto a FK, que pega SHARE ROW EXCLUSIVE rápido em `Organization`). Migration roda em transação única (rollback atômico). Não há down-migration.
- Integração (4 testes): RLS de leitura e WITH CHECK; único parcial, incluindo nulos e outro tenant; claim CTE `FOR UPDATE SKIP LOCKED` com 2 workers concorrentes segurando lock (3+3, 6 distintos); ON CONFLICT 1 depois 0. Os testes provam o que dizem, **mas eu não os vi rodar**: nem local nem no CI.
- CI @ 2c7ccb28: application gate, CodeQL, SonarQube e Visual Regression **pendentes** (run 39525741029 iniciado às 22:10 BRT). Secret scan, dependency review e Trivy passaram.

## Achados
- **P1 — Sem evidência de gate:** application gate (typecheck, lint, vitest, integração, migration-drift) não concluído no tip. O drift sozinho dá exit 2 (declarado pelo autor). Ausência de evidência não é aprovação. → BLOQUEADO.
- **P2 — Descoberta cross-tenant do relay:** com FORCE RLS sem bypass, um relay global não enxerga linhas vencidas de todos os tenants. O claim testado é por tenant. O #32/16 precisa definir: (a) iterar `Organization` via a allowlist de bypass existente e claim por tenant, ou (b) um role de relay com BYPASSRLS dedicado e auditado. Precisa estar documentado no handoff antes do merge do #32. Nesse modelo por tenant, os parciais ideais começam por `organizationId` (`(organizationId,status,nextAttemptAt)`); os atuais funcionam, mas filtram org depois do scan.
- **P2 — LGPD/retenção:** `envelope` JSONB guarda payload sem política de retenção. Não há purge de DISPATCHED/DEAD_LETTER nem de `DomainEventConsumption` (só há índice em processedAt). Exigir job/TTL documentado (ex.: DISPATCHED > 7d, DLQ > 30d com redaction) no #32 ou num follow-up do 01 antes de produção.
- **P3 — `eventId` UNIQUE global:** um tenant que insere um eventId de outro tenant recebe unique violation, o que é um oráculo de existência (fraco, com UUIDs). Preferir `(organizationId, eventId)` ou garantir que eventId seja sempre UUID gerado no servidor.
- **P3 — `lastError` sem CHECK de tamanho:** o truncamento de 2000 caracteres é só aplicacional. `maxAttempts` e `retryCount` não têm CHECK `>= 0`.
- **P3 — Claim:** o teste ordena por `createdAt`, e não existe índice parcial que cubra `ORDER BY createdAt`. O adaptador deve ordenar por `nextAttemptAt` para usar `relay_due`. O comentário do teste, de que a forma `IN (subquery)` devolve mais de n linhas, deve ir para o handoff do 16.
- **P4 — Sem down-migration/runbook de rollback** (DROP das 2 tabelas e do enum). Mudança de formatação não relacionada em `tenant-scoping-parity.test.ts`.

## Condições para APROVADO
1. Application gate verde no tip, incluindo integração e `verify:migration-drift` em merge com #28 (exit 0).
2. Rebase sobre main pós-#30 (+ #18 e #28), com count final 135, e re-review no novo SHA.
3. Decisão documentada do relay cross-tenant (P2) e plano de retenção/purge do envelope (P2).

## Ordem de merge
#30 → #18 → #28 (rebased, 133) → #34 (rebased, 135) → #32 (adaptador do 16). Qualquer commit novo invalida este parecer.
