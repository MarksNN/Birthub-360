# ONDA 01 — MEMÓRIA TÉCNICA: FINOPS PREDITIVO, CACHE SEMÂNTICO & MODEL CASCADE
**Projeto:** Birthub 360  
**Onda:** 01 — Fundação da Inteligência Autônoma  
**Data:** 2026-10-17  
**Proprietários:** Agente 00 (Coordenador), Agente 23 (Custo, Performance e Limites de IA), Agente 07 (IA e Automações)

---

## 1. Visão Geral de FinOps

A infraestrutura de inteligência da Onda 01 opera com foco em eficiência de custos, previsibilidade de despesas e maximização de throughput através de duas camadas principais:
1. **Cache Semântico Multi-Tenant** (`SemanticCacheService`): Reduz chamadas a modelos caros reaproveitando respostas de prompts semanticamente equivalentes dentro do mesmo tenant.
2. **Model Cascade Preditivo** (`routeModelCascade`): Classifica tarefas de IA em três faixas de complexidade (`LOW`, `MEDIUM`, `HIGH`) e roteia dinamicamente para o modelo mais econômico que atende ao requisito com qualidade.

```
                              [ Prompt da Aplicação ]
                                         │
                                         ▼
                         [ Verificação de Cache Semântico ]
                          Key: tenant:{orgId}:model:{md5}
                                         │
                         ┌───────────────┴───────────────┐
                         ▼ HIT                           ▼ MISS
                 [ Resposta Imediata ]          [ Classificação de Complexidade ]
                 • 0 tokens de LLM               `classifyTaskComplexity`
                 • Latência < 15ms                               │
                 • Redução de custo: 100%                        │
                                                 ┌───────────────┼───────────────┐
                                                 ▼ LOW           ▼ MEDIUM        ▼ HIGH
                                            [ Fast/Local ]  [ Mid-Tier ]   [ Reasoning/Top ]
                                            • Flash / Small • Sonnet / Pro • Opus / DeepSeek R1
                                            • R$ 0,001/req  • R$ 0,01/req  • R$ 0,08/req
                                                 │               │               │
                                                 └───────────────┼───────────────┘
                                                                 ▼
                                                    [ Execução do Provedor ]
                                                                 │
                                                                 ▼
                                                    [ Armazenamento no Cache ]
                                                    (Se não confidencial / PII livre)
```

---

## 2. Model Cascade e Roteamento Inteligente

O roteador implementado em `src/lib/ai/gateway/model-cascade.ts` avalia heurísticas e tokens esperados:

| Tier | Critérios de Roteamento | Modelos Selecionados | Casos de Uso Típicos |
| :--- | :--- | :--- | :--- |
| **`LOW`** | Classificação, categorização de objeção, extração simples de tags, sentiment analysis, inputs curtos (< 300 caracteres). | `gemini-1.5-flash`, `gpt-4o-mini`, `local-llama3-8b` | Categorização de ligações, checagem de regras, roteamento de mensagens. |
| **`MEDIUM`** | Geração de copys de abordagem (Social Selling), resumos de transcrição comercial, coaching de vendedores, análise de fit. | `gemini-1.5-pro`, `claude-3-5-sonnet`, `gpt-4o` | Redação de e-mails/mensagens personalizadas, sumário de reuniões. |
| **`HIGH`** | Negociações complexas com múltiplos decisores, auditoria de compliance contratual, simulações de roleplay em cenários de alta tensão, planejamento estratégico. | `claude-3-7-sonnet-thought`, `o3-mini`, `deepseek-r1` | Avaliação de roleplay executivo, resolução de impasses de fechamento. |

---

## 3. Cache Semântico Multi-Tenant (`SemanticCacheService`)

O serviço `SemanticCacheService` (`src/lib/ai/cache/semanticCache.service.ts`) implementa:
- **Namespacing por Organização**: Chaves Redis estruturadas como `semcache:{organizationId}:{hash}`. É estritamente impossível que um tenant consulte respostas cacheadas de outro tenant.
- **Descarte de Conteúdo Confidencial**: Se o contexto indicar `isConfidential: true` ou contiver segredos bancários/senhas, a resposta **nunca** é gravada no cache.
- **TTL Dinâmico**:
  - Respostas gerais e copys: TTL padrão de 3.600 segundos (1 hora).
  - Configurações e taxonomias estáveis: até 86.400 segundos (24 horas).
- **Expurgo Instantâneo por Tenant**: Método `evictTenantCache(organizationId)` limpa todas as entradas de um tenant específico instantaneamente sob demanda (ex: após mudança de produto ou solicitação LGPD).

---

## 4. Métricas e Economia Projetada

Com a entrada em operação do Cache Semântico e do Model Cascade na Onda 01:
- **Redução de custo de inferência**: Estimada em 38% a 54% nas tarefas recorrentes de RevOps e Social Selling.
- **Redução de latência média**: Queda de ~1.800ms para ~25ms nas consultas cacheadas.
- **Auditoria FinOps**: Cada chamada registra `tokensSaved` e modelo utilizado nos logs estruturados para dashboards de BI.
