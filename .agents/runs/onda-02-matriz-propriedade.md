# MATRIZ DE PROPRIEDADE E CONCORRÊNCIA — ONDA 02
**Projeto:** BIRTH HUB 360  
**Onda:** `02 — Inteligência Comercial Exógena`  
**Data:** 2026-10-18  
**Coordenador:** Agente 00  
**Auditor:** Agente 24  
**Branch de Integração:** `integracao/onda-02`  

---

## 1. Roster de Agentes Ativos na Onda 02

| Agente | Slot | Papel na Onda 02 | Branch Dedicada |
|---|:---:|---|---|
| **00 — Coordenador** | Slot 0 | Orquestração, baseline, governança e integração | `integracao/onda-02` |
| **04 — CRM e BI** | Slot 1 | FitScore preditivo, calibração ICP e detecção de churn/estagnação | `agente/04-onda-02-fitscore-churn` |
| **05 — Prospecção** | Slot 2 | Sinais de mercado (notícias, vagas) e Comitê de Decisão B2B | `agente/05-onda-02-sinais-comite` |
| **13 — Enxame Autônomo** | Slot 3 | Agentes de coleta e monitoramento de sinais em background | `agente/13-onda-02-enxame-sinais` |
| **18 — Contratos & API** | Slot 4 | Contratos compartilhados tipados em `src/shared/contracts/` | `agente/18-onda-02-contratos-sinais` |
| **24 — Revisão Independente**| Slot 5 | Auditoria contínua, verificação de gates e parecer formal | `agente/24-onda-02-auditoria` |

---

## 2. Matriz Disjunta de Arquivos (Propriedade Estrita)

```
src/shared/contracts/marketSignals.contract.ts
src/shared/contracts/decisionCommittee.contract.ts
src/shared/contracts/fitScore.contract.ts
→ Agente 18 (Contratos e API)

src/features/prospecting/services/enrichment/fitScore.ts
src/features/prospecting/services/enrichment/fitScoreCalibration.ts
src/features/analytics/services/churn-prediction.service.ts
→ Agente 04 (CRM e BI)

src/features/market-intelligence/domain/accountSignalTaxonomy.ts
src/features/prospecting/outbound/server/signals.ts
src/features/contacts/services/decision-committee.service.ts
src/features/signals-risks/**
→ Agente 05 (Prospecção)

src/features/intelligence/agents/churnRetention.agent.ts
src/features/market-intelligence/server/expansionSignalCollector.service.ts
→ Agente 13 (Enxame de Agentes)

.agents/runs/onda-02-*.md
.agents/plans/onda-02-*.md
→ Agente 00 (Coordenador)

.agents/reviews/onda-02-*.md
→ Agente 24 (Revisão Independente)
```

---

## 3. Regras de Exclusão Mútua e Concorrência

1. **Arquivos Compartilhados:** Nenhum especialista pode editar arquivos sob propriedade de outro agente sem handoff formal.
2. **Contratos Primeiro:** O Agente 18 entrega os contratos em `src/shared/contracts/` antes que Agente 04 e 05 consumam as interfaces.
3. **Sem Novas Dependências:** Uso estrito de bibliotecas já aprovadas em `package.json` (zod, crypto, prisma, bullmq).
4. **Isolamento de Tenants (RLS):** Toda busca de sinais ou pontuação de FitScore deve exigir e validar `organizationId`.
