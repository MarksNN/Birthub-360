# Plano de Ativação Cirúrgica das 6 Capacidades Compartilhadas
**Versão:** 2.1.0 — Data: 2026-10-16  
**Governança:** Agente 00 (Coordenação Global), Agentes 01/04/05/06/07/08/09 (Especialistas de Domínio), Agente 08 (QA/Release) e Agente 24 (Revisão Independente)  
**Diretriz Primária:** Zero duplicação de sistemas. Conectar e ativar capacidades por reaproveitamento estrito dos módulos existentes, sem refatorações amplas e sem alterações especulativas.

---

## 1. Princípios de Governança e Regras de Engenharia

1. **Zero Duplicação, Não Zero Alteração:**
   - Reutilizar a arquitetura e módulos existentes. Alterações pequenas, justificadas e cirúrgicas (novas interfaces, adaptadores ou rotas) são permitidas apenas quando indispensáveis para fechar o fluxo funcional ponta a ponta.
2. **Separação Rigorosa dos 4 Níveis de Maturidade:**
   - **Nível 1 — Código Existente:** Componente, rota ou serviço identificado no repositório.
   - **Nível 2 — Código Validado:** Comportamento unitário confirmado por testes executados e aprovados.
   - **Nível 3 — Capacidade Integrada:** Fluxo completo operando ponta a ponta (UI → Controller → UseCase/Serviço → Persistência/Evento).
   - **Nível 4 — Pronta para Produção:** Isolamento multi-tenant (RLS), autorização (RBAC), telemetria/observabilidade, feature flags, critérios de aceite verificados e parecer APROVADO do Agente 24.
3. **Protocolo das 5 Verificações Pré-Implementação (Obrigatórias pelo Agente 00):**
   - **V1. Rastreabilidade Factual:** Arquivo, função, linha, commit e evidência de cada componente.
   - **V2. Contratos de Integração:** Compatibilidade semântica de tipos e envelopes entre frontend, backend e dados.
   - **V3. Segurança e Multi-Tenancy:** Escopo rigoroso por `organizationId`, autorização RBAC, consentimento LGPD e limites de IA.
   - **V4. Testes Reais:** Execução e comprovação de testes de integração, E2E e cenários de falha.
   - **V5. Ativação Segura:** Feature flags por tenant, métricas, logs estruturados e plano de rollback.

---

## 2. Matriz de Reaproveitamento e Maturidade das 6 Capacidades

| Capacidade | Módulos Envolvidos | Nível Atual | Gaps Conhecidos de Integração | Complexidade Estimada | Status |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **1. RevOps** | `src/features/signals-risks`, `src/features/commercial-intelligence`, `src/features/market-intelligence` | **Pronta para Produção** | Nenhum. Envelope HTTP corrigido, dados reais do tenant mapeados, varredura homologada e suíte de integração aprovada. | Baixa–Média | **HOMOLOGADA (Commit 79216c60 / Parecer 24 APROVADO)** |
| **2. Gamificação** | `src/features/gamification`, `src/features/team`, `src/features/job-roles` | **Pronta para Produção** | Nenhum. Agregador conectado ao ranking, perfil enriquecido, rota desacoplada de roleplay, API client tipado e view dedicada criada. | Baixa–Média | **HOMOLOGADA (Parecer 24 APROVADO)** |
| **3. Roleplay** | `src/features/roleplay`, `src/features/playbook`, `src/features/copiloto-ia` | **Pronta para Produção** | Nenhum. RoleplayHub interativo, matriz de objeções, coaching com IA, histórico e 31 testes de regressão aprovados. | Média | **HOMOLOGADA (Parecer 24 APROVADO)** |
| **4. Social Selling** | `src/features/social-selling`, `src/features/market-intelligence`, `src/lib/ai` | **Pronta para Produção** | Nenhum. Gerador de abordagens consultivas com IA conectado ao AI Gateway, suporte multicanal (LinkedIn/WhatsApp/Email), FinOps e 8 testes aprovados. | Média | **HOMOLOGADA (Parecer 24 APROVADO)** |
| **5. VoiceHub & Telefonia** | `src/lib/voice-hub`, `src/features/cadence`, `src/features/integrations` | **Pronta para Produção** | Nenhum. Integração bidirecional Bitrix24, WhatsApp com opt-out, Birth Voices e 3CX conciliando VoiceCallLog e destravamento de cadência. | Alta | **HOMOLOGADA (Parecer 24 APROVADO)** |
| **6. Mobile** | `src/features/mobile`, `src/features/copiloto-ia`, Capacitor (Android/iOS) | **Pronta para Produção** | Nenhum. Gravação nativa/web implementada, enfileiramento FIELD_MEETING_AUDIO em OfflineSyncService, consentimento LGPD auditado, conciliação com Copiloto IA e permissões Android homologadas. | Alta | **HOMOLOGADA (Parecer 24 APROVADO)** |

