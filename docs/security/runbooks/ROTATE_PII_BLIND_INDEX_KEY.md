# Runbook — Rotação da Chave de Índice Cego de PII (`PII_BLIND_INDEX_KEY`)

**ID:** RB-SEC-011  
**Criticidade:** Tier 0 (Crítico / LGPD / Busca e Deduplicação)  
**Propriedade:** Agente 15 (Segurança Aplicada) em coordenação com Agente 01/01A e Agente 21 (LGPD)  
**Status:** Operacional  

---

## 1. Contexto e Motivação

`PII_BLIND_INDEX_KEY` é o segredo de 256 bits utilizado para gerar os hashes HMAC-SHA256 que indexam colunas de busca exata sobre dados de contatos (`Contact.emailIndex`, `phoneIndex`, `whatsappIndex`, `emailDomainIndex`, `phoneLast8Index`, `whatsappLast8Index`).

> [!WARNING]
> Trocar o valor de `PII_BLIND_INDEX_KEY` sem re-calcular os índices cegos faz com que contatos existentes fiquem **invisíveis** para webhooks de resposta de e-mail, opt-outs de WhatsApp, deduplicações de leads e buscas exatas via API.

---

## 2. Pré-requisitos e Ferramentas

- Banco de dados PostgreSQL com permissão de escrita.
- Script canônico: [`scripts/security/backfill-contact-pii.ts`](file:///c:/Github/Birthub-360/scripts/security/backfill-contact-pii.ts).

---

## 3. Procedimento de Execução Passo a Passo

### Passo 1: Geração da Nova Chave HMAC
```bash
NEW_BLIND_KEY=$(openssl rand -base64 32)
```

### Passo 2: Simulação e Validação Prévia
```bash
DATABASE_URL="<DB_URL>" \
CREDENTIALS_ENCRYPTION_KEY="<CURRENT_KEY>" \
PII_BLIND_INDEX_KEY="$NEW_BLIND_KEY" \
npx tsx scripts/security/backfill-contact-pii.ts --dry-run
```

### Passo 3: Execução da Re-indexação em Produção
```bash
DATABASE_URL="<DB_URL>" \
CREDENTIALS_ENCRYPTION_KEY="<CURRENT_KEY>" \
PII_BLIND_INDEX_KEY="$NEW_BLIND_KEY" \
npx tsx scripts/security/backfill-contact-pii.ts
```
O script percorre organização por organização, decodifica os valores e grava os novos hashes de busca baseados em `$NEW_BLIND_KEY`.

### Passo 4: Atualização no Gestor de Variáveis de Ambiente
1. No Infisical ou Render, configure `PII_BLIND_INDEX_KEY=$NEW_BLIND_KEY`.
2. Reinicie os serviços de API e Workers (`ENABLE_EMBEDDED_WORKERS`).

---

## 4. Validação Positiva
Teste uma busca exata de contato pelo email ou telefone através do endpoint de API:
```bash
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://<APP_URL>/api/contacts?search=contato@empresa.com.br"
```
A API deve retornar o registro correspondente encontrado através do índice cego.

---

## 5. Validação Negativa
Verifique via query SQL que o hash antigo não bate mais com a nova chave:
```sql
SELECT id, "emailIndex" FROM "Contact" WHERE "emailIndex" = '<HASH_GERADO_PELA_CHAVE_ANTIGA>';
-- Deve retornar 0 linhas
```
