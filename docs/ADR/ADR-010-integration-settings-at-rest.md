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
4. **Fail-closed: ilegível ≠ não configurado** (revisão 24/06).
   - `get` devolve `null` **só** quando não há configuração. Se algum campo secreto não decifrar, `get` **lança** `IntegrationConfigUnreadableError` (`AppError` 422, com `provider` e `fields`, sem valores). `getMany` lança se qualquer provider pedido estiver ilegível. A assinatura não mudou, então um chamador que não trate o caso falha fechado por padrão.
   - `lookup(orgId, provider)` devolve uma união discriminada sem lançar no ilegível: `configured` | `unconfigured` | `unreadable` (com `fields` e `message`). Erros de tenant continuam lançando.
   - Uma tool com fallback de plataforma (env) **só** pode usá-lo em `unconfigured`. Em `unreadable` ela responde `status: 'reconfiguration_required'` (helper `tools/integrationConfigState.ts`), sem fetch, sem pending action e sem env. Isso vale para Teams/Telegram (messaging), M365 (e-mail e meetings), Trello/Notion/Monday (tasks), push (notifications) e `send_sms` (`aiPendingAction`, `reason: 'credentials_unreadable'`).
   - `getStatus`/`listStatus` expõem `fields: Record<campo, 'set'|'unset'|'unreadable'>` e `unreadable`. Com qualquer campo ilegível, `configured = false`. Os consumidores decidem por `configured`/`fields`, nunca pela string mascarada.
   - O log informa só model, campo e id.
5. **Tenant sem bypass.** O `orgId` recebido precisa ser igual ao tenant do `requestContext`. Se não houver contexto, se houver divergência ou se o contexto tiver `bypassRls: true`, o código lança `IntegrationSettingsTenantError` antes de qualquer query. O teste-guard de `prisma.setting` cobre `tools/**` e `aiPendingAction.service.ts`.
6. **Merge no save.** Campo ausente, `''` ou contendo `••••` preserva o valor atual. A remoção só acontece por `clear`.
7. **Exposição:**
   - `get` e `getMany` devolvem valores decifrados apenas para uso server-side;
   - a UI e o LLM usam `getStatus` e `listStatus` (máscara `••••` + últimos 4);
   - `maskedConfig` vai só para ADMIN e GESTOR;
   - o pino faz redact (na raiz e em `*.campo`) de `botToken`, `appSecret`, `appPassword`, `webhookUrl`, `accessToken`, `refreshToken`, `apiKey`, `clientSecret`, `webhookSecret`, `authToken` e `appKey` (`LOGGER_REDACT_PATHS`, com teste);
   - o `TwilioProvider` loga a config via `sanitizeObjectForLogging`.
8. **Bitrix pelo Hub:** a gravação morta em `bitrix_webhook_url` foi removida, e o save do provider `bitrix24` no Hub responde `AppError` 422 orientando o uso da integração dedicada. Provider desconhecido responde 400, e provider OAuth (sem Setting) responde 422, em vez de 500.
9. **Backfill offline** em `scripts/security/backfill-integration-settings-encryption.ts`:
   - roda em dry-run por padrão e só grava com `--apply --snapshot-confirmed=<id>`;
   - é idempotente e nunca imprime valores;
   - processa organização por organização com `app.current_tenant_id`;
   - o dry-run relata chaves fora do catálogo (ex.: `accountSid`/`email` legados) por nome, sem valor, e as **preserva** (`fora_do_catalogo=…`, `linhas_com_chaves_fora_do_catalogo`).

   A rotação de chave foi estendida em `scripts/security/reencrypt-credentials.ts` (`--model=Setting`, por campo). **Nenhum dos dois foi executado.** Rodar em produção exige o OK do Marcelo.

10. **Pré-condições dos scripts** (`scripts/security/credential-script-guards.ts`, testadas):
    - `CREDENTIALS_ENCRYPTION_KEY` precisa estar **explícita** (base64, 32 bytes) em **qualquer** `NODE_ENV`. Não existe fallback para a chave de dev, porque cifrar o banco real com ela tornaria os dados ilegíveis em produção.
    - Na rotação, `OLD_KEY` e `NEW_KEY` também são obrigatórias e explícitas, precisam ser diferentes, e `CREDENTIALS_ENCRYPTION_KEY` tem de ser igual a uma delas.
    - `--apply` exige `--snapshot-confirmed=<id>` (vazio é recusado). A rotação agora roda em **dry-run por padrão** (antes gravava sem `--dry-run`), e `--apply` com `--dry-run` é recusado.
    - O script aborta antes de abrir conexão.

### Runbook (staging/produção — só com OK do Marcelo)

1. Exportar `CREDENTIALS_ENCRYPTION_KEY` (e, na rotação, `OLD_KEY`/`NEW_KEY`) explicitamente.
2. Rodar em dry-run e revisar o relatório (linhas a cifrar, ilegíveis, chaves fora do catálogo).
3. **Tirar um snapshot do banco** (RDS/PITR ou `pg_dump`) e anotar o id.
4. Rodar com `--apply --snapshot-confirmed=<id-do-snapshot>`.
5. Rodar o dry-run de novo: tem de dar 0 linhas a gravar (idempotência).
6. Se der errado, restaurar o snapshot do passo 3.

## v2 (adiada; depende do #33)

- **P1 — envelope/KMS** e unificação com o `credentialCrypto`.
- **P2 — rotação online** sem janela offline.
- **P3 — endurecimento do formato e da trilha:**
  - **AAD** = `tenantId` + nome do campo no GCM, para que um ciphertext copiado para outra org ou outro campo não decifre;
  - **key-id** no prefixo (`enc:v2:<kid>:…`), permitindo várias chaves ativas e rotação incremental;
  - **AuditLog no backfill/rotação**: uma entrada por linha gravada (org, key, campos, snapshot id, operador), sem valores.

## Fora do escopo / consequências

- **v2/KMS (envelope, key-id no prefixo, unificação com o `credentialCrypto`):** depende do #33. O `enc:v1` não tem key-id, então a rotação continua offline (OLD_KEY → NEW_KEY).
- **Fallback de plataforma (achado MÉDIA):** para tenant **sem** configuração, nada muda: `getBitrixSettings` usa `BITRIX24_WEBHOOK_URL`, e o messaging usa `TEAMS_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. A decisão de removê-lo é de produto (Marcelo). Para tenant com credencial **ilegível**, o fallback agora é bloqueado (item 4).
- **Read-modify-write sem transação** em `save`/`clear`: duas gravações concorrentes no mesmo provider podem perder um campo. Follow-up.
- **Rotação dos tokens que já ficaram em claro** em banco ou backup: decisão do Marcelo, fora do código.
- `lib/auth.ts` (onboarding) continua gravando `Setting` sem credenciais e fica fora do repositório.
- Ainda não existe rota DELETE/clear no Hub; fica como follow-up.
- Não houve mudança de schema Prisma nem migration.
