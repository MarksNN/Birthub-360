# INVENTÁRIO ARQUITETURAL DE REAPROVEITAMENTO — ONDA 04
**Data:** 18 de Outubro de 2026  
**Projeto:** BIRTH HUB 360°  
**Orquestrador:** Agente 00  
**Status:** HOMOLOGADO  

---

## 1. Mapeamento de Recursos e Reutilização

Conforme a Seção 4 do Master Prompt da Onda 04, nenhum novo SDK ou modelo é adicionado sem antes auditar os ativos existentes.

| Recurso | Arquivo Existente | Contrato Atual | Proprietário | Estado Operacional | Gap Identificado | Estratégia de Reaproveitamento |
|---|---|---|---|---|---|---|
| **Audio Stream Bridge** | `src/features/voice/audio-stream-bridge.ts` | `AudioPacket`, `BargeInConfig` | Agente 12 | **Reutilizável** | Faltava orquestração com AI Gateway e fallback | Integrar como camada física de buffer e VAD no `bimodalLiveOrchestrator.service.ts` |
| **WebRTC Channel** | `src/features/ai-voice/webrtc-channel.service.ts` | `BridgeHandshakeResponse` | Agente 12 | **Reutilizável** | Conexão SIP bridge sem métricas p50/p95/p99 | Estender para sessões interativas com barge-in |
| **Roleplay AI Engine** | `src/features/roleplay/services/roleplay-ai.service.ts` | `RoleplayPersona`, `RoleplayTurnInput` | Agente 07 | **Reutilizável** | Faltavam personas de mentoria metodológica e duelos | Reutilizar gateway LangChain e adicionar `MethodologicalTwin` e `WarRoomArena` |
| **Motor Comportamental** | `src/features/gamification/services/behavioralEngine.service.ts` | `IBehavioralEnginePort` | Agente 13 / 04 | **Reutilizável** | Não possuía pontuação direta para simulações War Room | Integrar `recordArenaPoints` garantindo idempotência e persistência real |
| **Gamificação Canônica** | `src/features/gamification/domain/Gamification.ts` | `calculateSellerLevel`, `XP` | Agente 13 | **Reutilizável** | Perfeito | Usar diretamente as regras canônicas de XP e níveis |
| **Offline Sync Mobile** | `src/features/mobile/offlineSync.service.ts` | `OfflineQueueItem`, `StorageAdapter` | Agente 09 | **Reutilizável** | Faltavam briefings pré-visita e geofencing consentido | Integrar no `mobileEdgeAi.service.ts` com cache seguro e limpeza em logout |
| **Social Selling Outreach** | `src/features/social-selling/server/socialSellingApproach.service.ts` | `GenerateApproachInput` | Agente 07 / 02 | **Reutilizável** | Abordagem genérica sem personalização de estilo pessoal | Adicionar motor `ShadowCopywriting` com consentimento e preservação factual |
| **AI Gateway & Usage Log** | `src/lib/ai/gateway.js`, `usage-log.js` | `getAiModel`, `logAiUsage` | Agente 07 / 23 | **Reutilizável** | Perfeito | Reutilizar para registro de tokens, latência e custo FinOps |
| **Event Mesh** | `src/lib/queue/domainEventMesh.service.ts` | `domainEventMesh` | Agente 16 | **Reutilizável** | Perfeito | Reutilizar para emissão de eventos assíncronos das 5 frentes |

---

## 2. Conclusão

Todos os 5 eixos da Onda 04 são extensões diretas de módulos pré-existentes, sem qualquer necessidade de instalar bibliotecas de terceiros ou criar sistemas redundantes.
