# Parecer Agente 24 — PR #34 @ eaf0d4e7

- **Missão:** schema da outbox transacional e idempotência durável (REMED-05).
- **Autor:** Agente 01 — Plataforma Segurança e Dados (branch `agente/01-remed-05-outbox-schema`).
- **Base:** merge-base 985d8586; **2 commits atrás da main** (falta #24 e #30). Rebase sobre #30/#18/#28 pendente (#18 e #28 ainda OPEN).
- **SHA revisado:** eaf0d4e7. Parecer anterior: BLOQUEADO @ 671d8d31 (commit 1b2fe2d).
- **Veredito: BLOQUEADO.**

## Critérios
1. Guard NULL com IS DISTINCT FROM + teste de sessão sem tenant.
2. search_path fixo; testes de CHECK pela constraint exata com eventIds distintos.
3. Lease de consumo: reservedBy, reservedUntil, completedAt, índice de reclaim, CHECK lease_owner, purge por completedAt.
4. Relay em loop por organização, sem BYPASSRLS.
5. Base rebaseada e gate verde.

## Comandos
- `gh api .../compare/671d8d31...eaf0d4e7` (73908ad5, eaf0d4e7); `gh api .../compare/main...eaf0d4e7`
- logs do application gate do run 39530369597

## Evidências
- `domain_event_outbox_purge`: `SET search_path = pg_catalog, public`; `IF p_org IS NULL OR p_org = '' OR p_org IS DISTINCT FROM current_setting('app.current_tenant_id', true) THEN RAISE`. Testes: `purge(ORG_A, ORG_B)` e sessão sem tenant → `rejects.toThrow(/tenant da sessão/)`. **1 e parte de 2 OK.**
- CHECKs: loop `[eventId, bad, constraint]` com eventIds distintos e `expect(detail).toContain(constraint)`. **OK.**
- `DomainEventConsumption`: `reservedBy TEXT NOT NULL DEFAULT ''`, `reservedUntil`/`completedAt timestamptz(3)`; `DomainEventConsumption_lease_reclaim_idx (organizationId, reservedUntil) WHERE completedAt IS NULL`; `DomainEventConsumption_lease_owner_check CHECK (reservedUntil IS NULL OR reservedBy <> '')`; índice `(organizationId, completedAt)`; purge com `completedAt IS NOT NULL AND completedAt < now() - interval`. Teste de lease (reserva, expira, retomada; concluído não retoma). **3 OK.**
- ADR-006: relay itera por tenant, sem BYPASSRLS (descoberta de tenants via `Organization` na allowlist existente, adaptador no #32). **4 OK.**
- Gate (run 39530369597, merge com a main): Architecture `✔ no dependency violations`; Unit 4938 passed; `remed05-outbox-schema.test.ts` 8/8 ✓; Integration **5 failed**: as 4 herdadas do #25 **+ `rls-coverage.test.ts`: `expected 131 to be 129`** (o PR adiciona 2 models tenant-scoped sem atualizar a contagem). Build/Smoke/E2E skipped.

## Achados
- **P1 — Falha nova no gate:** `rls-coverage` 131 vs 129, introduzida por este PR. Mesmo com a exceção das 4 herdadas, o gate não fica verde. Corrigir a contagem no rebase (soma final com #18/#28 = 135, segundo o autor).
- **P2 — Base desatualizada:** 2 commits atrás; rebase sobre #30/#18/#28 pendente e drift só sai com exit 0 junto do #28.
- **P3:** uma reserva gravada com `reservedUntil = NULL` nunca é retomada (`NULL < now()` é falso). O ADR documenta, mas um CHECK `(completedAt IS NOT NULL OR reservedUntil IS NOT NULL)` tornaria isso impossível no banco.
- **P4:** prazos de retenção provisórios até 01A/21 confirmarem.

## Condições para APROVADO
1. Rebase depois de #30/#18/#28 (ordem: #30 → #18 → #28 → #34).
2. `rls-coverage` atualizado; gate 100% verde após o #25 (ou só as 4 herdadas, se o #25 ainda não tiver entrado, com isenção do Marks).
3. Reauditoria rápida no SHA rebaseado.

Agente 24 — 2026-10-20 ~23:35 BRT. Sem comentários públicos no PR.
