# Runbook — Rotação da Chave Mestra de Criptografia em Repouso (`CREDENTIALS_ENCRYPTION_KEY`)

**ID:** RB-SEC-010  
**Criticidade:** Tier 0 (Crítico / LGPD / Integridade de Banco)  
**Propriedade:** Agente 15 (Segurança Aplicada) em coordenação com Agente 01/01A (Dados)  
**Status:** Operacional — revisado na Onda 52 (PR #102) para o contrato do `reencrypt-credentials.ts` (dry-run por padrão, `--apply` + `--snapshot-confirmed=<id>`) e no hardening seguinte (`agente/15-credential-rotation-hardening`): `--verify`, código de saída ≠ 0 com erros, gravação atômica por linha e alvo Redis `redis-wa-auth`. Corrigido no PR #107 após o parecer do Agente 24 (B1/B2): processamento **por organização sob RLS** com preflight e prova de cobertura, lista de alvos derivada de `ENCRYPTED_MODEL_FIELDS` (inclui `CopilotoTranscriptSegment.text`), `Account` na tabela real `account`, `--verify` em transações READ ONLY e retomada idempotente (`Já em NEW_KEY`).  
**Referências:** [`docs/ADR/ADR-010-integration-settings-at-rest.md`](../../ADR/ADR-010-integration-settings-at-rest.md) (itens 9–10 e Runbook), [`scripts/security/credential-script-guards.ts`](../../../scripts/security/credential-script-guards.ts), [`scripts/security/reencrypt-credentials.ts`](../../../scripts/security/reencrypt-credentials.ts), [`scripts/security/rls-coverage.ts`](../../../scripts/security/rls-coverage.ts), [`src/lib/crypto/encryptedModelFields.ts`](../../../src/lib/crypto/encryptedModelFields.ts), [`scripts/security/backfill-integration-settings-encryption.ts`](../../../scripts/security/backfill-integration-settings-encryption.ts).

> [!IMPORTANT]
> **Execução em qualquer ambiente (staging, produção ou qualquer banco com dados reais) depende do OK explícito do Marcelo**, registrado antes da janela. Nenhum agente executa este runbook por conta própria, e "o usuário concordou", repassado por outro agente, não vale como OK.

> [!WARNING]
> **DRY-RUN É O PADRÃO.** `reencrypt-credentials.ts` (e o backfill) **só gravam com `--apply` explícito E `--snapshot-confirmed=<id>`**. Rodar **sem `--apply` não altera nada no banco nem no Redis**, mesmo que o log termine em `✅ Concluído sem erros.`: confira sempre `Modo: 🚀 LIVE` no cabeçalho e `[Modo: LIVE]` no final. Até a Onda 52 o padrão era LIVE; a versão antiga deste runbook rodava o passo "Live" sem `--apply`, ou seja, **fazia um dry-run silencioso**, e em seguida trocava a chave, deixando **todas** as credenciais ilegíveis. Por isso o passo 6 (verificação) é **obrigatório** antes do passo 7 (troca da chave).

> [!CAUTION]
> **Risco de corrupção de dados:** trocar `CREDENTIALS_ENCRYPTION_KEY` no ambiente **sem re-cifrar antes os registros do banco e verificar** torna os dados existentes indecifráveis, quebrando integrações ativas e leituras de PII.

---

## 1. Contexto e Motivação

`CREDENTIALS_ENCRYPTION_KEY` é a chave simétrica de 256 bits (AES-256-GCM, envelope `enc:v1:`) que cifra credenciais e PII em repouso. O `reencrypt-credentials.ts` rotaciona (OLD_KEY → NEW_KEY) os campos `enc:v1:` de **todos** os models de `ENCRYPTED_MODEL_FIELDS` ([`src/lib/crypto/encryptedModelFields.ts`](../../../src/lib/crypto/encryptedModelFields.ts)) — a **mesma** constante que a extensão do Prisma usa para cifrar (`piiFields.ts` a reexporta); o script não tem lista própria. Um teste de contrato (`tests/unit/security/reencryptTargetsContract.test.ts`) confere cada model/campo contra o `schema.prisma` (tabela real, `@@map`, `organizationId`) e falha se surgir em `src/` um novo chamador de cifra fora dos conhecidos. Hoje:

- `GoogleWorkspaceConnection` (`accessToken`, `refreshToken`)
- `BitrixConnection` (`webhookUrl`, `webhookSecret`)
- `ThreeCXConnection` (`apiKey`, `apiSecret`)
- `VoiceHubConnection` (`apiKey`, `webhookSecret`)
- `SlackConnection` (`webhookUrl`, `botToken`), `StripeConnection` (`secretKey`, `webhookSecret`), `OmieConnection` (`appKey`, `appSecret`), `ExternalCrmConnection` (`config`)
- `Account` (`accessToken`, `refreshToken`, `idToken`) — tabela real **`account`** (`@@map`). Até o PR #107 o script procurava a tabela `"Account"`, logava `[PULADO]` e **nunca rotacionava os tokens OAuth**; agora o nome vem do mapa model→tabela, conferido pelo teste de contrato.
- `Contact` (`email`, `phone`, `whatsapp`)
- `VoiceCallLog` (`transcript`, `summary`, `recordingUrl`)
- **`CopilotoTranscriptSegment` (`text`)** — faltava na lista copiada à mão até o PR #107 (B2 do Agente 24): após a troca da chave, as transcrições do Copiloto ficariam ilegíveis.
- **`Setting`** (`key = integration.*` e a chave legada `bitrix_webhook_url`): campos secretos **por campo** dentro do JSON de `Setting.value` (ADR-010). Processado organização por organização com `app.current_tenant_id`. Pode ser isolado com `--model=Setting`.
- **Redis — sessões WhatsApp/Baileys** (`wa-auth:<org>:*`, gravadas por `src/features/integrations/whatsapp/useRedisAuthState.ts` com `encryptField`, ou seja, com a **mesma** `CREDENTIALS_ENCRYPTION_KEY`). Alvo separado: `--target=redis-wa-auth` (passo 5b). Se esse alvo não for rotacionado, **toda sessão WhatsApp fica ilegível** após a troca da chave e cada organização precisa ler o QR de novo.

Valores **sem** prefixo `enc:v1:` (texto puro legado) **não** são tocados pela rotação: no `Setting` eles são trabalho do backfill `backfill-integration-settings-encryption.ts` (ver passo 3).

O `enc:v1` não tem key-id: a rotação é **offline** (OLD_KEY → NEW_KEY numa janela). Rotação online/key-id está adiada para a v2 (ADR-010, #33).

---

## 2. Contrato dos scripts (nomes exatos)

Checado por `credential-script-guards.ts` **antes de abrir conexão** com o banco ou o Redis (o script aborta com `[FALHA CRÍTICA]`, código 1):

| Item | Regra |
|---|---|
| `DATABASE_URL` | obrigatória no alvo `db` (padrão). |
| `REDIS_URL` | obrigatória e explícita no alvo `redis-wa-auth` (sem fallback para localhost). |
| `CREDENTIALS_ENCRYPTION_KEY` | obrigatória e **explícita** no env (base64 de 32 bytes), em **qualquer** `NODE_ENV`; sem fallback para a chave de dev. Na rotação, tem de ser **igual a `OLD_KEY` ou a `NEW_KEY`** (pega ambiente trocado). |
| `OLD_KEY`, `NEW_KEY` | obrigatórias e explícitas (base64 de 32 bytes), **diferentes** entre si. Sem fallback entre elas nem para `NEW_CREDENTIALS_ENCRYPTION_KEY`. |
| (sem flag) | **dry-run** — nada é gravado. |
| `--apply` | grava. Exige `--snapshot-confirmed=<id>`. |
| `--snapshot-confirmed=<id>` | id do snapshot tirado imediatamente antes. Vazio ou flag sem valor é recusado; se repetida, vale a última. |
| `--dry-run` | aceito (é o padrão); `--apply` + `--dry-run` juntos são **recusados**. |
| `--model=<Model>` | filtra um model (ex.: `--model=Setting`, `--model=BitrixConnection`). Sem filtro = todos os models **e** o `Setting`. Model desconhecido ou `--model=` vazio são **recusados** (antes, `--model=` vazio processava tudo). Só vale com o alvo `db`. |
| `--target=db\|redis-wa-auth` | `db` (padrão): models + `Setting`. `redis-wa-auth`: chaves `wa-auth:*` do Redis. |
| `--verify` | modo **somente leitura**: não exige `OLD_KEY`, `NEW_KEY` nem snapshot; recusa `--apply`. Conta, por model/alvo, valores **legíveis / ilegíveis / em claro** sob **uma** chave. |
| `--key-env=NOME` | só no `--verify`: lê a chave da variável `NOME` (padrão `CREDENTIALS_ENCRYPTION_KEY`), explícita e válida, sem fallback. |

Saída por model (o que este runbook chama de contagem):

```
[PREFLIGHT] current_user=<role> rolsuper=<bool> rolbypassrls=<bool>
[PREFLIGHT] <Model> → "<tabela>": escopo=org|bypass rls=… force=… rls_se_aplica=… policy_admite_bypass=… organizationId=… select=… update=… reltuples=<n> contagem_global=exact|exact-bypass|estimate
[PREFLIGHT] ✅ cobertura provável para todos os alvos.      # ou ❌ <motivo> → aborta, código 1
Organizações: <n>
Processando Model: <Model> → "<tabela>" (campos: ...; escopo org|bypass)
  ↳ Total linhas: <n> | Re-criptografadas: <r> | Puladas: <p> | Já em NEW_KEY: <j> | Erros: <e> (linhas com campo ilegível, não gravadas; campos ilegíveis: <f>) | Conflitos: <c>
  ↳ [COBERTURA] <Model>: processadas=<x> soma_por_org=<y> global(<modo>)=<z> divergências=<d>
Processando Model: Setting (integration.* + bitrix_webhook_url, por campo)
  ↳ Total linhas: <n> | Re-criptografadas: <r> | Erros: <e> (linhas com campo ilegível ou versão desconhecida, não gravadas) | Conflitos: <c>
✅ Concluído sem erros, cobertura conferida. [Modo: DRY-RUN|LIVE]          # ou
❌ Concluído COM PROBLEMAS: Erros=<e> Conflitos=<c> Divergências=<d>. [Modo: ...] Código 2.
```

No alvo `redis-wa-auth`:

```
Processando Redis: wa-auth:* (sessões WhatsApp/Baileys)
  ↳ Total chaves: <n> | Re-criptografadas: <r> | Em claro: <c> | Já em NEW_KEY: <j> | Erros: <e> | Conflitos: <k> | Sumidas: <m>
  ↳ Chaves com erro/conflito (nomes, até 20): wa-auth:<org>:...
```

No `--verify`:

```
  ↳ [VERIFY] <Model|Setting|wa-auth:*>: legíveis=<x> ilegíveis=<y> em_claro=<z> linhas=<n>
  ↳ [COBERTURA] <Model>: processadas=… soma_por_org=… global(<modo>)=… divergências=<d>
✅ VERIFY OK: 0 ilegíveis com a chave de <NOME> e cobertura conferida.      # ou ❌ VERIFY FALHOU ... Código 2.
```

- `Re-criptografadas` = linhas (ou chaves) cujos campos `enc:v1:` **decifram todos com `OLD_KEY`** (no dry-run: as que *seriam* gravadas) → **pendentes**.
- `Já em NEW_KEY` = campos (ou chaves) que **não** decifram com `OLD_KEY` mas **decifram com `NEW_KEY`** — gravados por uma passada anterior. Não são erro nem são regravados: **rodar o apply de novo é idempotente** (retomada após falha parcial).
- `Erros` = **linhas** (ou chaves) com **pelo menos um** campo `enc:` que **não decifra nem com `OLD_KEY` nem com `NEW_KEY`** (ou envelope de versão desconhecida, inclusive no `Setting`) → **ilegíveis**. A gravação é **atômica por linha em todos os models**: uma linha com erro **não é gravada**, nem os campos dela que decifrariam (fail-closed; cada linha é um único `UPDATE`). `campos ilegíveis` dá o total de campos por trás dessas linhas.
- `Puladas` = campos sem `enc:` (nulos/texto puro), não afetados.
- Redis: `Em claro` = sessões legadas em JSON puro (lidas em passthrough pela app; a rotação não as toca). `Conflitos` = chaves que a app alterou entre a leitura e a gravação — **não** sobrescritas (compare-and-set). `Sumidas` = chaves que expiraram entre o SCAN e o GET. Os logs nunca mostram valores, só contagens e nomes de chave.
- `Conflitos` (banco) = linhas cujo `UPDATE` compare-and-set não casou (a app mudou a linha entre a leitura e a gravação) — não gravadas; rode de novo.
- `[COBERTURA]` / `divergências` — ver seção 3.1. Divergência = há linha que o script **não viu** (fora das organizações listadas, `organizationId` nulo, policy que esconde linha) → código 2.
- `legíveis / ilegíveis / em_claro` (verify) contam **campos** (ou chaves no Redis). `em_claro` não reprova o verify do `reencrypt`; no `--verify` do **backfill** reprova (são pendentes do backfill).

### Códigos de saída

| Código | Significado |
|---|---|
| `0` | Sem problemas: `Erros: 0`, `Conflitos: 0` e `divergências=0` (rotação) ou `ilegíveis=0` e `divergências=0` (verify; no backfill também `em_claro=0`). |
| `1` | Pré-condição recusada (`[FALHA CRÍTICA]`/`[FALHA]`), **preflight de RLS reprovado** (cobertura não provável — seção 3.1; nada foi lido nem gravado) ou falha de execução (conexão com banco ou **Redis**, inclusive erro de conexão/timeout no `GET` de uma chave `wa-auth:*`, SQL). Nada a interpretar nas contagens. |
| `2` | Dados com problema: `Erros > 0`, `Conflitos > 0` ou **divergência de cobertura** na rotação (**em dry-run e em apply**), `ilegíveis > 0` ou divergência no verify, ou, no backfill, linhas com valor cifrado ilegível (`ilegiveis=`), conflitos, divergências ou (`--verify`) segredos ainda em claro. |

O código de saída é o critério automático; os números continuam sendo registrados (seção 7).

---

## 3. Pré-requisitos

1. **OK explícito do Marcelo** para o ambiente e a janela (registrar data/hora e quem executa).
2. **Role do PostgreSQL** (seção 3.1) com `SELECT`/`UPDATE` em todas as tabelas-alvo e em `"Organization"` — o **dono das tabelas** (o role das migrations/app, `NOSUPERUSER NOBYPASSRLS`, que é o caso padrão) serve; um role de manutenção com `BYPASSRLS` dá contagem global exata. **Antes de cada comando** com o role sem `BYPASSRLS` (e com a escrita congelada), rode `ANALYZE "Contact"; ANALYZE "Setting"; ANALYZE "GoogleWorkspaceConnection"; ANALYZE "ThreeCXConnection"; ANALYZE "ExternalCrmConnection";` — sem isso o preflight aborta (código 1). Acesso também **ao Redis da app** (`REDIS_URL`, o mesmo de `src/lib/queue/redis.ts`); Node.js com `npx tsx`; OpenSSL.
3. **Janela de manutenção com escrita de integrações congelada** (ou app parada) entre o passo 5 e o passo 7: entre o apply e a troca da chave, a app ainda roda com a chave antiga — não consegue ler o que já foi re-cifrado e grava novos valores com a chave antiga (que o passo 6 vai acusar). **Os workers/sockets de WhatsApp precisam estar parados** na mesma janela: o Baileys regrava `wa-auth:<org>:*` continuamente (creds e chaves de sinal), e uma sessão aberta com a chave antiga gera `Conflitos` ou valores sob a chave antiga.
4. Chaves só em memória/gestor de segredos. Nunca imprimir, commitar ou deixar em histórico de shell (use `read -s` ou injeção pelo Infisical/Render).
5. **Backfill de integration settings (se fizer parte da janela):** rode-o **antes** da rotação, ainda com `CREDENTIALS_ENCRYPTION_KEY=<OLD_KEY>`, seguindo o runbook do ADR-010 (dry-run → snapshot → `--apply --snapshot-confirmed=<id>` → dry-run de novo com `a_cifrar=0`). Assim os valores que estavam em texto puro passam a `enc:v1:` com a chave antiga e entram na contagem da rotação.
   ```bash
   # dry-run (padrão; nada gravado). Ler: linhas=, a_cifrar=, linhas_com_chaves_fora_do_catalogo=, ilegiveis=
   DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" \
     npx tsx scripts/security/backfill-integration-settings-encryption.ts
   # grava (só após snapshot e com OK do Marcelo)
   DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" \
     npx tsx scripts/security/backfill-integration-settings-encryption.ts --apply --snapshot-confirmed="<SNAPSHOT_ID>"
   # verificação (somente leitura): exige ilegiveis=0 e em_claro=0, senão código 2
   DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" \
     npx tsx scripts/security/backfill-integration-settings-encryption.ts --verify
   ```
   O backfill também confere se os valores `enc:` existentes decifram com a `CREDENTIALS_ENCRYPTION_KEY` informada: linha com valor ilegível não é gravada, entra em `ilegiveis=` e o script sai com código 2 (chave errada no env ou rotação incompleta — pare e investigue).
   Se o backfill não for rodado, nada quebra: texto puro continua lido em passthrough e é recifrado na próxima gravação (com a chave vigente).

### 3.1 RLS, role e prova de cobertura (PR #107, B1 do Agente 24)

As tabelas-alvo têm RLS com `FORCE ROW LEVEL SECURITY` (vale também para o dono). Há dois tipos de policy:

| Policy | Tabelas |
|---|---|
| **só tenant** (`"organizationId" = app.current_tenant_id`, **sem** cláusula de bypass) | `Contact`, `GoogleWorkspaceConnection`, `ThreeCXConnection`, `ExternalCrmConnection`, `Setting` |
| tenant **ou** `app.bypass_rls = 'on'` | `BitrixConnection`, `OmieConnection`, `SlackConnection`, `StripeConnection`, `VoiceCallLog`, `VoiceHubConnection`, `CopilotoTranscriptSegment`, `Organization` |
| `userId` de um usuário do tenant **ou** bypass | `account` |

Até o #107 o script lia com `app.bypass_rls=on` e **sem tenant**: nas tabelas "só tenant" via **0 linhas** e terminava com código 0 — com `Contact` inteiro ainda sob a chave antiga. Agora:

1. **Preflight** (logado, antes de ler dados): `current_user`, `rolsuper`, `rolbypassrls` e, por tabela, RLS/FORCE, se a RLS se aplica ao role, se a policy admite bypass, coluna `organizationId`, privilégios `SELECT`/`UPDATE` e `reltuples`. Cobertura não provável → **aborta com código 1** (fail-closed): tabela inexistente, sem privilégio, model "por organização" sem `organizationId`, tabela sem tenant cuja policy não admite bypass, ou contagem global só por estimativa com tabela nunca analisada (`reltuples=-1`).
2. **Organizações** listadas por `SELECT id FROM "Organization"` (policy admite bypass).
3. **Uma transação por organização × model** com `set_config('app.current_tenant_id', <org>, true)` e **sem** bypass; `account` (sem `organizationId`) numa transação com bypass (a policy dele admite). Falha no meio desfaz só aquela organização/model; não há transação entre models (rode de novo — é idempotente).
4. **Contagem independente**: por organização, `count(*)` sob o mesmo tenant (e a visibilidade da policy) contra as linhas processadas; e **global**: `count(*)` exato quando o role tem `BYPASSRLS` (ou a RLS não se aplica), `count(*)` com bypass quando a policy admite (`exact-bypass`), ou `pg_class.reltuples` (`estimate`) nas tabelas "só tenant" com role sem `BYPASSRLS` — exato até 30 000 linhas, tolerância de 2% acima disso. Diferença = **divergência, código 2** (ex.: `Setting` com `organizationId` nulo, invisível a todo tenant).
5. `UPDATE` com compare-and-set e filtro `"organizationId" = <org>`; `--verify` e dry-run em transações **READ ONLY**.

**Role recomendado:** o dono das tabelas (role da app/migrations) com a escrita congelada e `ANALYZE` logo antes; ou um role de manutenção com `BYPASSRLS` + `SELECT`/`UPDATE` nas tabelas-alvo (contagem global exata, dispensa o `ANALYZE`). **Não** é preciso superusuário. Registre no log da janela o bloco `[PREFLIGHT]`.

Validado em Postgres 17 efêmero com **todas** as migrations e um role `NOSUPERUSER NOBYPASSRLS` dono das tabelas (`tests/container/reencryptCredentialsRls.test.ts`; roda com `RLS_PG_ADMIN_URL=<superuser de um PG descartável>` ou `RUN_INFRA_TESTS=1 npm run test:containers`). **Nunca** aponte esse teste para um banco real.

---

## 4. Procedimento passo a passo

### Passo 1 — Gerar a nova chave

```bash
read -rs OLD_KEY   # cole a chave ATUAL (a que está em CREDENTIALS_ENCRYPTION_KEY) — não ecoa
NEW_KEY=$(openssl rand -base64 32)
export OLD_KEY NEW_KEY
```

Guarde `NEW_KEY` no gestor de segredos (como valor **pendente**, ainda não ativo) antes de seguir — perder a `NEW_KEY` depois do apply equivale a perder os dados.

### Passo 2 — Dry-run explícito com contagem esperada

```bash
# role sem BYPASSRLS: ANALYZE das tabelas "só tenant" logo antes (seção 3.1)
psql "<DB_URL>" -c 'ANALYZE "Contact"; ANALYZE "Setting"; ANALYZE "GoogleWorkspaceConnection"; ANALYZE "ThreeCXConnection"; ANALYZE "ExternalCrmConnection";'
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --dry-run
REDIS_URL="<REDIS_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --target=redis-wa-auth --dry-run
```

Critério de aceite:
- **código de saída 0 nos dois comandos** (`echo $?`); cabeçalho `Modo: 🔍 DRY-RUN` e final `[Modo: DRY-RUN]`;
- `[PREFLIGHT] ✅ cobertura provável` e `divergências=0` em todo `[COBERTURA]`; `Organizações: <n>` igual ao total de organizações; `Contact` com `Total linhas` > 0 se a base tem contatos (0 em `Contact` com contatos na base = cobertura quebrada: pare);
- **`Erros: 0` em todos os models, no `Setting` e no Redis.** Qualquer erro (código 2) = valor que já não decifra com a chave atual: **pare** e investigue (não há como rotacioná-lo; no Redis, a alternativa é apagar a sessão daquela organização e ler o QR de novo, com OK do Marcelo);
- **anote a contagem esperada** `Re-criptografadas` por model, do `Setting` e do Redis (ex.: `BitrixConnection=12, Contact=3400, Setting=27, wa-auth=5400 …`). Ela é a referência dos passos 5 e 6. A contagem do Redis é aproximada (sessões expiram/mudam), mas com os workers parados deve ficar estável.

### Passo 3 — Snapshot do banco (pré-requisito do apply)

Tire um snapshot/backup **imediatamente antes** do apply (RDS snapshot/PITR, snapshot do provedor ou `pg_dump -Fc`) e **anote o id** (`<SNAPSHOT_ID>`) no registro da janela. Confirme que o snapshot terminou e é restaurável. Sem esse id o `--apply` é recusado.

**Redis:** com os workers de WhatsApp já parados, tire também um snapshot do Redis (`BGSAVE` e cópia do RDB, backup/export do provedor, ou um export das chaves `wa-auth:*` com `DUMP`+`PTTL` feito por SCAN) e anote o id (`<REDIS_SNAPSHOT_ID>`). O `--target=redis-wa-auth --apply` exige esse id em `--snapshot-confirmed`.

### Passo 4 — (Opcional) dry-run só do `Setting`

Para conferir isoladamente os segredos por campo de integração:

```bash
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --model=Setting
```

### Passo 5 — Apply (re-cifra OLD_KEY → NEW_KEY)

```bash
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --apply --snapshot-confirmed="<SNAPSHOT_ID>"
```

- Sem `--model` cobre todos os models **e** o `Setting`. Se a rotação for feita por partes (`--model=<Model>`), repita o comando para **cada** model e para `--model=Setting` — nenhum pode ficar de fora.
- Confira: `Snapshot confirmado: <SNAPSHOT_ID>`, `Modo: 🚀 LIVE`, `[Modo: LIVE]`, `Re-criptografadas` igual à contagem do passo 2 e `Erros: 0`.
- Código de saída **0**. Código 2 = alguma linha ilegível ficou sem gravar: **não troque a chave**; investigue (ou rollback).
- O apply grava linha a linha (cada linha num único `UPDATE` compare-and-set, nunca parcial), numa transação por organização × model. Se abortar no meio, **não troque a chave**: vá ao rollback (seção 6) ou rode de novo o mesmo apply — é **idempotente**: o que já foi re-cifrado aparece em `Já em NEW_KEY` e não é tocado, as restantes são re-cifradas, e o código é 0 se não houver erro real — e siga para o passo 6, que é o critério real.

### Passo 5b — Apply no Redis (sessões WhatsApp/Baileys)

```bash
REDIS_URL="<REDIS_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --target=redis-wa-auth --apply --snapshot-confirmed="<REDIS_SNAPSHOT_ID>"
```

- Percorre `wa-auth:*` com `SCAN` (nunca `KEYS`), re-cifra cada valor `enc:v1:` OLD→NEW e grava com um compare-and-set atômico (Lua) que **preserva o TTL** restante. Valores em claro (legado) ficam como estão.
- Aceite: código 0, `Erros: 0`, `Conflitos: 0`, `Re-criptografadas` ≈ contagem do passo 2. `Conflitos > 0` = a app gravou durante o apply (workers não estavam parados): pare os workers e rode de novo (as chaves já rotacionadas aparecem em `Já em NEW_KEY` — o critério real é o passo 6).
- **Alternativa se o alvo Redis não puder ser rodado** (sem acesso ao Redis, sem snapshot, ou decisão do Marcelo): depois do passo 7, apagar `wa-auth:<org>:*` de todas as organizações e **pedir a todas que leiam o QR de novo**. Essa decisão precisa estar no registro da janela antes do passo 7; sem ela, trocar a chave deixa todas as sessões ilegíveis.

### Passo 6 — VERIFICAÇÃO OBRIGATÓRIA (antes de trocar `CREDENTIALS_ENCRYPTION_KEY`)

> [!CAUTION]
> **Não pule este passo.** Ele é a única prova de que o banco e o Redis estão de fato sob a `NEW_KEY`. Nada aqui grava.

**6a — `--verify` sob a NEW_KEY: 0 ilegíveis.** Somente leitura, sem `OLD_KEY`/`NEW_KEY` de rotação nem snapshot; a chave a verificar vem de `--key-env` (ou da própria `CREDENTIALS_ENCRYPTION_KEY`):

```bash
VERIFY_KEY="$NEW_KEY" DATABASE_URL="<DB_URL>" \
  npx tsx scripts/security/reencrypt-credentials.ts --verify --key-env=VERIFY_KEY
VERIFY_KEY="$NEW_KEY" REDIS_URL="<REDIS_URL>" \
  npx tsx scripts/security/reencrypt-credentials.ts --verify --key-env=VERIFY_KEY --target=redis-wa-auth
```

Aceite: **código 0 nos dois**, `ilegíveis=0` e `divergências=0` em todos os models, no `Setting` e em `wa-auth:*`; `legíveis` ≈ campos da contagem do passo 2. `em_claro` é informativo (texto puro legado; o backfill trata o `Setting`). Código 2 = algum valor não decifra com a `NEW_KEY`: **não troque a chave**.

**6b — cross-check: 0 pendentes sob a OLD_KEY.** Dry-run na direção original (continua útil: prova que **nada** ficou sob a chave antiga, inclusive valores que a app gravou durante a janela):

```bash
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$NEW_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --dry-run
REDIS_URL="<REDIS_URL>" CREDENTIALS_ENCRYPTION_KEY="$NEW_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --target=redis-wa-auth --dry-run
```

Aceite: **`Re-criptografadas: 0` em todos os models, no `Setting` e no Redis**, com os valores já rotacionados em `Já em NEW_KEY` e **código 0**. (Até o #107, esses valores apareciam como `Erros` e este comando saía com 2 por definição; agora `Erros > 0` aqui é um valor que não decifra com nenhuma das duas chaves: **pare**.)

Se 6a sair com código ≠ 0 ou 6b tiver `Re-criptografadas` > 0: **não troque a chave.** Repita o passo 5/5b (com novo snapshot) ou faça o rollback.

### Passo 7 — Troca da chave e deploy (só depois do passo 6 aprovado)

1. No Infisical / Render (Environment), atualize `CREDENTIALS_ENCRYPTION_KEY` para o valor da `NEW_KEY`.
2. Dispare o redeploy da aplicação, religue os workers de WhatsApp e libere a escrita de integrações. (Se a alternativa do QR foi a escolhida no passo 5b, apague agora `wa-auth:<org>:*` e avise as organizações.)
3. Guarde a `OLD_KEY` em cofre, **fora do ambiente da app**, até o fim do período de rollback (seção 6); depois destrua-a.

---

## 5. Validação pós-deploy

**Positiva (nova chave):**
```bash
# Consulta a um contato ou credencial existente (deve decifrar sem erro)
curl -s -H "Authorization: Bearer <TOKEN_ADMIN>" https://<APP_URL>/api/contacts?limit=1
```
- Logs da app sem `Falha ao decifrar credencial` nem `IntegrationConfigUnreadableError` (HTTP 422 de integração ilegível, ADR-010).
- Uma integração por tipo (Bitrix, Google, Slack…) responde normalmente.

- Uma sessão WhatsApp por organização de amostra reconecta sem pedir QR.

**Negativa (chave antiga invalidada):** o passo 6b já comprova que a `OLD_KEY` não decifra mais nenhum valor (`Re-criptografadas: 0`). Opcionalmente, com um envelope de amostra do banco:
```ts
import { decryptCredentialSync } from './src/lib/security/credentialCrypto.js';
// Deve lançar erro: 'Falha na autenticação/decriptografia da credencial'
decryptCredentialSync(sampleCipherFromDb, OLD_KEY);
```

---

## 6. Rollback

| Situação | Ação |
|---|---|
| Falha no passo 2 (dry-run com `Erros`, código 2) | Nada foi gravado. Não prossiga; investigue os valores ilegíveis. |
| Falha no passo 5b ou 6 só no Redis, **chave ainda não trocada** | Restaure o snapshot do Redis `<REDIS_SNAPSHOT_ID>` (ou rotação reversa `--target=redis-wa-auth` com papéis invertidos e novo snapshot). Os workers continuam parados até o 6 passar. |
| Falha no passo 5 ou 6, **chave ainda não trocada** | A app continua com `CREDENTIALS_ENCRYPTION_KEY=<OLD_KEY>`. **Restaure o snapshot `<SNAPSHOT_ID>`** do passo 3 (padrão seguro; a janela congelada garante que nada se perde). Alternativa sem restore: rotação reversa — novo snapshot, `OLD_KEY=<NEW_KEY> NEW_KEY=<OLD_KEY> CREDENTIALS_ENCRYPTION_KEY=<OLD_KEY>` com `--apply --snapshot-confirmed=<novo-id>`, seguida do passo 6 com os papéis invertidos. |
| Problema **depois** do passo 7 | Volte `CREDENTIALS_ENCRYPTION_KEY` para a `OLD_KEY` **e** desfaça os dados: rotação reversa (preserva o que foi gravado depois do deploy) com novo snapshot, `--apply --snapshot-confirmed=<novo-id>` e verificação 6a/6b invertida; ou restauração do snapshot `<SNAPSHOT_ID>` (perde gravações posteriores). Nunca volte só a env sem desfazer os dados, nem o contrário. |

Toda execução de rollback em ambiente real também depende do OK do Marcelo.

---

## 7. Registro de Conclusão

- Registrar no log de auditoria interno: ambiente, data/hora, operador, OK do Marcelo, `<SNAPSHOT_ID>`, `<REDIS_SNAPSHOT_ID>` (ou a decisão de re-scan do QR), contagens e códigos de saída dos passos 2, 5, 5b, 6a e 6b.
- Documentar o SHA-256 da nova chave (nunca a chave) no registro de governança de chaves.
