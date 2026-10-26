# Parecer 24: PR #70 (fix(db): Organization sem DELETE/TRUNCATE após re-bootstrap)

- **PR:** #70, autor Agente 01, branch `agente/01-org-delete-privileges-regrant`
- **Head auditado:** `9e1c9bfc8342b25e5093ee36b24895884e3513a7`
- **Base:** main @ `7871e6f01b3037f3ecb99453c5fc0525b8216e46` (merge-base = main; ahead 1 / behind 0; MERGEABLE)
- **Remedia:** parecer 24 do PR #62 (`agente/24-review-pr62-67f66d77`, commit 276ff6e5)
- **Data:** 25/10/2026 ~11:35 BRT
- **Método:** análise estática do diff completo e dos arquivos no head, mais check-runs do head. Nada foi executado localmente (sem npm ci, sem banco).

## Veredito: **REPROVADO**

- **P2 (governança, §16 do AGENTS.md):** o PR edita `.github/workflows/ci.yml`, que pertence ao Agente 08. O corpo do PR não registra handoff nem aceite do 08.
- **CI (seria BLOQUEADO por si só):** o `application gate` foi **skipped** no head, por causa da falha herdada do trivy. Por isso o passo novo de re-bootstrap, o teste de integração novo e o teste unitário novo **não rodaram**. Não há evidência de execução.
- **Mérito técnico:** a correção em si está correta e completa no nível estático, conforme as seções 2 a 5.

Qualquer commit novo invalida este parecer.

## 1. Base e escopo
- Base é main atual, com 1 commit à frente. Cumpre o P1-1 do #62.
- São 6 arquivos:
  - `scripts/db/create-app-role.sql` (+46/-4)
  - `.github/workflows/ci.yml` (+13)
  - `tests/integration/db-restricted-table-privileges.test.ts` (+137)
  - `tests/unit/db/restricted-table-privileges.test.ts` (+51)
  - `prisma/migrations/20261021000000_.../migration.sql` (+4/-1, só comentário)
  - `docs/deploy/db-owner-role-separation.md` (+2/-1)
- Nenhum arquivo em `src/` foi tocado.

## 2. Script `create-app-role.sql`: OK
- **Lista única.** `SET birthub.restricted_no_delete_tables = 'Organization'` fica antes do loop. É uma GUC de sessão, já que variável psql não é interpolada em `DO $$`. O script roda numa sessão psql só, com `ON_ERROR_STOP=1`, tanto em `bootstrap-app-role.sh` (l.38) quanto no teste. O caminho local (`docker-compose.postgres-local.yml` l.49 → `.tpl`) monta o mesmo arquivo.
- **Loop DML.** `REVOKE ALL` e depois `GRANT SELECT, INSERT, UPDATE` para quem está na lista, ou `GRANT ... DELETE` para os demais. A comparação é exata (`= ANY`) e `%I` quota o nome. TRUNCATE nunca é concedido. OK.
- **Hook final `db_apply_restricted_table_privileges`.**
  - Ordem: é o último bloco executável do script. Vem depois do loop, dos `ALTER DEFAULT PRIVILEGES` e do `PERFORM lgpd_apply_consent_privileges()`, e não há nenhum GRANT depois dele (conferido no head).
  - Ação: faz `REVOKE DELETE, TRUNCATE ... FROM PUBLIC, prospector_app` e depois `has_table_privilege` (DELETE ou TRUNCATE) → `RAISE EXCEPTION`, o que aborta o bootstrap via ON_ERROR_STOP.
  - Tabela ausente: `to_regclass` torna o hook um no-op quando a tabela não existe (bootstrap antes do migrate).
  - Idempotente.
  - Superusuário: quando ele executa o REVOKE, o Postgres o trata como se viesse do dono, o que cobre os grants do default. Um grant de terceiro com grant option não seria revogado, mas o `RAISE` o detecta. Desenho correto.
