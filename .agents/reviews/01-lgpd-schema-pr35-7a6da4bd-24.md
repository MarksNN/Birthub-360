# Parecer Agente 24 — PR #35 (Agente 01) schema LGPD: ConsentAuditRecord + Flywheel

- **Missão:** REMED-06 (handoff 21→01, dá base para o #33): cadeia de consentimento append-only e Flywheel durável.
- **Autor:** Agente 01 — Plataforma Segurança e Dados
- **PR:** https://github.com/MarksNN/Birthub-360/pull/35 (branch `agente/01-lgpd-consent-flywheel-schema`)
- **SHA revisado:** `7a6da4bd4f597b5393a784c8d3b8b4beb79bc8de` (tip conferido em 2026-10-20 22h, horário de Brasília)
- **Base:** main @ `91bffdf6522503bc300d47d5cb604d19508462a0`
- **Veredito:** **BLOQUEADO** @ 7a6da4bd. Não há evidência de execução: no CI, a migration, os testes unitários e os de integração foram *skipped*. Qualquer commit novo invalida este parecer.

## Critérios
1. RLS ENABLE+FORCE, sem bypass, com isolamento A/B testado como papel não-superuser.
2. Append-only real: REVOKE para o papel da aplicação, trigger e aplicação não rodando como owner.
3. Cobertura dos achados do #33 (parecer 3e08a65): REVOKE, UNIQUE(org, sequence), detecção de corte no fim da cadeia, expurgo de autópsia e derivados, pseudonimização do subjectRef.
4. FKs e cascade coerentes com o append-only e com o offboarding.
5. Migration segura e count coerente com #18, #28 e #34.
6. Testes que provam o que afirmam, com o gate do CI verde.

## Comandos
- `gh pr view 35 --json headRefOid,files,statusCheckRollup`; `gh pr diff 35`
- `gh run watch 39526105492 --exit-status`; `gh run view 39526105492 --json jobs`
- `git grep bypass_rls|prospector_app|DIRECT_URL|OWNER_DATABASE_URL origin/main` (migrations, ci.yml, scripts/db)
- `git ls-tree origin/main prisma/migrations` (139 diretórios); `gh pr view 18/28/34 --json files`
- Sem npm ci e sem execução local, por restrição de memória da box.

## Evidências
- Diff: 1 migration (+133), schema.prisma (+87), teste de integração novo (+187) e count de RLS 129→132 nos testes unit e integration.
- CI, run 39526105492 (application gate): **failure**. Passaram install, bootstrap do papel NOSUPERUSER, audit, lint, prettier e typecheck. **Falhou** em Architecture tests (são os 2 ciclos herdados do #15 na main; o #30 resolve). Por causa disso foram **skipped**: OpenAPI drift, Unit Tests, Run Migrations, migration drift, Integration Tests, Build e E2E. A migration nunca foi aplicada no CI, e o "6/6" do autor não tem reprodução independente.
- CI: DATABASE_URL = `prospector_app` (NOSUPERUSER); migrate como `prospector` (owner). Não existe `OWNER_DATABASE_URL`/`DIRECT_URL` no ci.yml, então o teste do trigger contra o owner (`it.skipIf(!ownerPool)`) **é pulado no CI**.
- As policies das migrations da main usam `OR current_setting('app.bypass_rls') = 'on'`. As do #35 **não têm bypass**, o que é mais estrito e atende ao critério 1.

## Achados
**P1**
- P1-1. Sem evidência de execução: migration, unit e integração skipped no CI. Bloqueio independente do mérito.

**P2**
- P2-1. Append-only × direito de exclusão (LGPD art. 18): o trigger impede apagar ou anonimizar linhas, e `retentionUntil` é nullable e sem job, além de impossível de cumprir com o trigger. É preciso definir pseudonimização com **HMAC com chave por organização ou por titular**, mais crypto-shredding (destruir a chave = exclusão), e documentar a base legal (art. 16, I) para manter o registro de consentimento.
- P2-2. Hash sem chave + `UNIQUE(currentHash)` global: se `subjectRef` = `sha256:<id>` sem chave, ele é reversível por dicionário (e-mail ou telefone). O unique global, entre tenants, vira um oráculo de existência e causa colisão entre organizações. O unique deve ser `(organizationId, currentHash)` e o subjectRef deve usar HMAC com chave fora do banco.
- P2-3. Corte no fim da cadeia (achado do #33): o schema não tem âncora de cabeça (tabela `ConsentChainHead`, com último sequence e hash por organização, atualizada na mesma transação, ou um checkpoint assinado externo). UNIQUE(org, sequence) impede duplicata e furo no meio, mas não detecta remoção das últimas linhas por quem desliga o trigger.
- P2-4. O owner contorna o trigger: `ALTER TABLE ... DISABLE TRIGGER`, `session_replication_role=replica` (superuser) ou DROP. A defesa depende de a aplicação **nunca** rodar como owner. No CI isso vale (`prospector_app`); em produção não há evidência. Condição: provar a role de produção, e o REVOKE condicional `IF EXISTS prospector_app` precisa rodar de novo depois do bootstrap (o script não pode reconceder UPDATE/DELETE). Junto com P2-3, isso é mitigado pela âncora externa.
- P2-5. Offboarding bloqueado: `ConsentAuditRecord → Organization ON DELETE RESTRICT`, somado ao trigger, impede apagar a organização para sempre, inclusive no teardown de testes. Falta um runbook (procedimento de break-glass auditado, ou organização "tombstone" com retenção definida).
- P2-6. Expurgo de derivados (achado do #33): as tabelas Flywheel não têm FK para `Lead` (`leadId` solto) e só fazem cascade pela organização. Expurgar um titular não chega aos derivados (autópsia, few-shot com `attributionEvidence` JSONB, caches de IA e logs). Isso é responsabilidade do #33, mas o schema precisa de índices e chaves que suportem o expurgo por titular (o índice `(org, leadId)` existe, o que é bom).

**P3**
- P3-1. Testes: o teste do owner é pulado no CI, então o trigger contra owner não está provado ali. Não há teste de que o REVOKE foi aplicado (`has_table_privilege`). O comentário do count no unit não foi atualizado.
- P3-2. Conflitos de count e de schema.prisma com #18, #28 e #34: o 132 deste PR só vale isolado. Diretórios de migration: main 139, +#18, +#28, +#34, +#35 = **143**. O count de RLS precisa ser recalculado no rebase final (soma incremental: o #34 declarou 135; com o #35, +3).
- P3-3. Drift só fica em exit 0 com o #28, então o merge depende do #28.

**P4**
- P4-1. `createdAt` é TIMESTAMP sem tz, enquanto as demais colunas usam TIMESTAMPTZ.
- P4-2. Migration segura: só cria objetos novos (tabelas vazias, índices não-CONCURRENTLY aceitáveis, `CREATE OR REPLACE FUNCTION`), sem lock em tabelas existentes além da FK para Organization (ADD CONSTRAINT valida contra tabela vazia, com lock SHARE ROW EXCLUSIVE breve em Organization).

## Relação com o #33 (3e08a65)
| Achado do #33 | #35 |
|---|---|
| REVOKE UPDATE/DELETE para o app | OK (PUBLIC + prospector_app condicional) + trigger |
| UNIQUE(org, sequence) | OK |
| Detecção de corte no fim | **Não** (P2-3) |
| Expurgo de autópsia e derivados | Parcial (P2-6) |
| Pseudonimização do subjectRef | **Não** definido; hash sem chave (P2-2) |

## Condições para reavaliar (APROVADO)
1. Rebase depois de #30 → #18 → #28 → #34, com o application gate **100% verde** (migrations, unit e integração executados, sem skip), mais o teste do owner rodando no CI (definir `OWNER_DATABASE_URL`).
2. Unique por `(organizationId, currentHash)`, especificação de HMAC com chave para o subjectRef e âncora de cabeça da cadeia.
3. Teste de privilégio (`has_table_privilege` = false para UPDATE/DELETE/TRUNCATE) e evidência de que produção usa `prospector_app`, não o owner.
4. Runbook de offboarding e de retenção/crypto-shredding.

## Ordem de merge
#30 → #18 → #28 → #34 → #35 → #33 (wiring) → #32 (#32 depende do #34; o #33 depende do #35).
