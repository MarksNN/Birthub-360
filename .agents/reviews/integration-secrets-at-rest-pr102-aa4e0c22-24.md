# Parecer Agente 24 — PR #102 (integration secrets at rest) — **BLOQUEADO @ aa4e0c22**

- **Missão:** Onda 52, Agente 15. Cifrar em repouso os segredos do Hub Universal (`Setting` `integration.*`), com repositório único, fail-closed, máscara, RBAC do maskedConfig, redact, backfill e rotação.
- **Autor:** Agente 15 (conta GitHub MarksNN), branch `agente/15-integration-secrets-at-rest`.
- **Base:** `acd6c614` (= origin/main no fetch das 18:10 BRT de 25/10/2026). **Head auditado:** `aa4e0c22e7a4f6820866706b8db5ae7018666049` (1 commit). O merge ref é `3431f1ed`.
- **Revisor:** Agente 24. Nenhum código auditado foi alterado e não comentei no PR.
- **Escopo do veredito:** vale só para `aa4e0c22`. Qualquer commit novo invalida o parecer.

## Veredito
**BLOQUEADO.** Pela revisão estática, o código está apto. Não houve achado de segurança bloqueante, e (a) a (e) foram atendidos com teste. O gate da Release, porém, para no Type Check herdado: run 40234033148, job 121291757936. Com isso, Unit (onde estão os 46 testes novos), Architecture/depcruise, drift, Integration e Build **não rodaram** no head. Teste obrigatório que não rodou não conta como aprovação. Também não existe branch `agente/gha-diag-pr102-*`.

## 1. Descrição × diff
São 22 arquivos, +2268/−620, sem prisma, schema ou migration:
- **Docs:** ADR-010 e o handoff 15→24.
- **Scripts:** backfill, targets e reencrypt-credentials (com o modo Setting).
- **Novos:** `src/lib/integrations/integrationSettings.repository.ts` e `universalConnectors.catalog.ts`.
- **Alterados:** `universalConnectors.service.ts` (−564 líquido), as rotas, `aiPendingAction.service.ts`, as 6 tools universais, `logger.ts` e `TwilioProvider.ts`.
- **Testes:** 4 arquivos.

O diff confere com a descrição e com o ADR-010.

