# MEMÓRIA TÉCNICA — EIXO 5: ARQUITETURA BIMODAL LIVE (VOZ EM TEMPO REAL E FALLBACK)
**Onda:** 04 — Experiência Comercial Avançada  
**Agente Responsável:** Agente 12 — Voz e Telefonia / Agente 07 — IA e Automações  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-04`

---

## 1. Contexto e Objetivo
Implementar o copiloto de voz em tempo real (`bimodalLive.service.ts`) para os módulos `VoiceHub` e `Roleplay`, permitindo conversação fluida subsegundo, streaming bidirecional via WebRTC/WebSocket, detecção precisa de turnos, interrupção natural do assistente (barge-in) e fallback automático resiliente para a cadeia assíncrona tradicional sem perda de estado.

---

## 2. Contratos e Interfaces Formais
Arquivo de contrato: `src/shared/contracts/bimodalLiveVoice.contract.ts`
- `BimodalSessionConfig`: Parâmetros da sessão (`sessionId`, `organizationId`, `sellerId`, `contextMode`, `personaName`, `enableBargeIn`).
- `LiveTurn`: Estrutura de turnos (`speaker: 'user' | 'assistant'`, `audioDurationMs`, `interrupted`, `timestamp`).
- `LiveLatencyMetrics`: Métricas em milissegundos (`timeToFirstAudioMs`, `latencyP50Ms`, `latencyP95Ms`, `latencyP99Ms`, `bargeInResponseMs`, `reconnectCount`, `packetsLost`).
- `IBimodalLiveVoicePort`: Porta canônica com métodos `createSession`, `sendAudioStream`, `triggerBargeIn`, `fallbackToAsync`, `closeSession`.

---

## 3. Implementação Técnica
Arquivo de serviço: `src/features/ai-voice/server/bimodalLive.service.ts`
- **Streaming Bidirecional e Detecção de Turnos:**
  - Gerenciamento de estado (`LISTENING`, `PROCESSING`, `SPEAKING`, `INTERRUPTED`, `FALLBACK`, `DISCONNECTED`).
  - Buffer de áudio com chunking otimizado para entrega contínua.
- **Barge-In (Interrupção Natural):**
  - Ao detectar voz do usuário durante a fala da IA, o método `triggerBargeIn` corta imediatamente o áudio sintético em < 200ms, marca o turno como interrompido e retorna ao modo de escuta ativa.
- **Fallback Resiliente:**
  - Caso haja degradação severa de rede ou instabilidade no canal WebRTC, o `fallbackToAsync` redireciona a sessão para o pipeline de STT e TTS assíncrono mantendo o histórico de turnos e contexto do diálogo.
- **Segurança da Voz e Conformidade:**
  - A IA permanece expressamente identificada como IA (`MANDATORY_VOICE_AI_DISCLOSURE`).
  - Proibição estrita de clonagem de voz ou identidade vocal de pessoas reais sem consentimento.

---

## 4. Evidências de Teste
- `tests/unit/ai-voice/bimodalLive.service.test.ts`:
  - [x] Criação de sessão WebRTC com latência subsegundo (`timeToFirstAudioMs` < 800ms).
  - [x] Processamento de streaming de áudio e transição de turnos.
  - [x] Corte de áudio por barge-in com latência < 250ms.
  - [x] Fallback resiliente para pipeline assíncrono.
  - [x] Multi-tenancy guard bloqueando acesso cross-tenant.
- `tests/integration/onda-04/onda04ComprehensiveFlow.integration.test.ts` (Jornada A).
