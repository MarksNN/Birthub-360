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
| **2. Gamificação** | `src/features/gamification`, `src/features/team`, `src/features/job-roles` | **Validada** | Agregador de performance não conectado ao endpoint do ranking do cockpit. | Baixa–Média | Próxima na Fila |
| **3. Roleplay** | `src/features/roleplay`, `src/features/playbook`, `src/features/copiloto-ia` | **Existente** | Injeção das matrizes ativas do tenant (`Qualification`/`Objection`) nos prompts da sessão de simulação. | Média | Planejada |
| **4. Social Selling** | `src/features/social-selling`, `src/features/market-intelligence`, `src/lib/ai` | **Existente** | Conexão do gerador de abordagens consultivas ao gateway unificado de IA com cotas de tokens. | Média | Planejada |
| **5. VoiceHub** | `src/lib/voice-hub`, `src/features/cadence/dialer`, `src/features/voice-hub` | **Existente** | Conexão da UI `ActiveCallView` ao WebSocket de runtime de voz e validação técnica de latência WebRTC. | Alta | Planejada |
| **6. Mobile** | `src/features/mobile`, `src/features/copiloto-ia`, Capacitor (Android/iOS) | **Existente** | Integração do plugin nativo de áudio para reuniões de campo à fila de `OfflineSyncService`. | Alta | Planejada |

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
