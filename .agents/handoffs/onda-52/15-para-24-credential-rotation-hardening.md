- De: 15 — Segurança Aplicada
- Para: 24 — Revisão Independente (revisor técnico: 06 — Integrações e Bitrix; 01 para o desenho de schema da v2)
- Onda: 52
- Status: aberto. Branch `agente/15-credential-rotation-hardening`, a partir da `main` em `239a6675` (#101, por cima do merge do #102 `5dd480f8`). **Sem PR** (abertura só pelo 08A depois da revisão do 24).
- Prioridade: alto (condição do 24 para qualquer rotação da `CREDENTIALS_ENCRYPTION_KEY`)
- Referências: #102 (RB-SEC-010), `docs/ADR/ADR-010-integration-settings-at-rest.md`, ADR-006, #33 (KMS / F11, Agente 21)

## Regra de execução

> **Execução em qualquer ambiente só acontece com OK direto do Marcelo e snapshot confirmado.**
>
> Isto vale para os dois scripts (`reencrypt-credentials.ts`, `backfill-integration-settings-encryption.ts`), em todos os modos que gravam (`--apply`, incluindo `--target=redis-wa-auth`), em dev compartilhado, staging e produção. "O usuário concordou", vindo de um agente, não é OK. Nada foi executado contra banco ou Redis reais nesta entrega: só testes unitários com mocks (`pg` em memória e Redis fake).

## Problema (condições do 24 após o #102)

1. A rotação terminava com código 0 e "✅ Concluído com sucesso" mesmo com `Erros > 0`. Não havia verificação somente leitura (o passo 6a do runbook era um dry-run de rotação "ao contrário").
2. O runbook (linha 66 do #102) dizia que uma linha com campo ilegível não era gravada, mas fora do `Setting` o script regravava os campos legíveis da mesma linha (chaves misturadas na linha).
3. As sessões WhatsApp/Baileys (`wa-auth:<org>:*` no Redis, cifradas com a mesma chave) ficavam fora da rotação: depois da troca, todas as sessões ficariam ilegíveis.
4. `SECRET_ROTATION_POLICY.md` tinha links `file:///c:/…` (quebrados fora da máquina de quem escreveu).
5. A v2 do ADR-010 era só uma lista P1/P2/P3.

## Alteração feita

**Código (`scripts/security/`):**
- **Novo `credential-envelope.ts`:** envelope `enc:v1` com chave explícita (`encryptWithKey`/`decryptWithKey`), `classifyValue` (`readable|unreadable|plaintext|empty`; `enc:` de versão desconhecida = ilegível, fail-closed), contadores e `EXIT_DATA_ISSUES = 2`.
- **`credential-script-guards.ts`:** `isVerifyMode`, `parseKeyEnvName` (`^[A-Z][A-Z0-9_]*$`), `assertVerifyPreconditions` (recusa `--apply`; chave explícita de `CREDENTIALS_ENCRYPTION_KEY` ou `--key-env=NOME`; não pede `NEW_KEY` nem snapshot), `parseReencryptScope` (`--target=db|redis-wa-auth`; `--model=` vazio ou desconhecido recusado; `--model` só com `db`), `requireRedisUrl`. Os guards de backfill/rotação recusam `--verify`.
- **`reencrypt-credentials.ts` (reescrito):**
  - `main()` devolve o código; o bloco de entrada seta `process.exitCode`. **0** ok; **1** pré-condição/falha; **2** `Erros > 0` ou conflitos (dry-run **e** apply) ou ilegíveis no `--verify`.
  - **Atômico por linha** (`planRowReencrypt`): se qualquer campo da linha for ilegível com a `OLD_KEY`, a linha inteira não é gravada, em todos os models; cada linha vai num único `UPDATE`. `Erros` = linhas não gravadas.
  - `--verify`: legíveis / ilegíveis / em claro por model, `Setting` (por org, `app.current_tenant_id`) e Redis. Em claro é informativo aqui (o backfill é quem trata).
  - `--target=redis-wa-auth`: `SCAN MATCH wa-auth:* COUNT` (nunca `KEYS`), dedupe; dry-run por padrão; `--apply` exige `--snapshot-confirmed=<REDIS_SNAPSHOT_ID>`; gravação por compare-and-set em Lua (`GET` igual ao lido → `PTTL` → `SET PX` ou `SET`), que **preserva o TTL** e conta conflito se a chave mudou no meio; chave sumida = `missing`; `WRONGTYPE` = erro; valores em claro legados ficam como estão. Logs só com contagens e até 20 nomes de chave, **nunca valores**.
- **`backfill-integration-settings-encryption.ts`:** confere a legibilidade dos `enc:` existentes com a chave atual (linha com campo ilegível **não é gravada**, contada em `ilegiveis`); `--verify` (código 2 com ilegível **ou** segredo ainda em claro); código 2 se houver linha ilegível no backfill.
- **`integration-settings-targets.ts`:** `classifySettingValue`.

**Testes (`tests/unit/security/`):**
- `credentialScriptGuards.test.ts`: verify, key-env, escopo, `REDIS_URL`.
- **Novo** `reencryptCredentials.test.ts`: `vi.mock('pg')` com banco em memória; atomicidade por linha, gravações por model e `Setting`, verify e códigos de saída de `main` (2/0; pré-condição lança antes de qualquer query).
- **Novo** `reencryptRedisWaAuth.test.ts`: Redis fake (SCAN paginado com duplicata, TTL, `WRONGTYPE`, CAS em `eval`, gancho de conflito); dry-run, apply preservando TTL, idempotência, ilegível com log só de nomes, conflito, chave sumida, verify.
- `integrationSettingsBackfill.test.ts`: `readKey`, `unreadableRows` e verify.

**Docs:**
- `docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md` (RB-SEC-010): tabela de contrato e de códigos de saída; Redis no escopo (pré-requisitos: acesso ao Redis, workers WA parados; snapshot do Redis no passo 3; dry-run Redis no passo 2; novo passo 5b de apply no Redis, com a alternativa de re-scan do QR); **6a = `--verify --key-env=VERIFY_KEY`** (banco e Redis), **6b mantido como cross-check** (dry-run com a `NEW_KEY` como `OLD_KEY`: `Re-criptografadas: 0`, código 2 esperado pelos ilegíveis da chave antiga — o runbook explica); passo 7 reinicia os workers WA e valida a reconexão; rollback do Redis; texto da linha 66 corrigido para a semântica atômica.
- `docs/security/SECRET_ROTATION_POLICY.md`: os 9 links `file:///c:/Github/Birthub-360/docs/security/runbooks/…` → `runbooks/…` (todos os destinos existem); item do reencrypt atualizado.
- `docs/security/runbooks/ROTATE_PII_BLIND_INDEX_KEY.md:22`: o mesmo bug de link `file:///c:/…` (para `backfill-contact-pii.ts`) → caminho relativo.
- `SECURITY_GUIDE.md`, `INCIDENT_RESPONSE.md`: menções ao reencrypt alinhadas.
- `docs/ADR/ADR-010-integration-settings-at-rest.md`: item 10 (hardening), passos do runbook com `--verify`, **seção v2 detalhada** (V2.1–V2.9) e follow-up do `KEYS`.

## Decisões

- **Item 2 (linha 66):** o código foi alinhado ao runbook, não o contrário — atomicidade por linha em todos os models (fail-closed, nada de chave mista na linha). O runbook ganhou a definição exata de `Erros` (linhas não gravadas).
- **Redis:** cobertura implementada (viável): `SCAN` + CAS em Lua (preserva TTL sem depender de `KEEPTTL`, compatível com Redis < 6). Conflitos → código 2 e reexecução. O re-scan do QR fica documentado como plano B (passo 5b), não como caminho principal.
- **`--verify`:** em claro é informativo no reencrypt e falha no backfill (a missão do backfill é zerar o claro).
- **v2 (só documento):** `enc:v2:<kid>:<iv>:<tag>:<ct>` com o DEK embrulhado no **keyring** (`TenantDataKey`), não inline — permite crypto-shredding por tenant sem destruir a KEK compartilhada, evita ~200 bytes por campo e torna a rotação da KEK um re-wrap. AAD = `b360:enc:v2 | kid | tenantId | model | field` com prefixo de tamanho. A tabela nova exige migration própria (revisão do 01); **este PR não muda o schema Prisma**. Shredding nos backups: opção (A) após retenção ou (B) KEK por tenant — decidir com o F11 do #33.

## Validação (local, Node 22.23.3, 2026-10-25 ~19:45 UTC-3)

- `tsc --noEmit` (projeto): 88 erros, **mesmo conjunto** da `main` `239a6675` (diff ordenado vazio). tsc standalone com os scripts de `scripts/security/` (que o tsconfig do projeto não cobre): 0 erros.
- `biome check` nos 5 scripts tocados: 0 erros (os testes estão fora do `includes` do biome).
- vitest (`vitest.unit.config.ts`): `tests/unit/security/` + `secretFields.unit.test.ts`, `credentialCrypto.test.ts`, `whatsapp.service.test.ts`, `useRedisAuthState.test.ts`, `whatsapp.service.lock.test.ts`: **14 arquivos / 184 testes ok**.
- gitleaks 8.24.3 com o `.gitleaks.toml` da branch em `--no-merges --first-parent 239a6675..HEAD`: ver o corpo do PR.

## Fora do escopo / follow-ups

- `src/features/integrations/whatsapp/whatsapp.service.ts:284` ainda usa `KEYS wa-auth:<org>:*` (bloqueia o Redis em base grande) → trocar por `SCAN` (06/15).
- Envelope duplicado: `scripts/security/credential-envelope.ts` repete o `enc:v1` de `secretFields`/`credentialCrypto` porque os módulos da app têm fallback de chave de dev; a unificação está no V2.7 do ADR-010.
- Implementação da v2: depende do #33 (KMS) e de OK do Marcelo por fase (V2.9).

## Pedido ao 24

Revisar: códigos de saída e guards; atomicidade por linha; o CAS do Redis (TTL, conflito, `WRONGTYPE`) e o que vai para o log; o RB-SEC-010 (6a/6b, 5b, códigos); o desenho v2 (formato, AAD, keyring, shredding). Nenhuma execução até OK direto do Marcelo e snapshot confirmado.
