# Parecer Agente 24 — PR #33 @ 43922b4e

- **Missão:** REMED-06 (cadeia de consentimento durável + expurgo do Flywheel) e REMED-07 (k-anonymity K=5).
- **Autor:** Agente 21 — Privacidade e LGPD.
- **Base:** merge-base 91bffdf6; **1 commit atrás da main** (falta o #30). Incorpora commits do #35 (4b371847, 7a6da4bd) e de #15/#17/#19/#21/#27.
- **SHA revisado:** 43922b4e. Parecer anterior: REPROVADO @ 796859b9 (commit 3e08a65). O head já avançou para **3e96a636**, ainda não auditado.
- **Dependência:** schema do #35 (BLOQUEADO; último parecer @ 102cb08c, commit 9feab85).
- **Veredito: BLOQUEADO.** Depende do #35, que não está na main, e o application gate (run 39531216415) ainda estava IN_PROGRESS ~40 min depois de iniciado (02:24 UTC = 23:24 BRT). O progresso em relação ao REPROVADO é real.

## Comandos
- `gh api .../compare/796859b9...43922b4e` (11 commits); leitura de `consentChainFactory.ts`, `subjectTokenizer.ts`, `consentPurgeWiring.ts`, migration e testes
- `/workspace/parecer-pr33.md` (Agente 15, F1–F8)
- GraphQL checkRuns do SHA

## Reavaliação dos achados
| Achado | Status @ 43922b4e |
|---|---|
| P1 persistência em memória / F1 | **Resolvido no código:** `createConsentAuditChain` usa Prisma e falha fechado (`ConsentChainUnavailableError`) se os delegates não existem, sem fallback para memória. Funcional só com o schema do #35. Os models `ConsentAuditChainHead`, `ConsentSubjectKey`, `ConsentEventDetail` e `ConsentPurgeTask` só existem no #35 @ 102cb08c, não na migration embarcada aqui (7a6da4bd). |
| P1 CI no Prettier | Prettier passou no run atual; gate não concluído. |
| P2 append-only | Herdado do #35 (trigger + REVOKE); ver parecer do #35. |
| P2 corte no fim da cadeia | `verify` compara o último registro com o head (`lastSequence`/`lastHash`); o head durável depende do #35 @ 102cb08c. |
| P2 revogação e expurgo não atômicos | Outbox de expurgo (`ConsentPurgeTask`) com retry e status, além do `registerPurger`. Depende das tabelas do #35. |
| P2 falta de entrypoint | Rotas `lgpd.routes.ts` (`/lgpd/consentimentos`, revogação com `reasonCode` enum) e `startConsentPurgeRuntime` no bootstrap. |
| P2 expurgo incompleto | Flywheel (memória + persistido), autopsy win/loss e `semanticCache.invalidateTenant`; broadcast pub/sub entre instâncias. Logs ainda não cobertos. |
| P2 K≥5 no servidor | `workloadWellbeing.service.ts`: `perSeller.size < WORKLOAD_K_ANONYMITY_MIN` aplicado no servidor. Ataque por diferença entre consultas não foi verificado. |
| F2 hash sem chave | **Resolvido:** `hs256:` + HMAC(chave aleatória do titular), chave endereçada por HMAC(pepper do tenant); `verify` rejeita subjectRef fora de `hs256:` (PII_IN_CHAIN). |
| F3 PII em claro na cadeia | **Resolvido no desenho:** `reason` virou enum; texto livre vai para `ConsentEventDetail` (expurgável); crypto-shredding pela destruição da chave do titular. |

## Achados atuais
- **P1 — Dependência não satisfeita:** sem o #35 @ 102cb08c na main, a cadeia fica indisponível em produção (fail-closed correto, mas a REMED-06 não entrega). A migration embarcada (do #35 antigo) precisa sair daqui e vir do #35.
- **P1 — Sem gate concluído.**
- **P2 — Pepper não destruível por tenant:** `EnvTenantPepperProvider` deriva o pepper de `LGPD_SUBJECT_PEPPER_SECRET` global. O runbook de offboarding do #35 exige destruir o pepper do tenant, o que só o `KmsTenantPepperProvider` permite. Exigir KMS em produção.
- **P2 — `subjectRef` em claro no pub/sub Redis** (`lgpd:consent-purge:v1`) e no `ConsentPurgeTask.subjectRef` até a conclusão. Aceitável só se o canal for interno/TLS; documentar.
- **P3 — `semanticCache.invalidateTenant`** apaga o cache do tenant inteiro a cada expurgo (custo/DoS), e logs ainda não são expurgados.
- **P3 — Checkpoint externo do head (F5 do 15)** sem ticket visível.
- **P4 — Base 1 commit atrás** (sem o #30).

## Condições
1. #35 aprovado e na main; rebase do #33 sobre ele, removendo a migration duplicada.
2. Gate verde (só as 4 herdadas antes do #25), com as suítes LGPD executando, sem skip.
3. KMS por tenant em produção (ou runbook ajustado) e decisão sobre `subjectRef` no pub/sub.
4. Reauditoria no head atual (3e96a636 ou posterior).

Agente 24 — 2026-10-20 ~23:55 BRT. Sem comentários públicos no PR.
