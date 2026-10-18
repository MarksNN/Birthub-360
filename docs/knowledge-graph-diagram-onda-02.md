# DIAGRAMA DO GRAFO SEMÂNTICO DE CONTAS E DECISORES — ONDA 02
**Projeto:** Birth Hub 360°  
**Eixo:** 6 — Knowledge Graph & Multi-Threading Social Selling  
**Data:** 2026-10-18  

---

## 1. Diagrama Arquitetural de Nós e Relacionamentos (Mermaid)

```mermaid
graph TD
    subgraph OrganizationContext["Tenant Isolation (organizationId)"]
        ACC[Conta Principal / Empresa]
        FIL[Filial / Subsidiária]
        DEC_TECH[Decisor Técnico: Gerente de TI / CTO]
        DEC_FIN[Decisor Financeiro: CFO / Diretor Financeiro]
        DEC_EXEC[Decisor Executivo: CEO / Diretor Geral]
        INF[Influenciador: Coordenador de Operações]
        DEAL[Oportunidade Comercial: Migração Cloud]
        COMP[Concorrente Citado: Competitor X]
    end

    %% Relacionamentos Corporativos
    ACC -->|HAS_SUBSIDIARY| FIL
    DEC_EXEC -->|WORKS_AT| ACC
    DEC_FIN -->|WORKS_AT| ACC
    DEC_TECH -->|WORKS_AT| ACC
    INF -->|WORKS_AT| FIL
    
    %% Hierarquia e Influência
    DEC_TECH -->|REPORTS_TO| DEC_EXEC
    DEC_FIN -->|REPORTS_TO| DEC_EXEC
    INF -->|REPORTS_TO| DEC_TECH
    INF -->|INFLUENCES| DEC_TECH

    %% Relacionamentos Comerciais com Oportunidade
    DEC_EXEC -->|DECISION_MAKER_FOR| DEAL
    DEC_FIN -->|DECISION_MAKER_FOR| DEAL
    DEC_TECH -->|INFLUENCES| DEAL
    DEAL -->|MENTIONED_COMPETITOR| COMP
```

---

## 2. Multi-Threading para Social Selling (C4)

O Knowledge Graph expõe o método `getSocialSellingMultiThreadingContext(organizationId, accountId)`, que compõe abordagens sob medida para cada decisor:

| Perfil de Decisor | Foco da Abordagem | Tópicos Prioritários |
|---|---|---|
| **Decisor Técnico** | Arquitetura, segurança, integração | APIs REST, isolamento de dados, conformidade LGPD, SLA |
| **Decisor Financeiro** | Retorno sobre investimento, TCO, CAPEX/OPEX | Payback em meses, previsibilidade de custos, redução de desperdício |
| **Decisor Executivo** | Alinhamento estratégico e produtividade | Aceleração de crescimento, diferencial competitivo, governança |
| **Influenciador** | Usabilidade e rotina diária | Facilidade de adoção, automação de tarefas manuais, suporte humanizado |

Todas as abordagens são sugestões consultivas para o vendedor humano, respeitando a proibição de disparos autônomos não autorizados.
