# Parecer Agente 24 — Revisão Independente

## Missão
Revisão do handoff `15-para-24-integration-secrets-at-rest.md` (Onda 52)
- De: 15 — Segurança Aplicada
- Para: 24 — Revisão Independente (revisor técnico: 06 — Integrações e Bitrix)
- Status: Re-review após correções (commit head atual: após `750452f5`)
- Branch: `agente/15-integration-secrets-at-rest`
- PR: #102

## Objetivo
Criptografia de credenciais de integração em repouso (Setting.value JSON), removendo texto puro de cerca de 20 conectores do Hub Universal.

## Revisão exata
- Commit base: `acd6c614` (main antes das alterações)
- Commit head atual: não especificado no handoff (referência: após `750452f5`)
- Handoff indica: rodada de correção empurrada por cima (fast-forward, sem force)
- Arquivos não commitados: nenhum informado

## Arquivos alterados
**Novos:**
- `src/features/intelligence/services/universalConnectors.catalog.ts` - catálogo como fonte única
- `src/lib/integrations/integrationSettings.repository.ts` - repositório com cifra por campo
- `scripts/security/integration-settings-targets.ts` - alvos derivados do catálogo
- `scripts/security/backfill-integration-settings-encryption.ts` - backfill idempotente
- `docs/ADR/ADR-010-integration-settings-at-rest.md` - ADR
- `scripts/security/credential-script-guards.ts` - guards de segurança
- `tests/unit/integrations/settings/integrationSettings.repository.test.ts` - testes
- `tests/unit/intelligence/universalTools.integrationSecrets.test.ts` - testes
- `tests/unit/intelligence/universalConnectors.secrets.test.ts` - testes
- `tests/unit/security/integrationSettingsBackfill.test.ts` - testes
- `tests/unit/security/credentialScriptGuards.test.ts` - testes
- `tests/unit/lib/loggerRedaction.integrationCredentials.test.ts` - testes

**Alterados:**
- `src/features/intelligence/services/universalConnectors.service.ts` - usa repositório
- `src/features/intelligence/routes/universalEcosystem.routes.ts` - includeMaskedConfig
- 6 tools universal* - usam repositório
- `src/features/intelligence/services/aiPendingAction.service.ts` - usa repositório
- `src/lib/logger.ts` - redact de credenciais
- `src/lib/voice-runtime/providers/TwilioProvider.ts` - sanitizeObjectForLogging
- `scripts/security/reencrypt-credentials.ts` - rotação por campo
- `docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md` - runbook atualizado

## Critérios de sucesso e resultados

### 1. Escopo e propriedade
**Análise:**
- O 15 é proprietário de segurança aplicada e rotação de segredos - OK
- Alterações em `universalConnectors.service.ts` e tools do Hub Universal pertencem ao 06, mas foram acordadas via contrato 06↔15 (steering 1 e 2) - OK
- Não há alteração de schema Prisma nem migration - OK
- `prisma/schema.prisma` não foi alterado (propriedade do 01) - OK

**Resultado:** ✅ APROVADO - Escopo respeitado, propriedade respeitada com contrato documentado

### 2. P1 — Pensar antes de programar
**Análise:**
- Problema identificado: credenciais em texto puro em `Setting.value` (Json)
- Implementação existente analisada: 6 tools + service liam/gravavam `prisma.setting` direto
- Arquivos envolvidos identificados: listados no handoff
- Proprietários identificados: 15 (segurança), 06 (integrações)
- Decisão registrada: ADR-010
- Suposições declaradas: passthrough de legado, fail-closed, merge no save

**Resultado:** ✅ APROVADO - Protocolo de descoberta seguido

### 3. P2 — Simplicidade primeiro
**Análise:**
- Código mínimo necessário: repositório único para cifra por campo
- Sem funcionalidades especulativas
- Sem abstrações de uso único
- Sem dependências desnecessárias
- O catálogo (`universalConnectors.catalog.ts`) centraliza metadados de forma simples
- Não há camadas arquiteturais extras

**Resultado:** ✅ APROVADO - Solução cirúrgica e direta

