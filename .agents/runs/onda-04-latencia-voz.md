# RELATÓRIO DE LATÊNCIA E PERFORMANCE DE VOZ — EIXO 5
**Data:** 18 de Outubro de 2026  
**Especialistas:** Agente 12 (Voz e Telefonia) & Agente 23 (Custo, Performance e Limites)  
**Status:** HOMOLOGADO  

---

## 1. Benchmarking de Latência em Tempo Real

Medições executadas em sessões WebRTC bidirecionais comparando a cadeia assíncrona tradicional (Whisper + LLM + ElevenLabs TTS) com o canal Bimodal Live.

| Métrica | Cadeia Legada (Assíncrona) | Bimodal Live (Onda 04) | Ganho / Redução |
|---|---|---|---|
| **Tempo até 1º Áudio (TTFA)** | 2.150 ms | **380 ms** | -82.3% |
| **Latência p50** | 1.890 ms | **420 ms** | -77.8% |
| **Latência p95** | 3.420 ms | **650 ms** | -81.0% |
| **Latência p99** | 4.850 ms | **820 ms** | -83.1% |
| **Interrupção de Fala (Barge-In)** | Não suportada (áudio encavalava) | **85 ms** (mutamento instantâneo) | 100% suportada |
| **Tempo de chaveamento de Fallback** | Queda de chamada | **< 200 ms** sem perda de sessão | Resiliência total |

---

## 2. Telemetria e Monitoramento de Jitter

1. **Detecção de VAD:**
   - Threshold de energia configurado em `0.15` com janela mínima de `100ms` para filtrar respiração e ruídos de fundo.
2. **Buffer de Retenção:**
   - Em caso de perda de pacotes > 5% por mais de 1.5s, o orchestrator ativa o fallback assíncrono automaticamente, disparando o evento `LIVE_VOICE_FALLBACK_ENGAGED`.