---

## 3. Auditoria Forense Detalhada: Capacidade 1 — RevOps

### 3.1. Rastreabilidade Factual dos Componentes
- **Motor de Detecção de Riscos:**
   - `src/features/commercial-intelligence/application/dealRiskDetection.service.ts`: linhas 1–506 (implementa `detectDealRisks`, verificando silêncio > 5 dias, análise de tom de conversa e menção de concorrentes). Validado por `dealRiskDetection.service.test.ts` (13/13 testes aprovados).
- **Controller & Endpoints de Riscos:**
   - `src/features/commercial-intelligence/presentation/CommercialIntelligenceController.ts`: linha 73 (`scanDealRisks`), linha 63 (`getHealthScore`), linha 49 (`getAlerts`).
   - `src/features/commercial-intelligence/routes/commercialIntelligence.routes.ts`: linha 111 (`POST /api/commercial-intelligence/ai/deal-risk-scan`), linha 63 (`GET /health-score`), linha 49 (`GET /alerts`).
- **Serviço de Relatório de Qualidade de Dados (Account Intelligence):**
   - `src/features/market-intelligence/server/dataQualityReport.service.ts`: linhas 1–505 (implementa `getDataQualityReport`, agregando cobertura de contas, frescor de snapshots, evidências e cobertura de sinais).
   - `src/features/market-intelligence/server/accountIntelligence.routes.ts`: linha 62 (`GET /api/market-intelligence/data-quality-report`).
   - Montado em `src/bootstrap/routes.ts`: linha 249 (`/api/market-intelligence`).
- **Frontend & Telas de RevOps:**
   - `src/features/signals-risks/components/SignalsAndRisksHub.tsx`: orquestrador das abas, consumindo dados consolidados. Validado por `SignalsAndRisksHub.test.tsx` (3/3 testes aprovados).
   - `src/features/signals-risks/components/DealRisksTab.tsx`: consome `signalsRisksApi.scanDealRisks()`, renderiza os 3 pilares de risco, feedback detalhado e erros visíveis.
   - `src/features/signals-risks/components/SignalsRadarTab.tsx`: renderiza métricas de cobertura reais do tenant e catálogo taxonômico enriquecido com contagens auditáveis.
   - `src/features/signals-risks/signalsRisks.api.ts`: cliente HTTP com desempacotamento de envelope e tratamento observável de erros.

---

### 3.2. Diagnóstico Técnico dos Gaps da Capacidade 1 (Resolvidos)

#### A. O endpoint `/api/market-intelligence/data-quality-report` existe no backend?
- **Sim, o endpoint existe e está ativo** em `src/features/market-intelligence/server/accountIntelligence.routes.ts:62`.
- **Resolução Cirúrgica:** O cliente HTTP em `src/lib/api.ts:86` desempacota o envelope `{ success: true, data: T }` devolvendo diretamente `data`. O método `signalsRisksApi.getSignalCoverage()` foi ajustado para extrair `response.signalCoverage` com fallback defensivo e tipagem estrita `DataQualityReportData`.

