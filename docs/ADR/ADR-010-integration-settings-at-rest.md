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
    - **Hardening pós-#102** (`agente/15-credential-rotation-hardening`):
      - **Código de saída:** 0 = ok; 1 = pré-condição/falha; **2 = dados com problema** (`Erros > 0` ou conflitos na rotação, em dry-run **e** apply; ilegíveis no `--verify`; no backfill, valores cifrados ilegíveis ou, no `--verify`, segredos ainda em claro). Antes, a rotação terminava com 0 e "✅ Concluído com sucesso" mesmo com erros.
      - **`--verify`** nos dois scripts: somente leitura, sem `NEW_KEY` nem snapshot; chave de `CREDENTIALS_ENCRYPTION_KEY` ou `--key-env=NOME` (explícita, sem fallback); conta legíveis/ilegíveis/em claro por model. `--verify` com `--apply` é recusado, e os guards de apply recusam `--verify`.
      - **Atômico por linha em todos os models:** uma linha com qualquer campo cifrado ilegível sob `OLD_KEY` não é gravada (antes, fora do `Setting`, os campos legíveis eram regravados e a linha ficava com chaves misturadas). Cada linha vai num único `UPDATE`. O backfill também passa a conferir a legibilidade dos `enc:` existentes e não grava a linha ilegível.
      - **Redis:** `--target=redis-wa-auth` rotaciona as sessões WhatsApp/Baileys (`wa-auth:<org>:*`, mesma chave): `SCAN` (nunca `KEYS`), compare-and-set em Lua que preserva o TTL, `--apply` exige o id do snapshot do Redis, logs só com contagens e nomes de chave.
      - `--model=` vazio ou desconhecido é recusado (antes processava todos); `REDIS_URL` explícita, sem fallback.

### Runbook (staging/produção — só com OK do Marcelo)

1. Exportar `CREDENTIALS_ENCRYPTION_KEY` (e, na rotação, `OLD_KEY`/`NEW_KEY`) explicitamente.
2. Rodar em dry-run e revisar o relatório (linhas a cifrar, ilegíveis, chaves fora do catálogo).
3. **Tirar um snapshot do banco** (RDS/PITR ou `pg_dump`) e anotar o id.
4. Rodar com `--apply --snapshot-confirmed=<id-do-snapshot>`.
5. Rodar o dry-run de novo: tem de dar 0 linhas a gravar (idempotência). Depois, `--verify`: código 0 (`ilegiveis=0` e `em_claro=0`).
6. Se der errado, restaurar o snapshot do passo 3.
7. **Rotação de chave** (`reencrypt-credentials.ts`, inclusive `--model=Setting`): seguir [`docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md`](../security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md) (RB-SEC-010). Lá estão o snapshot (banco e Redis), o dry-run com contagem esperada, o apply (banco e `--target=redis-wa-auth`) e a **verificação obrigatória** (`--verify` sob a `NEW_KEY` com 0 ilegíveis + cross-check de 0 pendentes sob a `OLD_KEY`) **antes** de trocar `CREDENTIALS_ENCRYPTION_KEY`. Sem `--apply`, nada é gravado.

## v2 — desenho detalhado (adiada; depende do #33; **só documento, nada implementado**)

Problemas da v1 que a v2 resolve: uma única chave global para todos os tenants e campos (sem key-id, então rotação só offline e com janela); ciphertext copiável entre orgs/campos (sem AAD); dois módulos de cifra duplicados (`src/lib/security/credentialCrypto.ts` e `src/lib/crypto/secretFields.ts`, ambos `enc:v1` e ambos com chave fixa de dev como fallback); sem trilha de auditoria nas rotações; impossível apagar criptograficamente os dados de **um** tenant.

### V2.1 Hierarquia de chaves

