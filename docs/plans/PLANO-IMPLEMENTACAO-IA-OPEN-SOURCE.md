# Plano de Implementação - IA Open Source

**Data:** 2026-09-28  
**Responsável:** Agente 07 — IA e Automações  
**Coordenação:** Agente 00 — Coordenador  
**Estratégia:** 8 agentes simultâneos (máximo permitido por AGENTS.md)  
**Tempo total estimado:** 34 dias (~7 semanas)

## Visão Geral

Implementar 10 ferramentas de IA 100% open source para substituir/potencializar dependências pagas, mantendo compatibilidade com o gateway existente (`src/lib/ai/gateway/`).

**Critérios de sucesso:**
- Zero lock-in de vendor
- RLS multi-tenant preservado em todas as ferramentas
- Observabilidade unificada (Phoenix)
- Guardrails de PII ativos
- Self-hosted em infraestrutura controlada

---

## Detalhamento por Ferramenta (Referência para Handoffs)

### Guardrails AI
- **Arquivos:** `src/lib/ai/guardrails/**`
- **Env:** `GUARDRAILS_CONFIG`
- **Testes:** `tests/unit/ai/guardrails.test.ts`

### Zod Structured Outputs
- **Arquivos:** `src/lib/ai/schemas/**`, `src/lib/ai/structured/**`
- **Testes:** `tests/unit/ai/structured.test.ts`

### Qdrant
- **Arquivos:** `src/lib/ai/embeddings/qdrant.ts`
- **Env:** `QDRANT_URL`
- **Prisma:** `DocumentEmbedding` (Agente 01)
- **Docker:** Qdrant container (Agente 10)

### vLLM
- **Arquivos:** `src/lib/ai/gateway/providers/vllm.provider.ts`
- **Env:** `VLLM_BASE_URL`
- **Docker:** vLLM container com GPU (Agente 10)
- **BullMQ:** Ajuste de concorrência (Agente 16)

### LlamaIndex
- **Arquivos:** `src/lib/ai/knowledge/**`
- **Rotas:** `/api/knowledge/upload`, `/api/knowledge/query`
- **UX:** `KnowledgeUpload.tsx`, `KnowledgeSearch.tsx` (Agente 02)

### Coqui TTS
- **Arquivos:** `src/lib/voice/tts/coqui.provider.ts`
- **Env:** `COQUI_TTS_URL`
- **Docker:** Coqui container (Agente 10)
- **Voice:** Integração Birth Voice (Agente 12)

### LangGraph
- **Arquivos:** `src/lib/ai/workflows/**`
- **Prompts:** Definição por nó (Agente 13)
- **BullMQ:** Integração com filas (Agente 16)

### Phoenix
- **Arquivos:** `src/lib/ai/telemetry/phoenix.ts`
- **Env:** `PHOENIX_URL`
- **Docker:** Phoenix container (Agente 10)
- **Harness:** Integração (Agente 14)

### W&B Self-Hosted
- **Arquivos:** `src/lib/ai/telemetry/wandb.ts`
- **Env:** `WANDB_BASE_URL`, `WANDB_API_KEY`
- **Docker:** W&B container (Agente 10)
- **UX:** Dashboard analytics (Agente 02)

### Ollama Fallback
- **Arquivos:** `src/lib/ai/gateway/providers/litellm.provider.ts` (existente)
- **Env:** `OLLAMA_BASE_URL`
- **Monitoramento:** Health check (Agente 10)

---

## Matriz de Risco

| Ferramenta | Risco | Mitigação |
|------------|-------|-----------|
| vLLM | Requer GPU cara | Iniciar com T4, escalar para A10 se necessário |
| Qdrant | Single point of failure | Deploy em cluster (3 nós) com replica |
| LlamaIndex | Overhead de memória | Limitar tamanho de documento (10MB) |
| Coqui TTS | Qualidade inferior a ElevenLabs | Testar com usuários antes de produção |
| LangGraph | Curva de aprendizado | Documentação extensiva + treinamento |
| Phoenix | Sobrecarga de traces | Sampling de 10% em produção |
| W&B | Overhead de logs | Batch de logs, enviar a cada 60s |
| Guardrails | Falsos positivos | Whitelist de termos legítimos |
| Zod | Falha de validação | Retry com fallback para parsing manual |
| Ollama | Gargalo de throughput | Usar apenas em emergência |

---

## Estrutura de Ondas (8 Agentes Simultâneos)

Conforme AGENTS.md, o Coordenador (00) ocupa 1 slot. Podem executar até **8 especialistas simultâneos** com isolamento por worktree/branch.

### Onda 1 — Fundação de Segurança e Dados (7 dias)

**Agentes simultâneos (8/8):**
1. **Agente 07** — Guardrails AI (lógica)
2. **Agente 07** — Zod Structured Outputs (lógica)
3. **Agente 01** — Schema Prisma (tabela DocumentEmbedding)
4. **Agente 15** — Revisão de políticas PII
5. **Agente 10** — Deploy Qdrant (Docker)
6. **Agente 07** — Cliente Qdrant (lógica)
7. **Agente 02** — UX básica de upload de conhecimento
8. **Agente 14** — Test harness para segurança

