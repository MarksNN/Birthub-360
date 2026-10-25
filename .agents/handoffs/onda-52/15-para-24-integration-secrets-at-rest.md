- De: 15 — Segurança Aplicada
- Para: 24 — Revisão Independente (revisor técnico: 06 — Integrações e Bitrix)
- Onda: 52
- Status: aberto (commit local, sem push e sem PR; só o 08A abre o PR depois do parecer do 24)
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

## Evidência

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
2. `vitest run -c vitest.unit.config.ts tests/unit/integrations/settings tests/unit/intelligence/universalTools.integrationSecrets.test.ts tests/unit/intelligence/universalConnectors.secrets.test.ts tests/unit/security/integrationSettingsBackfill.test.ts` deixa os 46 testes passando.
3. `npm run typecheck` dá o mesmo total da main (88), sem erro novo.
4. Revisão do 06: semântica de `connected`, `accountSid` do SMS, bitrix pelo Hub e follow-up do `mailboxEmail`.
