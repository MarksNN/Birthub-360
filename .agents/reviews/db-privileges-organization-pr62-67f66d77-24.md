# Parecer Agente 24 — PR #62 `Fix Database Privileges Leak for Organization Table`

- **Veredito:** **REPROVADO** @ `67f66d773979046b4c8f331d7cafbf11b7af6edb`
- **Missão:** Jules — sessão 05 (Prisma/LGPD)
- **Autor:** Jules (PR aberto pela conta MarksNN)
- **Dono do arquivo / modelo de roles:** Agente 01 (Plataforma Segurança e Dados), com o Agente 15 na segurança de roles
- **Auditor:** Agente 24 — Revisão Independente
- **Data:** 2026-10-25 (UTC-3, Brasília)
- **Base declarada do PR:** `jules/ci-05-prisma-lgpd-20261024` @ `03fa29a6fb6b1ccf8668bb5b13a9a41e673bba9a` (**não é `main`**)
- **main na auditoria:** `02d1a46e75571655854e58d4b1ceced9a7e53ced`. A base está 1 commit atrás e esse commit não toca o arquivo.
- **Head auditado:** `67f66d773979046b4c8f331d7cafbf11b7af6edb` (1 commit). Qualquer novo commit invalida este parecer.

## Escopo (diff real)
Muda só `scripts/db/create-app-role.sql` (+5/-1). No loop de grants por tabela, `Organization` passa a receber `SELECT, INSERT, UPDATE`, e as demais tabelas continuam com `SELECT, INSERT, UPDATE, DELETE`. O escopo bate com o declarado.

## Comandos
```
gh pr view 62 --json headRefOid,baseRefName,files,commits,statusCheckRollup ; gh pr diff 62
gh api repos/MarksNN/Birthub-360/compare/main...67f66d77    # diverged ahead 1 / behind 1, merge-base 03fa29a6, só o script
git clone --filter=blob:none --depth 1 (sparse: scripts prisma src tests .github docs) @ main 02d1a46e   # worktree único /workspace/rev24/wt
leitura: scripts/db/create-app-role.sql, prisma/migrations/2026102{0220000,0240000,1000000}_*, prisma/schema.prisma,
         .github/workflows/ci.yml, scripts/db/bootstrap-app-role.sh, scripts/test/prepare-integration-env.js,
         tests/integration/{lgpd-consent-flywheel-rls,db-owner-role-separation,rls-postgres-direct-enforcement}.test.ts,
         tests/unit/db/lgpd-app-role-reapply.test.ts, tests/helpers/integration-setup.ts
grep organization.delete/deleteMany/DELETE FROM "Organization"/offboard em src, server.ts, scripts
gh api commits/67f66d77/check-runs ; gh run list --commit 67f66d77
gh pr view 34/35/39/40 --json state,mergedAt
```
Sem `npm ci` (limite do box).

## 0. Base
A base é `jules/ci-05-prisma-lgpd-20261024`, não `main`, o mesmo padrão do #60. Ver P1-1.

## 1. Premissa: **real**
- **Main reabre DELETE.** A migration `20261021000000_lgpd_chain_restrict_org_no_app_delete` (l.103) faz `REVOKE DELETE, TRUNCATE ON TABLE "Organization" FROM prospector_app`, e o comentário dela (l.8) diz "também em scripts/db/create-app-role.sql". **Isso não é verdade na main.**
  - O loop de `create-app-role.sql` (l.166–168) faz `REVOKE ALL` e depois `GRANT SELECT, INSERT, UPDATE, DELETE` em toda tabela do migrator, `Organization` inclusive.
  - O hook `lgpd_apply_consent_privileges()` (l.221–227) só cobre as 9 tabelas LGPD e não toca em `Organization`.
  - Conclusão: re-rodar o script depois das migrations (via `bootstrap-app-role.sh`, documentado como idempotente e "seguro rodar de novo") devolve DELETE em `Organization` ao app. A migration não roda de novo, porque já está em `_prisma_migrations`.
