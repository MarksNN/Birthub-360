# Plano de Execução de Onda — Evolução Estrutural do Enxame de IA (394 Agentes)

**Missão:** Planejamento e Arquitetura de Elevação das Capacidades, Autonomia Supervisionada e Aprendizado do Enxame  
**Projeto:** Birth Hub 360°  
**Data:** 2026-10-26  
**Agente:** 00 — Coordenador Global  
**Base:** `origin/main` (`03fa29a6fb6b1ccf8668bb5b13a9a41e673bba9a`)  
**Branch:** `jules/ci-04-integration-contracts-20261024`  
**Documento Executivo HTML:** [`docs/planejamento-onda-evolucao-enxame-ia.html`](file:///c:/Users/Marks/Documents/GitHub/Birthub-360/docs/planejamento-onda-evolucao-enxame-ia.html)  

---

## 1. Sumário e Diagnóstico

O ecossistema conta atualmente com 394 agentes (379 core + 15 célula comercial) com contratos, grants de capabilities, RBAC e isolamento de tenant 100% estabilizados. Contudo, para transformar essa rede em um enxame autônomo de alta performance, foram mapeadas 6 frentes estruturais de evolução que demandam orquestração entre especialistas de diferentes domínios, respeitando o [AGENTS.md](file:///c:/Users/Marks/Documents/GitHub/Birthub-360/AGENTS.md) §15.

---

## 2. Matriz de Propriedade e Alocação dos Especialistas

| Frente | Especialistas | Arquivos / Domínio sob Propriedade | Entregável Principal |
|---|---|---|---|
| **1. Tool Bindings Especializados** | 07 (IA) + 18 (Contratos) | `src/features/job-roles/catalog/*`, `scripts/capability-import/*` | Bindings tipados para domínios de marketing, finanças e CS; saneamento dos 5 bindings pendentes. |
| **2. Multi-Swarm Hierárquico** | 13 (Governança Enxame) + 07 (IA) | `src/features/intelligence/agents/supervisor.agent.ts` | Sub-swarms especializados e roteamento semântico por embeddings da missão. |
| **3. Persistência do Data Flywheel** | 01 (Dados) + 21 (LGPD) | `prisma/schema.prisma`, `prisma/migrations/**` | Tabelas relacionais com RLS para abordagens e exemplos few-shot; expurgo atômico na revogação. |
| **4. Inbox de Ações de IA** | 02 (UX) + 03 (Design/A11y) | `src/features/intelligence/components/*`, `src/App.tsx` | Painel de aprovação em 1 clique para tarefas, dossiês e forecast com conformidade WCAG AA. |
| **5. Golden Datasets & Evals** | 14 (Test Harness) + 08 (QA) | `scripts/evals/**`, `tests/evals/**` | Suíte de benchmarking de alucinação e extração tática com gate CI automatizado. |
| **6. Semantic Caching & FinOps** | 16 (Runtime) + 10 (Infra) + 23 (FinOps) | `src/lib/redis/**`, `src/lib/ai/gateway/**` | Cache semântico de respostas em Redis, reduzindo latência e consumo de tokens. |
| **Auditoria & Gate de Fechamento** | 24 (Revisão Independente) | `.agents/reviews/**` | Homologação final, diffs cirúrgicos e parecer conclusivo. |

---

## 3. Sequenciamento de Fases

1. **Fase 1 — Fundação de Dados & Saneamento de Contratos (Semana 1):** Agente 01 entrega o schema do Flywheel; Agente 07/18 entrega os tool bindings.
2. **Fase 2 — Orquestração & Interface de Aprovação Humana (Semana 2):** Agente 13 implementa o roteamento hierárquico; Agente 02/03 entrega o Inbox de Ações de IA.
3. **Fase 3 — Otimização FinOps, Cache e Evals (Semana 3):** Agente 16/10 ativa o cache no Redis; Agente 14/08 fecha os testes de fidelidade factual; Agente 24 audita e aprova.
