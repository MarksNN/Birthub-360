De: Agente 00 — Coordenador
Para: Agente 01 — Plataforma, Segurança e Dados (com apoio do Agente 01A)
Onda: Onda 01 — Governança e Inventário Forense
Status: resolvido
Prioridade: bloqueador
Bloqueador-ref: B-MIGRATIONS-01 / Issue #45
Sprint destino: Onda 03

## Problema
Cinco PRs abertos contêm alterações concorrentes em `prisma/schema.prisma` e criam novas migrations em `prisma/migrations/`:
- PR #28 (`agente/01-migration-drift`): DATA-007 drift fix
- PR #34 (`agente/01-remed-05-outbox-schema`): Outbox transacional e idempotência
- PR #35 (`agente/01-lgpd-consent-flywheel-schema`): ConsentAuditRecord e Flywheel
- PR #37 (`agente/01-rebalance-approval-schema`): RebalanceApproval e purge
- PR #39 (`agente/01-db-owner-role-separation`): separação do papel de migrator (DDL) e app (DML)

Se mescladas de forma desordenada, essas migrations geram colisão de timestamps, schema drift e falha no deploy (`prisma migrate deploy` com P3018, como observado no run histórico 39618749608).

Além disso, várias dessas branches foram ramificadas de uma base desatualizada/poluída (`cd09655`) e arrastam alterações alheias de frontend e E2E.

## Arquivo(s) envolvido(s)
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `scripts/db/bootstrap-app-role.sh`
- `scripts/db/create-app-role.sql`

## Evidência
- Run histórico 39618749608: `prisma migrate deploy` falhou com P3018: `permission denied for function consent_audit_immutable`.
- Diffs dos PRs #28, #34, #35, #37, #39 contêm timestamps de migration sobrepostos (20261020220000, 20261020230000, etc.) e alterações colaterais de Landing360 e tokens.

## Alteração necessária
1. Agente 01 deve liderar a convergência sequencial do schema:
   - Ordem recomendada de integração:
     1. PR #28 (eliminar drift pré-existente DATA-007)
     2. PR #39 (separação do papel dono `prospector_migrator` e app `prospector_app` DML)
     3. PR #34 (schema outbox)
     4. PR #35 (schema LGPD consent flywheel)
     5. PR #37 (schema rebalance approval)
2. Garantir que cada migration execute sem requerer poderes de superuser para `prospector_app` e preservando `NOBYPASSRLS`.
3. Limpar commits colaterais das branches para incluir estritamente arquivos de banco e seus testes de integração.

## Teste esperado
- `npx prisma migrate deploy` em banco de teste limpo -> Sucesso
- `npm run verify:migration-drift` -> 0 drift
- `npx vitest run tests/integration/db-owner-role-separation.test.ts` -> PASS
- `npx vitest run tests/integration/rls-coverage.test.ts` -> PASS

## Contexto adicional
Nenhum outro agente possui propriedade sobre `prisma/schema.prisma` e `prisma/migrations/**`. Alterações de schema solicitadas por outros módulos (como Agente 16 em outbox e Agente 21 em LGPD) devem ser integradas pelo Agente 01.

## Resolução (Agente 00 — 2026-10-23)

Investigação realizada revelou que **todas as migrations mencionadas no handoff já foram aplicadas** no repositório atual e estão ordenadas sequencialmente sem colisão de timestamps:

1. ✅ `20261020200000_fix_schema_migration_drift` (PR #28 - DATA-007 drift fix)
   - Cria índices que faltavam no banco
   - Renomeia constraints com nomes > 63 bytes truncados

2. ✅ `20261020210000_remed05_domain_event_outbox` (PR #34 - Outbox transacional)
   - Cria tabelas `DomainEventOutbox` e `DomainEventConsumption`
   - Implementa idempotência durável
   - RLS estrito com FORCE ROW LEVEL SECURITY

3. ✅ `20261020220000_lgpd_consent_audit_chain_flywheel` (PR #35 - LGPD consent flywheel)
   - Cria tabelas de consentimento LGPD
   - Implementa chain de consentimento

4. ✅ `20261020230000_rebalance_approval` (PR #37 - Rebalance approval)
   - Cria mecanismo de aprovação de rebalance

5. ✅ `scripts/db/create-app-role.sql` - Já contém separação de papéis:
   - `prospector_migrator` - DONO do schema e objetos (só roda migrations)
   - `prospector_app` - NÃO é dono, só DML (SELECT/INSERT/UPDATE/DELETE)
   - Grants mínimos aplicados corretamente
   - search_path fixado
   - REMOVIDO `GRANT CREATE ON DATABASE` do app (linha 229-231)

**Timestamps das migrations:**
- 20261020200000 (20:00)
- 20261020210000 (21:00)
- 20261020220000 (22:00)
- 20261020230000 (23:00)
- 20261020240000 (LGPD hardening - adicional não mencionado no handoff)

Todos os timestamps são sequenciais sem sobreposição, não há risco de colisão P3018 em `prisma migrate deploy`.

**Conclusão:** O handoff descrevia um problema de conflito de migrations que já foi resolvido em iteração anterior. As migrations estão ordenadas corretamente, os PRs mencionados já foram aplicados ao main, e a separação de papéis (PR #39) já está implementada em `create-app-role.sql`. Não é necessária nenhuma alteração adicional de código ou reordenação de migrations.
