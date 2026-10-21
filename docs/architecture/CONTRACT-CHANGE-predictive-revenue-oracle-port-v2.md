# Mudança de contrato — `IPredictiveRevenueOraclePort` V2 (REMED-03/04)

- **Arquivo:** `src/shared/contracts/predictiveRevenueOracle.contract.ts`
- **Origem:** PR #15 (merge `27463513` na `main`)
- **Domínio de contrato/API:** Agente 18 (sem bot; registro feito pelo Agente 04)
- **Natureza:** **não estritamente aditiva** (o nome original mudou de assinatura)
- **Revisão:** Agente 24

## 1. O que mudou

| Antes (≤ `3a1611f5`) | Depois (`27463513`) |
|---|---|
| `IPredictiveRevenueOraclePort` retornava `ExecutiveRevenueCockpit`, `WhatIfSimulationResult`, `BacktestValidationMetrics` | Renomeado para **`IPredictiveRevenueOraclePortLegacy`** (`@deprecated`), sem `approveAccountAllocation` **e também sem `generateAccountAllocationRecommendations`** — só `getCockpitData`, `runWhatIfSimulation` e `getBacktestMetrics` |
| — | **`IPredictiveRevenueOraclePort`** (mesmo nome) agora retorna `ExecutiveRevenueCockpitV2`, `WhatIfSimulationResultV2`, `BacktestValidationMetricsV2`; mantém `generateAccountAllocationRecommendations` |
| `approveAccountAllocation({ organizationId, recommendationId, approvedBy }) → { success, executedAllocation }` | **Removido.** Aprovação passa a ser `POST /api/commercial-intelligence/predictive/rebalance/approvals` e **não** executa a troca no CRM (`appliedToCrm: false`) |

### Tipos novos
- `OracleDataStatus = 'ok' | 'insufficient_data'`
- `ProjectedRevenueHorizonV2`, `WhatIfSimulationResultV2`, `BacktestValidationMetricsV2`, `ExecutiveRevenueCockpitV2`
- `RebalanceApprovalRequest`, `RebalanceApprovalRecord`, `RebalanceApprovalResponse`

### Semântica V2 (honesta)
- Todo número vem do histórico real do tenant (Lead/funil Negócio + `ForecastSnapshot`). Abaixo dos mínimos: `status: 'insufficient_data'`, valores `null` e `insufficientDataReason` preenchido.
- Campos que viraram anuláveis: `expectedRevenue`, `confidenceInterval`, `projectedWonDealsCount`, `uncertaintyDegree`, `currentQuota`, `quotaAttainmentPercent`, `baselineRevenue`, `simulatedRevenue`, `netRevenueDelta`, `deltaPercent`, `impactBreakdown`, `meanAbsoluteError`, `meanAbsolutePercentageError`, `predictionBias`, `calibrationScore`, `predictionIntervalCoveragePercent`.
- `currentQuota: null` → a meta vem de `GET /api/commercial-intelligence/goals`.
- `dealsAtRisk` e `mainFunnelBottlenecks` sempre `[]` → usar `/deals` e `/funnel-bottlenecks`.
- `modelConfidence`: `'CALIBRATED_PROJECTION' | 'ESTIMATED_ONLY' | 'INSUFFICIENT_DATA'`. Backtest `status`: `'CALIBRATED' | 'UNCALIBRATED_ESTIMATE_ONLY' | 'INSUFFICIENT_DATA'`.

## 2. Endpoints (valores reais de `predictive.routes.ts` na `main`)

Montados em `/api/commercial-intelligence/predictive`, herdando `authenticateToken` + `requireTenant` e `requireRole(COMMERCIAL_INTELLIGENCE_ROLES)` = **ADMIN/GESTOR**. Envelope `{ success, data }`. `organizationId` sempre vem do token, nunca do body.

| Método | Path | Sucesso | Erros |
|---|---|---|---|
| GET | `/api/commercial-intelligence/predictive/cockpit` | 200 `{ success: true, data: ExecutiveRevenueCockpitV2 }` | 401/403 (auth/RBAC), 403 `Organização não identificada.` |
| GET | `/api/commercial-intelligence/predictive/backtest` | 200 `{ success: true, data: BacktestValidationMetricsV2 }` | idem |
| POST | `/api/commercial-intelligence/predictive/rebalance/approvals` | 201 (novo) ou 200 (replay idempotente, `alreadyRecorded: true`) `{ success: true, data: RebalanceApprovalResponse }` | 403; 404 lead fora do tenant; 409 decisão/payload divergente para o mesmo `recommendationId` (`data.existing`); 422 `Payload inválido.` com `details` |

Body do POST (zod `.strict()`):
```json
{
  "recommendationId": "string 1..128 (chave de idempotência)",
  "leadId": "string 1..64",
  "fromOwner": "string 1..200 | null",
  "toOwner": "string 1..200 (≠ fromOwner)",
  "decision": "APPROVED | REJECTED",
  "note": "string ≤1000 (opcional)"
}
```
Persistência: `AuditLog` (entity `RebalanceApproval`, action `REBALANCE_DECISION`). Limite conhecido: sem UNIQUE, corrida concorrente pode gerar 2 linhas — handoff 04→01 (`.agents/handoffs/.../04-para-01-rebalance-approval-unique.md`). `note` é texto livre: possível PII no AuditLog (achado P3 do 24, em avaliação com o Agente 21).

## 3. Quem é afetado
- **`src/features/predictability/components/PredictiveRevenueCockpit.tsx` (Agente 02):** consome o formato legado; precisa migrar para V2.
- **Backend:** `PredictiveRevenueOracleService implements IPredictiveRevenueOraclePort` (já migrado no #15).
- Qualquer consumidor que importasse `IPredictiveRevenueOraclePort` esperando a assinatura antiga ou chamasse `approveAccountAllocation`.

## 4. Como migrar
1. Precisa do formato antigo temporariamente? Importe `IPredictiveRevenueOraclePortLegacy` (deprecated; será removido após a migração da UI). Atenção: a Legacy **não** expõe `generateAccountAllocationRecommendations`; quem precisa das recomendações de alocação deve usar `IPredictiveRevenueOraclePort` (V2).
2. Troque os tipos para `*V2` e trate `status === 'insufficient_data'`: exiba estado vazio com `insufficientDataReason`; nunca substitua `null` por 0 ou número de exemplo.
3. Busque dados em `GET .../predictive/cockpit` e `GET .../predictive/backtest`; meta em `/goals`; riscos/gargalos em `/deals` e `/funnel-bottlenecks`.
4. Substitua `approveAccountAllocation` por `POST .../predictive/rebalance/approvals`; trate 201/200 (replay), 404, 409 e 422. A troca de responsável continua no fluxo normal do CRM.
