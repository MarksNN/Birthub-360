- De: 15 — Segurança Aplicada
- Para: 24 — Revisão Independente (revisor técnico: 06 — Integrações e Bitrix)
- Onda: 52
- Status: aberto. PR #102 (branch `agente/15-integration-secrets-at-rest`), **24 BLOCKED em `aa4e0c22`** → rodada de correção empurrada por cima (fast-forward, sem force). O novo head é o commit que contém esta versão do handoff (`fix(security): 15 — correções do parecer 24/06 …`). Aguarda nova revisão do 24. **Head atual:** commit seguinte a `db02bd60` (`fix(security): 15 — gitleaks FP #6 …`), que só adiciona ao allowlist do `.gitleaks.toml` o regex ancorado `^sms-plain-key-0001$` (fixture de `integrationSettingsBackfill.test.ts:94`, falso-positivo `generic-api-key`); gitleaks 8.24.3 local em `--no-merges --first-parent acd6c614..HEAD`: no leaks found.
- Prioridade: alto (achado ALTA)
- Referências: diagnóstico do 15 "integration secrets at rest" (veredito ALTA), contrato 06↔15 (steering 1 e 2), `docs/ADR/ADR-010-integration-settings-at-rest.md`, #33 (KMS, Agente 21)

## Problema

As credenciais de cerca de 20 conectores do Hub Universal (WhatsApp Cloud, Telegram, Teams, Trello, HubSpot, RD Station, SMS, push, Omie, Zoom, Calendly, M365…) ficam em `Setting.value` (`Json`, `key = integration.<provider>`) em **texto puro**.

- A extensão de cifra do Prisma não cobre `Json`.
- Seis tools mais o `universalConnectors.service` e o `aiPendingAction` liam e gravavam `prisma.setting` direto.
- O GET `/ecosystem/connectors` devolvia `maskedConfig` também para CLOSER e SDR.
- O Hub gravava `bitrix_webhook_url` em claro, e ninguém lia esse valor.
- O pino não fazia redact de `botToken`, `webhookUrl`, `appSecret` e similares, e o `TwilioProvider` logava a config crua.

## Alteração feita

**Novos:**
- `src/features/intelligence/services/universalConnectors.catalog.ts`: o catálogo virou a fonte única (`secret: true` por campo, `settingKey`, `IntegrationProvider`).
- `src/lib/integrations/integrationSettings.repository.ts`, com `get`, `getMany`, `getStatus`, `listStatus`, `save` e `clear`:
  - `enc:v1` por campo e passthrough do legado;
  - fail-closed;
  - sem `bypassRls`, e `IntegrationSettingsTenantError` se o `orgId` divergir do `requestContext`;
  - merge no save, em que `''` e `••••` preservam o valor.
- `scripts/security/integration-settings-targets.ts`: alvos derivados do catálogo.
- `scripts/security/backfill-integration-settings-encryption.ts`: dry-run por padrão, `--apply` para gravar, idempotente, por tenant e **não executado**.
- `docs/ADR/ADR-010-integration-settings-at-rest.md`.

**Alterados:**
- `universalConnectors.service.ts`: usa o repositório. O `maskedConfig` sai só com `includeMaskedConfig`, e a gravação morta do bitrix foi removida (o save de `bitrix24` no Hub lança um erro orientando a usar a integração dedicada).
- `universalEcosystem.routes.ts`: `includeMaskedConfig: hasRequiredRole(role, ['ADMIN','GESTOR'])`.
- **Fase B**, sem nenhum `prisma.setting` restante:
  - `universalEmailTool`, `universalMessagingTool`, `universalOfficeDocsTool`, `universalTasksAndNotesTool`, `universalMeetingsTool` e `universalNotificationsTool` usam o repositório;
  - `aiPendingAction.service` (send_sms) também usa o repositório.
- `src/lib/logger.ts`: redact de `botToken`, `appSecret`, `appPassword`, `webhookUrl` (na raiz e em `*.`) e de `*.accessToken`.
- `src/lib/voice-runtime/providers/TwilioProvider.ts`: loga a config via `sanitizeObjectForLogging`.
- `scripts/security/reencrypt-credentials.ts`: `--model=Setting` rotaciona por campo (`reencryptIntegrationSettingValue`, função pura e fail-closed).

**Fora do repositório, de propósito:** `src/lib/auth.ts:345` (onboarding grava Setting de módulos, sem credencial).