## 2. Criptografia
- Reusa `src/lib/crypto/secretFields.ts` sem alterá-lo. É AES-256-GCM com IV de 12 bytes aleatório e tag de 16 bytes verificada. O formato é `enc:v1:`, que é a versão.
- A chave vem de `CREDENTIALS_ENCRYPTION_KEY` (32 bytes em base64), e um tamanho inválido lança erro.
- A cifra é **por campo** (`secret: true` no catálogo).
- **Não há AAD nem key-id.** Isso já existia em secretFields. A consequência: quem tem escrita no banco consegue trocar um ciphertext entre tenants ou campos sem que a falha seja detectada.
- O backlog v2 está no ADR (KMS e key-id, dependente do #33). **Recomendo** incluir AAD = `orgId|settingKey.field` nesse v2.
- **(a) Fail-closed: OK.**
  - Em produção sem chave, encrypt e decrypt lançam erro.
  - Com chave errada ou ciphertext adulterado, `get` devolve `null` (não configurado) e `getStatus` devolve "ilegível".
  - Nunca é devolvido ciphertext nem texto puro.
  - Toda gravação nova é cifrada. Sem chave em produção, `save` lança erro antes de gravar.
  - Testes: o repositório cobre "ciphertext adulterado → null"; `secretFields.unit.test` cobre chave errada, produção sem chave e tamanho inválido.
  - **Ressalva:** fora de produção, sem chave, é usada a chave fixa de dev (comportamento anterior). Veja a condição C3.

## 3. Legado e escritores
- **(c) Legado: OK, com teste.**
  - Valor sem prefixo é lido em passthrough.
  - No `save`, um segredo preservado que ainda estiver em texto puro é recifrado (`encryptIfNeeded`).
  - Teste: "'' e '••••…' preservam o valor atual; legado em texto puro é recifrado na gravação".
  - Risco residual aceito durante a transição: com acesso de escrita ao banco, é possível fazer downgrade para texto puro. Sugiro um modo estrito pós-backfill que rejeite valor sem `enc:v1:`.
  - Borda P4: um valor legado que comece com `enc:` sem ser `enc:v1:` nunca é cifrado, nem pelo repositório nem pelo backfill.
- **Escritores e leitores de `integration.*`:**
  - Usando `git grep` no head, só o repositório faz `prisma.setting` sobre `integration.*`, mais os dois scripts via SQL.
  - Os demais acessos a `prisma.setting` ficam fora do escopo:
    - `voice-hub/settingRepository` só usa as chaves fixas `general`, `voice_runtime`, `onboarding_checklist` e as de módulos.
    - `lib/auth.ts:345` está fora do escopo pelo ADR.
  - A gravação morta de `bitrix_webhook_url` foi removida. O Bitrix usa `BitrixConnection`.

## 4. Tenancy
- **(b) OK.**
  - Nas rotas, `orgId` vem de `req.user` e não do body ou dos params.
  - O repositório faz `assertTenant`: exige `getTenantId()` do requestContext igual ao `orgId` antes de qualquer query, e lança erro sem contexto.
  - Todas as queries filtram `organizationId` + `userId: null` + `key`. Não há `bypassRls`.
- **Testes:** "orgId divergente do requestContext lança antes de qualquer query", "sem requestContext lança", e na ação de SMS "orgId divergente → send_failed, sem query nem fetch".
- **Caminho do worker:** `agent.worker.ts:63` envolve o job do `SDROutboundDraftAgent` em `requestContext.run({ tenantId })`. O SMS via `executeAndRecord` mantém o contexto, e a regressão que eu temia não acontece.
- **Backfill:** liga bypass só para listar `Organization`, desliga em seguida e roda org a org com `app.current_tenant_id`.

## 5. RBAC
- **(e) OK.**
  - O GET connectors aceita ADMIN, GESTOR, CLOSER e SDR (VISUALIZADOR recebe 403), com `includeMaskedConfig = hasRequiredRole(role, ['ADMIN','GESTOR'])`.
  - Para os outros papéis o `maskedConfig` vem `{}` em todos os conectores, inclusive bitrix e google.
  - O PUT é adminOrGestor.
  - O enum real é ADMIN, GESTOR, CLOSER, SDR e VISUALIZADOR.
- **Teste:** `it.each(['CLOSER','SDR'])` verifica `{}` em todos os conectores, ausência da máscara e ausência do token. `it.each(['ADMIN','GESTOR'])` verifica que recebem a máscara.
- **Frontend:** `UniversalEcosystemPanel.tsx` preenche o formulário com o `maskedConfig` e devolve a máscara no PUT, que fica preservada pelo sentinel (ver d).

## 6. Tools e prompt
- As 6 tools e o `aiPendingAction` passam pelo repositório.
- O decrypt (`get`) só acontece no ponto do fetch externo. Para status e listagem é usado `getStatus`/`getMany`, que devolvem booleano ou máscara.
- Os 12 testes de tools verificam que o token decifrado chega ao destino (URL do Bot API, Bearer do Graph, key/token do Trello, webhook) e **não** aparece na saída para o LLM.
- Um guard verifica que nenhum arquivo em `tools/**` usa `prisma.setting`.
- **(d) Merge: OK, com testes.**
  - `''` e o valor contendo `••••` preservam o segredo atual: a máscara não sobrescreve e o vazio não apaga.
  - A remoção só acontece por `clear`, que não tem rota (fora do escopo pelo ADR).
  - Testes: "'' e '••••…' preservam" e "mantém o ciphertext existente quando preservado".

## 7. Redact
- **Adicionados:** botToken, appSecret, appPassword, webhookUrl (com as formas `*.`) e `*.accessToken`.
- **Lacunas (P3, não bloqueante):** faltam `*.refreshToken`, `apiKey` no topo, `clientSecret`/`*.clientSecret`, `webhookSecret`/`*.webhookSecret`, `authToken` e `appKey`. Os paths do pino são exatos, então `secret` não cobre `clientSecret`.
- **Não há teste de redact no PR.** O critério 7 pede um, então fica pendente (condição C2).

## 8. Backfill e rotação
- **Backfill:**
  - É **dry-run por padrão** (`--apply` explícito).
  - É idempotente: pula valores `enc:` e não cifra duas vezes. Há teste de segunda passada sem nenhuma gravação.
  - Nunca imprime valor.
  - O log é só stdout por linha, `[DRY-RUN]/[APPLY] org/key/campos`, sem registro em AuditLog.
- **Rollback:** não existe script reverso. A volta seria por backup ou snapshot antes do `--apply`. Como o app lê os dois formatos, não precisar de rollback é aceitável, mas o runbook deve exigir o snapshot.
- **Rotação:** `reencrypt-credentials --model=Setting` é fail-closed (OLD_KEY inválida → lança). Atenção: esse script é **LIVE por padrão** (`--dry-run` é opt-in), comportamento que ele já tinha.
- **C3:** o backfill não exige `CREDENTIALS_ENCRYPTION_KEY` explicitamente. Rodado com `NODE_ENV=development` contra um banco real, cifraria com a chave fixa de dev, que é pública. O `--apply` deve abortar sem chave explícita.
- **Execução em produção** do backfill e da rotação: **precisa de OK do Marcelo**, que não foi dado nem registrado até agora. Não bloqueia o PR. Nenhum dos scripts foi executado.

## 9. Testes (46)
Contagem no head:
- repository: 15
- connectors.secrets: 4 + 2 `it.each`×2 = 8
- tools: 12
- backfill: 11

Total **46 ✓**.
- **Cobertos:** tamper (repositório e `secretFields`), chave errada (`secretFields` e `reencrypt` OLD_KEY), legado em texto puro, cross-tenant (guard de contexto), `''`/`••••`, CLOSER/SDR e o guard de tools.
- **Não cobertos:** redact, e troca de ciphertext entre orgs (impossível de detectar sem AAD).
- **Nenhum teste novo rodou no CI** (Unit foi pulado).

## 10. CI no head aa4e0c22 (horário BRT)
- **Verdes:**
  - Trivy: run 40234033067.
  - Dependency Review: 40234033086.
  - CodeQL: 40234033133.
  - Bundle Budget: 40234033274.
  - Na Release 40234033148: secret scan, trivy scan, dependency review, Audit, Lint, Prettier e working tree limpa.
- **Type Check falhou com 88 erros.** O conjunto `arquivo:TS-code` é idêntico ao baseline 88 de main (pós-#96, `/tmp/d96e.txt`). As únicas diferenças são deslocamentos de linha nas tools e no `aiPendingAction`. **Nenhum erro novo.**
- **Pulados:** Architecture (depcruise, cruise-coverage, hotspots), drift, Unit, AI Resilience, Migrations, Integration, Build, Smoke e E2E.
- **CodeQL:** 3 alertas novos em `refs/pull/102/merge`, todos em arquivo de teste (`universalTools.integrationSecrets.test.ts`):
  - #105 e #106 `js/incomplete-url-substring-sanitization` (linhas 195 e 236).
  - #107 `js/file-system-race` (linha 311).
  - P4: corrigir ou dispensar com justificativa.
- **depcruise:** é preciso confirmar no diag a importação `lib/integrations → features/intelligence/services/universalConnectors.catalog` (lib→features).

## 11. LGPD
Reduz o risco nos arts. 46 (medidas de segurança) e 48 (no incidente, dado cifrado diminui o dano e pesa na avaliação do art. 48 §3º). O risco residual é o legado em texto puro até o backfill, além de backups antigos. O texto final de LGPD depende de aprovação do DPO ou do Marcelo.

## Condições para virar APROVADO (sobre o mesmo SHA ou um sucessor reauditado)
- **C1 (bloqueante, GHA/06):** abrir um diag estilo v4e para `aa4e0c22` (veículo `agente/gha-diag-pr102-<sha8>`; patch do ci.yml igual ao do v4e, patch-id d113fd0a), com:
  - Unit sem falhas novas além de AgentExecutor (load) e gateway ×3, e os 46 testes novos verdes.
  - Integration só com a falha do swarm-autonomous-mission-e2e.
  - Architecture (depcruise, cruise-coverage, hotspots), OpenAPI drift e Build verdes.
  - DATA-007 sem diferença.
  - TS com 88 erros e nenhum novo.
- **C2 (15, recomendada antes do merge):** completar o redact (`*.refreshToken`, `apiKey`, `clientSecret`, `webhookSecret`, `authToken`, `appKey` e as formas `*.`) e incluir um teste unitário que faça log de um objeto com esses campos e verifique `[Redacted]`.
- **C3 (15, antes de qualquer `--apply`):** o backfill e a rotação devem abortar sem `CREDENTIALS_ENCRYPTION_KEY` explícita; o runbook deve exigir snapshot do banco. **A execução precisa de OK do Marcelo.**
- **P3/P4 de follow-up:** AAD e key-id no v2, modo estrito pós-backfill, os 3 alertas de CodeQL em teste, e a borda `enc:` sem `v1`.

## Comandos e evidências
- `git fetch origin`; `refs/pr/102h` = aa4e0c22; `refs/pr/102m` = 3431f1ed; origin/main = acd6c614.
- `git diff --stat acd6c614 aa4e0c22`; `git show aa4e0c22:<arquivo>` para o repositório, `secretFields`, ADR-010, service, rotas, tools, logger, scripts e testes.
- `git grep -nE "\.setting\.(upsert|update|create|find…)" aa4e0c22 -- src scripts` e `git grep '"Setting"'`.
- `gh run list --commit aa4e0c22…`; `gh run view 40234033148 --json jobs`; `gh api --allow-escape-sequences …/jobs/121291757936/logs`.
- Comparação de TS: extração `arquivo(l,c): error TSxxxx` → 88 linhas; o multiset `arquivo+código` é igual ao de `/tmp/d96e.txt`.
- `gh api code-scanning/alerts?ref=refs/pull/102/merge&state=open` → 3 alertas (#105–#107).
- `git ls-remote origin 'refs/heads/agente/gha-diag-pr102*'` → nenhum.
