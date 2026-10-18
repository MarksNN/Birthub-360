# INVENTÁRIO DE REAPROVEITAMENTO — ONDA 02
**Projeto:** BIRTH HUB 360  
**Onda:** 02 — Inteligência Comercial Exógena  
**Data:** 2026-10-18  
**Coordenador:** Agente 00  

---

## Tabela Canônica de Reutilização de Componentes

| Componente | Arquivo de Origem | Contrato / Porta | Proprietário | Estado | Ação na Onda 02 |
|---|---|---|---|---|---|
| **DomainEventMesh** | `src/lib/queue/domainEventMesh.service.ts` | `IDomainEventMeshPort` | Agente 16 | Operacional (Onda 01) | Estendido cirurgicamente com 5 novos tipos de eventos da Onda 02 |
| **Data Flywheel** | `src/features/intelligence/services/commercialLearningFlywheel.service.ts` | `ICommercialLearningFlywheel` | Agente 07 | Operacional (Onda 01) | Conectado diretamente ao `WinLossAutopsyService` para absorver desfechos |
| **CuratedObjection** | `src/features/playbook/services/curatedObjection.service.ts` | `CuratedObjectionService` | Agente 07 | Operacional (Onda 01) | Reutilizado para promoção de objeções curadas da autópsia forense |
| **Playbook Adapter** | `src/features/playbook/infra/PlaybookRoleplayAdapter.ts` | `RoleplayPlaybookPort` | Agente 02 | Operacional (Onda 01) | Reutilizado para alimentar simulações de Roleplay com aprendizados vivos |
| **Agent Registry** | `src/features/intelligence/agents/commercialAgentRegistry.ts` | `CommercialAgentCatalog` | Agente 13 | Operacional (Onda 01) | Reutilizado para registro oficial dos 3 agentes táticos da Onda 02 |
| **PiiTokenizer** | `src/lib/pii/piiTokenizer.ts` | `IPiiTokenizerPort` | Agente 15 | Operacional (Onda 01) | Reutilizado na sanitização de dados exógenos e anonimização de transcrições |
| **SemanticCache** | `src/lib/cache/semanticCache.ts` | `ISemanticCachePort` | Agente 23 | Operacional (Onda 01) | Reutilizado para deduplicação e controle de custos de consultas a LLM |
| **Prisma Client & RLS** | `src/lib/prisma.ts` | `executeWithRls` | Agente 01 | Operacional (Onda 00) | Reutilizado com garantia de isolamento por `organizationId` em todas as consultas |
| **Logger Central** | `src/lib/logger.ts` | Pino Logger | Agente 10 | Operacional (Onda 00) | Reutilizado para observabilidade e rastreabilidade de eventos e decisões |

---

## Decisão Arquitetural: Não Proliferação de Mecanismos Paralelos
- **Nenhum banco de grafos externo (ex: Neo4j) foi instalado**: o Grafo Semântico de Contas e Decisores foi estruturado com grafo lógico tipado sobre a infraestrutura existente do PostgreSQL/Prisma, prevenindo complexidade operacional e custos de infraestrutura desnecessários.
- **Nenhum segundo framework de agentes (ex: LangChain / CrewAI) foi adicionado**: os 3 agentes táticos foram integrados ao ecossistema nativo do Swarm em `commercialAgentRegistry.ts`, garantindo observabilidade, governança de tokens e controle por tenant.