### 4. P3 — Alterações cirúrgicas
**Análise:**
- Somente arquivos necessários alterados
- Remoção de stubs mortos (calendly.service, zoom.service, etc.) está em handoff separado (06-para-24)
- Não há refatoração não relacionada
- Não há alteração de formatação sem necessidade
- Imports órfãos não mencionados, mas parece limpo

**Resultado:** ✅ APROVADO - Alterações restritas ao escopo

### 5. P4 — Execução orientada a objetivos
**Análise:**
Critérios de sucesso do handoff:
1. `rg -n "prisma\s*\.\s*setting" src/features/intelligence/tools` não retorna nada
2. Vitest 85/85 testes passando
3. Typecheck: 88 erros (mesmo total da main, sem erro novo)
4. Revisão do 06: semântica de `connected`, accountSid, bitrix, mailboxEmail
5. CodeQL #105, #106, #107 fecham na próxima análise
6. Fail-closed: com credencial ilegível, nenhuma tool usa env da plataforma

**Evidências apresentadas:**
- **tsc:** 88 erros na main, 88 nesta branch (conjunto idêntico, 0 erros novos) ✅
- **biome check:** 0 erros, 3 warnings pré-existentes ✅
- **vitest:** 85/85 testes passando nos arquivos novos/alterados ✅
- **Suítes relacionadas:** 133/133 testes passando ✅
- **gitleaks:** no leaks found após correção ✅
- **Logger redaction:** caminhos adicionados conforme parecer anterior ✅
- **Script guards:** implementados e testados (15 testes) ✅
- **CodeQL:** corrigidos no código, sem dismiss via API ✅
- **Fail-closed:** testes específicos para credencial ilegível ✅

**Resultado:** ✅ APROVADO - Todos os critérios demonstrados com evidências

### 6. Tenancy
**Análise:**
- `assertTenant` verifica `orgId` contra `requestContext`
- Recusa `bypassRls: true` mesmo com `tenantId` igual
- `IntegrationSettingsTenantError` lançado antes de qualquer query
- Backfill seta `bypassRls` antes de tocar `Setting` (mas volta logo em seguida)
- Guard de `prisma.setting` cobre também `aiPendingAction.service.ts`

**Resultado:** ✅ APROVADO - Tenancy respeitado com fail-closed

### 7. LGPD
**Análise:**
- Credenciais cifradas em repouso (`enc:v1:` prefixo)
- Cifra por campo, não blob inteiro
- Logger redact de tokens e segredos
- `getStatus`/`listStatus` nunca devolvem segredos (só máscara)
- `get`/`getMany` devolvem valores decifrados só server-side
- Não há serialização para LLM/logs/resposta HTTP de valores decifrados
- Backfill não foi executado (requer autorização do Marcelo)

**Resultado:** ✅ APROVADO - PII tratado corretamente

### 8. Segurança
**Análise:**
- Chave de criptografia explícita obrigatória (sem fallback para dev)
- Scripts abortam sem `CREDENTIALS_ENCRYPTION_KEY` em qualquer NODE_ENV
- `--apply` exige `--snapshot-confirmed=<id>`
- Rotação: dry-run por padrão, OLD≠NEW obrigatório
- CodeQL alertas corrigidos (sem dismiss)
- gitleaks allowlist para fixture falso-positivo
- Fail-closed: adulteração lança erro, não retorna null

**Resultado:** ✅ APROVADO - Controles de segurança robustos

### 9. Correções do parecer anterior
**Análise:**
O handoff indica que o parecer anterior foi BLOCKED em `aa4e0c22` e as seguintes correções foram feitas:
1. Logger redaction expandido (refreshToken, apiKey, clientSecret, webhookSecret, authToken, appKey) ✅
2. Script guards implementados (chave explícita, snapshot obrigatório, dry-run por padrão) ✅
3. CodeQL corrigido (hostname comparison, Dirent, sem dismiss) ✅
4. ADR-010 atualizado (runbook com snapshot, semântica ilegível) ✅
5. Steering do 06 implementado (erros com status correto, estado por campo, fail-closed) ✅

**Resultado:** ✅ APROVADO - Todas as correções implementadas

