# Catálogo de Contratos e Arquitetura RAG Híbrido Multi-Tenant
**Versão:** 1.0.0 — Onda 01  
**Proprietário:** Agente 07 (IA e Automações) & Agente 18 (Contratos e API)  

---

## 1. Pipeline Unificado de Recuperação Contextual

O AI Gateway do Birth Hub 360 opera sobre um motor híbrido de recuperação em dois estágios com fusão e re-ranking (`src/features/knowledge/search.service.ts`):

```
[Consulta Autorizada (com organizationId)]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
[Busca Vetorial (pgvector)]  [Busca Lexical (BM25 / TSVECTOR)]
   (Semântica, Cosseno)         (Código exato, CNPJ, termos técnicos)
         │                   │
         └─────────┬─────────┘
                   ▼
[Reciprocal Rank Fusion (RRF, k=60)]
                   ▼
[Filtro de Permissões RBAC & RLS]
                   ▼
[Re-ranking Contextual (rerankerService)]
                   ▼
[Sanitização com wrapUntrustedContent]
                   ▼
[Injeção no Prompt do AI Gateway com Citação de Fontes]
```

---

## 2. Garantias de Isolamento Multi-Tenant

1. **Contexto de Transação RLS:** Todas as consultas executam dentro de `withRlsContext(organizationId, ...)`, configurando `SET LOCAL app.current_tenant_id`.
2. **Cláusula WHERE Redundante:** Todas as consultas SQL/Prisma incluem explicitamente `WHERE organizationId = $1`.
3. **Impossibilidade de Contaminação:** Mesmo que o motor de busca não encontre documentos para o tenant, ele devolve lista vazia; nunca completa com dados de outros inquilinos.

---

## 3. Recuperação de Casos Comerciais Similares (`SimilarDealsService`)

- **Objetivo:** Fornecer histórico de negociações ganhas (`DEAL_WON` / `Negocios_Ganhos`) para enriquecer abordagens no Social Selling (C4) e cenários de simulação no Roleplay (C3).
- **Limite:** Até 3 negociações mais relevantes do mesmo tenant e segmento.
- **Proteção:** Apresentado ao modelo como histórico de evidência, delimitado por tags `<untrusted_external_content>`, nunca como instruções imperativas de sistema.

---

## 4. Governança e Ciclo de Vida do Conhecimento

- **Frescor e Versão:** Documentos incrementam `version` a cada reindexação de conteúdo.
- **Revogação / Direito ao Esquecimento:** Evento `KNOWLEDGE_DOCUMENT_REVOKED` invalida simultaneamente o cache semântico e remove os chunks dos vetores de busca do tenant.
