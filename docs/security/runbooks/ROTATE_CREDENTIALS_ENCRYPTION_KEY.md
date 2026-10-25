# Runbook — Rotação da Chave Mestra de Criptografia em Repouso (`CREDENTIALS_ENCRYPTION_KEY`)

**ID:** RB-SEC-010  
**Criticidade:** Tier 0 (Crítico / LGPD / Integridade de Banco)  
**Propriedade:** Agente 15 (Segurança Aplicada) em coordenação com Agente 01/01A (Dados)  
**Status:** Operacional — revisado na Onda 52 (PR #102) para o contrato atual do `reencrypt-credentials.ts` (dry-run por padrão, `--apply` + `--snapshot-confirmed=<id>`).  
**Referências:** [`docs/ADR/ADR-010-integration-settings-at-rest.md`](../../ADR/ADR-010-integration-settings-at-rest.md) (itens 9–10 e Runbook), [`scripts/security/credential-script-guards.ts`](../../../scripts/security/credential-script-guards.ts), [`scripts/security/reencrypt-credentials.ts`](../../../scripts/security/reencrypt-credentials.ts), [`scripts/security/backfill-integration-settings-encryption.ts`](../../../scripts/security/backfill-integration-settings-encryption.ts).

> [!IMPORTANT]
> **Execução em qualquer ambiente (staging, produção ou qualquer banco com dados reais) depende do OK explícito do Marcelo**, registrado antes da janela. Nenhum agente executa este runbook por conta própria, e "o usuário concordou", repassado por outro agente, não vale como OK.

> [!WARNING]
> **DRY-RUN É O PADRÃO.** `reencrypt-credentials.ts` (e o backfill) **só gravam com `--apply` explícito E `--snapshot-confirmed=<id>`**. Rodar **sem `--apply` não altera nada no banco**, mesmo que o log termine em `✅ Concluído com sucesso.`: confira sempre `Modo: 🚀 LIVE` no cabeçalho e `[Modo: LIVE]` no final. Até a Onda 52 o padrão era LIVE; a versão antiga deste runbook rodava o passo "Live" sem `--apply`, ou seja, **fazia um dry-run silencioso**, e em seguida trocava a chave, deixando **todas** as credenciais ilegíveis. Por isso o passo 6 (verificação) é **obrigatório** antes do passo 7 (troca da chave).

> [!CAUTION]
> **Risco de corrupção de dados:** trocar `CREDENTIALS_ENCRYPTION_KEY` no ambiente **sem re-cifrar antes os registros do banco e verificar** torna os dados existentes indecifráveis, quebrando integrações ativas e leituras de PII.

---

## 1. Contexto e Motivação

`CREDENTIALS_ENCRYPTION_KEY` é a chave simétrica de 256 bits (AES-256-GCM, envelope `enc:v1:`) que cifra credenciais e PII em repouso. O `reencrypt-credentials.ts` rotaciona (OLD_KEY → NEW_KEY) os campos `enc:v1:` de:

- `GoogleWorkspaceConnection` (`accessToken`, `refreshToken`)
- `BitrixConnection` (`webhookUrl`, `webhookSecret`)
- `ThreeCXConnection` (`apiKey`, `apiSecret`)
- `VoiceHubConnection` (`apiKey`, `webhookSecret`)
- `SlackConnection` (`webhookUrl`, `botToken`), `StripeConnection` (`secretKey`, `webhookSecret`), `OmieConnection` (`appKey`, `appSecret`), `ExternalCrmConnection` (`config`)
- `Account` (`accessToken`, `refreshToken`, `idToken`)
- `Contact` (`email`, `phone`, `whatsapp`)
- `VoiceCallLog` (`transcript`, `summary`, `recordingUrl`)
- **`Setting`** (`key = integration.*` e a chave legada `bitrix_webhook_url`): campos secretos **por campo** dentro do JSON de `Setting.value` (ADR-010). Processado organização por organização com `app.current_tenant_id`. Pode ser isolado com `--model=Setting`.

Valores **sem** prefixo `enc:v1:` (texto puro legado) **não** são tocados pela rotação: no `Setting` eles são trabalho do backfill `backfill-integration-settings-encryption.ts` (ver passo 3).

O `enc:v1` não tem key-id: a rotação é **offline** (OLD_KEY → NEW_KEY numa janela). Rotação online/key-id está adiada para a v2 (ADR-010, #33).

---

## 2. Contrato dos scripts (nomes exatos)

Checado por `credential-script-guards.ts` **antes de abrir conexão** com o banco (o script aborta com `[FALHA CRÍTICA]`):

| Item | Regra |
|---|---|
| `DATABASE_URL` | obrigatória. |
| `CREDENTIALS_ENCRYPTION_KEY` | obrigatória e **explícita** no env (base64 de 32 bytes), em **qualquer** `NODE_ENV`; sem fallback para a chave de dev. Na rotação, tem de ser **igual a `OLD_KEY` ou a `NEW_KEY`** (pega ambiente trocado). |
| `OLD_KEY`, `NEW_KEY` | obrigatórias e explícitas (base64 de 32 bytes), **diferentes** entre si. Sem fallback entre elas nem para `NEW_CREDENTIALS_ENCRYPTION_KEY`. |
| (sem flag) | **dry-run** — nada é gravado. |
| `--apply` | grava. Exige `--snapshot-confirmed=<id>`. |
| `--snapshot-confirmed=<id>` | id do snapshot tirado imediatamente antes. Vazio ou flag sem valor é recusado; se repetida, vale a última. |
| `--dry-run` | aceito (é o padrão); `--apply` + `--dry-run` juntos são **recusados**. |
| `--model=<Model>` | filtra um model (ex.: `--model=Setting`, `--model=BitrixConnection`). Sem filtro = todos os models **e** o `Setting`. |

Saída por model (o que este runbook chama de contagem):

```
Processando Model: <Model> (campos: ...)
  ↳ Total linhas: <n> | Re-criptografadas: <r> | Puladas: <p> | Erros: <e>
Processando Model: Setting (integration.* + bitrix_webhook_url, por campo)
  ↳ Total linhas: <n> | Re-criptografadas: <r> | Erros: <e>
✅ Concluído com sucesso. [Modo: DRY-RUN|LIVE]
```

- `Re-criptografadas` = linhas com pelo menos um campo `enc:v1:` que **decifra com `OLD_KEY`** (no dry-run: linhas que *seriam* gravadas) → **pendentes**.
- `Erros` = campos `enc:v1:` que **não decifram com `OLD_KEY`** (no `Setting`, linhas) → **ilegíveis** para a chave informada como `OLD_KEY`. Linhas com erro **nunca** são gravadas (fail-closed).
- `Puladas` = campos sem `enc:v1:` (nulos/texto puro), não afetados.
- **O script termina com código 0 e `✅ Concluído com sucesso.` mesmo com `Erros > 0`.** O critério de aceite é sempre ler os números, não o código de saída.

---

## 3. Pré-requisitos

1. **OK explícito do Marcelo** para o ambiente e a janela (registrar data/hora e quem executa).
2. Acesso ao PostgreSQL com permissão de escrita; Node.js com `npx tsx`; OpenSSL.
3. **Janela de manutenção com escrita de integrações congelada** (ou app parada) entre o passo 5 e o passo 7: entre o apply e a troca da chave, a app ainda roda com a chave antiga — não consegue ler o que já foi re-cifrado e grava novos valores com a chave antiga (que o passo 6 vai acusar).
4. Chaves só em memória/gestor de segredos. Nunca imprimir, commitar ou deixar em histórico de shell (use `read -s` ou injeção pelo Infisical/Render).
5. **Backfill de integration settings (se fizer parte da janela):** rode-o **antes** da rotação, ainda com `CREDENTIALS_ENCRYPTION_KEY=<OLD_KEY>`, seguindo o runbook do ADR-010 (dry-run → snapshot → `--apply --snapshot-confirmed=<id>` → dry-run de novo com `a_cifrar=0`). Assim os valores que estavam em texto puro passam a `enc:v1:` com a chave antiga e entram na contagem da rotação.
   ```bash
   # dry-run (padrão; nada gravado). Ler: linhas=, a_cifrar=, linhas_com_chaves_fora_do_catalogo=
   DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" \
     npx tsx scripts/security/backfill-integration-settings-encryption.ts
   # grava (só após snapshot e com OK do Marcelo)
   DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" \
     npx tsx scripts/security/backfill-integration-settings-encryption.ts --apply --snapshot-confirmed="<SNAPSHOT_ID>"
   ```
   Se o backfill não for rodado, nada quebra: texto puro continua lido em passthrough e é recifrado na próxima gravação (com a chave vigente).

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
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$OLD_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --dry-run
```

Critério de aceite:
- cabeçalho `Modo: 🔍 DRY-RUN` e final `[Modo: DRY-RUN]`;
- **`Erros: 0` em todos os models e no `Setting`.** Qualquer erro = valor que já não decifra com a chave atual: **pare** e investigue (não há como rotacioná-lo);
- **anote a contagem esperada** `Re-criptografadas` por model e do `Setting` (ex.: `BitrixConnection=12, Contact=3400, Setting=27 …`). Ela é a referência dos passos 5 e 6.

### Passo 3 — Snapshot do banco (pré-requisito do apply)

Tire um snapshot/backup **imediatamente antes** do apply (RDS snapshot/PITR, snapshot do provedor ou `pg_dump -Fc`) e **anote o id** (`<SNAPSHOT_ID>`) no registro da janela. Confirme que o snapshot terminou e é restaurável. Sem esse id o `--apply` é recusado.

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
- O apply grava linha a linha (não é uma transação única). Se abortar no meio, **não troque a chave**: vá ao rollback (seção 6) ou rode de novo o mesmo apply (linhas já re-cifradas aparecem como `Erros` e não são tocadas; as restantes são re-cifradas) e siga para o passo 6.

### Passo 6 — VERIFICAÇÃO OBRIGATÓRIA (antes de trocar `CREDENTIALS_ENCRYPTION_KEY`)

> [!CAUTION]
> **Não pule este passo.** Ele é a única prova de que o banco está de fato sob a `NEW_KEY`. Ambos os comandos são dry-run (sem `--apply`).

**6a — 0 ilegíveis com a NEW_KEY.** Dry-run decifrando com a `NEW_KEY` (passada como `OLD_KEY`; a `NEW_KEY` do comando é só o destino simulado):

```bash
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$NEW_KEY" OLD_KEY="$NEW_KEY" NEW_KEY="$OLD_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --dry-run
```

Aceite: **`Erros: 0` em todos os models e no `Setting`** (todo `enc:v1:` decifra com a `NEW_KEY`) e `Re-criptografadas` igual à contagem do passo 2.

**6b — 0 pendentes sob a OLD_KEY.** Dry-run na direção original:

```bash
DATABASE_URL="<DB_URL>" CREDENTIALS_ENCRYPTION_KEY="$NEW_KEY" OLD_KEY="$OLD_KEY" NEW_KEY="$NEW_KEY" \
  npx tsx scripts/security/reencrypt-credentials.ts --dry-run
```

Aceite: **`Re-criptografadas: 0` em todos os models e no `Setting`** (nada mais decifra com a chave antiga). Aqui `Erros` > 0 é o esperado (são os valores já sob a `NEW_KEY`).

Se 6a tiver `Erros` > 0 ou 6b tiver `Re-criptografadas` > 0: **não troque a chave.** Repita o passo 5 (com novo snapshot) ou faça o rollback.

### Passo 7 — Troca da chave e deploy (só depois do passo 6 aprovado)

1. No Infisical / Render (Environment), atualize `CREDENTIALS_ENCRYPTION_KEY` para o valor da `NEW_KEY`.
2. Dispare o redeploy da aplicação e libere a escrita de integrações.
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
| Falha no passo 2 (dry-run com `Erros`) | Nada foi gravado. Não prossiga; investigue os valores ilegíveis. |
| Falha no passo 5 ou 6, **chave ainda não trocada** | A app continua com `CREDENTIALS_ENCRYPTION_KEY=<OLD_KEY>`. **Restaure o snapshot `<SNAPSHOT_ID>`** do passo 3 (padrão seguro; a janela congelada garante que nada se perde). Alternativa sem restore: rotação reversa — novo snapshot, `OLD_KEY=<NEW_KEY> NEW_KEY=<OLD_KEY> CREDENTIALS_ENCRYPTION_KEY=<OLD_KEY>` com `--apply --snapshot-confirmed=<novo-id>`, seguida do passo 6 com os papéis invertidos. |
| Problema **depois** do passo 7 | Volte `CREDENTIALS_ENCRYPTION_KEY` para a `OLD_KEY` **e** desfaça os dados: rotação reversa (preserva o que foi gravado depois do deploy) com novo snapshot, `--apply --snapshot-confirmed=<novo-id>` e verificação 6a/6b invertida; ou restauração do snapshot `<SNAPSHOT_ID>` (perde gravações posteriores). Nunca volte só a env sem desfazer os dados, nem o contrário. |

Toda execução de rollback em ambiente real também depende do OK do Marcelo.

---

## 7. Registro de Conclusão

- Registrar no log de auditoria interno: ambiente, data/hora, operador, OK do Marcelo, `<SNAPSHOT_ID>`, contagens dos passos 2, 5, 6a e 6b.
- Documentar o SHA-256 da nova chave (nunca a chave) no registro de governança de chaves.
