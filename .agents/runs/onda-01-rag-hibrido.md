# ONDA 01 — MEMÓRIA TÉCNICA: RAG HÍBRIDO MULTI-TENANT & INTELIGÊNCIA CONTEXTUAL
**Projeto:** Birthub 360  
**Onda:** 01 — Fundação da Inteligência Autônoma  
**Data:** 2026-10-17  
**Proprietários:** Agente 00 (Coordenador), Agente 01 (Plataforma, Segurança e Dados), Agente 07 (IA e Automações)

---

## 1. Visão Geral

O sistema de **RAG Híbrido Multi-Tenant** da Onda 01 une busca esparsa (BM25 com pg_trgm no PostgreSQL), busca densa (embeddings vetoriais no Qdrant / pgvector) e fusão por **Reciprocal Rank Fusion (RRF com constante k=60)**, complementado por Contextual Retrieval e busca de **Negociações Similares** (`SimilarDealsService`).

```
                    [ Query do Usuário / Contexto do Lead ]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
        [ Busca Esparsa ]                             [ Busca Densa ]
        PostgreSQL BM25 / pg_trgm                     Qdrant / pgvector
        Filtro: organizationId                        Filtro: organizationId
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      ▼
                        [ Reciprocal Rank Fusion ]
                           RRF Score = ∑ 1 / (60 + Rank_i)
                                      │
                                      ▼
                      [ Reranker / Re-ordenação ]
                        Cross-Encoder / Contextual
                                      │
                                      ▼
                       [ Top-K Chunks Relevantes ]
                                      │
                                      ▼
               [ Enriquecimento com Casos de Sucesso ]
                     SimilarDealsService (Até 3 deals)
                                      │
                                      ▼
               [ Defesa de Prompt Injection (Gateway) ]
                   <untrusted_external_content> ... </...>
                                      │
                                      ▼
                     [ LLM Generation (Prompt Seguro) ]
```

---

## 2. Componentes e Contratos

### 2.1 Fusão RRF (Reciprocal Rank Fusion)
A fórmula canônica implementada segue:
$$RRF(d) = \frac{1}{60 + \text{rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{rank}_{\text{sparse}}(d)}$$

- A constante $k=60$ mitiga discrepâncias de escala entre os escores de similaridade por cosseno da busca vetorial e os escores BM25 de frequência de termos.
- Itens presentes no topo de ambos os retrievers recebem pontuação máxima, garantindo robustez a termos técnicos exatos e sinônimos contextuais.

### 2.2 Recuperação de Negociações Semelhantes (`SimilarDealsService`)
O serviço `SimilarDealsService` (`src/features/knowledge/similarDeals.service.ts`):
1. **Filtro Estrito de Tenancy**: Exige `organizationId` obrigatório e consulta exclusivamente negociações ganhas (`Negocios_Ganhos`, `Convertido_em_Oportunidade`) sob transação `withRlsContext`.
2. **Limite Defensivo**: Retorna até no máximo 3 negociações semelhantes. Se o tenant tiver apenas 1 ou 2 negócios ganhos no segmento, retorna apenas os existentes, **nunca inventando dados ou completando com dados de terceiros**.
3. **Prompt Injection Defense**: Todo dado recuperado do histórico passa por `wrapUntrustedContent`, sendo delimitado pela tag `<untrusted_external_content>` para evitar que anotações ou títulos maliciosos do lead manipulem o sistema de instruções do LLM.

---

## 3. Integração com as Capacidades

| Capacidade | Integração | Impacto |
| :--- | :--- | :--- |
| **C1 — RevOps** | Recuperação de playbooks de fechamento | Vendedor recebe na tela do lead exemplos de contratos ganhos semelhantes no mesmo segmento. |
| **C3 — Roleplay** | Obtenção de histórico de objeções reais | O avaliador de IA injeta objeções do segmento para testar o vendedor com fidelidade à realidade. |
| **C4 — Social Selling** | RAG sobre catálogo e personas | Copys geradas citam dados precisos de cases de sucesso do cliente sem alucinação. |
| **C5 — VoiceHub** | Sugestões em tempo real para agente | Durante a chamada, o assistente traz respostas rápidas e referências a deals passados. |

---

## 4. Garantia de Isolamento e Não-Cruzamento de Tenants

- **RLS no Banco**: Cada query SQL executa dentro de transação com `set_config('app.current_tenant_id', organizationId, true)`.
- **Filtros de Coleção Vetorial**: Todas as buscas no Qdrant ou pgvector aplicam cláusula de `must: [ { key: "organizationId", match: { value: tenantId } } ]`.
- **Teste de Regressão Multi-Tenant**: Validado em `tests/integration/onda-01/intelligenceCoreFlow.integration.test.ts` e `tests/unit/features/knowledge/similarDeals.service.test.ts`.
