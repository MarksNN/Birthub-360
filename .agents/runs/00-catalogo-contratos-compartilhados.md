# CATÁLOGO DE CONTRATOS COMPARTILHADOS E FRONTEIRAS ARQUITETURAIS — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Princípio da Inversão de Dependência e Desacoplamento Hexagonal

Para impedir que a evolução contínua da plataforma gere acoplamento espaguete entre módulos funcionais, o Birth Hub 360 adota estritamente:
1. **Regra `no-cross-feature-imports`:** Monitorada pelo Dependency Cruiser (`.dependency-cruiser.cjs`). Uma pasta em `src/features/<modulo-a>/` é terminantemente proibida de importar arquivos internos de `src/features/<modulo-b>/`.
2. **Contratos em `src/shared/contracts/`:** Todas as trocas de mensagens e dados entre features operam exclusivamente através de interfaces TypeScript e portas hexagonais declaradas neste diretório.
3. **Composition Root (`src/shared/di/setup.ts`):** O único local do sistema autorizado a conhecer múltiplos módulos simultaneamente, instanciando os adaptadores concretos e registrando-os no Container de Injeção de Dependências (`container.ts`).

---

## 2. Inventário dos 12 Contratos Compartilhados Oficiais

### 2.1 `LiveCallRiskPort` (`liveCallRisk.contract.ts`)
- **Propósito:** Ingestão de sinais de sentimentos, objeções e concorrentes identificados em reuniões ou chamadas de áudio diretamente no motor de detecção de risco de oportunidades (RevOps).
- **Consumidores:** `src/features/mobile/`, `src/features/voice-hub/`.
- **Implementação:** `CommercialIntelligenceUseCases.ingestLiveCallInsight`.
- **Assinatura Chave:**
  ```typescript
  export interface LiveCallRiskPort {
    ingestLiveCallInsight(
      organizationId: string,
      insight: LiveCallInsightInput,
      now?: Date,
      options?: { notify?: boolean }
    ): Promise<unknown>;
  }
  ```

### 2.2 `RoleplayPlaybookPort` (`roleplayPlaybook.contract.ts`)
- **Propósito:** Fornece os critérios de qualificação técnica e a matriz de objeções ativas do Playbook para alimentar as personas dinâmicas e o avaliador de SPIN Selling do Roleplay.
- **Consumidores:** `src/features/roleplay/application/RoleplayUseCases.ts`.
- **Implementação Concreta:** `PlaybookRoleplayAdapter` em `src/features/playbook/infra/`.
- **Assinatura Chave:**
  ```typescript
  export interface RoleplayPlaybookPort {
    findQualificationCriteria(organizationId: string): Promise<string[]>;
    findObjections(organizationId: string): Promise<string[]>;
  }
  ```

### 2.3 `CopilotoTranscriptionQueuePort` (`copilotoTranscription.contract.ts`)
- **Propósito:** Permite que recursos móveis e gravadores de campo enfileirem gravações de áudio para transcrição assíncrona no worker Whisper sem importar a infraestrutura BullMQ do Copiloto.
- **Consumidores:** `src/features/mobile/audioRecording.service.ts`.
- **Implementação:** Registrada no DI conectando à fila `transcribeConversationQueue`.

### 2.4 `CopilotoVoiceIngestionPort` (`copilotoVoiceIngestion.contract.ts`)
- **Propósito:** Canal de ingestão de ligações gravadas no discador SDR (VoiceHub) para análise semântica e geração de notas estruturadas pelo Copiloto IA.
- **Implementação:** `CopilotoVoiceIngestionAdapter` utilizando `MeetingSynthesisService`.

### 2.5 `BitrixLeadWritebackPort` (`bitrixWriteback.contract.ts`)
- **Propósito:** Atualização bidirecional de resumos de reuniões, tarefas concluídas e campos personalizados no CRM Bitrix24 a partir de análises geradas pelo Copiloto IA.
- **Implementação:** `BitrixLeadWritebackAdapter` em `src/features/integrations/bitrix/infra/`.

### 2.6 `StripeChargePort` (`stripeCharge.contract.ts`)
- **Propósito:** Reconciliação financeira no CRM360 (marcar fatura como Paga) somente após validação de cobrança confirmada na API da Stripe.
- **Implementação:** `StripeChargeAdapter` em `src/features/integrations/stripe/infra/`.

### 2.7 `DailyPlanContract` (`dailyPlan.contract.ts`)
- **Propósito:** Padroniza a lista de tarefas diárias do vendedor, conciliando agendas do Google Calendar, tarefas do Bitrix e alertas de estagnação do CRM.

### 2.8 `AnalyticsContract` (`analytics.contract.ts`)
- **Propósito:** DTOs imutáveis de eventos de transição de pipeline, cálculo de velocidade de vendas e atribuição de canais.

### 2.9 `MeetingSynthesisContract` (`meetingSynthesis.contract.ts`)
- **Propósito:** Estrutura normalizada de transcrição, identificação de participantes, dores relatadas e próximos passos acordados.

### 2.10 `NotificationContract` (`notification.contract.ts`)
- **Propósito:** Emissão de notificações em tempo real via Server-Sent Events (SSE) com isolamento por usuário e tenant.

### 2.11 `IngestionContract` (`ingestion.contract.ts`)
- **Propósito:** Ingestão de materiais de treinamento, PDFs e políticas comerciais para processamento de embeddings RAG.

### 2.12 `OpenapiRouteInventory` (`openapiRouteInventory.ts`)
- **Propósito:** Registro estático e tipado de todos os 73 prefixos de rota e 443 endpoints expostos, auditado pelo teste de drift `verify:openapi-drift`.

---

## 3. Diretriz para as Próximas Ondas

- **Regra de Ouro:** Não criar contratos especulativos com antecedência.
- **Evolução Segura:** Sempre que uma das 20 novas evoluções exigir comunicação entre dois domínios (ex.: Agente Closer comunicando com Assinatura Digital), deve-se definir primeiro a interface em `src/shared/contracts/`, submetê-la ao crivo do Agente 18 e registrá-la no container DI antes de implementar a lógica de negócio.
