# CATÁLOGO DE FONTES E SINAIS DE MERCADO — MARKET SENSING
**Projeto:** Birth Hub 360°  
**Eixo:** 12 — Market Sensing & Inteligência Exógena  
**Contrato:** `src/shared/contracts/marketSignals.contract.ts`  
**Serviço:** `src/features/market-intelligence/server/marketSensing.service.ts`  

---

## 1. Categorias de Sinais Exógenos Monitorados

| Categoria | Descrição | Fontes Prioritárias | Impacto Comercial no CRM |
|---|---|---|---|
| `regulatory_change` | Mudança regulatória ou tributária setorial | Diários Oficiais, Portais Governamentais | Gatilho para abordagem consultiva de conformidade |
| `leadership_change` | Troca de executivo C-Level / Diretor | Comunicados de imprensa, fontes públicas | Oportunidade de reaproximação e reabertura de diálogo |
| `mna` | Fusão, aquisição ou investimento | Portais de negócios, CVM | Consolidação de fornecedores e revisão de contas |
| `hiring_surge` | Sinais de contratação em massa em área estratégica | Vagas públicas, sites de carreiras | Expansão de infraestrutura e capacidade produtiva |
| `geographic_expansion` | Abertura de nova unidade, fábrica ou filial | Notícias corporativas, anúncios oficiais | Prospecção de novas contas e cross-sell regional |
| `tech_adoption` | Implantação de nova tecnologia ou ERP | Notícias técnicas, licitações | Demanda por integração e interoperabilidade |
| `competitor_event` | Lançamento de produto ou crise de concorrente | Imprensa especializada | Defesa de base e combate a objeções |

---

## 2. Pipeline de Processamento e Deduplicação

```
Fonte Externa -> Ingestão Autorizada -> Sanitização PII -> Hash SHA-256 (Deduplicação) -> Classificação de Relevância -> Vinculação a Conta/Setor -> Publicação de MARKET_SIGNAL_DETECTED -> Alerta no Radar RevOps
```

1. **Deduplicação Criptográfica:** Cada sinal gera um hash SHA-256 a partir de `title + sourceUrl + publishedAt`. Sinais idênticos são descartados antes de consumir processamento de IA.
2. **Expirabilidade Temporal:** Sinais possuem validade temporal definida (`validUntil`). Sinais vencidos não geram alertas comerciais ativos.
3. **Isolamento de Tenant:** Quando um sinal é vinculado a uma conta do CRM, ele recebe obrigatoriamente o `organizationId` do tenant, impedindo qualquer vazamento cross-tenant.
