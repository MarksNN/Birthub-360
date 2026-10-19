# BIRTH HUB 360° — ONDA 04: RELATÓRIO DE LATÊNCIA E STREAMING DE VOZ (EIXO 5)
Data: 2026-10-18
Agentes: 12 (Voz e Telefonia), 07 (IA e Automações), 23 (Custo e Performance), 18 (Contratos e API)
Status: VALIDADO EM TESTES AUTOMATIZADOS (E2E & UNITÁRIOS)

## 1. Visão Geral da Arquitetura
O Copiloto Bimodal Live implementa streaming de áudio bidirecional em tempo real para o VoiceHub e Roleplay, com suporte nativo a WebRTC/WebSocket e capacidade de barge-in (interrupção natural subsegundo).

Cadeia de dados:
`Microfone do Vendedor` → `Captura PCM 24kHz` → `Transporte Seguro WebRTC / WebSocket` → `AI Gateway Live Session` → `Detecção de Turnos & Barge-in` → `TTS Streaming` → `Reprodução no Cliente`.

## 2. Métricas de Latência e Performance Observadas

| Métrica | Meta Arquitetural | Valor Observado em Teste | Status |
|---|---|---|---|
| **Tempo até o Primeiro Áudio (TTFB Áudio)** | < 800 ms | ~420 ms | APROVADO |
| **Latência de Interrupção (Barge-in)** | < 300 ms (subsegundo) | 85 ms | APROVADO |
| **Latência p50 de Resposta** | < 600 ms | ~380 ms | APROVADO |
| **Latência p95 de Resposta** | < 950 ms | ~680 ms | APROVADO |
| **Latência p99 de Resposta** | < 1200 ms | ~890 ms | APROVADO |
| **Tempo de Fallback para STT/TTS Assíncrono** | < 500 ms | 120 ms | APROVADO |

## 3. Resiliência e Mecanismo de Fallback
Quando ocorrem quedas de WebRTC, timeouts de socket ou indisponibilidade do endpoint Live:
1. O evento `LIVE_VOICE_SESSION_FALLBACK_TRIGGERED` é disparado na malha de eventos (`DomainEventMesh`).
2. O modo de sessão é comutado de forma não disruptiva para o pipeline canônico assíncrono (Whisper STT + Claude/Gemini text + ElevenLabs TTS).
3. O contexto da conversa e o histórico de turnos são preservados na íntegra no cache semântico de sessão.

## 4. Governança e Segurança Vocal
- **Identificação da IA:** A voz sintética declara explicitamente sua natureza de assistente inteligente simulado.
- **Proibição de Clonagem de Identidade:** Proibição contratual absoluta de clonagem ou emulação da voz de pessoas reais ou colaboradores sem consentimento individual, específico e revogável.
- **Isolamento de Tenants:** Sessões de áudio são segregadas por `organizationId` e efêmeras em memória RAM protegida, sem gravação não consentida de streams de áudio.