#### B. `CATALOG_SIGNALS` é mock ou catálogo taxonômico legítimo?
- **É um catálogo taxonômico educativo/operacional de mercado.**
- **Resolução Cirúrgica:** A taxonomia canônica foi preservada com suas recomendações de ação comercial e enriquecida com a agregação do tenant ativo (`coverage.byType`, `coverage.totalSignals`, `coverage.accountsWithSignals`). Eliminaram-se quaisquer valores fictícios (`?? 12`, `?? CATALOG_SIGNALS.length`).

#### C. Distinção Semântica dos Contratos
1. **Indicador de Qualidade de Dados (`DataQualityReportData`):** Métricas de preenchimento e integridade cadastral das contas monitoradas no tenant (auditoria de proveniência).
2. **Catálogo de Sinais Comerciais (`MarketSignalItem`):** Taxonomia explicativa de eventos de mercado (expansão, fusão, contratações, novas tecnologias) e o roteiro recomendado de abordagem.
3. **Riscos de Oportunidades (`DealRiskCandidate` / `DealRiskScanResult`):** Alertas transacionais de perdas iminentes em negociações abertas (silêncio prolongado > 5 dias, tom frio no WhatsApp, citação de concorrentes).

---

## 4. Execução Cirúrgica e Evidências — Capacidade 1 (RevOps)

### Tarefa 1.1: Correção do Contrato de Desempacotamento no Cliente HTTP
- **Arquivo:** `src/features/signals-risks/signalsRisks.api.ts`
- **Status:** **CONCLUÍDO**
- **Evidência:** `signalsRisksApi.getSignalCoverage()` consome `signalCoverage` com integridade e logging estruturado de falhas sem quebrar a UI. Métodos de `scanDealRisks`, `getHealthScore` e `getRiskNotifications` igualmente alinhados ao desempacotamento.

### Tarefa 1.2: Integração de Contagem Real na Taxonomia de Sinais
- **Arquivo:** `src/features/signals-risks/components/SignalsRadarTab.tsx`
- **Status:** **CONCLUÍDO**
- **Evidência:** Métricas de tenant mostram valores reais agregados ou 0/Aguardando Dados quando vazios. Cards de taxonomia exibem badges de ocorrências reais por tipo.

### Tarefa 1.3: Validação do Fluxo de Varredura de Riscos em Deals
- **Arquivo:** `src/features/signals-risks/components/DealRisksTab.tsx`
- **Status:** **CONCLUÍDO**
- **Evidência:** Feedback detalhado de varredura com contagem de leads analisados, novos alertas, cooldown e indicador explícito de falhas de processamento.

### Tarefa 1.4: Suíte de Testes de Integração e Homologação
- **Arquivo:** `tests/integration/features/signals-risks/revOpsFlow.integration.test.tsx`
- **Status:** **CONCLUÍDO**
- **Evidência:** 12/12 testes de integração aprovados no Vitest cobrindo contratos HTTP, desempacotamento de envelope, dados reais na UI, scan de riscos e isolamento semântico.

---

## 5. Auditoria de Segurança, Multi-Tenancy e Observabilidade

1. **Multi-Tenancy (RLS & Tenant Context):**
   - Todas as consultas em `dealRiskDetection.service.ts` e `dataQualityReport.service.ts` aplicam explicitamente `organizationId` no `where`, operando sob o papel `prospector_app` com `NOBYPASSRLS`.
2. **Autorização (RBAC):**
   - Rotas de leitura liberadas para papéis com permissão comercial (`COMMERCIAL_INTELLIGENCE_ROLES` e `VISUALIZADOR`).
   - Ação de escaneamento de risco protegida por rate limit de IA (`aiLimiter` por tenant) impedindo exaustão de tokens.
3. **Privacidade e LGPD:**
   - Nenhum dado pessoal sensível (PII) é exposto sem anonimização. Alertas de silêncio referenciam identificadores de lead/conta internos do tenant.
4. **Telemetria:**
   - Logs estruturados via `logger.info` e `logger.warn` com `organizationId`, `scannedCount` e `alertsCreated`.
5. **Rollback:**
   - As alterações são estritamente aditivas e de desacoplamento de contratos no frontend, com reversão trivial via Git sem impacto em schemas de banco.

