# Runbook — Rotação da Chave Mestra de Criptografia em Repouso (`CREDENTIALS_ENCRYPTION_KEY`)

**ID:** RB-SEC-010  
**Criticidade:** Tier 0 (Crítico / LGPD / Integridade de Banco)  
**Propriedade:** Agente 15 (Segurança Aplicada) em coordenação com Agente 01/01A (Dados)  
**Status:** Operacional

---

## 1. Contexto e Motivação

`CREDENTIALS_ENCRYPTION_KEY` é a chave simétrica de 256 bits (AES-256-GCM) utilizada para cifrar credenciais em repouso persistidas nas tabelas:
- `GoogleWorkspaceConnection` (`accessToken`, `refreshToken`)
- `BitrixConnection` (`webhookUrl`, `webhookSecret`)
- `ThreeCXConnection` (`apiKey`, `apiSecret`)
- `VoiceHubConnection` (`apiKey`, `webhookSecret`)
- `SlackConnection`, `StripeConnection`, `OmieConnection`, `ExternalCrmConnection`
- `Account` (`accessToken`, `refreshToken`, `idToken`)
- `Contact` (`email`, `phone`, `whatsapp`)
- `VoiceCallLog` (`transcript`, `summary`, `recordingUrl`)

> [!CAUTION]
> **Risco de Corrupção de Dados:** Trocar o valor de `CREDENTIALS_ENCRYPTION_KEY` nas variáveis de ambiente **sem re-criptografar previamente os registros do banco** torna todos os dados existentes indecifráveis, quebrando integrações ativas e leituras de PII.

---

## 2. Pré-requisitos e Ferramentas

- Acesso ao banco de dados PostgreSQL com permissão de escrita.
- Utilitário de re-encriptação: [`scripts/security/reencrypt-credentials.ts`](file:///c:/Github/Birthub-360/scripts/security/reencrypt-credentials.ts).
- Terminal com Node.js / `npx tsx` e OpenSSL.

---

## 3. Procedimento de Execução Passo a Passo

### Passo 1: Geração da Nova Chave
Gere uma nova chave criptograficamente segura de 32 bytes codificada em Base64:
```bash
NEW_KEY=$(openssl rand -base64 32)
echo "Nova chave gerada em memória segura."
```
*(Nunca imprima ou persista esta chave em arquivos versionados).*

### Passo 2: Execução de Simulação (Dry-Run)
Valide a integridade dos dados e decriptação atual executando o script em modo de teste:
```bash
OLD_KEY="<CHAVE_ATUAL>" NEW_KEY="$NEW_KEY" DATABASE_URL="<DB_URL>" \
  npx tsx scripts/security/reencrypt-credentials.ts --dry-run
```
- **Critério de Aceite:** O relatório deve indicar `Erros: 0` e listar o total de registros identificados em cada model.

### Passo 3: Execução da Re-encriptação em Lote (Live)
Execute a re-encriptação no banco de dados:
```bash
OLD_KEY="<CHAVE_ATUAL>" NEW_KEY="$NEW_KEY" DATABASE_URL="<DB_URL>" \
  npx tsx scripts/security/reencrypt-credentials.ts
```
- O script atualiza atômica e progressivamente os envelopes `enc:v1:...` com a nova chave.

### Passo 4: Atualização no Gestor de Segredos (Infisical / Render)
1. Acesse o Infisical ou painel do Render (Environment).
2. Atualize a variável `CREDENTIALS_ENCRYPTION_KEY` com o valor de `$NEW_KEY`.
3. Dispare o redeploy da aplicação.

---

## 4. Validação Positiva (Confirmação da Nova Chave)

Execute um teste de leitura e escrita através da API da aplicação:
```bash
# 1. Consulta a um contato ou credencial existente (deve decifrar sem erros no log)
curl -s -H "Authorization: Bearer <TOKEN_ADMIN>" https://<APP_URL>/api/contacts?limit=1

# 2. Inspecionar logs da aplicação: não deve haver registros de 'Falha ao decifrar credencial'
```

---

## 5. Validação Negativa (Comprovação de Invalidação da Chave Antiga)

Utilizando a ferramenta unitária ou scratch script, comprove que a chave antiga não decifra mais os registros gravados:
```ts
import { decryptCredentialSync } from './src/lib/security/credentialCrypto.js';
// Deve lançar erro: 'Falha na autenticação/decriptografia da credencial'
decryptCredentialSync(sampleCipherFromDb, OLD_KEY);
```

---

## 6. Registro de Conclusão

- Registrar a rotação no log de auditoria interno.
- Documentar a data e o hash da nova chave (SHA-256 da chave) no registro de governança de chaves.