- **KEK** (key-encryption key) no KMS (AWS KMS / GCP KMS / Vault Transit — escolha do #33/infra). A app nunca vê a KEK; só chama `wrap`/`unwrap`. Identificada por `kekId` (ARN/versão).
- **DEK** (data-encryption key) por tenant e por versão: 32 bytes aleatórios, AES-256-GCM. Guardada **embrulhada** (`wrappedDek = KMS.wrap(DEK, kekId, ctx={tenantId, kid})`). O contexto de criptografia do KMS amarra o DEK ao tenant (unwrap com outro tenant falha e fica no log do KMS).
- Dados sem tenant (ex.: `Account` do Better Auth no nível de usuário) usam o tenant reservado `_platform`.
- Interface `KeyWrapper { kekId; wrap(dek, ctx); unwrap(wrapped, ctx) }` com implementação KMS e uma implementação local **explícita** para dev/test (KEK de env obrigatória; **sem** chave fixa de dev).

### V2.2 Formato

`enc:v2:<kid>:<iv b64url>:<tag b64url>:<ct b64url>`

- **Variante escolhida (diferente de `enc:v2:<kid>:<wrappedDek>:<iv>:<tag>:<ct>`):** o `wrappedDek` **não** vai inline no valor; fica no **keyring** (V2.4), endereçado pelo `kid`. Motivos: (a) **crypto-shredding** — com o DEK embrulhado dentro de cada valor, apagar um tenant exigiria destruir a KEK (compartilhada) ou reescrever todo valor; com keyring, basta destruir as linhas de DEK do tenant; (b) tamanho — um DEK embrulhado pelo KMS tem ~150–200 bytes, repetido em cada campo de cada linha (Contact tem 3 campos por linha); (c) rotação de KEK vira só re-embrulhar N DEKs (um por tenant/versão), sem tocar dados.
- `kid`: identificador opaco e estável, `dk_<26 chars base32>` (aleatório), sem `:`. Não codifica o tenant (não vaza o orgId em logs/exports); o tenant entra pelo AAD e pelo keyring.
- IV 12 bytes aleatórios, tag 16 bytes, como na v1. Base64url para não colidir com `:`.

### V2.3 AAD

`AAD = "b360:enc:v2" | kid | tenantId | model | field`, cada parte com prefixo de tamanho (u16 big-endian) para não haver ambiguidade de concatenação.

- `model`: nome do model Prisma; no `Setting`, `Setting:<settingKey>` (ex.: `Setting:integration.trello`); no Redis, `redis:wa-auth`.
- `field`: nome da coluna ou do campo do JSON (`apiKey`); no Redis, a categoria da chave (`creds`, `pre-key`, `session`, `sender-key`, `app-state-sync-key`… — o sufixo sem o id, para a app conseguir reconstruir o contexto).
- Efeito: ciphertext copiado para outra org, outro model ou outro campo **não decifra** (falha de tag → ilegível, fail-closed como na v1). Exige que todo ponto de cifra conheça `{tenantId, model, field}` — ver V2.7.

### V2.4 Keyring e key-id

Tabela nova (migration própria, revisão do Agente 01; **este PR não muda o schema**):

`TenantDataKey { kid (PK), organizationId, version, wrappedDek, kekId, state: active|decrypt_only|retired|destroyed, createdAt, activatedAt, retiredAt, destroyedAt }`, com no máximo **um** `active` por `organizationId` (índice parcial único) e RLS por tenant (sem bypass, como o `Setting`). `destroyed` apaga `wrappedDek` (fica só o metadado) e grava um tombstone append-only `TenantDataKeyTombstone` (org, kid, kekId, destroyedAt, destroyedBy, motivo — **sem** material de chave), no mesmo padrão do `ConsentSubjectKeyTombstone` do ADR-006.

Runtime: `resolveKey(tenantId, kid?)` com cache em memória (LRU, TTL ~5 min, invalidado por evento de rotação), unwrap sob demanda; escrita sempre com o DEK `active` do tenant; leitura aceita `active`, `decrypt_only` e `retired` (este último só para jobs de backfill, com alerta).

### V2.5 Rotação online

- **Leitura:** `enc:v1:` (chave global legada `CREDENTIALS_ENCRYPTION_KEY`, enquanto existir) **e** `enc:v2:` (keyring). **Escrita:** sempre `enc:v2:` com o DEK ativo. Sem janela offline: a app continua no ar durante toda rotação.
- **Rotação de KEK** (rotina ou incidente no KMS): re-embrulhar cada `wrappedDek` com a nova `kekId`. Não toca dados; idempotente; AuditLog por DEK.
- **Rotação de DEK de um tenant:** (1) cria DEK `v+1` `active`, o anterior vira `decrypt_only`; (2) job em background por tenant e model, em lotes, re-cifra do `kid` antigo para o novo com compare-and-set (`UPDATE … WHERE id = $1 AND "<campo>" = $antigo`; no Redis, o mesmo CAS em Lua dos scripts v1, preservando TTL); (3) `--verify` por `kid` (contagem por `kid` = 0 no banco e no Redis); (4) DEK antigo → `retired` e, depois do período de retenção, `destroyed`.
- **Migração v1 → v2:** é uma rotação "da chave global para o DEK do tenant": regravações normais da app já produzem v2; um job de backfill converte o resto; quando o `--verify` der 0 `enc:v1:` em todos os models, `Setting` e `wa-auth:*`, a `CREDENTIALS_ENCRYPTION_KEY` sai do ambiente (depois do período de rollback) e o caminho de leitura v1 é removido num PR seguinte.
- Concorrência: o CAS garante que uma gravação da app no meio não é sobrescrita (vira conflito, reprocessado no próximo lote).

### V2.6 AuditLog no backfill e na rotação

Usa o `AuditLog` existente (`action`, `entity`, `entityId`, `actorId`, `tenantId`, `details`), **sem valores**:

- `crypto.dek.create|activate|retire|destroy`, `crypto.kek.rewrap` — por DEK (`entity = TenantDataKey`, `entityId = kid`);
- `crypto.backfill.v2`, `crypto.rotate.dek` — por **lote** (não por linha, para não multiplicar o volume): `details` = JSON `{runId, model, fields, kidFrom, kidTo, rows, written, unreadable, conflicts, snapshotId, mode}`; linhas ilegíveis entram por id (sem valor);
- `crypto.shred.tenant` — V2.8;
- `crypto.verify` — resultado do `--verify` (contagens por `kid`).

O operador (`actorId`) é obrigatório nos scripts (`--operator=<id>`); o `runId` liga AuditLog, log do job e registro da janela. A âncora de integridade do AuditLog (HMAC com chave no KMS) segue o ADR-006 (Agente 15).

### V2.7 Unificação `credentialCrypto` + `secretFields`

Um único módulo `src/lib/crypto/envelope.ts`:

- `encrypt(ctx: { tenantId; model; field }, plaintext): Promise<string>` → sempre v2;
- `decrypt(ctx, stored): Promise<string>` → v1 (legado) ou v2; erro tipado `EnvelopeUnreadableError` (o repositório do ADR-010 continua mapeando para `IntegrationConfigUnreadableError` 422);
- `classify(ctx, stored)` → `readable|unreadable|plaintext` (base do `--verify`);
- versões síncronas só com DEK já em cache (a extensão Prisma e o Baileys são síncronos hoje: o cache é aquecido por tenant no início da request/conexão).

`credentialCrypto.ts` e `secretFields.ts` viram reexports finos do `envelope.ts` (com teste-guard de que nada novo importa os antigos) e são removidos depois. A extensão Prisma (`ENCRYPTED_MODEL_FIELDS`) passa `{tenantId: row.organizationId ?? '_platform', model, field}`; o repositório de integrações passa `Setting:<key>`; o `useRedisAuthState` passa `redis:wa-auth` + categoria. O fallback de chave fixa de dev **some**. Os scripts deste ADR passam a usar o mesmo módulo (hoje têm a lógica do envelope duplicada em `scripts/security/credential-envelope.ts` por causa do fallback).

### V2.8 Crypto-shredding por tenant (alinhar com F11 do #33)

- Encerramento de conta / eliminação LGPD do tenant: `destroy` de **todos** os DEKs do tenant (apaga `wrappedDek`, grava tombstone e `crypto.shred.tenant` no AuditLog). Todo valor `enc:v2` desse tenant fica indecifrável no banco, réplicas e Redis — sem precisar varrer linha a linha. Sessões `wa-auth:<org>:*` são apagadas também (não há o que preservar).
- **Backups:** os backups antigos ainda têm as linhas de `TenantDataKey` com o `wrappedDek`; enquanto a KEK existir, um restore recupera o DEK. Duas opções, a decidir junto do F11 do #33 (Agente 21): **(A)** shredding efetivo nos backups só depois da janela de retenção (documentado no registro de eliminação, como no ADR-006); **(B)** KEK **por tenant** no KMS, com agendamento de deleção da KEK no shredding — efeito imediato também nos backups, ao custo de uma chave KMS por tenant. Recomendação do 15: (A) por padrão, (B) para tenants que exijam prova imediata.
- O shredding de um **titular** (ADR-006) continua no `ConsentSubjectKey`; o de **tenant** é este. Os dois tombstones têm o mesmo formato para a auditoria LGPD.

### V2.9 Plano de migração

| Fase | O quê | Gate |
|---|---|---|
| F0 | #33 mergeado; KMS e KEK provisionados; decisão (A)/(B) do V2.8 com o 21. | OK do Marcelo |
| F1 | `envelope.ts` (lê v1+v2, **escreve v1** por flag `CRYPTO_WRITE_VERSION=v1`), `KeyWrapper`, migration do `TenantDataKey` + tombstone, reexports de `credentialCrypto`/`secretFields`. Sem efeito em dados. | revisão 24 + 01 (schema) |
| F2 | Script de provisionamento: um DEK `active` por tenant (+ `_platform`), dry-run/`--apply --snapshot-confirmed`, AuditLog. | snapshot + OK do Marcelo |
| F3 | Flag para `v2` num tenant canário, depois em todos. Leituras v1 continuam. Rollback = voltar a flag (v2 já gravado continua legível). | métricas de erro de decifra = 0 |
| F4 | Backfill v1→v2 por tenant/model e `wa-auth:*` (CAS, lotes, AuditLog), `--verify` por `kid` e por versão: 0 `enc:v1:`, 0 ilegíveis. | snapshot (banco e Redis) + OK do Marcelo |
| F5 | Retirar `CREDENTIALS_ENCRYPTION_KEY` do ambiente após o período de rollback; remover leitura v1, `credentialCrypto.ts`, `secretFields.ts` e o envelope duplicado dos scripts. | OK do Marcelo |

Riscos: latência/indisponibilidade do KMS (mitigada pelo cache; falha de unwrap = fail-closed, nunca fallback); contexto errado no AAD (testes de propriedade por model/campo antes da F3); custo de KMS na opção (B).

## Fora do escopo / consequências

- **v2/KMS (envelope, key-id no prefixo, unificação com o `credentialCrypto`):** desenhada acima, não implementada; depende do #33. O `enc:v1` não tem key-id, então a rotação continua offline (OLD_KEY → NEW_KEY).
- **`KEYS wa-auth:<org>:*`** em `whatsapp.service.ts` (limpeza de sessão por org) ainda usa `KEYS`, que bloqueia o Redis em base grande. Os scripts usam `SCAN`; trocar o serviço por `SCAN` é follow-up.
- **Fallback de plataforma (achado MÉDIA):** para tenant **sem** configuração, nada muda: `getBitrixSettings` usa `BITRIX24_WEBHOOK_URL`, e o messaging usa `TEAMS_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. A decisão de removê-lo é de produto (Marcelo). Para tenant com credencial **ilegível**, o fallback agora é bloqueado (item 4).
- **Read-modify-write sem transação** em `save`/`clear`: duas gravações concorrentes no mesmo provider podem perder um campo. Follow-up.
- **Rotação dos tokens que já ficaram em claro** em banco ou backup: decisão do Marcelo, fora do código.
- `lib/auth.ts` (onboarding) continua gravando `Setting` sem credenciais e fica fora do repositório.
- Ainda não existe rota DELETE/clear no Hub; fica como follow-up.
- Não houve mudança de schema Prisma nem migration.
