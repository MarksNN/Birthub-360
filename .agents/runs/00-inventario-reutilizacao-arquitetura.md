# INVENTÁRIO FORENSE DE REUTILIZAÇÃO DA ARQUITETURA — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  

---

## 1. Classificação Metodológica

Cada componente é categorizado rigorosamente de acordo com os seguintes critérios factuais:
- **Existente e Validado:** Código completo, tipagem estrita, contratos expostos e testes automatizados passando.
- **Existente mas Não Integrado:** Serviço implementado, mas isolado ou não exposto no composition root.
- **Parcial:** Estrutura existe, mas depende de mocks residuais, rotas 503 deliberadas ou dados incompletos.
- **Ausente:** Declarado em documentações conceituais antigas, mas sem implementação física no repositório.
- **Substituído:** Substituído por arquitetura superior comprovada (ex.: Qdrant substituído por PostgreSQL pgvector).
- **Não Verificável:** Depende exclusivamente de serviço externo pago sem sandbox local ou offline mock.

---

## 2. As Seis Capacidades Comerciais Estratégicas

### 2.1 Capacidade 1 — RevOps & Sinais de Risco (C1)
- **Arquivo / Serviço:** `src/features/signals-risks/components/SignalsAndRisksHub.tsx`, `src/features/commercial-intelligence/application/dealRiskDetection.service.ts`, `dataQualityReport.service.ts`.
- **Contrato:** `src/shared/contracts/liveCallRisk.contract.ts` (`LiveCallRiskPort`).
- **Dependências:** `PrismaClient`, `src/lib/api.ts` (desempacotamento `{ success: true, data: T }`).
- **Proprietário:** Agente 04 (CRM e BI).
- **Testes:** 12 testes de integração em `tests/integration/features/signals-risks/revOpsFlow.integration.test.tsx` + 13 testes unitários em `dealRiskDetection.service.test.ts`.
- **Estado Operacional:** **EXISTENTE E VALIDADO (Nível 4 - Pronta para Produção)**.
- **Riscos & Reuso:** Métricas dinâmicas sem contadores sintéticos. Pode ser estendido na Onda 01 para alimentar o Copiloto em tempo real.

### 2.2 Capacidade 2 — Gamificação & Desempenho Comercial (C2)
- **Arquivo / Serviço:** `src/features/gamification/components/GamificationView.tsx`, `sellerPerformanceAggregator.service.ts`, `GamificationUseCases.ts`.
- **Contrato:** Rotas REST `/api/gamification/cockpit`, `/api/gamification/leaderboard`, `/api/gamification/achievements`.
- **Dependências:** `PrismaSellerPerformanceRepository`, eventos de deal fechado e ligações.
- **Proprietário:** Agente 04 (CRM e BI).
- **Testes:** 9 testes em `gamificationFlow.integration.test.tsx` + 15 unitários em `sellerPerformanceAggregator.test.ts`.
- **Estado Operacional:** **EXISTENTE E VALIDADO (Nível 4 - Pronta para Produção)**.
- **Riscos & Reuso:** Leaderboard dinâmico por período (hoje/semana/mês/trimestre). Permite plug-and-play imediato para regras de incentivo da Célula Comercial.

### 2.3 Capacidade 3 — Roleplay de Vendas & Avaliação de IA (C3)
- **Arquivo / Serviço:** `src/features/roleplay/components/roleplay-hub/RoleplayHub.tsx`, `RoleplayUseCases.ts`, `roleplay-ai.service.ts`.
- **Contrato:** `src/shared/contracts/roleplayPlaybook.contract.ts` (`RoleplayPlaybookPort`), implementado por `PlaybookRoleplayAdapter.ts` em `src/features/playbook/infra/`.
- **Dependências:** AI Gateway, `src/lib/ai/guardrails/prompt-safety.ts` (`wrapUntrustedContent`).
- **Proprietário:** Agente 07 (IA e Automações) / Agente 02 (UX).
- **Testes:** 7 testes em `roleplayFlow.integration.test.tsx` + 24 unitários em `RoleplayUseCases.test.ts`.
- **Estado Operacional:** **EXISTENTE E VALIDADO (Nível 4 - Pronta para Produção)**.
- **Riscos & Reuso:** Avaliação pedagógica SPIN Selling real via IA. Reúso direto para treinamento de SDRs e Closers nas Ondas 01 a 03.

### 2.4 Capacidade 4 — Social Selling & Abordagens Consultivas (C4)
- **Arquivo / Serviço:** `src/features/social-selling/components/SocialSellingHub.tsx`, `socialSelling.service.ts`.
- **Contrato:** `POST /api/social-selling/generate`, `POST /api/social-selling/track-usage`.
- **Dependências:** AI Gateway, `src/lib/ai/finops/tokenQuota.service.ts`.
- **Proprietário:** Agente 07 (IA e Automações) / Agente 05 (Prospecção).
- **Testes:** 3 testes de integração em `socialSellingFlow.integration.test.ts` + 5 unitários.
- **Estado Operacional:** **EXISTENTE E VALIDADO (Nível 4 - Pronta para Produção)**.
- **Riscos & Reuso:** Geração multicanal (LinkedIn, WhatsApp, E-mail) com trava FinOps e revisão humana mandatória (*human-in-the-loop*).

