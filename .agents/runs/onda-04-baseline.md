# BASELINE OPERACIONAL E MÉTRICAS — ONDA 04
**Onda:** 04 — Experiência Avançada: Voz em Tempo Real, Mentoria Inteligente, Mobile Edge AI, War Room e Personalização de Comunicação  
**Agente Responsável:** Agente 00 — Coordenador / Agente 10 — Infraestrutura, Observabilidade e SRE  
**Data:** 2026-10-18  
**Base:** `main` (commit `205ff990`)  
**Branch de Integração:** `integracao/onda-04`  

---

## 1. Estado dos Gates na Base de Partida

Antes do início da Onda 04, a integridade da base `main` foi validada com os seguintes resultados:

| Métrica / Gate | Comando Executado | Resultado Baseline | Status |
|---|---|:---:|:---:|
| **Typecheck** | `npm run typecheck` | 0 erros (`tsc --noEmit` limpo) | APROVADO |
| **Linter** | `npm run lint` | 0 erros | APROVADO |
| **Arquitetura** | `npm run test:architecture` | 0 violações (1667 arquivos verificados) | APROVADO |
| **Build Web** | `npm run build` | Bundle gerado, 179 entradas de precache | APROVADO |
| **Build Worker** | `npm run build:worker` | `dist/worker.cjs` (1019.2kb) em 116ms | APROVADO |
| **Suíte de Testes (Ondas 01-03)** | `npx vitest run ...` | 22 arquivos, 87 testes | 100% PASS |

---

## 2. Baseline de Latência e Desempenho de Voz

Na arquitetura atual (baseada em chamadas tradicionais REST e polling de transcrição):
- **Cadeia Atual (STT em lote -> LLM -> TTS):**
  - Tempo até primeiro áudio: 1.8s a 3.2s
  - Latência de resposta p50: 2.1s
  - Latência de resposta p95: 3.8s
  - Barge-in (Interrupção): Não suportado nativamente na camada HTTP/REST.

- **Meta da Solução Live (Bimodal Live via WebRTC/WebSocket bidirecional):**
  - Tempo até primeiro áudio: < 800ms
  - Latência de resposta p50: < 600ms
  - Latência de resposta p95: < 1.0s
  - Barge-in: Detecção e corte de áudio sintético em < 200ms
  - Fallback: Transição transparente para motor de lote em < 1.5s caso conexão WebRTC seja degradada.

---

## 3. Baseline do Mobile e Armazenamento Offline

- **`OfflineSyncService`:**
  - Suporte a fila de mutações idempotentes com SQLite/IndexedDB local.
  - Armazenamento em cache de briefings e notas comerciais.
- **Geofencing:**
  - Modelo consentido: detecção de perímetro geográfico de contas cadastradas com sugestão voluntária de abertura de briefing. Nenhuma gravação ou ação externa automática.
