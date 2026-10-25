# Veredito Agente 24 — PR #107 (credential-rotation-hardening) @ 67026811

- **PR:** #107 · autor Agente 15 · branch `agente/15-credential-rotation-hardening`
- **Head auditado:** `67026811b2ec4c2a0a70619b2905c2d9085dbb0a` (1 commit sobre a base, 16 arquivos)
- **Base:** main `239a667570e79881b55d5b358713fc6c208a324d`
- **Handoff:** `.agents/handoffs/onda-52/15-para-24-credential-rotation-hardening.md`
- **Data:** 2026-10-25 (America/Sao_Paulo, UTC-3)

## VEREDITO: **REPROVADO @ 67026811**

Os guards, os códigos de saída, o `--verify`, o CAS no Redis e o runbook estão corretos no que fazem. Revisei o código e rodei tudo de verdade em PG17 e Redis 8 efêmeros. Mesmo assim, o critério automático de aceite da rotação (código 0 + `--verify` 6a/6b) dá **falso verde** em dois casos reais, e o operador **perderia dados em silêncio** depois da troca da chave:

1. **B1 (P1, reproduzido):** com um role sem superuser/BYPASSRLS, o FORCE RLS esconde todas as linhas de 4 tabelas-alvo. Rotação e verify veem 0 linhas e saem com código 0.
2. **B2 (P1):** `CopilotoTranscriptSegment.text` é cifrado com a CEK, mas fica fora da rotação e do verify.