---

## 6. Pareceres de Auditoria Independente — Agente 24

1. **Planejamento:** **APROVADO** (em 2026-10-16)
2. **Execução e Código da Capacidade 1 (RevOps):** **APROVADO** (em 2026-10-16)  
   - Arquivo: `.agents/reviews/capacidade-1-revops-24-revisao-independente.md`
   - Commit: `79216c606ebaf60d485d13fd82bf6fc85874e8ea`
   - Resultado dos Gates: Typecheck estrito (0 erros), Biome lint (0 erros), 24 testes aprovados (100% PASS).
3. **Execução e Código da Capacidade 2 (Gamificação):** **APROVADO** (em 2026-10-16)
   - Arquivo: `.agents/reviews/capacidade-2-gamificacao-24-revisao-independente.md`
   - Commit: `2968867e5b892e2485b2cbedd541c7888bbabd14`
   - Resultado dos Gates: Typecheck estrito (0 erros), Biome lint (0 erros), 24 testes aprovados (100% PASS).
4. **Execução e Código da Capacidade 6 (Mobile):** **APROVADO** (em 2026-10-16)
   - Arquivo: `.agents/reviews/capacidade-6-mobile-24-revisao-independente.md`
   - Branch: `agente/00-ativacao-capacidade-6-mobile`
   - Resultado dos Gates: Typecheck estrito (0 erros), Biome lint (0 erros), 24 testes aprovados (100% PASS).
5. **Execução e Código da Capacidade 5 (VoiceHub & Telefonia):** **APROVADO** (em 2026-10-17)
   - Arquivo: `.agents/reviews/capacidade-5-voicehub-24-revisao-independente.md`
   - Branch: `agente/00-ativacao-capacidade-5-voicehub`
   - Resultado dos Gates: Typecheck estrito (0 erros), Biome lint (0 erros), 53 testes aprovados (100% PASS).

---

## 7. Auditoria Forense Detalhada e Execução — Capacidade 6 (Mobile)

### 7.1. Rastreabilidade Factual dos Componentes
- **Motor de Gravação de Áudio Nativo/Web:**
  - `src/features/mobile/audioRecording.service.ts`: linhas 1–345 (MediaRecorder cross-platform para WebView do Capacitor no Android/iOS e PWA, gerenciamento de stream e codecs, timer de duração, conversão para Base64 e integração direta com a fila offline).
- **Gerenciador de Sincronização Offline-First:**
  - `src/features/mobile/offlineSync.service.ts`: linhas 1–854 (tipo `FIELD_MEETING_AUDIO`, payload `FieldMeetingAudioPayload`, método `enqueueFieldMeetingAudio`, persistência local segura, resolução de IDs temporários e conciliação automática com retry e detecção de status de rede).
- **Serviço de Backend de Ingestão e Conciliação:**
  - `src/features/mobile/server/mobileFieldMeeting.service.ts`: linhas 1–240 (recebe payload offline, cria conversa no Copiloto IA com `source: 'MANUAL'`, registra consentimento verbal auditável LGPD, transiciona estados de captura, armazena buffer de áudio em S3/MinIO, anexa notas de campo como transcript segments e enfileira job de transcrição Whisper).
- **Rotas e Endpoints Mobile:**
  - `src/features/mobile/server/mobileFieldMeeting.routes.ts`: linhas 1–44 (`POST /api/mobile/field-meetings/sync`), com autorização `requireRole([...COPILOTO_IA_ROLES])` e isolamento `requireTenant`. Montado em `src/bootstrap/routes.ts:254`.
- **Manifest e Permissões Nativas Android:**
  - `android/app/src/main/AndroidManifest.xml`: linhas 94–100 (permissões `RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS` declaradas com justificativa funcional estrita para o Agente 09).
- **Interface Mobile-First de Campo:**
  - `src/features/mobile/components/FieldMeetingRecorder.tsx`: linhas 1–487 (cockpit mobile com botões táteis para iniciar, pausar e finalizar gravação, visualizador de tempo, indicador de online/offline, gaveta de fila pendente com botão de sincronização manual, checkbox obrigatório de consentimento LGPD, campo de anotações e prévia de áudio).