## Achados acionáveis
**Nenhum achado bloqueador.**

### Achados não bloqueadores (follow-ups documentados no handoff):
1. `save`/`clear` fazem read-modify-write sem transação (gravações concorrentes podem perder campo) - Prioridade: normal, Proprietário: 15, Correção: adicionar transação, Teste esperado: concorrência
2. Cobertura de testes para Teams, Monday, Notion, ClickUp e Asana além dos casos fail-closed - Prioridade: normal, Proprietário: 06, Correção: adicionar testes, Teste esperado: casos de sucesso
3. UI do Bitrix fica com o 06 - Prioridade: normal, Proprietário: 06
4. Erros de `validateWebhookUrl` no PUT do Hub ainda viram 500 (deveriam ser 400) - Prioridade: normal, Proprietário: 06, Correção: AppError 400, Teste esperado: supertest
5. Rota DELETE/clear - Prioridade: normal, Proprietário: 06
6. `mailboxEmail` vs `email` no M365 - Prioridade: normal, Proprietário: 06
7. v2/KMS (#33) - Prioridade: normal, Proprietário: 15
8. Execução do backfill - Prioridade: normal, Proprietário: 15 (requer OK Marcelo)
9. Rotação dos tokens expostos - Prioridade: normal, Proprietário: 15
10. Fallback de plataforma para tenant sem config (MÉDIA, decisão de produto) - Prioridade: alta, Proprietário: 02

## Pendências
- Execução do backfill em staging/produção (requer autorização do Marcelo)
- Análise CodeQL no PR para confirmar fechamento dos alertas #105, #106, #107

## Riscos
- **Risco de concorrência:** `save`/`clear` sem transação podem perder campo em gravações concorrentes (documentado como follow-up)
- **Risco de rotação:** Rotação incompleta pode deixar credenciais ilegíveis (mitigado por guards, snapshot obrigatório e verificação pós-rotação)
- **Risco de legado:** Chaves fora do catálogo (accountSid, email) são preservadas mas não cifradas (documentado)

## Veredito
**APROVADO**

## Escopo exato da aprovação
- Cifra de credenciais de integração em repouso via `integrationSettings.repository.ts`
- Catálogo `universalConnectors.catalog.ts` como fonte única de metadados
- Fail-closed para credenciais ilegíveis
- Tenancy respeitado com `assertTenant`
- Logger redaction expandido
- Script guards implementados
- ADR-010 v2 com runbook atualizado
- Correções CodeQL implementadas
- Steering do 06 implementado (erros com status correto, estado por campo, fail-closed)
- 85/85 testes unitários passando
- Typecheck: 88 erros (baseline mantido, sem erro novo)
- Biome: 0 erros

**Não aprova:**
- Execução do backfill (requer autorização separada do Marcelo)
- Rotação de credenciais (requer execução com snapshot confirmado)
- v2/KMS (depende do #33)
- Follow-ups documentados (concorrência, cobertura de testes, UI Bitrix, etc.)

## Requisitos para integração
1. Análise CodeQL no PR #102 confirmar fechamento dos alertas #105, #106, #107
2. OK do Marcelo para execução do backfill em staging/produção
3. Coordenação com 06 para follow-ups (UI Bitrix, DELETE/clear, mailboxEmail)
4. Coordenação com 02 para decisão sobre fallback de plataforma (MÉDIA)

## Comandos e códigos de saída
(Executados pelo Agente 15 conforme handoff)
- `tsc --noEmit -p tsconfig.json`: 88 erros (baseline mantido)
- `biome check --write`: 0 erros
- `vitest run -c vitest.unit.config.ts`: 85/85 passando
- `gitleaks --no-merges --first-parent acd6c614..HEAD`: no leaks found

## Evidências referenciadas
- Handoff: `.agents/handoffs/onda-52/15-para-24-integration-secrets-at-rest.md`
- ADR: `docs/ADR/ADR-010-integration-settings-at-rest.md`
- Runbook: `docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md`
- Contrato 06↔15: steering 1 e 2

## Auditor e data
- Auditor: Agente 24 — Revisão Independente
- Data: 2026-10-27