- **Default privileges (P3-2 do #62).** Continuam concedendo DELETE em tabelas novas. Isso é inevitável, porque o Postgres não tem exceção por tabela. O PR documenta o fato no script e no doc, e o hook corrige na próxima execução. A janela "Organization recriada por migration" fica mitigada, com a recomendação documentada de repetir o REVOKE na migration. Aceito.
- **Hook LGPD.** `lgpd_apply_consent_privileges()` só cobre as 9 tabelas LGPD e não toca em `Organization` (verificado no #62). Como o hook novo roda depois dele, não há interação negativa.
- **Comentários (P3-1 do #62).** O cabeçalho do script (l.46ss), o comentário do loop e a l.8 da migration estão corrigidos e agora batem com a realidade. OK.

## 3. Fluxos do app: não quebram
- Não há `organization.delete`, `deleteMany` nem `DELETE FROM "Organization"` em `src/`, `server.ts` ou `scripts/`. O offboarding é crypto-shredding (verificado no #62).
- O `integration-setup.ts` já faz fallback para o owner em 42501.
- O PR não altera código de aplicação.

## 4. Testes: bem desenhados, mas não executados
- **Integração.**
  - Estado após migrate → re-bootstrap: `has_table_privilege` em SELECT/INSERT/UPDATE dá true; DELETE/TRUNCATE dá false. Há também `DELETE ... WHERE false` e `TRUNCATE` reais, ambos rejeitados com 42501.
  - Controle `ForecastSnapshot` mantém DELETE, então a exceção não vaza para outras tabelas.
  - Re-bootstrap duplo (idempotência).
  - Drift simulado com `GRANT DELETE, TRUNCATE` como owner, corrigido pelo hook. O `finally` faz a limpeza.
  - No CI a ausência de `BOOTSTRAP_SUPERUSER_URL`/`DIRECT_URL` gera **throw**, não skip. As duas variáveis estão no `.env.test` do CI (l.271 e l.281). O `migrator_password` vem da `DIRECT_URL` (`prospector_migrator:ci_migrator_test_pass`), então não altera a senha.
- **Unitário (estático).** Cobre a lista antes do loop, a ausência de GRANT TRUNCATE/ALL e o hook depois do último GRANT amplo, dos defaults e do hook LGPD, sem GRANT na cauda.
- **Passo novo no CI.** "Re-bootstrap pós-migrate" fica logo após `prisma migrate deploy`. Reproduz a ordem de produção (P2-1 do #62).
- **Porém:** os três estão dentro do job `application gate` (`needs: [secret-scan, trivy-scan]`, `if: ... trivy-scan.result == 'success'`), que foi **skipped**. **P1-2/P2-1 do #62 continuam sem evidência.**

## 5. P3-3 do #62 (outras tabelas sensíveis)
- Ficam fora do escopo. A lista `birthub.restricted_no_delete_tables` já permite estender o regime, por exemplo a `AuditLog`, `OptOutRecord`, `DncList`, `CallSuppression`, `CopilotoConsentRecord` e `OrganizationAiConsent`.
- Isso continua como follow-up do 01/15, com decisão sobre fluxos legítimos de remoção. Não bloqueia.

## 6. Achados
- **P2-1 (governança, bloqueante).** `.github/workflows/ci.yml` pertence ao Agente 08 (tabela de propriedade; §16: "Não editar… informar o proprietário… abrir handoff"). Não há registro de aceite do 08.
  - **Correção:** o 08 registra aceite explícito do passo novo e da linha do `.env.test` (handoff 01→08 em `.agents/handoffs/`), ou o 08 faz o commit do trecho do ci.yml.
- **P2-2 (evidência, bloqueante).** Os testes novos não rodaram, porque o `application gate` foi skipped.
  - **Desbloqueio:** merge do #67 (trivy), correção do Lint herdado na main (biome: 10 erros; o gate está vermelho na main desde cdea0bc9 / run 40017040602), depois atualizar o #70 com a main e esperar o gate verde com `Run Integration Tests` executado.
- **P3-1.** A migration `20261021000000` já aplicada teve o comentário alterado, o que muda o checksum em `_prisma_migrations`.
  - `migrate deploy` não reaplica; já `migrate dev`/`status` em bancos locais podem acusar "modified after applied".
  - Há precedente (791d480c7). Aceitável, desde que conste no PR.
- **P3-2.** O hook falha (RAISE) se um grant de terceiro persistir, o que faz o bootstrap de produção abortar no fim. É o comportamento desejado, mas deve constar no runbook de deploy.

## 7. CI no head 9e1c9bfc (11:32 BRT)
| Check | Estado | Natureza |
|---|---|---|
| Central Birth Hub 360 / trivy scan | failure | herdado (3 alertas HIGH da main; corrigido pelo #67) |
| Trivy — gate de PR | failure | herdado |
| build | failure | herdado (agregador) |
| **application gate** | **skipped** | herdado, mas **impede a evidência deste PR** |
| secret scan, dependency review, Dependency Review, Trivy (SARIF), CodeQL/python | success | n/a |
| CodeQL/js, SonarQube, Visual Regression | in_progress | n/a |

Nenhuma falha nova atribuível ao PR.

## 8. Para APROVADO
1. Aceite do 08 sobre o ci.yml.
2. Head atualizado sobre a main, com trivy e lint verdes.
3. `application gate` executado e verde, com os logs mostrando "Re-bootstrap pós-migrate" e `db-restricted-table-privileges.test.ts` (3 testes) passando.
4. Nova auditoria do 24 no SHA final.
