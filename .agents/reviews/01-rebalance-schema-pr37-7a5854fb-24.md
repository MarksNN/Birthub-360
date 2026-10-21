# Parecer Agente 24 — PR #37 @ 7a5854fb

- **Missão:** schema `RebalanceApproval` (REMED-04, handoff 04→01): UNIQUE (org, recommendationId), CHECKs, RLS FORCE, purge e anonimização por titular.
- **Autor:** Agente 01 — Plataforma Segurança e Dados.
- **Base:** 8dff1dde (main atual).
- **SHA revisado:** 7a5854fb.
- **Veredito: BLOQUEADO.**

## Critérios
1. Anonimização efetiva; 2. RLS sem bypass; 3. compatível com o #23; 4. ordem de merge; 5. gate.

## Comandos
- `gh pr diff 37` (migration, schema.prisma, `rebalance-approval-schema.test.ts`, rls-coverage unit, tenant-scoping-parity)
- leitura de `PrismaRebalanceApprovalStore.ts@9819f72b` (#23)
- logs do application gate do run 39533477827

## Evidências
- RLS: ENABLE + FORCE, policy `tenant_isolation` USING/WITH CHECK `organizationId = current_setting('app.current_tenant_id', true)`, sem cláusula `app.bypass_rls`. **2 OK.**
- Funções `rebalance_approval_purge` e `rebalance_approval_anonymize_lead_notes`: SECURITY INVOKER, `SET search_path = pg_catalog, public`, guard `p_org IS NULL OR '' OR IS DISTINCT FROM current_setting(...)`; purge sem default de prazo (≥1). CHECKs `note ≤ 280` e `decision IN ('APPROVED','REJECTED')`.
- Anonimização: `UPDATE ... SET note = NULL WHERE org AND leadId`. Na tabela, a nota some de fato; `leadId`, `fromOwner`, `toOwner`, `decidedBy` (ids internos) ficam.
- Gate (run 39533477827): Architecture ✔ 0 violações; Unit 4938 passed; `rebalance-approval-schema.test.ts` 4/4 ✓; Integration **5 failed**: as 4 herdadas do #25 **+ `tests/integration/rls-coverage.test.ts`: `expected 130 to be 129`** (o PR atualizou só o rls-coverage *unit*).
- #23 @ 9819f72b continua gravando a decisão no `AuditLog` (`prisma.auditLog.findFirst/create`); nenhum código usa `RebalanceApproval`.

## Achados
- **P1 — Falha nova no gate:** rls-coverage de integração 130 vs 129.
- **P2 — Schema incompatível com a política LGPD do #23:** o #23 decidiu não persistir o texto da nota (só `noteLength`, `noteHash` HMAC por org e `noteRef:null`). O #37 cria a coluna `note VARCHAR(280)` em claro e não tem `noteLength`/`noteHash`. Isso reintroduz texto livre persistido, que precisa de anonimização. Alinhar: trocar `note` por `noteLength INT` + `noteHash CHAR(64)` (CHECK hex) ou justificar no handoff com aceite do 21.
- **P2 — Anonimização não alcança o AuditLog:** a nota legada do #15 e o histórico "fica no AuditLog" (comentário do model). A função só limpa esta tabela; o expurgo do AuditLog continua no handoff 04→21.
- **P3 — Tabela órfã:** sem store Prisma no #23 a UNIQUE não fecha a corrida até o 04 migrar o store. Isso precisa de PR encadeado.
- **P4:** `decidedAt TIMESTAMP(3)` sem fuso; as tabelas novas do 01 usam `TIMESTAMPTZ(3)`.

## Ordem de merge
Conflita com #18, #28 e #34 em `schema.prisma` e nos counts (final 136, segundo o autor). Ordem: #25 → #23 → #18 → #28 → #34 → #37 (rebase) → store do 04 sobre o #37. #35/#33/#32 seguem as condições próprias.

## Condições
1. Corrigir o rls-coverage de integração; rebase na ordem acima; gate verde (após o #25).
2. Resolver o P2 (coluna `note` vs. a política do #23), com aceite do 21.
3. Reauditoria no SHA rebaseado.

Agente 24 — 2026-10-20 ~23:50 BRT. Sem comentários públicos no PR.
