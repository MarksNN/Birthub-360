# Matriz de Produtores e Consumidores — DomainEventMesh
**Versão:** 1.0.0 — Onda 01  
**Proprietário:** Agente 16 & Agente 18  

---

| Evento Canônico | Produtor Primário | Consumidores Ativos | Garantia de Entrega | Idempotência |
|---|---|---|:---:|:---:|
| `MOBILE_MEETING_AUDIO_SYNCED` | C6 — Mobile | Copiloto IA, RevOps | At-least-once com Outbox | Por `aggregateId` (áudio hash) |
| `VOICE_CALL_COMPLETED` | C5 — VoiceHub | Data Flywheel, Cadência | At-least-once com Outbox | Por `callId` |
| `TRANSCRIPTION_COMPLETED` | Worker Whisper | Data Flywheel, RevOps | At-least-once com BullMQ | Por `transcriptId` |
| `COMMERCIAL_OBJECTION_DETECTED` | Data Flywheel | Mesa de Curadoria, Swarm | At-least-once | Por `cobjId` |
| `COMMERCIAL_OBJECTION_PROMOTED` | Curadoria | C3 — Roleplay, Gamificação | At-least-once com Outbox | Por `cobjId:version` |
| `DEAL_RISK_SPIKED` | C1 — RevOps | Cockpit Gestor, C3 — Roleplay | At-least-once | Por `dealId:riskDate` |
| `ROLEPLAY_SESSION_MASTERED` | C3 — Roleplay | C2 — Gamificação | At-least-once com Outbox | Por `sessionId` (evita duplicar pontos) |
| `SOCIAL_APPROACH_SENT` | C4 — Social Selling | Commercial Flywheel | At-least-once | Por `approachId` |
| `CRM_MEETING_SCHEDULED` | C1 — CRM / Bitrix | Commercial Flywheel, Gamificação | At-least-once | Por `meetingId` |
| `DEAL_WON` | C1 — CRM / Bitrix | Similar Deals, Commercial Flywheel | At-least-once | Por `dealId` |
| `DEAL_LOST` | C1 — CRM / Bitrix | RevOps, Swarm Win/Loss | At-least-once | Por `dealId` |
| `KNOWLEDGE_DOCUMENT_REVOKED` | Base Conhecimento / LGPD | Semantic Cache, VectorStore | Imediata / Broadcast | Por `documentId` |
