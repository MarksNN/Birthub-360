# INVENTÁRIO ARQUITETURAL DE MÓDULOS E INTEGRAÇÕES

**Projeto:** Birth Hub 360° / Birthub 360  
**Data:** 2026-10-17  
**Autoridade:** Agente 00 (Coordenação Global) & Agente 24 (Auditoria Independente)  
**Total de Módulos Identificados:** 34 verticais de domínio  
**Total de Endpoints Mapeados:** 443 endpoints REST documentados em `docs/openapi.yaml`  
**Total de Prefixos de Rota:** 73 montados no composition root (`src/bootstrap/routes.ts`)  

---

## 1. COMPOSITION ROOT E ESTRUTURA DE BOOTSTRAP

O backend é orquestrado a partir de `server.ts` através de composição modular limpa em `src/bootstrap/`:
- `src/bootstrap/security.ts`: Headers HTTP (Helmet), CORS estrito (`ALLOWED_ORIGINS`), CSRF Guard, Rate Limiting distribuído (`RedisRateLimiter`).
- `src/bootstrap/routes.ts`: Montagem de 73 prefixos de rotas com `requireAuth`, `requireTenant` e `requireRole`.
- `src/bootstrap/workers.ts`: Inicialização controlada dos workers BullMQ (`bitrixSync`, `coldCall`, `enrichmentCascade`, `newsMonitor`, `swarmScheduler`, `whatsappSignal`, etc.).
- `src/bootstrap/shutdown.ts`: Graceful shutdown gerenciando encerramento de pools HTTP, Prisma, Redis e canais WebRTC/Telefonia.

---

## 2. INVENTÁRIO COMPLETO DOS MÓDULOS DE NEGÓCIO

| Módulo | Caminho no Código | Dono Oficial | Status Operacional | Criticidade | Contrato Principal |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **RevOps & Signals** | `src/features/signals-risks/` | Agente 04 | **Funcional (Nível 4)** | Alta | `signalsRisksApi` ↔ `/api/market-intelligence/data-quality-report` |
| **Gamificação** | `src/features/gamification/` | Agente 02 / 04 | **Funcional (Nível 4)** | Média | `gamificationApi` ↔ `/api/gamification/cockpit` |
| **Roleplay de Vendas** | `src/features/roleplay/` | Agente 07 | **Funcional (Nível 4)** | Alta | `roleplayApi` ↔ `/api/roleplay/sessions` |
| **Social Selling** | `src/features/social-selling/` | Agente 07 | **Funcional (Nível 4)** | Média | `socialSellingApi` ↔ `/api/social-selling/generate` |
| **VoiceHub & Telefonia** | `src/lib/voice-hub/` | Agente 12 / 06 | **Funcional (Nível 4)** | Crítica | `voiceHubApi` ↔ `/api/voice-hub/dialer/call` |
| **Mobile & Field Meetings**| `src/features/mobile/` | Agente 09 | **Funcional (Nível 4)** | Alta | `mobileFieldMeeting.service` ↔ `/api/mobile/field-meetings/sync` |
| **CRM Pipelines & Leads** | `src/features/crm/` | Agente 04 | **Funcional (Nível 4)** | Crítica | `LeadUseCases`, `PrismaLeadRepository` |
| **CRM 360 & Forecast** | `src/features/crm360/` | Agente 04 / 17 | **Funcional (Nível 4)** | Alta | `Crm360UseCases`, `PrismaCrm360Repository` |
| **Commercial Intelligence**| `src/features/commercial-intelligence/` | Agente 04 | **Funcional (Nível 4)** | Alta | `dealRiskDetection.service.ts` |
| **Market Intelligence** | `src/features/market-intelligence/` | Agente 05 | **Funcional (Nível 3)** | Alta | `accountIntelligence.service.ts` |
| **Motor de Prospecção** | `src/features/prospecting/` | Agente 05 | **Funcional (Nível 4)** | Alta | `enrichment.service.ts`, `apollo.service.ts` |
| **Hub de IA & Swarm** | `src/features/intelligence/` | Agente 07 / 13 | **Funcional (Nível 4)** | Alta | `CentralAISuiteService`, `swarmScheduler` |
| **Copiloto IA & Whisper** | `src/features/copiloto-ia/` | Agente 07 | **Funcional (Nível 4)** | Alta | `transcribeConversation.worker.ts` |
| **Cadência Multicanal** | `src/features/cadence/` | Agente 17 | **Funcional (Nível 4)** | Alta | `cadence.engine.ts`, `PrismaConversationSignalPort` |
| **Automações** | `src/features/automations/` | Agente 07 | **Funcional (Nível 3)** | Média | `automation.engine.ts` |
| **Mesa de Tratamento** | `src/features/mesa-tratamento/` | Agente 04 / 06 | **Funcional (Nível 3)** | Média | SDR lead queue & Bitrix staging |
| **Playbooks & Matrizes** | `src/features/playbook/` | Agente 02 / 07 | **Funcional (Nível 4)** | Média | `QualificationMatrixUseCases`, `ObjectionMatrixUseCases` |
| **Analytics & BI** | `src/features/analytics/` | Agente 04 | **Funcional (Nível 3)** | Média | `AnalyticsUseCases`, `churn-prediction` |
| **Billing & FinOps** | `src/features/billing/` | Agente 01 | **Funcional (Nível 4)** | Alta | `UsageUseCases`, `aiBudget.ts` |
| **Gestão de Equipe & Roles**| `src/features/team/`, `job-roles/` | Agente 02 | **Funcional (Nível 4)** | Alta | `CapabilityAuthorizationService` |
| **Auditoria & LGPD** | `src/features/lgpd/`, `lib/audit/` | Agente 21 / 15 | **Funcional (Nível 4)** | Crítica | `AuditService`, `assertPiiExternalConsent` |