Não houve mudança de schema Prisma nem migration, e não foi usado `@ts-ignore` nem `any` novo.

### Mudanças de semântica (06 por favor confirmar)

- `connected` ou `configured` agora significa "algum campo do catálogo com valor não vazio".
- No SMS, o `accountSid` saiu, porque não estava no catálogo e nunca era usado.
- `bitrix24` salvo pelo Hub agora lança um erro amigável.
- `IntegrationProvider` é `Extract` do array do catálogo, e não `keyof typeof`. É um desvio documentado.
- Não existe rota DELETE/clear: `clear` existe só no repositório (follow-up).
- O frontend não mudou.
- O e-mail M365 continua lendo `email`, mas o catálogo grava `mailboxEmail`. A divergência já existia na main e não foi alterada aqui (follow-up do 06).

## Rodada de correção (parecer 24 BLOCKED em `aa4e0c22` + steering do 06)

**Itens do 24:**
1. **Logger:** redact de `refreshToken`, `apiKey`, `clientSecret`, `webhookSecret`, `authToken` e `appKey`, na raiz e em `*.campo` (`LOGGER_REDACT_PATHS` exportado). Teste: `tests/unit/lib/loggerRedaction.integrationCredentials.test.ts`.
2. **Scripts abortam** (`scripts/security/credential-script-guards.ts`, puro e testado em `tests/unit/security/credentialScriptGuards.test.ts`):
   - backfill e reencrypt abortam sem `CREDENTIALS_ENCRYPTION_KEY` explícita (base64 de 32 bytes) em **qualquer** `NODE_ENV`, sem fallback para a chave de dev;
   - `OLD_KEY`/`NEW_KEY` idem (sem fallback), precisam ser diferentes, e a chave corrente tem de ser igual a uma delas;
   - `--apply` exige `--snapshot-confirmed=<id>`; o `run` do backfill também recusa apply sem `snapshotId` antes de qualquer query;
   - **mudança de contrato:** o reencrypt agora roda em **dry-run por padrão** (antes gravava se não houvesse `--dry-run`), e `--apply` com `--dry-run` é recusado;
   - o runbook do ADR-010 exige snapshot antes do `--apply`.
3. **CodeQL** — corrigido no código de teste (`universalTools.integrationSecrets.test.ts`), **nenhum alerta dispensado via API**:
   - #105 e #106 (`js/incomplete-url-substring-sanitization`): `includes('api.trello.com')`/`includes('graph.microsoft.com')` → comparação exata de `new URL(u).hostname` (helper `hostOf`);
   - #107 (`js/file-system-race`): `statSync` + `readFileSync` → `readdirSync(dir, { withFileTypes: true })` com `Dirent.isDirectory()/isFile()`; `statSync` saiu do import.
   - O fechamento dos alertas depende da próxima análise do CodeQL no PR.
4. **ADR-010:** v2 ganhou a P3 (AAD `tenantId`+campo, key-id no prefixo, AuditLog no backfill/rotação), o runbook com snapshot e a semântica ilegível ≠ não configurado.

**Steering do 06:**
- **A. Erros com status correto:** `universalConnectors.service` usa `AppError`: provider desconhecido 400, slack sem webhook 400, `bitrix24` 422 (mensagem amigável), OAuth 422. `UnknownIntegrationProviderError` agora estende `AppError` (400). Teste de rota (supertest + `errorHandler`): bitrix24 → 422, desconhecido → 400, OAuth → 422.
- **B. Estado por campo:** `getStatus`/`listStatus` expõem `fields: Record<campo,'set'|'unset'|'unreadable'>` e `unreadable`, com `configured=false` se houver campo ilegível. `tasks` (clickup/asana, antigo :368) e `notifications` (SMS, antigo :137) usam `configured`/`fields`, não mais a string mascarada. `list_platforms` usa `listStatus` (um provider ilegível não derruba a listagem; mostra `conectado:false, ilegivel:true`).
- **C. Fail closed:**
  - `get` **lança** `IntegrationConfigUnreadableError` (`AppError` 422, com `provider`/`fields`, sem valores) e `null` continua significando "não configurado"; `getMany` lança se algum pedido estiver ilegível;
  - novo `lookup` → `configured | unconfigured | unreadable`, sem lançar no ilegível; erro de tenant continua lançando;
  - **messaging:** Teams/Telegram com credencial ilegível **não** caem no env da plataforma: `status: 'reconfiguration_required'`, sem fetch e sem pending action;
  - revisados os demais: e-mail (M365 → `integrationWarnings`, sem Graph), meetings (Teams → `integrationWarning`), tasks (Trello/Notion/Monday sem fetch), notifications (push sem fetch; SMS `gatewayUnreadable`), `aiPendingAction` `send_sms` → `reason: 'credentials_unreadable'`;
  - o fallback quando **não há** configuração continua igual (testado para Teams e Telegram).