### 2.5 Capacidade 5 — VoiceHub & Telefonia SDR (C5)
- **Arquivo / Serviço:** `src/features/voice-hub/pages/VoiceHubView.tsx`, `src/lib/voice-hub/services/telephonyService.ts`, `voiceCallLog.service.ts`.
- **Contrato:** `src/shared/contracts/copilotoVoiceIngestion.contract.ts`, `/api/voice-hub/dialer/call`.
- **Dependências:** Birth Voices (SIP/WebRTC), 3CX PBX, `optOutService` para trava de discagem.
- **Proprietário:** Agente 12 (Voz e Telefonia) / Agente 06 (Integrações).
- **Testes:** 9 testes em `voiceHubFlow.integration.test.tsx` + 44 unitários.
- **Estado Operacional:** **EXISTENTE E VALIDADO (Nível 4 - Pronta para Produção)**.
- **Riscos & Reuso:** Bloqueio preventivo fora de horário comercial e contra tabela de opt-out. Endpoints de discagem legados travados em 503 por segurança.

### 2.6 Capacidade 6 — Mobile & Reuniões de Campo Offline (C6)
- **Arquivo / Serviço:** `src/features/mobile/components/FieldMeetingRecorder.tsx`, `audioRecording.service.ts`, `offlineSync.service.ts`.
- **Contrato:** `src/shared/contracts/copilotoTranscription.contract.ts` (`CopilotoTranscriptionQueuePort`), `POST /api/mobile/field-meetings/sync`.
- **Dependências:** Android Capacitor (`android/app/src/main/AndroidManifest.xml`), IndexedDB local, Opus/WebM encoder.
- **Proprietário:** Agente 09 (Mobile).
- **Testes:** 4 testes em `mobileFieldMeetingFlow.integration.test.tsx` + 24 unitários.
- **Estado Operacional:** **EXISTENTE E VALIDADO (Nível 4 - Pronta para Produção)**.
- **Riscos & Reuso:** Consentimento verbal LGPD obrigatório antes de gravar. Sincronização offline-first com fila `FIELD_MEETING_AUDIO`.

---

## 3. Plataforma, Dados, Inteligência e Integrações

| Subsistema | Componente Chave | Estado Operacional | Diagnóstico Forense | Reutilização Estratégica |
|---|---|:---:|---|---|
| **Banco Relacional & Migrações** | `prisma/schema.prisma` | **Existente e Validado** | 139 migrações sequenciais, tipagem estrita, schema 100% validado por `prisma validate`. | Base de dados primária inviolável. |
| **Isolamento Multi-Tenant (RLS)** | PostgreSQL NOSUPERUSER | **Existente e Validado** | Papel `prospector_app` configurado com `SET LOCAL app.current_organization_id`. `WITH CHECK (organization_id = ...)` estrito. | Segurança de tenancy ativa em 48+ tabelas. |
| **Motor Vetorial / Semântico** | PostgreSQL + `pgvector` | **Substituído (Qdrant)** | Qdrant foi substituído por PostgreSQL 16 + extensão `pgvector` (porta 5434). Busca híbrida via Reciprocal Rank Fusion ($k=60$) + reranking LLM. | Evita infraestrutura redundante de cluster vetorial. |
| **AI Gateway & Roteamento** | `src/lib/ai/gateway/` | **Existente e Validado** | Circuit Breaker, failover em cascata (Groq, LiteLLM, OpenAI, OpenRouter, vLLM), telemetria e sanitização. | Ponto único de consumo de LLM da plataforma. |
| **FinOps & Token Budget** | `src/lib/ai/finops/` | **Existente e Validado** | `tokenQuota.service.ts` (20.7 KB) monitora cotas por tenant, teto diário e alertas. | Proteção de custo em todas as operações de IA. |
| **Filas & Runtime Assíncrono** | `src/lib/queue/`, `worker.ts` | **Existente e Validado** | 13 filas BullMQ no Redis, entrypoint worker isolado, graceful shutdown e dead-letter queue. | Execução assíncrona de transcrição, enriquecimento e sync. |
| **Enxame de Agentes Comerciais** | `src/features/intelligence/agents/` | **Existente e Validado** | 25 arquivos incluindo SDR, Closer, BDR, Ops, Churn, Supervisor e a Tríade de Estratégia. | Orquestração autônoma de tarefas comerciais. |
| **Playbook Vivo & Matrizes** | `src/features/playbook/` | **Existente e Validado** | Objeções, critérios de qualificação, adaptação hexagonal ao Roleplay. | Memória de melhores práticas e scripts. |
| **Prospecção & Enriquecimento** | `src/features/prospecting/` | **Existente e Validado** | Apollo, Google Places, BrasilAPI, Crawlee, cálculo de FitScore e deduplicação. | Geração e enriquecimento contínuo de leads. |
| **Integração Bitrix24** | `src/features/integrations/bitrix/` | **Existente e Validado** | Sincronização bidirecional, writeback de leads, expurgo e mapeamento de campos. | Integração de CRM corporativo. |
| **Privacidade & Consentimento LGPD** | `src/lib/security/` | **Existente e Validado** | `consentAuditChain.service.ts` (cadeia criptográfica de consentimento), `piiTokenizer.service.ts`, opt-out unificado. | Garantia legal e técnica contra vazamento de PII. |
| **Observabilidade & Tracing** | OpenTelemetry + Sentry | **Existente e Validado** | Tracing distribuído Node.js + client React, métricas HTTP e endpoints `/metrics`. | Telemetria e diagnóstico contínuo de latência. |