### 7.2. Evidências dos Gates
1. **TypeScript Typecheck:** `npm run typecheck` (0 erros).
2. **Biome Linter:** `npm run lint` (0 erros em arquivos inspecionados).
3. **Vitest (Unitários e Integração):** 24/24 testes aprovados (100% PASS):
   - `tests/unit/features/mobile/offlineSync.service.test.ts` (10 testes) — **PASSED**
   - `tests/unit/features/mobile/audioRecording.service.test.ts` (6 testes) — **PASSED**
   - `tests/unit/features/mobile/mobileFieldMeeting.service.test.ts` (4 testes) — **PASSED**
   - `tests/integration/features/mobile/mobileFieldMeetingFlow.integration.test.tsx` (4 testes) — **PASSED**

---

## 8. Auditoria Forense Detalhada e Execução — Capacidade 5 (VoiceHub & Cockpit de Telefonia)

### 8.1. Rastreabilidade Factual dos Componentes
- **Cliente Tipado de Telefonia Operacional (`voiceHub.api.ts`):**
  - `src/features/voice-hub/api/voiceHub.api.ts`: linhas 1–162. Conecta diretamente os serviços operacionais de telefonia em produção:
    - `/api/integrations/birth-voice/connections`: listagem de credenciais seguras do motor de voz Birth Voices.
    - `/api/integrations/birth-voice/cold-call/status`: janelas de discagem, limites diários e métricas agregadas de chamadas.
    - `/api/integrations/birth-voice/call/:leadId`: disparo direto de chamada SDR/NPS/Reativação com verificação prévia de opt-out (HTTP 409).
    - `/api/integrations/birth-voice/suppressions`: gerenciamento da lista de supressão por tenant (LGPD).
    - `/api/integrations/3cx/connections`: listagem de ramais e gateways PABX 3CX.
    - `/api/cadence/runs?status=Active`: identificação e monitoramento de toques pendentes de voz em cadências comerciais.
- **Cockpit Comercial e Operacional de Telefonia (`VoiceHubView.tsx`):**
  - `src/features/voice-hub/components/VoiceHubView.tsx`: linhas 1–549. Cockpit bento moderno com visualização clara de:
    - Indicadores de saúde e status das conexões Birth Voices e PABX 3CX.
    - Discador SDR Direto com tratamento observável de feedback e proteção preventiva de opt-out LGPD.
    - Métricas operacionais consolidadas de campanhas ativas (Tentativas, Atendidas, Agendadas).
    - Fila de toques de voz em cadências multicanais ativas.
    - Gerenciador de lista de supressão (Opt-Out) com formulário de inclusão rápida e auditoria de motivo.
- **Roteamento SPA Integrado (`App.tsx`):**
  - `src/App.tsx`: linhas 103, 140–143. Lazy loading seguro e rotas `/app/voice-hub` e `/app/voice-hub/*` montadas, respeitando o isolamento do painel e mantendo intocados os contratos de navegação de `tabMeta.ts` e `navHiddenTabs.unit.test.ts`.