- **Pontos baratos:**
  - `assertTenant` recusa `bypassRls: true` mesmo com `tenantId` igual;
  - o guard de `prisma.setting` cobre também `aiPendingAction.service.ts`;
  - o dry-run do backfill relata chaves fora do catálogo (`accountSid`/`email` legados) por nome, sem valor, e as **preserva** (`unknownFields`, `rowsWithUnknownFields`).

**Evidência desta rodada:**
- **tsc** (`tsc --noEmit -p tsconfig.json`, Node 22): **88** erros, conjunto idêntico ao baseline de 88 ignorando linha/coluna — **0 erros novos**. Os scripts (`scripts/security/*.ts`) e os 6 arquivos de teste tocados, fora do tsconfig, foram checados à parte (`--strict`, nodenext): 0 erros.
- **biome check --write** nos arquivos tocados: 0 erros; 3 warnings, todos em linhas pré-existentes não tocadas (`BATCH_SIZE` sem uso e `useTemplate` no reencrypt, `useOptionalChain` no `universalEmailTool`).
- **vitest** (`-c vitest.unit.config.ts`, prisma mockado, sem Postgres): **85/85** nos testes novos/alterados:
  - `integrationSettings.repository.test.ts` 19 (adulterado → lança 422 e `fields`; `lookup` nos 3 estados; `lookup` não engole erro de tenant; `getMany` lança; `bypassRls` recusado; provider desconhecido 400);
  - `universalTools.integrationSecrets.test.ts` 23 (+11 de fail-closed e guard);
  - `universalConnectors.secrets.test.ts` 11 (+3 de rota);
  - `integrationSettingsBackfill.test.ts` 15 (+4: chaves fora do catálogo, apply sem snapshot);
  - `credentialScriptGuards.test.ts` 15 (novo);
  - `loggerRedaction.integrationCredentials.test.ts` 2 (novo).
- Suítes relacionadas (`pending-actions.service`, `swarmScheduler.fullModeGates`, `intelligence.routes`, `cold-email.service` e as de `tests/unit/{lib,intelligence}` que citam universal/logger): 18 arquivos, 133/133.
- `trivy-pr-gate.test.ts` segue falhando só porque o clone sparse não tem `.github/` (pré-existente).
- Nada foi executado contra banco; backfill e reencrypt **não** foram rodados.

