# CATÁLOGO DE RELACIONAMENTOS COMERCIAIS — KNOWLEDGE GRAPH
**Projeto:** Birth Hub 360°  
**Eixo:** 6 — Knowledge Graph  
**Contrato Canônico:** `src/shared/contracts/accountKnowledgeGraph.contract.ts`  
**Serviço:** `src/features/knowledge/services/accountKnowledgeGraph.service.ts`  

---

## 1. Tipos de Nós (Entities)

- `account`: Organização ou empresa cliente/prospect.
- `subsidiary`: Filial, braço operacional ou subsidiária corporativa.
- `decision_maker`: Executivo com autoridade formal de assinatura ou veto de compra.
- `influencer`: Membro do comitê de avaliação técnica, jurídica ou operacional.
- `opportunity`: Deal comercial registrado no pipeline do CRM.
- `competitor`: Player concorrente identificado durante as negociações.

---

## 2. Catálogo de Arestas e Tipos de Relacionamento

| Tipo de Relacionamento | Origem -> Destino | Grau de Certeza | Descrição |
|---|---|---|---|
| `WORKS_AT` | Decisor/Influenciador -> Conta | Confirmado | Vínculo empregatício formal ou cargo verificado |
| `REPORTS_TO` | Decisor/Influenciador -> Decisor | Confirmado / Hipótese | Linha de reporte hierárquico direto |
| `DECISION_MAKER_FOR` | Decisor -> Oportunidade | Confirmado | Papel de decisor econômico ou signatário no deal |
| `INFLUENCES` | Influenciador -> Decisor/Deal | Hipótese fundamentada | Capacidade de influenciar a decisão final |
| `PREVIOUSLY_WORKED_AT` | Decisor -> Conta Anterior | Histórico | Experiência prévia em empresa do ecossistema |
| `PARTICIPATED_IN_MEETING` | Decisor -> Oportunidade | Fato auditável | Presença registrada em call ou reunião comercial |
| `RELATED_TO_DEAL` | Conta/Decisor -> Oportunidade | Fato auditável | Associação direta com a negociação |
| `MENTIONED_COMPETITOR` | Oportunidade -> Concorrente | Fato auditável | Registro verbal ou documental de concorrência |
| `HAS_SUBSIDIARY` | Conta -> Filial | Fato corporativo | Vínculo societário ou filial cadastrada |

---

## 3. Atributos Canônicos de Cada Aresta

Cada aresta persistida possui obrigatoriamente:
- `organizationId`: Particionamento rígido de tenant.
- `sourceNodeId` e `targetNodeId`: Identificadores dos nós.
- `relationshipType`: Um dos tipos catalogados acima.
- `confidence`: Nível de certeza (`confirmed` | `inferred_hypothesis`).
- `provenance`: Origem do dado (`crm_manual` | `voice_call` | `market_signal` | `public_cnpj`).
- `discoveredAt` e `lastVerifiedAt`: Rastreabilidade temporal.
- `metadata`: Metadados adicionais sanitizados.
