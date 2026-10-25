# Parecer Agente 24 — PR #102 (Agente 15, segredos de integração at-rest) — reauditoria

- **Veredito: BLOQUEADO @ `750452f523f0c582bed9cae5f7417830b644b695`**
- Missão: onda-52 / 15 — integration secrets at rest (redact, guards de scripts, CodeQL #105–#107, ajustes do Agente 06)
- Autor do head: Marks (commit 750452f5, 2026-10-25 18:37 BRT), parent `db02bd60c4f50d47bf6f222c2b26aa2956b08921`
- Base: `main` = `acd6c61413d6e3fc617a1f8521e50a79072b22f0`
- Parecer anterior: BLOQUEADO @ aa4e0c22 (commit d13a3a30, branch agente/24-review-pr102-aa4e0c22)
- Método: somente fetch/diff/show/gh api/logs (sem checkout, sem worktree, sem npm ci); gitleaks 8.24.3 local. Nenhum comentário no PR e nenhuma alteração no código auditado.

## Por que BLOQUEADO
A diag do head 750452f5 existe e é um veículo válido, mas **ainda está em execução** no momento deste parecer (18:44 BRT):
- branch `agente/gha-diag-pr102-750452f5` = `f0f85829a1a17123e782e69f13ad1fbdb5f45b84`. Parent 750452f5, altera somente `.github/workflows/ci.yml` (blob `d8a7e3a03e678b1df28278dbb2d8f833d08a4e16`, v4e) ✓
- Release run 40236532644: secret scan ✓; application gate (job 121299338815) passou do Type Check (step 12, continue-on-error) e está em Unit (step 15). Ainda faltam Unit, Re-bootstrap/privilégios, DATA-007, Integration, Architecture/hotspots, Build/smoke e E2E.
- Sonar 40236532600 e Visual 40236532663 em andamento. CodeQL 40236532625, Trivy, Dependency Review e Bundle ✓.
Sem os resultados do critério (7), não há evidência dinâmica para aprovar.

A diag anterior, `af035fb8` (agente/gha-diag-pr102-db02bd60), **não vale como evidência**: o secret scan falhou (job 121296806666, `generic-api-key` em tests/unit/security/integrationSettingsBackfill.test.ts:94) e o application gate foi pulado.

## Delta db02bd60 → 750452f5
`git diff --stat db02bd60 750452f5`:
- `.gitleaks.toml` +12. Adiciona o bloco de comentário FP #6 e `'''^sms-plain-key-0001$'''` em `[allowlist] regexes`. Nenhum path foi adicionado.
- `.agents/handoffs/onda-52/15-para-24-integration-secrets-at-rest.md`: 1 linha, só texto de status.
- **Registro:** o delta NÃO é só o `.gitleaks.toml`. Ele inclui também 1 linha de handoff (doc, inócuo). Por isso uma diag do db02bd60 valeria em princípio, mas a af035fb8 não executou o gate (ver acima).

## Verificação do falso positivo #6 (gitleaks 8.24.3, local)
- Faixa `aa4e0c22^..750452f5`, usando o `.gitleaksignore` do 750452f5:
  - config do db02bd60 → 1 leak (fixture da linha 94), exit 2;
  - config do 750452f5 → "no leaks found", exit 0, 3 commits.
- Estreiteza (`--no-git`, config do 750452f5):
  - `'sms-plain-key-0001'` é suprimido;
  - `'sms-plain-key-0001Zq8Lw3Xr7'` e `'Zq8Lw3Xr7Kp2Vm9Tn4Bh6Jd1'` continuam detectados.
  - O regex é ancorado (`^…$`) no valor exato e não há allowlist de path.
- A fixture é obviamente sintética (`sms-plain-key-0001`, entropia 3.53) e não é uma chave real ✓
- Secret scan no CI do 750452f5: Release run 40236395225, job 121298798639 **success** ✓

## Critérios (1)–(6) — resultado estático + CI do PR @ 750452f5
1. **Redact** ✓
   - `LOGGER_REDACT_PATHS` exportado e usado em `paths`, com censor `[REDACTED]`.
   - Novos: `*.refreshToken`, `apiKey`, `clientSecret`/`*.`, `webhookSecret`/`*.`, `authToken`/`*.`, `appKey`/`*.`. Nenhum path antigo foi removido.
   - Teste com 14 campos, raiz e aninhado, sem "SECRET" no output.
   - Nota menor: o teste monta um pino próprio com os mesmos paths, em vez de usar a instância `logger`.
2. **Guards dos scripts** ✓ (com achado no runbook, abaixo)
   - `requireExplicitKey`: sem fallback e com 32 bytes obrigatórios.
   - `--snapshot-confirmed`: a última ocorrência vence; valor vazio ou flag nua é recusado.
   - Backfill: `--apply` exige snapshot, com checagem também dentro de `runIntegrationSettingsBackfill`.
   - Reencrypt: dry-run por padrão (`let dryRun = true`). `--apply` exige snapshot e é incompatível com `--dry-run`. OLD/NEW/CURRENT explícitos, OLD≠NEW, CURRENT ∈ {OLD, NEW}.
   - Os guards rodam antes de qualquer conexão. Os fallbacks `OLD_KEY→CREDENTIALS_ENCRYPTION_KEY` e `NEW_CREDENTIALS_ENCRYPTION_KEY` foram removidos.
   - Chamadores: nenhum workflow ou script do package.json chama os scripts.
3. **CodeQL #105–#107** ✓
   - `hostOf()` com `===` exato e `readdirSync({withFileTypes:true})`.
   - Alertas em estado "fixed" no ref de merge; 0 alertas abertos.
   - CodeQL do 750452f5 (40236395216) e da diag (40236532625) ✓
4. **Ajustes do Agente 06** ✓
   - AppError 400: provider desconhecido, Slack sem URL. AppError 422: bitrix24, OAuth, `IntegrationConfigUnreadableError`.
   - Estado por campo `set|unset|unreadable`; `configured=false` quando ilegível.
   - `get`/`getMany` lançam erro em valor ilegível, e `null` significa só "não configurado".
   - Tools Teams/Telegram/M365/notion/trello/monday/push/SMS e aiPendingAction: no estado ilegível não há fallback de env nem fetch; retornam `reconfigurationRequired`/`credentials_unreadable`.
   - `assertTenant` recusa `bypassRls === true`.
   - Sem vazamento: logs e mensagens contêm só nomes de campo, e os testes `expectNoSecret` cobrem o env secret e `enc:v1:`.
5. **Regressões (estático)** ✓
   - `save` não mudou. Nenhum chamador direto restante de `get`/`getMany` sem tratar o erro.
   - Testes: cerca de 85 (repository 19, connectors 9, tools 23, logger 2, guards 10/15 casos, backfill 15).
6. **CI @ 750452f5** (Release 40236395225, application gate job 121298909017):
   - Lint (step 9) ✓, Prettier (step 10) ✓, árvore limpa (step 11) ✓.
   - Type Check (step 12) falha com **88 erros, idênticos ao baseline do main acd6c614 por arquivo+código** ✓ (mesma falha pré-existente). Por isso os steps 13+ foram pulados no gate do PR, e as evidências deles dependem da diag.
   - Trivy ✓, Dependency Review ✓, CodeQL ✓. Sonar (40236395219) ainda em andamento no momento do parecer.
7. **Diag** ⏳ em execução (ver "Por que BLOQUEADO").

## Achados
- **P2 (condição obrigatória antes de qualquer rotação):** `docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md` não foi atualizado.
  - O Passo 3 ("Live", sem flags) agora executa em DRY-RUN quando o shell já exporta `CREDENTIALS_ENCRYPTION_KEY=OLD`. O Passo 4 então troca a chave sem que nada tenha sido re-cifrado, e todas as credenciais ficam ilegíveis (fail-closed, indisponibilidade).
  - Também falta `--apply --snapshot-confirmed=<id>` e a variável `CREDENTIALS_ENCRYPTION_KEY` explícita.
  - Referências desatualizadas, mas inócuas: SECRET_ROTATION_POLICY.md:95 e SECURITY_GUIDE.md:154. O ADR-010 já traz o runbook novo.
- **Info:** o delta db02bd60→750452f5 inclui 1 linha de handoff além do `.gitleaks.toml` (inócuo).
- **Info:** a diag af035fb8 (db02bd60) é inválida como evidência, porque o gate não rodou.

## Para virar APROVADO
1. A diag f0f85829 (ou sucessora sobre 750452f5, apenas com ci.yml d8a7e3a0/8397884a) concluída e batendo com o esperado vs main acd6c614:
   - tsc 88, drift verde;
   - Unit falhando só AgentExecutor + gateway (3), com os testes novos verdes;
   - re-bootstrap/privilégios ok;
   - DATA-007 "No difference";
   - Integration falhando só swarm (1/731);
   - Architecture/hotspots verdes, incluindo lib→features;
   - Build/smoke ok;
   - E2E com os mesmos 33.
2. Sonar concluído sem regressão.
3. Head inalterado em 750452f5.

## Condições (valem também após uma aprovação)
- Backfill ou rotação em produção somente com o OK explícito do Marcelo e com snapshot confirmado.
- Atualizar o runbook legado ROTATE_CREDENTIALS_ENCRYPTION_KEY.md (P2) antes de qualquer rotação.