- **Onde a lacuna aparece.**
  - Local: `scripts/test/prepare-integration-env.js` re-roda o script num banco de teste já migrado e só então chama `migrate deploy`, que não faz nada. Num banco reaproveitado, o teste `lgpd-consent-flywheel-rls.test.ts` "v5: app NÃO apaga Organization" ficaria vermelho.
  - CI: o banco é novo, o bootstrap roda no passo l.177 **antes** do `migrate deploy` (l.225), e a migration revoga por último. Por isso o CI não pega a lacuna.
- **Risco LGPD.** O `schema.prisma` tem 128 relações `onDelete: Cascade` vindas de `Organization`, 2 `Restrict` e 2 `SetNull`.
  - Restrict: `ConsentAuditRecord` e `ConsentAuditChainHead`.
  - SetNull: `AILog` e `Birthub360CallResult`.
  - Cascade inclui `ConsentSubjectKey`, `ConsentSubjectKeyTombstone`, `ConsentEventDetail`, `ConsentPurgeTask`, `TenantKeyEnvelope`, `OptOutRecord`, `DncList`, `CallSuppression`, `CopilotoConsentRecord` e `OrganizationAiConsent`.
  - Uma org **sem** cadeia de consentimento sai inteira em cascata, incluindo opt-out, DNC e supressões, o que é risco de recontato. Uma org **com** cadeia esbarra no RESTRICT (23503).