---

## 3. AUDITORIA DAS INTEGRAÇÕES EXTERNAS

| Provedor / Serviço | Finalidade | Mecanismo de Isolamento e Resiliência | Status Conexão |
| :--- | :--- | :--- | :---: |
| **Bitrix24 CRM** | Sincronização bidirecional de deals, contatos e leads | Queue BullMQ dedicada (`bitrixSync.worker`), rate limit, idempotência via `externalId` | **OPERACIONAL** |
| **3CX PBX** | Central telefônica corporativa e eventos de chamada | Webhook autenticado, conciliação `VoiceCallLog`, fallback local | **OPERACIONAL** |
| **Birth Voices** | Telefonia SIP/WebRTC e discagem ativa com IA | Tokens rotacionáveis, verificação de horários e supressão de opt-out | **OPERACIONAL** |
| **WhatsApp / Baileys** | Mensageria instantânea com leads e opt-out | `whatsappCommand.queue`, cooldown de mensagens, consentimento explícito | **OPERACIONAL** |
| **Apollo.io API** | Enriquecimento de e-mails corporativos e perfis | Cache de 30 dias em Postgres, rate limit com backoff exponencial | **OPERACIONAL** |
| **Google Places API** | Geocodificação e dados cadastrais de estabelecimentos | Tratamento defensivo de ausência de chave (mock seguro em dev/test) | **OPERACIONAL** |
| **Groq / Llama 3** | Motor primário de inferência LLM de altíssima velocidade | Circuit breaker, retry com backoff, limite de tokens por tenant | **OPERACIONAL** |
| **OpenAI / Whisper** | Transcrição de áudio de reuniões presenciais e chamadas | Storage presigned URLs S3/MinIO, fila assíncrona, sanitização de PII | **OPERACIONAL** |
| **MinIO / AWS S3** | Armazenamento de áudios, anexos e snapshots de propostas | Criptografia em repouso (SSE), presigned URLs com expiração curta (15m) | **OPERACIONAL** |
| **Redis** | Filas BullMQ, cache de segundo nível e locks distribuídos | Conexão resiliente com reconexão automática e dead-letter queues | **OPERACIONAL** |
| **PostgreSQL 16** | Banco relacional com RLS e dados transacionais | Connection pool Prisma, papel sem superusuário (`prospector_app`) | **OPERACIONAL** |

---

## 4. ENDPOINTS LEGADOS E BLOQUEIOS INTENCIONAIS (STATUS 503)

Em conformidade com a auditoria forense do Plano Mestre:
- Endpoints de discagem legados em `src/features/cadence/dialer/interface/http/server.ts` retornam intencionalmente `503 MODULE_NOT_READY`.
- Essa restrição é um controle de segurança defensivo para impedir o acionamento de rotas não homologadas fora do novo cockpit VoiceHub.
- A aplicação principal e os testes de integração operam exclusivamente sobre o novo cockpit `src/lib/voice-hub` e `VoiceHubView.tsx`, onde todas as 53 rotas estão plenamente ativas e seguras.