**Branch:** `integracao/onda-ia-1`  
**Worktrees:** `../wt-agente-07-security`, `../wt-agente-01-data`, `../wt-agente-10-infra`, `../wt-agente-15-security-applied`, `../wt-agente-02-ux`, `../wt-agente-14-harness`

**Matriz de propriedade:**
- `src/lib/ai/guardrails/**`: Agente 07
- `src/lib/ai/schemas/**`: Agente 07
- `prisma/schema.prisma`: Agente 01
- `docker-compose.yml`: Agente 10
- `src/lib/ai/embeddings/qdrant.ts`: Agente 07
- `src/features/knowledge/**`: Agente 02
- `tests/security/**`: Agente 15
- `tests/harness/**`: Agente 14

**Handoffs:**
- 07 → 15: políticas de PII para revisão
- 07 → 01: solicitação de tabela DocumentEmbedding
- 10 → 07: endpoint Qdrant pronto
- 01 → 07: migration aplicada

**Gate por leva (2-3 merges):**
- Leva 1: Guardrails + Zod (Agente 07)
- Leva 2: Schema Prisma + Deploy Qdrant (Agente 01 + 10)
- Leva 3: Cliente Qdrant + UX básica (Agente 07 + 02)

---

### Onda 2 — Escala de Inferência e Conhecimento (10 dias)

**Agentes simultâneos (8/8):**
1. **Agente 10** — Provisionamento GPU + Deploy vLLM
2. **Agente 07** — Adapter vLLM + integração gateway
3. **Agente 16** — Ajuste de concorrência BullMQ
4. **Agente 07** — LlamaIndex (ingestão de documentos)
5. **Agente 02** — UI completa de conhecimento
6. **Agente 01** — Upload de arquivos (validação)
7. **Agente 12** — Deploy Coqui TTS
8. **Agente 07** — Adapter Coqui TTS

**Branch:** `integracao/onda-ia-2` (a partir de onda-ia-1)  
**Worktrees:** `../wt-agente-10-infra`, `../wt-agente-07-llm`, `../wt-agente-16-workers`, `../wt-agente-07-knowledge`, `../wt-agente-02-ux`, `../wt-agente-01-data`, `../wt-agente-12-voice`, `../wt-agente-07-tts`

**Matriz de propriedade:**
- `src/lib/ai/gateway/providers/vllm.provider.ts`: Agente 07
- `src/lib/ai/gateway/chat-model.ts`: Agente 07
- `src/lib/ai/knowledge/**`: Agente 07
- `src/features/knowledge/**`: Agente 02
- `src/lib/queue/**`: Agente 16
- `k8s/**`, `infrastructure/**`: Agente 10
- `src/lib/voice/tts/**`: Agente 07
- `android/**` (se TTS mobile): Agente 09

**Handoffs:**
- 10 → 07: endpoint vLLM pronto
- 07 → 16: integração com filas
- 16 → 07: concorrência ajustada
- 10 → 07: endpoint Coqui pronto
- 07 → 12: teste de qualidade de voz
- 01 → 07: validação de upload ok

**Gate por leva:**
- Leva 1: vLLM + GPU (Agente 10)
- Leva 2: Adapter vLLM + BullMQ (Agente 07 + 16)
- Leva 3: LlamaIndex + UI conhecimento (Agente 07 + 02)
- Leva 4: Coqui TTS (Agente 10 + 07 + 12)

---

### Onda 3 — Orquestração e Observabilidade (12 dias)

**Agentes simultâneos (8/8):**
1. **Agente 07** — LangGraph (workflow pipeline)
2. **Agente 13** — Definição de prompts por nó
3. **Agente 16** — Integração LangGraph + BullMQ
4. **Agente 10** — Deploy Phoenix
5. **Agente 07** — Cliente Phoenix + traces
6. **Agente 10** — Deploy W&B self-hosted
7. **Agente 07** — Cliente W&B + logs
8. **Agente 14** — Integração Phoenix no test harness

**Branch:** `integracao/onda-ia-3` (a partir de onda-ia-2)  
**Worktrees:** `../wt-agente-07-workflow`, `../wt-agente-13-swarm`, `../wt-agente-16-workers`, `../wt-agente-10-infra`, `../wt-agente-07-telemetry`, `../wt-agente-14-harness`

**Matriz de propriedade:**
- `src/lib/ai/workflows/**`: Agente 07
- `.agents/prompts/13-enxame-autonomo.md`: Agente 13 (readonly)
- `src/lib/queue/**`: Agente 16
- `k8s/**`, `infrastructure/**`: Agente 10
- `src/lib/ai/telemetry/**`: Agente 07
- `tests/harness/**`: Agente 14

