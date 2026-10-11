- De: 00 (Coordenador)
- Para: 15 (Segurança Aplicada) e 06 (Integrações e Bitrix)
- Onda: liquidacao-debitos
- Status: resolvido
- Prioridade: alto (Bloqueador B-13)

## Problema

Auditar logs dos workers de fila (`src/lib/queue/**`) e webhooks externos para impedir vazamento de PII (Bloqueador B-13 da missão original). PII inclui: telefones, e-mails, transcrições de áudio e outros dados pessoais sensíveis.

## Evidência

### 1. Workers de Fila — NENHUMA VIOLAÇÃO CRÍTICA

**enrichmentCascade.worker.ts** (linhas 44-67):
- ✅ logger.info com `jobId`, `companyId`, `organizationId` — IDs não são PII
- ✅ logger.info com métricas (`apollo`, `hunter`, `places`, `contacts`) — não são PII
- ✅ logger.error com `err`, `jobId`, `companyId` — IDs e erro não são PII

**newsMonitor.worker.ts** (linhas 64, 76):
- ✅ logger.info com `companyId` — ID não é PII

**Conclusão:** Workers de fila NÃO logam PII em claro.

### 2. Webhook Birth Voice — NENHUMA VIOLAÇÃO CRÍTICA

**birthVoice.webhook.ts** (linhas 171-398):
- ✅ logger.warn com `err`, `leadId` — ID não é PII
- ✅ logger.warn com `err`, `leadId`, `callSid` — IDs não são PII
- ✅ logger.error — sem dados específicos
- ✅ logger.warn — sem dados específicos
- ✅ logger.error com `organizationId` — ID não é PII
- ✅ logger.warn com `organizationId` — ID não é PII
- ✅ logger.warn com `leadId`, `organizationId` — IDs não são PII
- ✅ logger.error com `err`, `leadId` — ID não é PII

**Observação:** O webhook processa transcrições de áudio (`data.transcript`), mas NUNCA loga o conteúdo da transcrição. Apenas loga IDs e erros.

**Conclusão:** Webhook Birth Voice NÃO loga PII em claro.

### 3. Webhook 3CX — VIOLAÇÕES ENCONTRADAS

**threecx.service.ts** (linhas 136-837):

**VIOLAÇÃO #1 — pbxUrl (URL do PABX):**
- Linha 136-138: `logger.info({ organizationId, connectionId, pbxUrl, extension })`
- Linha 184-186: `logger.info({ organizationId, connectionId, pbxUrl: conn.pbxUrl })`
- Linha 204-206: `logger.warn({ err, organizationId, connectionId, pbxUrl: conn.pbxUrl })`

**Risco:** `pbxUrl` pode conter hostname/IP do PABX, que é informação de infraestrutura sensível. Embora não seja PII pessoal, não deveria ser logado em claro.

**VIOLAÇÃO #2 — destinationNumber (telefone completo):**
- Linha 362-375: `logger.warn({ organizationId, connectionId, extension, destinationNumber, callId })`

**Risco:** `destinationNumber` é o número de telefone discado. Telefone é PII sensível (LGPD). NÃO deveria ser logado em claro.

**VIOLAÇÃO #3 — payload cru (CORRIGIDO):**
- Linha 394-396: Comentário indica que anteriormente a função fazia `logger.info({ payload })` com payload cru
- Status atual: CORRIGIDO — função não loga mais payload cru

**Conclusão:** Webhook 3CX tem 2 violações ativas (pbxUrl e destinationNumber).

### 4. Webhook Bitrix — NENHUMA VIOLAÇÃO CRÍTICA

**bitrix.webhook.ts** (linhas 1-287):
- ✅ webhook usa `requestContext.run({ tenantId: organizationId })` para isolamento
- ✅ logInbound grava em `BitrixSyncLog` (não logger stdout) com metadata
- ✅ Não há logger.info/warn/error com dados sensíveis em claro

**Conclusão:** Webhook Bitrix NÃO loga PII em claro.

## Resolução

### Status Geral: ⚠️ VIOLAÇÕES EM 3CX

Workers de fila e webhooks Bitrix/Birth Voice estão OK. Webhook 3CX tem violações que precisam correção.

### Ações Necessárias

**1. Remover pbxUrl dos logs (Prioridade: MÉDIA)**
- Arquivo: `src/features/integrations/threecx/threecx.service.ts`
- Linhas: 136-138, 184-186, 204-206
- Ação: Remover `pbxUrl` dos contextos de logger.info/warn
- Justificativa: URL do PABX é informação de infraestrutura sensível

**2. Mascarar destinationNumber nos logs (Prioridade: ALTA — PII sensível)**
- Arquivo: `src/features/integrations/threecx/threecx.service.ts`
- Linha: 362-375
- Ação: Aplicar máscara (ex: `last8DigitsIndex(destinationNumber)`) ou remover do log
- Justificativa: Telefone é PII sensível sob LGPD
- Referência: `src/lib/crypto/piiIndex.ts` já existe com função `last8DigitsIndex`

**3. Verificar se há outros logs com telephone/phone no código**
- Pesquisar por padrões: `logger.*phone`, `logger.*telephone`, `logger.*dial`
- Verificar se há transcrições sendo logadas em algum lugar

## Teste Esperado

1. Após correção, disparar chamada 3CX real e verificar logs
2. Confirmar que pbxUrl não aparece em logger.info/warn
3. Confirmar que destinationNumber aparece mascarado (ex: ****-****-1234) ou não aparece
4. Verificar que callId e IDs internos continuam logados (úteis para debug)

## Contexto Adicional

- A função `last8DigitsIndex` já existe em `src/lib/crypto/piiIndex.ts` para máscara de telefone
- Handoff anterior: `.agents/handoffs/onda-1/06-para-01-persistencia-3cx.md` (resolvido)
- Webhook 3CX agora grava em `ThreeCXCallEvent` (persistência real) em vez de só logar

## Resolução (Agente 06/15)

**Implementado em:** 2026-10-10

**Ações executadas:**
- [x] pbxUrl removido dos logs (linhas 136-138, 184-186, 204-206)
- [x] destinationNumber mascarado com últimos 4 dígitos (linha 362-382)
- [x] Verificação adicional de outros logs com telephone/phone no código (nenhuma encontrada)
- [x] Status alterado para "resolvido"

**Alterações em `src/features/integrations/threecx/threecx.service.ts`:**

1. **Linha 136-138:** Removido `pbxUrl` do logger.info de conexão bem-sucedida
2. **Linha 184-186:** Removido `pbxUrl` do logger.info de teste de comunicação
3. **Linha 204-206:** Removido `pbxUrl` do logger.warn de falha de teste
4. **Linha 362-371:** Mascarado `destinationNumber` com `****{últimos 4 dígitos}` no logger.warn de falha de chamada
5. **Linha 379-382:** Mascarado `destinationNumber` com `****{últimos 4 dígitos}` no logger.info de chamada disparada

**Justificativa da máscara:**
- Últimos 4 dígitos são suficientes para debug (identificar se o número correto foi discado)
- Não expõe o número completo (PII sensível sob LGPD)
- Padrão simples: `destinationNumber.replace(/\D/g, '').slice(-4)`