**Follow-ups (não bloqueiam):**
- `save`/`clear` fazem read-modify-write sem transação (gravações concorrentes no mesmo provider podem perder campo);
- cobertura de testes para Teams (tasks/meetings), Monday, Notion, ClickUp e Asana além dos casos fail-closed;
- UI do Bitrix fica com o 06;
- erros de `validateWebhookUrl` no PUT do Hub ainda viram 500 (deveriam ser 400);
- os anteriores: rota DELETE/clear, `mailboxEmail` vs `email` no M365, v2/KMS (#33), execução do backfill, rotação dos tokens expostos, fallback de plataforma para tenant sem config (MÉDIA, decisão de produto).

## Evidência (rodada anterior, `aa4e0c22`)

> Contagens e semântica abaixo são da rodada anterior. Em especial, "adulteração tratada como null" foi substituída: agora `get` lança `IntegrationConfigUnreadableError` (ver acima).

- **tsc** (`tsc --noEmit -p tsconfig.json`, Node 22): **88 erros** na main `acd6c614` e **88** nesta branch. O conjunto é **idêntico** quando se ignoram os números de linha, e só as linhas deslocaram nos arquivos tocados. Não há erro novo. Os scripts e o `TwilioProvider`, que ficam fora do tsconfig, foram checados à parte, sem erros.
- **biome check** nos 16 arquivos de produção e no ADR: 0 erros e 6 warnings, todos pré-existentes na main: `BATCH_SIZE` sem uso no reencrypt, `useTemplate`, `useOptionalChain` em `universalEmailTool` e `noNonNullAssertion` em `universalOfficeDocsTool`. Os testes ficam em path ignorado pelo `biome.json`.
- **vitest** (`-c vitest.unit.config.ts`, prisma mockado, sem Postgres), testes novos com 46 de 46 passando:
  - `tests/unit/integrations/settings/integrationSettings.repository.test.ts` (15):
    - linha crua cifrada;
    - merge `''` e `••••`;
    - round-trip;
    - passthrough;
    - adulteração tratada como null ou "ilegível";
    - `getMany` com uma única query;
    - máscara;
    - `listStatus`;
    - `clear`;
    - orgId divergente e ausência de contexto;
    - provider desconhecido.
  - `tests/unit/intelligence/universalTools.integrationSecrets.test.ts` (12): um teste por tool, sempre com a linha crua `enc:v1` no mock do prisma. Verifica que o segredo decifrado chega só ao fetch do provedor e que a saída da tool não contém nem o segredo nem `enc:v1:`. Inclui:
    - `aiPendingAction` com orgId divergente, que falha fechado sem query e sem fetch;
    - o **teste-guard**, que barra `prisma.setting` em `src/features/intelligence/tools/**`. Na main, ele pegaria 6 arquivos e 16 ocorrências.
  - `tests/unit/intelligence/universalConnectors.secrets.test.ts` (8):
    - `maskedConfig` vazio sem a opção;
    - com a opção, só máscara e campos públicos;
    - erro do bitrix sem gravar;
    - save cifrado;
    - rota GET via supertest, em que ADMIN e GESTOR recebem a máscara e CLOSER e SDR recebem `{}` em todos os conectores.
  - `tests/unit/security/integrationSettingsBackfill.test.ts` (11):
    - `planSettingBackfill`: só campos secret, pula `enc:`, legado bitrix e idempotência;
    - `runIntegrationSettingsBackfill` com `QueryFn` fake: o dry-run não emite UPDATE e o log não traz valores; o apply grava por linha, com tenant setado e bypass desligado antes de tocar `Setting`; uma segunda passada grava 0;
    - `reencryptIntegrationSettingValue`: OLD→NEW, texto puro intocado, legado bitrix e fail-closed.
- **Suítes relacionadas** (`tests/unit/{intelligence,integrations,security,lib,features/intelligence,voice-hub}` e `src/features/intelligence`): 131 arquivos, com 866 testes passando e 2 falhando. Nenhuma das 2 falhas tem relação com esta mudança:
  - `trivy-pr-gate.test.ts`: o clone sparse não tem `.github/`;
  - `AgentExecutor.test.ts`: importa `../../services/guardrails.service.js`, um path que não existe na main.
- Nada foi executado contra banco, nem o backfill, nem o reencrypt.

## Fora deste PR (decisões do Marcelo)

1. **v2/KMS** (envelope, key-id no prefixo, unificação com o `credentialCrypto`): depende do #33. Ver ADR-010.
2. **Execução do backfill** em staging ou produção: primeiro `dry-run`, depois `--apply`. Exige o OK do Marcelo.
3. **Rotação dos tokens** que já estiveram em claro no banco ou em backups.
4. **Achado MÉDIA, fallback de plataforma:** não mudou, só foi documentado. `getBitrixSettings` usa `BITRIX24_WEBHOOK_URL`, e o messaging usa `TEAMS_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` para qualquer tenant sem configuração própria. É decisão de produto.

## Teste esperado (24)

1. `rg -n "prisma\s*\.\s*setting" src/features/intelligence/tools` não retorna nada.
2. `vitest run -c vitest.unit.config.ts tests/unit/integrations/settings tests/unit/intelligence/universalTools.integrationSecrets.test.ts tests/unit/intelligence/universalConnectors.secrets.test.ts tests/unit/security/integrationSettingsBackfill.test.ts tests/unit/security/credentialScriptGuards.test.ts tests/unit/lib/loggerRedaction.integrationCredentials.test.ts` deixa os 85 testes passando.
3. `npm run typecheck` dá o mesmo total da main (88), sem erro novo.
4. Revisão do 06: semântica de `connected`, `accountSid` do SMS, bitrix pelo Hub e follow-up do `mailboxEmail`.
5. CodeQL no PR: #105, #106 e #107 fecham na próxima análise (corrigidos no código, sem dismiss).
6. Fail-closed: com credencial ilegível, nenhuma tool usa env da plataforma (testes `falha fechada: …`).
