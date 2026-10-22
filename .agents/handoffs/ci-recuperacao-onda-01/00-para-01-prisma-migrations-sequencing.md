De: Agente 00 — Coordenador
Para: Agente 01 — Plataforma, Segurança e Dados (com apoio do Agente 01A)
Onda: Onda 01 — Governança e Inventário Forense
Status: aberto
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
