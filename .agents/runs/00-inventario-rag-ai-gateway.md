# INVENTÁRIO DE RAG, AI GATEWAY E FINOPS — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Arquitetura de Recuperação da Informação (RAG)

### 1.1 Diagnóstico de Infraestrutura Vetorial (Qdrant vs. pgvector)
- **Achado Forense:** O banco vetorial dedicado Qdrant não existe no código-fonte, no `package.json` nem no `docker-compose.yml`. A menção histórica foi categorizada como **SUBSTITUÍDA**.
- **Solução Implementada e Ativa:** A plataforma adotou o **PostgreSQL 16 com extensão nativa `pgvector`** (`pgvector/pgvector:pg16` provisionada na porta 5434), gerida pelo script `scripts/setup-vector-db.ts`.
- **Benefícios Arquiteturais:**
  1. **Transacionalidade ACID Unificada:** Dados relacionais de leads/empresas e seus respectivos embeddings residem no mesmo banco de dados, eliminando drifts de sincronização.
  2. **Tenancy Nativo em Nível de Linha (RLS):** As consultas vetoriais herdam automaticamente as políticas de Row Level Security do PostgreSQL sob o papel `prospector_app`.
  3. **Menor Custo Operacional:** Dispensa a manutenção de um cluster adicional de banco vetorial dedicado.

### 1.2 Pipeline de Busca Híbrida e Reranking
Implementado em `src/features/knowledge/search.service.ts`:
1. **Busca Vetorial Densa:** Cálculo de distância por similaridade de cosseno (`<=>`) sobre vetores de 1536 dimensões indexados com IVFFlat/HNSW no PostgreSQL.
2. **Busca Textual Esparsa:** Consulta full-text nativa do Postgres utilizando dicionário em português (`to_tsvector('portuguese', content) @@ plainto_tsquery('portuguese', query)`).
3. **Fusão Recíproca de Rankings (RRF):** Algoritmo Reciprocal Rank Fusion com constante canônica $k=60$:
   $$RRF(d) = \sum_{m \in \{dense, sparse\}} \frac{1}{60 + rank_m(d)}$$
4. **Reranking Fail-Safe:** Avaliação contextual dos top-K candidatos via LLM leve (`src/features/knowledge/services/reranker.service.ts`), com fallback imediato para o score RRF caso o provedor de IA oscile.

### 1.3 Isolamento Multi-Tenant no RAG
- **Garantia de Segurança:** O filtro `WHERE organization_id = $1` é injetado diretamente na query SQL do banco antes do cálculo de produto escalar ou similaridade.
- **Proibição de Pós-Filtragem:** É estritamente proibido buscar os top-K vetores globais e filtrar por tenant em memória na aplicação (o que causaria vazamento de metadados e exaustão de contexto).

---

## 2. AI Gateway, Resiliência e Provedores

Implementado em `src/lib/ai/gateway/`:

### 2.1 Provedores de Modelos Homologados
- **Groq Provider (`providers/groq.provider.ts`):** Provedor primário de inferência de ultra-baixa latência (modelos `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`), validado localmente com saída estruturada em 1.9s a 3.5s.
- **LiteLLM Gateway (`providers/litellm.provider.ts`):** Interface corporativa com suporte a failover e balanceamento multi-nuvem.
- **OpenAI & OpenRouter (`providers/openai.provider.ts`, `openrouter.provider.ts`):** Provedores secundários para tarefas complexas de raciocínio.
- **vLLM Provider (`providers/vllm.provider.ts`):** Suporte nativo para inferência auto-hospedada em hardware on-premises/privado.

### 2.2 Mecanismos de Tolerância a Falhas
1. **Circuit Breaker Distribuído (`circuit-breaker.ts`):** Monitora falhas consecutivas e latência no Redis. Se um provedor falhar 3 vezes consecutivas, o circuito abre temporariamente (30s) e desvia o tráfego para o provedor secundário da cascata (`model-cascade.ts`).
2. **Exponential Backoff com Jitter (`retry.ts`):** Retentativas automáticas para erros transientes de rede (429, 502, 503, 504) com espaçamento pseudo-aleatório para prevenir efeito manada (*thundering herd*).
3. **Prompt Safety & Injeção de Contexto (`prompt-safety.ts`):** Sanitização rigorosa via `wrapUntrustedContent`, delimitando dados do usuário e de leads com tags semânticas invioláveis para prevenir ataques de prompt injection.
4. **Mascaramento e Redação de PII (`redaction.ts`):** Substituição de CPF, telefones pessoais e cartões por tokens antes do envio a provedores de LLM externos.

---

## 3. FinOps, Governança de Custos e Token Quota

Implementado em `src/lib/ai/finops/tokenQuota.service.ts` (20.7 KB):
- **Contabilidade Precisa por Tenant:** Registro de tokens de entrada (prompt tokens), tokens de saída (completion tokens) e custo financeiro estimado em dólares e reais.
- **Teto Orçamentário Diário:** Limite configurável por organização. Quando o consumo atinge 80%, alertas de aviso são emitidos via SSE; ao atingir 100%, operações não-críticas de enriquecimento são pausadas graciosamente com retorno HTTP 429 e mensagem clara ao usuário.
- **Auditoria de Uso:** Registro assíncrono em banco de dados (`AILog`), auditado por testes de concorrência e tenant isolation.
