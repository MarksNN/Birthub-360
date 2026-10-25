# ADR 010: Credenciais de integração em `Setting.value` cifradas por campo (enc:v1), via repositório único

## Status

Aceito para a v1 (Onda 52; Agente 15 com contrato do Agente 06; revisão do 24). A v2 com envelope/KMS fica **adiada** e depende do #33 (Agente 21).

## Contexto

O Hub Universal (`src/features/intelligence/tools/universal*Tool.ts`, `universalConnectors.service.ts`, `aiPendingAction.service.ts`) guarda as credenciais de cerca de 20 provedores (WhatsApp Cloud, Telegram, Teams, Trello, HubSpot, RD Station, SMS, push, Omie, Zoom, Calendly, M365 etc.) em `Setting` (`key = integration.<provider>`, coluna `value Json`).

- Cada tool lia e gravava `prisma.setting` direto, com os tokens em **texto puro** dentro do JSON.
- A extensão de cifra do Prisma (`src/lib/prisma.ts` + `ENCRYPTED_MODEL_FIELDS`) cobre só colunas `String`, nunca `Json`. Por isso banco, backups e réplicas guardavam os segredos em claro.
- O GET de conectores devolvia `maskedConfig` também para CLOSER e SDR.
- `bitrix_webhook_url` era gravado em texto puro pelo Hub e nunca era lido (a configuração real fica em `BitrixConnection`).

O diagnóstico do Agente 15 classificou o achado como **ALTA**.

## Decisão

1. **Repositório único** em `src/lib/integrations/integrationSettings.repository.ts` (`get`, `getMany`, `getStatus`, `listStatus`, `save` e `clear`). Fora dele, nenhum código de `src/features/intelligence/tools/**` acessa `prisma.setting`, e um teste-guard garante isso.
2. **Cifra por campo, formato `enc:v1:`** (`src/lib/crypto/secretFields.ts`, AES-256-GCM, chave `CREDENTIALS_ENCRYPTION_KEY`).
   - Só os campos `secret: true` do catálogo (`universalConnectors.catalog.ts`) são cifrados. O JSON continua um objeto com as mesmas chaves, sem um blob opaco.
   - O catálogo é a fonte única de verdade para o repositório, o backfill e a rotação.
3. **Legado em passthrough.** Valor sem prefixo `enc:` é lido como está e recifrado na próxima gravação. Assim, nada quebra antes do backfill.
4. **Fail-closed.** Se algum campo secreto não decifrar, `get` devolve `null` (tratado como não configurado) e o status mostra "ilegível — reconfigure". O log informa só model, campo e id.
5. **Tenant sem bypass.** O `orgId` recebido precisa ser igual ao tenant do `requestContext`. Se não houver contexto ou se houver divergência, o código lança `IntegrationSettingsTenantError` antes de qualquer query.
6. **Merge no save.** Campo ausente, `''` ou contendo `••••` preserva o valor atual. A remoção só acontece por `clear`.
7. **Exposição:**
   - `get` e `getMany` devolvem valores decifrados apenas para uso server-side;
   - a UI e o LLM usam `getStatus` e `listStatus` (máscara `••••` + últimos 4);
   - `maskedConfig` vai só para ADMIN e GESTOR;
   - o pino faz redact de `botToken`, `appSecret`, `appPassword`, `webhookUrl` e `*.accessToken`;
   - o `TwilioProvider` loga a config via `sanitizeObjectForLogging`.
8. **Bitrix pelo Hub:** a gravação morta em `bitrix_webhook_url` foi removida, e o save do provider `bitrix24` no Hub agora orienta o uso da integração dedicada.
9. **Backfill offline** em `scripts/security/backfill-integration-settings-encryption.ts`:
   - roda em dry-run por padrão e só grava com `--apply`;
   - é idempotente e nunca imprime valores;
   - processa organização por organização com `app.current_tenant_id`.

   A rotação de chave foi estendida em `scripts/security/reencrypt-credentials.ts` (`--model=Setting`, por campo). **Nenhum dos dois foi executado.** Rodar em produção exige o OK do Marcelo.

## Fora do escopo / consequências

- **v2/KMS (envelope, key-id no prefixo, unificação com o `credentialCrypto`):** depende do #33. O `enc:v1` não tem key-id, então a rotação continua offline (OLD_KEY → NEW_KEY).
- **Fallback de plataforma (achado MÉDIA): não muda neste ADR, só fica documentado.** `getBitrixSettings` usa `BITRIX24_WEBHOOK_URL`, e o messaging usa `TEAMS_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` para qualquer tenant sem configuração própria. A decisão é de produto (Marcelo).
- **Rotação dos tokens que já ficaram em claro** em banco ou backup: decisão do Marcelo, fora do código.
- `lib/auth.ts` (onboarding) continua gravando `Setting` sem credenciais e fica fora do repositório.
- Ainda não existe rota DELETE/clear no Hub; fica como follow-up.
- Não houve mudança de schema Prisma nem migration.