- **Fluxo legítimo do app que apague Organization: nenhum.** Não há `organization.delete`, `deleteMany` nem `DELETE FROM "Organization"` em `src/`, `server.ts` ou `scripts/`. O offboarding atual é crypto-shredding (`destroyTenantKey`, `consentAuditChain.service.ts:541`), sem DELETE da org. Os testes já assumem o REVOKE: `tests/helpers/integration-setup.ts` usa um fallback com o owner quando recebe 42501. **A revogação não quebra fluxo.**
- **Coerente com o modelo do Agente 01.** O app é só DML e não é dono de nada; o migrator é o dono; o hook de regimes restritos roda por último. O PR completa o item 3 da REMED-06 v5 (#35), que ficou só na migration.
- **#34, #35, #39 e #40 estão CLOSED sem merge (22/10).** Mesmo assim, o conteúdo deles já está na main: separação `prospector_app`/`prospector_migrator`, default privileges, as migrations LGPD `20261020220000`, `20261020240000` e `20261021000000`, e o hook. O PR não conflita (mergeable, só 1 arquivo).

## 2. Idempotência
- O REVOKE/GRANT fica dentro do loop, no ramo de tabelas (não sequences). A ordem é `REVOKE ALL` → `GRANT` sem DELETE. TRUNCATE já não era concedido. OK.
- A comparação `r.relname = 'Organization'` é exata e sensível a maiúsculas, que é o correto para o nome Prisma. `format('%I')` quota o identificador. OK.
- Re-execução: a cada rodada `Organization` volta a ficar sem DELETE e sem TRUNCATE. OK.
- **Default privileges:** `ALTER DEFAULT PRIVILEGES … GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospector_app` (l.204) continua valendo. Se uma migration futura **recriar** `Organization`, a tabela nasce com DELETE até a próxima re-execução do script. Risco baixo (P3-2).
- O GRANT novo fica antes do hook `lgpd_apply_consent_privileges()`, então o teste estático `tests/unit/db/lgpd-app-role-reapply.test.ts` continua válido.

## 3. Outras tabelas sensíveis em que o app tem DELETE hoje (fora do escopo; follow-up do 01)
- **Restritas pelo hook:** `ConsentAuditRecord` (SELECT, INSERT), `ConsentAuditChainHead` (SELECT, INSERT, UPDATE), `ConsentSubjectKeyTombstone` (SELECT), `TenantKeyEnvelope` (SELECT, INSERT, UPDATE).
  - Com DELETE por desenho (purga/shredding): `ConsentSubjectKey`, `ConsentEventDetail`, `ConsentPurgeTask`, `FlywheelApproachRecord`, `FlywheelFewShotExample`.
- **Com DML completo, DELETE incluído:** `AuditLog`, `AILog`, `AIGuardrailEvent`, `OptOutRecord`, `DncList`, `CallSuppression`, `CopilotoConsentRecord`, `OrganizationAiConsent`, `DealClosureEvent`, `DomainEventOutbox`, `DomainEventConsumption`, logs de sync e chamadas.
  - `AuditLog`, `OptOutRecord`, `DncList`, `CallSuppression` e os registros de consentimento são candidatos a append-only ou sem DELETE pelo app. Precisa de decisão do 01/15 e checagem de fluxos de remoção legítimos, como despublicar opt-out por pedido do titular.

## 4. Testes
- Já existe `has_table_privilege` em `db-owner-role-separation.test.ts`, mas nada sobre `Organization`. Já existe o teste v5 com `DELETE FROM "Organization"` → `permission denied`, mas ele roda no CI só no fluxo bootstrap → migrate, que não reproduz o defeito.
- **O PR não adiciona nenhum teste.** Falta provar o cenário do defeito: migrate → re-rodar `create-app-role.sql` → `has_table_privilege('prospector_app','"Organization"','DELETE') = false` (e TRUNCATE false). Ver P2-1.

## 5. CI no head
Há apenas **SonarQube Analysis** (`in_progress` na auditoria). Não rodaram o gate Release/`build`, lint, typecheck, unit, integração com banco nem E2E, porque o `ci.yml` filtra `pull_request: branches: [main, master]`. **Sem evidência de CI.**

## Achados
- **P1-1 — a base não é `main`.** Mergear não altera a main, e nenhum gate obrigatório rodou.
- **P1-2 — ausência total de evidência do application gate e da integração com banco no head.** O próprio PR admite que integração e E2E falharam no sandbox do autor.
- **P2-1 — falta teste de regressão do cenário real (re-execução pós-migrate).** É preciso um teste de integração, ou um passo no CI que re-rode `bootstrap-app-role.sh` depois do `migrate deploy`, verificando por `has_table_privilege` que `Organization` fica sem DELETE e sem TRUNCATE. Sem isso, o CI continua cego para a regressão que o PR corrige.
- **P3-1 — o comentário da migration `20261021000000` (l.8) ficou falso na main.** O PR o torna verdadeiro. O cabeçalho do script (l.46, "só DML (SELECT/INSERT/UPDATE/DELETE)") e o comentário do loop (l.148) também deveriam citar a exceção de `Organization`.
- **P3-2 — default privileges.** Uma `Organization` recriada por migration herda DELETE até a re-execução. Recomendo que a exceção viva também num hook de regime restrito (estender `lgpd_apply_consent_privileges()` ou criar um análogo), para que uma migration futura consiga reaplicá-la. Isso não bloqueia.
- **P3-3 — tabelas sensíveis com DELETE pelo app** (seção 3): `AuditLog`, `OptOutRecord`, `DncList`, `CallSuppression`, `CopilotoConsentRecord`, `OrganizationAiConsent`. Follow-up do 01/15, fora deste PR.
- **P4-1 — o corpo do PR mistura um tema alheio** (P3018/índices) que não está no diff. Ruído de rastreabilidade.

## Pontos positivos
- O defeito existe e a correção é mínima, idempotente, quotada e coerente com o modelo de roles e com a REMED-06 v5.
- Não há fluxo do app que dependa do DELETE em `Organization`, então não há quebra funcional.

## Condições para reavaliação (novo head)
1. Mudar a base do PR para `main` (rebase sobre `02d1a46e` ou posterior).
2. Adicionar o teste de regressão do P2-1: migrate → re-bootstrap → `has_table_privilege` DELETE/TRUNCATE em `Organization` = false. O cenário precisa estar no CI.
3. CI verde no head novo: Release/`build`, unit, integração com banco (inclusive `lgpd-consent-flywheel-rls` v5 e `db-owner-role-separation`).
4. Atualizar os comentários do P3-1.
5. Ciência do Agente 01 (dono do modelo de roles e LGPD).

Sem merge até um novo parecer APROVADO para o SHA exato.