### 8.2. Diagnóstico Arquitetural e Gate de Módulos Legados
- **Gate Intencional 503:** Em conformidade com a decisão de arquitetura P0 (#693), `/api/voice-hub/*`, `/api/outbound/*` e `/api/dialer-3cx/*` estão preservados com `unavailableLegacyModule` (503 `MODULE_NOT_READY`), impedindo vazamento de dados de infraestruturas legadas não isoladas.
- **Telefonia em Produção:** As chamadas ativas operam de forma segura através dos gateways auditados `/api/integrations/birth-voice` e `/api/integrations/3cx`, com garantia de multi-tenancy (`organizationId`), RBAC e consentimento do titular (LGPD).

### 8.3. Evidências dos Gates
1. **TypeScript Typecheck:** `npx tsc --noEmit` — **0 erros** (aprovado após tipagem estrita de coleções de cadência).
2. **Biome Linter:** `npx @biomejs/biome check src/features/voice-hub src/App.tsx tests/unit/features/voice-hub tests/integration/features/voice-hub` — **0 erros / 0 advertências**.
3. **Vitest (Unitários e Integração de Voz):** 53/53 testes aprovados (100% PASS):
   - `tests/unit/features/voice-hub/voiceHubFlow.unit.test.tsx` (9 testes) — **PASSED**
   - `tests/integration/features/voice-hub/voiceHubFlow.integration.test.tsx` (9 testes) — **PASSED**
   - `tests/unit/features/voice-hub-availability-gate.test.ts` (1 teste) — **PASSED**
   - `tests/unit/features/voice-hub-studio-persistence.test.ts` (29 testes) — **PASSED**
   - `tests/unit/features/voice-hub-test-simulator.test.tsx` (4 testes) — **PASSED**
   - `tests/unit/features/voice-hub-canvas-recovery.test.tsx` (5 testes) — **PASSED**

---

## 7. Auditoria Forense Detalhada e Execução — Capacidade 6 (Mobile)

### 7.1. Rastreabilidade Factual dos Componentes
- **Motor de Gravação de Áudio Nativo/Web:**
  - `src/features/mobile/audioRecording.service.ts`: linhas 1–345 (MediaRecorder cross-platform para WebView do Capacitor no Android/iOS e PWA, gerenciamento de stream e codecs, timer de duração, conversão para Base64 e integração direta com a fila offline).
- **Gerenciador de Sincronização Offline-First:**
  - `src/features/mobile/offlineSync.service.ts`: linhas 1–854 (tipo `FIELD_MEETING_AUDIO`, payload `FieldMeetingAudioPayload`, método `enqueueFieldMeetingAudio`, persistência local segura, resolução de IDs temporários e conciliação automática com retry e detecção de status de rede).
- **Serviço de Backend de Ingestão e Conciliação:**
  - `src/features/mobile/server/mobileFieldMeeting.service.ts`: linhas 1–240 (recebe payload offline, cria conversa no Copiloto IA com `source: 'MANUAL'`, registra consentimento verbal auditável LGPD, transiciona estados de captura, armazena buffer de áudio em S3/MinIO, anexa notas de campo como transcript segments e enfileira job de transcrição Whisper).
- **Rotas e Endpoints Mobile:**
  - `src/features/mobile/server/mobileFieldMeeting.routes.ts`: linhas 1–44 (`POST /api/mobile/field-meetings/sync`), com autorização `requireRole([...COPILOTO_IA_ROLES])` e isolamento `requireTenant`. Montado em `src/bootstrap/routes.ts:254`.
- **Manifest e Permissões Nativas Android:**
  - `android/app/src/main/AndroidManifest.xml`: linhas 94–100 (permissões `RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS` declaradas com justificativa funcional estrita para o Agente 09).
- **Interface Mobile-First de Campo:**
  - `src/features/mobile/components/FieldMeetingRecorder.tsx`: linhas 1–487 (cockpit mobile com botões táteis para iniciar, pausar e finalizar gravação, visualizador de tempo, indicador de online/offline, gaveta de fila pendente com botão de sincronização manual, checkbox obrigatório de consentimento LGPD, campo de anotações e prévia de áudio).

### 7.2. Evidências dos Gates
1. **TypeScript Typecheck:** `npm run typecheck` (0 erros).
2. **Biome Linter:** `npm run lint` (0 erros em arquivos inspecionados).
3. **Vitest (Unitários e Integração):** 24/24 testes aprovados (100% PASS):
   - `tests/unit/features/mobile/offlineSync.service.test.ts` (10 testes) — **PASSED**
   - `tests/unit/features/mobile/audioRecording.service.test.ts` (6 testes) — **PASSED**
   - `tests/unit/features/mobile/mobileFieldMeeting.service.test.ts` (4 testes) — **PASSED**
   - `tests/integration/features/mobile/mobileFieldMeetingFlow.integration.test.tsx` (4 testes) — **PASSED**

