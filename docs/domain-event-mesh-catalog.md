# Catálogo de Eventos — DomainEventMesh
**Versão:** 1.0.0 — Onda 01  
**Proprietário:** Agente 18 (Contratos e API) & Agente 16 (Runtime e Workers)  

---

## 1. Estrutura Canônica do Envelope

Todos os eventos trafegados pelo `DomainEventMesh` implementam `DomainEventEnvelope<T>` (`src/shared/contracts/domainEventMesh.contract.ts`):

- `eventId`: UUID único prefixado (`evt-<uuid>`).
- `eventType`: Identificador nominal do evento em screaming snake case.
- `eventVersion`: SemVer do contrato do payload (ex.: `1.0.0`).
- `organizationId`: Identificador do tenant proprietário (Obrigatório, sem cross-tenant).
- `correlationId`: Identificador da jornada ponta a ponta.
- `causationId`: Rastro causal da sequência de eventos (ex.: `evt-1->evt-2`), com limite máximo de 5 saltos contra tempestades recursivas.
- `occurredAt`: Timestamp ISO 8601 da ocorrência.
- `producer`: Nome do módulo emissor.
- `aggregateId`: ID da entidade raiz de agregação.
- `payload`: Dados estruturados minimizados (livres de PII bruta).

---

## 2. Eventos Canônicos Homologados

### 1. `MOBILE_MEETING_AUDIO_SYNCED`
- **Produtor:** Capacidade 6 — Mobile (`src/features/mobile`)
- **Consumidores:** VoiceHub / Copiloto IA (`src/features/copiloto-ia`), RevOps (`src/features/signals-risks`)
- **Finalidade:** Disparar transcrição de campo, conciliação com CRM e análise preliminar de riscos.

### 2. `VOICE_CALL_COMPLETED`
- **Produtor:** Capacidade 5 — VoiceHub (`src/features/voice-hub`)
- **Consumidores:** Data Flywheel (`src/features/playbook/services`), Cadência (`src/features/cadence`)
- **Finalidade:** Persistir resultado da chamada, analisar transcrição para extração de objeções e destravar toques da cadência.

### 3. `TRANSCRIPTION_COMPLETED`
- **Produtor:** Copiloto IA / Worker Whisper (`src/lib/queue`)
- **Consumidores:** Data Flywheel, RevOps
- **Finalidade:** Fornecer texto transcrito minimizado para classificação semântica e detecção de padrões.

### 4. `COMMERCIAL_OBJECTION_DETECTED`
- **Produtor:** Data Flywheel (`curatedObjectionService`)
- **Consumidores:** Mesa de Curadoria, Swarm Learning Agent
- **Finalidade:** Iniciar ciclo de validação de objeção real com score de confiança e categorização.

### 5. `COMMERCIAL_OBJECTION_PROMOTED`
- **Produtor:** Mesa de Curadoria / Playbook (`curatedObjectionService`)
- **Consumidores:** Capacidade 3 — Roleplay (`PlaybookRoleplayAdapter`), Gamificação (`src/features/gamification`)
- **Finalidade:** Disponibilizar novo cenário e objeção viva nas personas do Roleplay e conceder pontos ao curador.

### 6. `DEAL_RISK_SPIKED`
- **Produtor:** Capacidade 1 — RevOps (`dealRiskDetection.service.ts`)
- **Consumidores:** Cockpit do Gestor, Roleplay
- **Finalidade:** Alertar silêncio prolongado ou frio emocional no lead e sugerir treino corretivo.

### 7. `ROLEPLAY_SESSION_MASTERED`
- **Produtor:** Capacidade 3 — Roleplay (`RoleplayAiService`)
- **Consumidores:** Capacidade 2 — Gamificação (`src/features/gamification`), RevOps
- **Finalidade:** Conceder badge e pontuação com idempotência e registrar prontidão comercial do vendedor.

### 8. `SOCIAL_APPROACH_SENT`
- **Produtor:** Capacidade 4 — Social Selling (`src/features/social-selling`)
- **Consumidores:** Commercial Learning Flywheel (`commercialLearningFlywheel`)
- **Finalidade:** Iniciar janela de atribuição causal para futura promoção como few-shot copy.

### 9. `CRM_MEETING_SCHEDULED`
- **Produtor:** CRM / Bitrix24 (`src/features/crm`)
- **Consumidores:** Commercial Learning Flywheel, Gamificação
- **Finalidade:** Fechar elo de atribuição da abordagem enviada e qualificar copy para a biblioteca de exemplos.

### 10. `DEAL_WON`
- **Produtor:** CRM / Bitrix24 (`src/features/crm`)
- **Consumidores:** Commercial Learning Flywheel, Similar Deals Engine, Gamificação
- **Finalidade:** Consagrar padrão comercial como vitória de alta confiança e enriquecer base de casos similares.

### 11. `DEAL_LOST`
- **Produtor:** CRM / Bitrix24 (`src/features/crm`)
- **Consumidores:** RevOps, Swarm Win/Loss Worker
- **Finalidade:** Disparar análise de perda e alimentar novas hipóteses de objeções.

### 12. `KNOWLEDGE_DOCUMENT_REVOKED`
- **Produtor:** Base de Conhecimento / LGPD (`src/features/knowledge`)
- **Consumidores:** Semantic Cache (`semanticCache`), Search Index, Curated Objections
- **Finalidade:** Propagar expurgo imediato de documentos ou dados revogados pelo titular em todos os caches e vetores.