Os dois defeitos já existem no main (#102). Como o #107 é declaradamente "a condição antes de qualquer rotação", eles bloqueiam. Qualquer commit novo invalida este veredito.

## 0. Baseline: main 239a6675 em relação a acd6c614

O main 239a6675 é exatamente:

- o #102: merge `5dd480f8`, com tree idêntica a `0d02eaf8`, que aprovei em `f3b1b7af`;
- mais o #101: só `package.json`, `package-lock.json` e `docs/security/AUDIT_WAIVERS.md`, que aprovei em `dee61608`.

Não há nada além disso. O PR tem 1 commit sobre 239a6675. Não altera `prisma/`, workflows, `Dockerfile`, `fly.toml` nem os `scripts` do `package.json`.

## 1. Claims do Agente 15

| # | Claim | Resultado | Evidência |
|---|---|---|---|
| 1 | Códigos de saída: 0 ok, 1 falha crítica, 2 erros/conflitos/ilegíveis | **OK**, com ressalva P3-1 | `reencrypt-credentials.ts:585-595` e `backfill-integration-settings-encryption.ts:320-331`. Exercitado de verdade: apply sem snapshot → 1; Redis inacessível → 1; reaplicar com chave errada → 2 (`/workspace/p107-redis-repro.log`); tabela ausente / crash a meio → 1 |
| 2 | `--verify` é somente leitura | **OK** no código | Nos caminhos de `runVerify` (`reencrypt-credentials.ts:469-511`) e no verify do backfill (`:240-262`) há só SELECT/GET/SCAN. Não roda em transação `READ ONLY` (P3-4) |
| 3 | Atomicidade por linha (runbook:66) e tenancy | **OK** para `Setting`; **FALHA** para os models com RLS sem bypass (B1) | Há um UPDATE por linha (`:214`). `Setting` é tratado por organização, com `app.current_tenant_id` (`:228-267`, backfill `:174-251`). Para os models, `bypass_rls=on` sem tenant (`:544`, `:485`) → B1 |
| 4 | Redis `wa-auth:*`: SCAN, dry-run por padrão, snapshot, Lua CAS com TTL, conflito → 2, padrão de chave, plano B do QR, guards | **OK** (testei de verdade) | Detalhes abaixo |
| 5 | Links `file:///c:/` corrigidos | **OK** em `docs/` | Não sobra nenhum em `docs/`. Os restantes estão em `.agents/` e `EXECUCAO-ONDAS.md`, fora do escopo |
| 6 | ADR-010 v2 só como documento | **OK** | `ADR-010:70` diz "só documento, nada implementado". O PR não muda `src/`, `prisma/` nem migrations. As fases F2/F4 exigem snapshot + OK do Marcelo (`:147`, `:149`) |
| 7 | Runbook coerente de ponta a ponta | **Parcial** | O fluxo é coerente: OK do Marcelo, freeze, backfill antes, dry-run com contagem, snapshot DB+Redis, apply, troca da chave, 6a/6b, rollback e plano B do QR. **Faltam:** (a) exigir um role superuser/BYPASSRLS ou um cruzamento com contagem independente (B1). O pré-requisito `ROTATE_…:106` diz só "permissão de escrita", e o exemplo `:151` (`Contact=3400`) seria exibido como `Contact=0` sem alarme; (b) `CopilotoTranscriptSegment` (B2) |

### Detalhe do claim 4 (Redis), em `redis-server 8.0.2` efêmero na porta 6399

Log: `/workspace/p107-redis-repro.log`.

- O dry-run é o padrão: 3 chaves, 2 a re-cifrar, 1 em claro, código 0.
- `--apply` sem snapshot → `[FALHA CRÍTICA] --apply exige --snapshot-confirmed`, código 1, nada gravado.
- `--apply --snapshot-confirmed=…` → 2 re-cifradas, código 0.
  - O **Lua CAS real** rodou no Redis (não só a emulação JS dos testes) e preservou o TTL: `PTTL creds=598505` (era PX 600000).
  - A chave sem TTL continuou com `-1`.
  - A chave em claro e a chave `other:key` (fora do padrão) ficaram intactas.
- `--verify --key-env=VERIFY_KEY` → 2 legíveis, 0 ilegíveis, código 0.
- Reaplicar com a chave antiga → `Erros=2`, código 2. O fail-closed funciona.
- Redis inacessível → código 1.
- O padrão `wa-auth:*` bate com `useRedisAuthState.ts`, que não usa keyPrefix. O plano B (re-scan do QR) está no runbook.

## 2. Seção dedicada: execução real só com OK do Marcelo + snapshot

| Verificação | Resultado | Evidência |
|---|---|---|
| Nenhum script do `package.json` / `postinstall` / workflow de CI / entrypoint Docker / hook de migration invoca `reencrypt-credentials.ts`, `backfill-integration-settings-encryption.ts` ou `--target=redis-wa-auth` | **OK** | Fiz grep no head inteiro, fora de `docs/`, `.agents/`, testes e `scripts/security/`. A única ocorrência é um comentário em `src/lib/integrations/integrationSettings.repository.ts:15`. O `postinstall` é só `npx prisma generate`. O `CMD` do `Dockerfile` é `npx prisma migrate deploy && exec npm run start`. O `fly.toml` não tem `release_command` que chame os scripts. `.github/workflows` não tem nada. O PR não toca `prisma/migrations` |
| Gravação exige `--apply` **E** `--snapshot-confirmed=<id>` nos 2 scripts e no alvo Redis | **OK** | `credential-script-guards.ts:49` (parse; o valor vazio lança), `:78` (backfill), `:100` (rotação, incluindo o alvo `redis-wa-auth`). Defesa em profundidade no backfill em `:171`. A checagem acontece **antes** de conectar (`backfill:272`, `reencrypt:516`). Exercitado: apply sem snapshot → código 1 no alvo Redis e no DB |
| O padrão é dry-run | **OK** | O modo só vira LIVE com `--apply`. Confirmado nas execuções reais: cabeçalho `🔍 DRY-RUN` e nada gravado |
| Os testes usam só mocks ou DB efêmero | **OK** | `reencryptCredentials.test.ts` usa `vi.mock('pg')` e `DATABASE_URL=postgres://fake.invalid`. `reencryptRedisWaAuth.test.ts` usa um Redis fake em memória. Os testes de guards e do backfill são puros. Nenhum teste lê o ambiente real |
| O runbook exige OK do Marcelo + id do snapshot | **OK** | `ROTATE_CREDENTIALS_ENCRYPTION_KEY.md:10` ("depende do OK explícito do Marcelo… Nenhum agente executa"), `:13` (dry-run padrão / `--apply` + `--snapshot-confirmed`), `:104` (pré-requisito 1), passo 3 (snapshot do banco **e** do Redis, com o id anotado). No ADR-010, `:60` ("só com OK do Marcelo") |
| Códigos de saída e `--verify` cobrem os **dois** scripts | **OK** | O backfill tem `--verify` com `ilegiveis=0` e `em_claro=0` → código 0, senão 2 (`ADR-010:66`). O reencrypt tem verify para DB e Redis. Os dois mapeiam 0/1/2 da mesma forma |
| Ressalvas | **informativo** | (a) `--snapshot-confirmed` é uma declaração: o script não tem como provar que o snapshot existe. O controle é de processo (OK do Marcelo + id anotado), e é o desenho correto. (b) A mensagem do guard no alvo Redis fala em "snapshot/backup do banco"; o ideal seria "do Redis" (cosmético). (c) **B1 torna o `--verify` não confiável como prova** para 4 tabelas. A trava de execução está OK, mas a trava de aceite, não |

Conclusão desta seção: **nada roda contra DB/Redis real sem uma ação manual com `--apply --snapshot-confirmed`**, e o runbook exige o OK do Marcelo e o id do snapshot. Isso está aprovado. O que reprova é o critério de aceite (B1 e B2).

## 3. Testes e CI: evidência real

### CI no head 67026811

- **application gate:** falha em **Type Check**, com 88 erros.
  - Comparei as chaves `arquivo(l,c) TSxxxx` com o main 239a6675: o conjunto é **idêntico**, então não há regressão de tipos.
  - Por isso **Unit, Integration, Build e E2E foram pulados**. O CI **não** rodou os testes novos.
  - É o mesmo padrão do main: no run `40240502830`, o application gate também é failure.
  - Log: `/workspace/p107-gate-clean.log`; tsc em `/workspace/tsc-p107.txt` e `/workspace/tsc-p239.txt`.
- **Release / "Consolidar veredito":** failure, consequência do gate. Igual ao main.
- **trivy, secret scan e CodeQL:** sucesso.
- **Sonar** (run `40241683802`, job `121314625849`): "Run Tests with Coverage" ainda estava em andamento quando consultei. Não acompanhei com watch, então não conta como evidência.

### Local (sem `npm ci`)

O ambiente foi um export do head via `git archive` (não é clone), com `node_modules` linkado do lockfile `acd6c614`, que difere do head só pelo undici do #101. Node 20.19.2 local, contra 22 no CI.

- **4 arquivos novos/alterados do PR: 68/68 passam.** São eles: `integrationSettingsBackfill` 18, `reencryptCredentials` 11, `credentialScriptGuards` 31, `reencryptRedisWaAuth` 8. Log: `/workspace/p107-vitest-4files.log`.
- Diretório de testes de segurança: 9 arquivos, **143/143**. Log: `/workspace/p107-vitest-security.log`.
- O claim "184/184 em 14 arquivos" não foi reproduzido com o mesmo recorte de arquivos. Não é bloqueante, porque os arquivos do PR passam.
- Biome nos 5 arquivos de `scripts/security`: 0 problemas.
- tsc avulso (`--strict`, nodenext) nos 2 scripts: 1 erro, `reencrypt-credentials.ts:448` TS2351 (`new Redis` via `import('ioredis')` default). Em runtime funciona, como mostram as execuções. É P3-6, porque `scripts/` fica fora do `tsconfig` do CI.
- **gitleaks 8.24.3** em `239a6675..67026811`, com o `.gitleaks.toml` e o `.gitleaksignore` do head: 1 commit, **no leaks found**.

### Execução real em PG17 efêmero

- Ambiente: porta 55433, DB `r107`, dono `app_owner` NOSUPERUSER NOBYPASSRLS, com as policies copiadas literalmente das migrations.
- Resultado: dry-run, apply e verify reais. É a reprodução de B1. Log: `/workspace/p107-rls-repro.log`.

## 4. Achados

### B1 — P1 BLOQUEANTE: o FORCE RLS sem cláusula de bypass faz rotação e verify "não verem" 4 tabelas, com código 0

**Onde:**

- `scripts/security/reencrypt-credentials.ts:544`: liga `app.bypass_rls=on` e processa os models sem tenant (SELECT em `:192`, UPDATE em `:214`).
- `:485`: o verify usa o mesmo padrão.

**Por que falha:**

- A migration `20260825120000_scope_rls_bypass_to_bootstrap_allowlist` removeu a cláusula de bypass das policies de `Contact`, `GoogleWorkspaceConnection` e `ThreeCXConnection`.
- A migration `20260923170000` criou `ExternalCrmConnection` só com tenant.
- Todas têm FORCE RLS.
- Resultado: com um role que não é superuser nem BYPASSRLS (o próprio `app_owner`/dono da tabela é afetado pelo FORCE), o SELECT devolve **0 linhas**.

**Reprodução** (`/workspace/p107-rls-repro.log`):

- O dry-run mostra `Contact: Total linhas: 0`.
- O apply com `--snapshot-confirmed` sai com código 0.
- `--verify --key-env=VERIFY_KEY` (chave NOVA) mostra `Contact: legíveis=0 ilegíveis=0`, `✅ VERIFY OK`, código 0.
- Vista como superuser depois do apply: `Contact.c1` **ainda está com o ciphertext da chave ANTIGA**, enquanto `BitrixConnection` (policy com bypass) foi rotacionado.
- Depois da troca da chave, a PII de Contact e as credenciais de GoogleWorkspace, 3CX e ExternalCrm ficariam ilegíveis **sem nenhum sinal**.

**Agravantes:**

- O runbook (`:106`) pede só "permissão de escrita".
- Nenhum script checa `rolsuper`/`rolbypassrls`.
- O próprio repo já tem o padrão correto: `backfill-contact-pii.ts` e o backfill do `Setting` neste PR processam por organização, com `app.current_tenant_id`.

**Correção exigida (qualquer uma, com teste):**

- (a) Processar os models com policy só de tenant **por organização** (como `Setting`), na rotação **e** no verify.
- **ou** (b) Preflight fail-closed: `SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user`; se for falso, código 1 antes de qualquer leitura. Mais o runbook exigindo esse role.
- **E, em qualquer caso:**
  - o verify deve falhar (código 2) se a contagem vista divergir de uma contagem independente, por tenant ou via superuser;
  - um teste de integração em PG efêmero com as policies reais (não só `vi.mock('pg')`) provando que Contact é rotacionado e verificado por um role não-superuser, ou que o script aborta.

### B2 — P1 BLOQUEANTE: `CopilotoTranscriptSegment.text` fora da rotação e do verify

**Onde:**

- `src/lib/crypto/piiFields.ts:77` (`ENCRYPTED_MODEL_FIELDS`): o campo é cifrado com a CEK desde `4354e77f1` (2026-09-13).
- Não aparece em `TARGET_MODELS` (`reencrypt-credentials.ts:73-85`), nem no runbook, nem no verify.
- Depois da rotação, as transcrições ficariam ilegíveis, e o verify daria OK.

**Correção exigida:**

- Incluir o model e o campo em `TARGET_MODELS`. A policy de `20260917180000` tem bypass; se mudar, vale B1.
- Adicionar um **teste de contrato**: todo model/campo de `ENCRYPTED_MODEL_FIELDS`, e de qualquer outra fonte cifrada com `CREDENTIALS_ENCRYPTION_KEY`, deve estar em `TARGET_MODELS`. O ideal é derivar `TARGET_MODELS` de `piiFields.ts`, para não divergir de novo.
- Atualizar o runbook.

### P3 (não bloqueantes; corrigir junto se for barato)

- **P3-1:** um erro de conexão no `GET` do Redis é contado como "erro de dado" (código 2 em vez de 1): `reencrypt-credentials.ts:363-369` e `:408-414`. O SCAN inicial falha corretamente com 1.
- **P3-2:** o UPDATE no DB não tem compare-and-set contra o valor antigo (`:214`, `:259`; backfill `:220`). Há risco de lost update se a app escrever durante o apply. É mitigado pelo freeze do pré-requisito 3 (`ROTATE_…:105`).
- **P3-3:** um valor `enc:` de versão desconhecida no `Setting` é pulado em silêncio (`:115`, `:126`). É inconsistente com `planRowReencrypt` (`:161`), que conta como erro.
- **P3-4:** o verify não roda em `BEGIN TRANSACTION READ ONLY`. Seria uma garantia barata.
- **P3-5:** a rotação não é transacional entre models. Um crash a meio sai com código 1 e escritas parciais (reproduzido com a tabela `Setting` ausente). O runbook cobre a re-execução idempotente, então basta documentar explicitamente.
- **P3-6:** `scripts/` fica fora do `tsconfig` do CI (`include: ["src","server.ts"]`), e há o TS2351 em `:448`. Sugestão: um `tsconfig.scripts.json` no CI.
- **P3-7:** o Lua CAS só é emulado em JS nos testes. Validei de verdade aqui; sugiro um teste opcional com Redis efêmero.
- **P3-8:** o handoff diz "Sem PR", mas o #107 existe.

### Follow-ups listados pelo 15: nenhum bloqueia

- `KEYS` em `whatsapp.service.ts:284` (P3 de performance).
- Shredding de backups (#33 F11).
- Unificação do envelope (V2.7).

## 5. Condições para re-aprovação (novo SHA)

1. Corrigir B1 conforme a seção 4, com teste em PG efêmero usando as policies reais.
2. Corrigir B2, com teste de contrato contra `piiFields.ts`.
3. Runbook: role exigido (ou preflight) e `CopilotoTranscriptSegment` na lista e na contagem.
4. Evidência real de testes no novo SHA:
   - ou o CI chega até Unit/Integration, o que hoje é impossível por causa dos 88 erros de tsc herdados do main;
   - ou um diag do GHA numa branch `agente/gha-diag-pr107-<sha8>` = head novo + **somente** o patch de `ci.yml` equivalente a `d8a7e3a0`, validado por igualdade de tree.
   - Minha reexecução local também vale.
5. Manter tudo o que já está OK na seção 2 (guards, dry-run padrão, nenhuma invocação automática).