**Handoffs:**
- 07 → 13: workflow definido, prompts por nó
- 13 → 07: prompts definidos
- 07 → 16: workflow pronto para filas
- 16 → 07: integração concluída
- 10 → 07: endpoints Phoenix + W&B prontos
- 07 → 14: telemetry integrada

**Gate por leva:**
- Leva 1: LangGraph + prompts (Agente 07 + 13)
- Leva 2: BullMQ + workflow (Agente 16)
- Leva 3: Phoenix + W&B (Agente 10 + 07)
- Leva 4: Test harness telemetry (Agente 14)

---

### Onda 4 — Fallback e Validação Final (5 dias)

**Agentes simultâneos (6/8):**
1. **Agente 07** — Ollama fallback (documentação + teste)
2. **Agente 10** — Health check vLLM + alertas
3. **Agente 14** — Suite de testes E2E completa
4. **Agente 08** — Gate completo (typecheck, lint, testes)
5. **Agente 15** — Varredura de segredos (gitleaks)
6. **Agente 00** — Coordenação + aprovação final

**Branch:** `integracao/onda-ia-4` (a partir de onda-ia-3)  
**Worktrees:** `../wt-agente-07-fallback`, `../wt-agente-10-infra`, `../wt-agente-14-harness`, `../wt-agente-08-qa`, `../wt-agente-15-security`

**Matriz de propriedade:**
- `src/lib/ai/gateway/providers/litellm.provider.ts`: Agente 07
- `k8s/**`, `infrastructure/**`: Agente 10
- `tests/e2e/**`: Agente 14
- `.github/workflows/**`: Agente 08
- `scripts/security/**`: Agente 15
- `AGENTS.md`, `.agents/runs/**`: Agente 00

**Handoffs:**
- 07 → 10: fallback configurado
- 10 → 07: health check pronto
- 14 → 08: testes E2E prontos
- 08 → 00: veredito do gate
- 15 → 00: varredura de segredos ok

**Gate por leva:**
- Leva 1: Fallback + health check (Agente 07 + 10)
- Leva 2: Testes E2E (Agente 14)
- Leva 3: Gate completo (Agente 08 + 15)
- Leva 4: Aprovação final (Agente 00)

---

## Estimativa de Esforço (Otimizado para 8 Agentes)

| Onda | Dias | Agentes Simultâneos | Ferramentas |
|------|------|---------------------|-------------|
| Onda 1 — Fundação | 7 dias | 8/8 | Guardrails, Zod, Qdrant, UX básica |
| Onda 2 — Escala | 10 dias | 8/8 | vLLM, LlamaIndex, Coqui TTS, BullMQ |
| Onda 3 — Orquestração | 12 dias | 8/8 | LangGraph, Phoenix, W&B, Test Harness |
| Onda 4 — Validação | 5 dias | 6/8 | Ollama fallback, E2E, Gate final |
| **Total** | **34 dias (~7 semanas)** | | |

**Ganho de tempo:** 65 dias → 34 dias (48% mais rápido)

---

## Critérios de Aceite por Onda

### Onda 1 — Fundação
- [ ] Guardrails AI instalado e testado
- [ ] Zod schemas definidos e validados
- [ ] Qdrant deployado e acessível
- [ ] Tabela DocumentEmbedding criada
- [ ] UX básica de upload funcional
- [ ] Test harness de segurança configurado

### Onda 2 — Escala
- [ ] vLLM com GPU operacional
- [ ] Adapter vLLM integrado ao gateway
- [ ] BullMQ ajustado para throughput
- [ ] LlamaIndex ingerindo documentos
- [ ] UX de conhecimento completa
- [ ] Coqui TTS sintetizando áudio

### Onda 3 — Orquestração
- [ ] LangGraph workflow definido
- [ ] Prompts por nó configurados
- [ ] Integração BullMQ funcionando
- [ ] Phoenix deployado e coletando traces
- [ ] W&B self-hosted operacional
- [ ] Test harness com telemetry

### Onda 4 — Validação
- [ ] Ollama fallback documentado e testado
- [ ] Health check vLLM ativo
- [ ] Testes E2E completos passando
- [ ] Gate completo aprovado (typecheck, lint, testes, secret scan)
- [ ] Observabilidade unificada validada
- [ ] RLS multi-tenant preservado
- [ ] Release aprovado pelo Agente 00

---

## Próximos Passos

1. Agente 00 aprovar este plano
2. Agente 00 criar branch `integracao/onda-ia-1` e worktrees para os 8 agentes
3. Publicar matriz de propriedade em `.agents/runs/onda-ia-1.md` antes do início
4. Iniciar Onda 1 (Fundação) com 8 agentes simultâneos
5. Gate por leva a cada 2-3 merges
6. Progressão sequencial: Onda 1 → 2 → 3 → 4
7. Validação final na Onda 4 com Agente 00 aprovando release

---

**Gerado por:** Agente Integrador IA-Plataforma  
**Revisão:** Pendente - Agente 00  
**Status:** Rascunho para aprovação
