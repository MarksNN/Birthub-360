# Parecer Agente 24 — PR #35 @ 102cb08c

- **Missão:** schema LGPD da cadeia de consentimento (REMED-06): ConsentAuditRecord append-only, head, chaves por titular, detalhe expurgável, purge tasks e Flywheel.
- **Autor:** Agente 01 — Plataforma Segurança e Dados.
- **Base:** pré-#30; rebase sobre #18/#28/#34 pendente (declarado pelo autor).
- **SHA revisado:** 102cb08c. Parecer anterior: BLOQUEADO @ 7a6da4bd (commit 830b4b1).
- **Veredito: BLOQUEADO.** O application gate (run 39533611062) ainda estava em execução (Unit) às ~23:50 BRT, e a leitura posterior foi impedida por rate limit da API do GitHub. O desenho evoluiu bem; o máximo, depois do rebase e do gate, seria APROVADO CONDICIONADO.

## Critérios / verificações pedidas
1. O CHECK garante HMAC ou só formato? 2. O tombstone preserva PII? 3. A âncora detecta corte no fim? 4. O offboarding funciona? 5. Os testes rodam no CI?

## Comandos
- `gh api .../compare/7a6da4bd...102cb08c` (migration +255, schema +127, create-app-role.sql, ADR-006, base legal, testes)
- leitura de `migration.sql@102cb08c` e `tests/integration/lgpd-consent-flywheel-rls.test.ts@102cb08c`

## Evidências e respostas
1. **Só formato.** `CHECK (kind = 'GENESIS' OR subjectRef ~ '^hs256:[a-f0-9]{64}$')`. Um sha256 sem chave com o prefixo `hs256:` passa. A garantia de HMAC depende do código do #33 (`SubjectTokenizer`); o banco só impede PII em claro.
2. **Sem material de chave.** O tombstone guarda `organizationId`, `lookupId` (HMAC(pepper do tenant, subjectRef)), `keyCreatedAt`, `shreddedAt`, `shreddedBy=session_user`. Não há PII direta. Porém `lookupId` é pseudônimo estável: quem tem o pepper consegue confirmar que um titular candidato foi esquecido. Isso é aceitável só se o pepper do tenant for destruível (ver P2-2).
3. **Sim, com ressalva.** `ConsentAuditRecord` bloqueia UPDATE/DELETE/TRUNCATE por trigger para qualquer papel. `ConsentAuditChainHead` tem gênese imutável, `lastSequence` estritamente crescente e DELETE só em cascata (`pg_trigger_depth() > 1`). Um corte no fim (pelo owner com trigger desligado) fica detectável no `verify` do app comparando com o head. Ressalva: o banco não amarra o head às inserções; não há trigger em INSERT do record que avance o head, então quem desliga triggers pode cortar o record e o head juntos.
4. **Parcial, por runbook.** FK `ConsentAuditRecord → Organization ON DELETE RESTRICT` e trigger sem exceção de cascata: a org com cadeia não pode ser apagada. O ADR-006 define o runbook (destruir o pepper do tenant, apagar ConsentSubjectKey, expurgar detalhes/Flywheel, manter a cadeia até o fim do prazo legal e fazer break-glass pelo owner com DPO+15). É uma escolha documentada e com base legal (art. 16, I), mas o passo final é manual e fora do app.
5. **Testes (`lgpd-consent-flywheel-rls.test.ts`):** grants, triggers em ORIGIN, head, tombstone e cascata **sem skip**. Exceção: o teste de trigger contra owner/superuser usa `it.skipIf(!ownerPool)` (depende de `OWNER_DATABASE_URL`/`DIRECT_URL` no CI). **Execução no CI não confirmada** (gate em andamento).
- Grants (`lgpd_apply_consent_privileges`): Record SELECT/INSERT; Head SELECT/INSERT/UPDATE; SubjectKey SELECT/INSERT/DELETE; Tombstone SELECT; Detail SELECT/INSERT/DELETE; PurgeTask e Flywheel CRUD; `REVOKE ALL FROM PUBLIC`. RLS ENABLE+FORCE com `tenant_isolation` sem bypass em todas. UNIQUE `(organizationId, currentHash)`.

## Achados
- **P1 — Sem evidência de CI** neste SHA, e base desatualizada (rebase pendente). Nos PRs #34 e #37, a contagem do `tests/integration/rls-coverage.test.ts` quebrou; confirmar que aqui ela foi atualizada (o autor cita count 137).
- **P2-1 — CHECK só de formato:** documentar que a garantia de HMAC é do app e cobrir com um teste de contrato no #33 (token ≠ sha256(subjectRef)).
- **P2-2 — Runbook depende de destruir o pepper do tenant**, mas o `EnvTenantPepperProvider` do #33 deriva o pepper de um segredo global (`HMAC(LGPD_SUBJECT_PEPPER_SECRET, org)`). Ele não é destruível por tenant, só o `KmsTenantPepperProvider` atende. Exigir KMS em produção ou ajustar o runbook.
- **P3 — Head não é mantido pelo banco** (sem trigger AFTER INSERT no record). Recomendo checkpoint externo do head (F5 do Agente 15).
- **P3 — Prova de que a produção roda como `prospector_app`** segue com o 08A/15 e é condição para o append-only valer.
- **P4 — `shreddedBy=session_user`** pode expor o nome do papel; ok.

## Condições
1. Rebase depois de #18/#28/#34; gate verde (só as 4 herdadas, enquanto o #25 não entrar), com a suíte LGPD executando, sem skip do owner no CI.
2. P2-2 resolvido entre 01 e 21 (KMS por tenant em produção).
3. Evidência do 08A/15 sobre o papel de runtime.
4. Reauditoria no SHA rebaseado.

Agente 24 — 2026-10-20 ~23:55 BRT. Sem comentários públicos no PR.
