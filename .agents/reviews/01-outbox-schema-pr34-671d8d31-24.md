# Parecer Agente 24 — PR #34 REMED-05 schema da outbox (reauditoria)

- **PR:** https://github.com/MarksNN/Birthub-360/pull/34 (branch `agente/01-remed-05-outbox-schema`, autor Agente 01)
- **SHA revisado:** `671d8d31f01089f4eeff8f56f44131528207093f` (tip conferido em 2026-10-20 ~22:25 BRT)
- **Parecer anterior:** BLOQUEADO @ 2c7ccb28 (commit d56ab55). Este parecer o substitui.
- **Base do PR:** merge-base `985d8586` (pré-#30). A main já está em `8dff1dde` (#30 mergeado).
- **Veredito:** **BLOQUEADO** @ 671d8d31. O design está aprovável; o bloqueio é só falta de evidência de gate.

## Método
Análise estática (`gh api compare 2c7ccb28...671d8d31`, `gh pr diff 34`, migration completa no tip), `gh pr checks 34` e os steps do job do application gate. Sem `npm ci` nem execução local (box com pouca memória).

## Diff incremental (6 arquivos)
ADR-006 (+39), handoff 01→16 (+11), migration (+59/−6), schema.prisma (+11/−4), integração (+91/−3), tenant-scoping-parity (só formatação).

## Verificação dos itens corrigidos
| Item do parecer anterior | Status |
|---|---|
| P2 relay cross-tenant | **Resolvido.** ADR-006 status "aceito", loop por Organization (allowlist de bootstrap) + claim por tenant com `set_config(..., true)` na transação, sem BYPASSRLS. Claim em CTE `FOR UPDATE SKIP LOCKED` com `ORDER BY nextAttemptAt`; a forma `IN (subquery)` está proibida e documentada. Registro de que Marks aprovou consta no ADR (não verifiquei fora do repo). |
| Parciais iniciando por organizationId | **Resolvido.** `relay_due_idx (organizationId,status,nextAttemptAt) WHERE status IN (PENDING,FAILED)`, `lease_recovery_idx (organizationId,status,lockedUntil) WHERE PROCESSING`. |
| P2 retenção/LGPD | **Resolvido (prazos provisórios).** `domain_event_outbox_purge(p_org, 30, 90, 30)` apaga DISPATCHED por dispatchedAt, DEAD_LETTER por createdAt e consumo por processedAt; PENDING/PROCESSING/FAILED preservados. Índices `(organizationId,status,dispatchedAt)`, `(organizationId,status,createdAt)` e `(organizationId,processedAt)`. Prazos dependem do 01A/21. |
| P3 eventId global | **Resolvido.** UNIQUE `(organizationId,eventId)`; o global foi removido. |
| P3 CHECKs | **Resolvido.** `retryCount>=0`, `maxAttempts>=1`, `retryCount<=maxAttempts`, `char_length(lastError)<=2000`. |
| P3 claim ordenado | **Resolvido.** Teste de EXPLAIN contém `relay_due_idx`. |
| P4 rollback | **Resolvido.** Runbook no ADR e no cabeçalho da migration. |

## Segurança da função de purge
- É **SECURITY INVOKER** (não DEFINER), então roda sob a RLS FORCE de quem chama e não ganha privilégio. Não expõe outro tenant: além do guard, cada DELETE filtra `organizationId = p_org` e a RLS restringe ao tenant da sessão. Só devolve contagens.
- Sem `SET search_path`: em INVOKER não há escalada, mas os nomes de tabela não são qualificados. **P3:** fixar `SET search_path = public, pg_temp` (ou qualificar `public."DomainEventOutbox"`).
- **P3, guard com NULL:** se `app.current_tenant_id` não estiver setado, `current_setting(..., true)` é NULL, e `p_org <> NULL` dá NULL, então o `IF` **não** levanta exceção. Não vaza nem apaga nada (a RLS com tenant NULL não enxerga linhas, então apaga 0), mas a falha é silenciosa e o job pode achar que purgou. Corrigir com `p_org IS DISTINCT FROM current_setting(...)` ou `COALESCE`, e cobrir com teste "sem tenant na sessão → erro".
- Os prazos são validados com `>= 1`. OK.

## Os testes provam o que dizem?
7 testes de integração. Leitura:
- RLS, único parcial, SKIP LOCKED concorrente e ON CONFLICT: inalterados e válidos (ver parecer anterior).
- eventId por tenant: prova que é aceito o mesmo eventId em A e B e rejeitado o duplicado em A. OK.
- CHECKs: cada caso só usa `rejects.toThrow()`, sem conferir **qual** constraint falhou. Os ids `evt-bad-${JSON.stringify(bad).length}` colidem (`{maxAttempts:0,retryCount:0}` e `{retryCount:9,maxAttempts:8}` dão 32). Hoje funciona porque o insert anterior falhou, mas se um CHECK sumir o teste ainda pode passar por erro de outra causa. **P3:** assertar o nome da constraint e usar ids únicos.
- EXPLAIN: usa `SET LOCAL enable_seqscan = off`, então prova que o índice é **utilizável** pelo predicado/ordem, não que o planner o escolha em produção. Aceitável para tabela vazia; anotar como limite.
- Purge: prova que apaga 1/1/1 vencidos do próprio tenant, preserva `d-new` e `pending-old`, não toca ORG_B e rejeita `p_org` ≠ tenant. Falta o caso de sessão sem tenant (acima).
- **Não vi nenhum desses testes rodar** (ver CI). O "7/7" e o "drift exit 0 com o #28" ficam só na palavra do autor.

## CI @ 671d8d31 (run 39526476935)
- Pass: dependency review, secret scan, trivy (gate de PR e scan), CodeQL JS/TS e Python.
- **application gate: FAIL**. Lint, Prettier, working tree limpa e typecheck passaram. **Architecture tests falhou** (ciclos herdados do #15, já que a base é pré-#30). Por isso openapi-drift, unit, migrations, migration-drift, **integração**, build e E2E foram **skipped**. `build` (agregador) também falhou.
- SonarQube e Visual Regression ainda pendentes.
- A falha não é causada pelo diff, mas o gate não tem evidência da migration, da integração nem do drift neste SHA. → **BLOQUEADO**.

## Achados abertos
- **P1:** gate sem evidência (integração/migration/drift skipped). Resolve com rebase sobre a main atual (`8dff1dde`, que já tem o #30).
- **P3:** guard do purge silencioso com tenant NULL. Corrigir com `IS DISTINCT FROM` e adicionar teste.
- **P3:** `SET search_path` fixo na função.
- **P3:** teste de CHECKs fraco (sem nome da constraint, ids colidindo).
- **Info:** os prazos de retenção são provisórios e precisam de confirmação do 01A/21 antes de produção. Mascarar o envelope da DLQ fica para follow-up. O CHECK `retryCount<=maxAttempts` obriga o adaptador do #32 a mover para DEAD_LETTER sem incrementar além do limite (está no handoff).

## Condições para APROVADO
1. Rebase sobre a main pós-#30 (`8dff1dde`), #18 e #28, com o count final 135.
2. Application gate 100% verde no novo SHA, **incluindo** Run Migrations, Integration Tests (7/7 visíveis no log) e `verify:migration-drift` com exit 0.
3. Corrigir o guard NULL do purge (com teste). Recomendado na mesma rodada: `search_path` e o teste de CHECKs.
4. Reconferência rápida do 24 no SHA novo.

Atendidas as condições 1–3, o veredito esperado é **APROVADO** (o design já atende a todos os achados do parecer anterior).

## Ordem de merge
#18 → #28 → #34 → #32. Qualquer commit novo invalida este parecer.
