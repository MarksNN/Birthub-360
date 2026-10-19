# INVENTÁRIO DE REAPROVEITAMENTO E ANÁLISE DE GAPS — ONDA 03
**Data:** 2026-10-18  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Branch de Integração:** `integracao/onda-03`  

---

## 1. Mapeamento Canônico de Capacidades Existentes

| Módulo | Arquivo | Serviço / Classe | Contrato | Proprietário | Teste Existente | Estado | Decisão de Reaproveitamento | Gap Identificado e Solução Onda 03 |
|---|---|---|---|---|---|:---:|:---:|---|
| **Gamificação** | `src/features/gamification/domain/Gamification.ts` | `calculateSellerPoints`, `calculateSellerLevel`, `evaluateBadges` | `GamificationRepository` | Agente 04 | `sellerPerformanceAggregator.service.test.ts` | Pronto | **Reutilizar & Estender** | Não possuía missões adaptativas geradas por gargalos. Estender com catálogo de missões e concessão backend-only. |
| **Performance Vendedor** | `src/features/gamification/services/sellerPerformanceAggregator.service.ts` | `SellerPerformanceAggregatorService` | `SellerPerformanceRepository` | Agente 04 | `sellerPerformanceAggregator.service.test.ts` | Pronto | **Reutilizar** | Métricas agregadas de calls, reuniões e taxas de conversão prontas para alimentar a detecção de gargalos. |
| **Coaching IA** | `src/features/gamification/services/seller-coaching.service.ts` | `SellerCoachingService` | `SellerPerformanceData` | Agente 07 | Unitário interno | Pronto | **Conectar** | Focado em texto livre semanal. Conectar ao Behavioral Engine para sugerir treinamentos e roleplays direcionados. |
| **Roleplay Pedagógico** | `src/features/roleplay/domain/Roleplay.ts` e `roleplay-ai.service.ts` | `RoleplayAIService` | `RoleplayRepository` | Agente 07 | `roleplay.test.ts` | Pronto | **Reutilizar & Conectar** | Avaliação SPIN e contorno de objeção prontas. Conectar à conclusão de missões (ex: score ≥ 85) disparando `ROLEPLAY_SESSION_MASTERED`. |
| **Cadência Multicanal** | `src/features/cadence/domain/Cadence.ts` | `decideCadenceAction`, `recordTouchAttempt` | `CadenceRunState` | Agente 17 | `cadence.service.test.ts` | Pronto | **Reutilizar & Estender** | Máquina de estados determinística pronta. Faltava motor de sugestão reativa de cadência e resgate de leads estagnados. |
| **Opt-Out Unificado** | `src/features/cadence/domain/optOut.ts` | `optOutService` | `OptOutRepository` | Agente 17 | `optOut.service.test.ts` | Pronto | **Reutilizar** | Trava inviolável multi-canal contra reativações indevidas. Consumida pelo Self-Driving CRM. |
| **Guardião de Promessas** | `src/features/intelligence/agents/tactical/promiseGuardian.agent.ts` | `PromiseGuardianAgent` | `IPromiseGuardianPort` | Agente 13 | `tacticalSwarm.agents.test.ts` | Pronto | **Reutilizar & Conectar** | Extração de compromissos com revisão humana pronta. Conectar como origem do Value Realization pós-venda. |
| **Simulador Contratação** | `src/features/commercial-intelligence/application/hiringScenarioSimulator.ts` | `simulateHiringScenario` | `HiringScenarioResult` | Agente 04 | `hiringScenarioSimulator.unit.test.ts` | Pronto | **Reutilizar & Estender** | Base de simulação de impacto financeiro pronta. Estender para o motor What-If multi-fatorial do Revenue Oracle. |
| **Forecast Ponderado** | `src/features/commercial-intelligence/application/scoring/dealScoring.ts` | `computeDealForecastScore` | `ScoredDeal` | Agente 04 | `dealScoring.test.ts` | Pronto | **Reutilizar** | Pontuação explicável de probabilidade sem alucinação, base para a projeção em 30, 90 e 180 dias. |
| **Calibração Forecast** | `src/features/commercial-intelligence/application/forecastCalibration.ts` | `computeForecastCalibration` | `ForecastCalibrationResult` | Agente 04 | `forecastCalibration.test.ts` | Pronto | **Reutilizar** | Métricas de confiabilidade e calibração por backtesting histórico. |
| **DomainEventMesh** | `src/lib/queue/domainEventMesh.service.ts` | `domainEventMesh` | `IDomainEventMeshPort` | Agente 18 | `onda01ComprehensiveFlow.integration.test.ts` | Pronto | **Estender** | Adicionar os novos eventos de automação comercial e orquestração inteligente. |
| **AI Gateway & Cache** | `src/lib/ai/gateway.ts` e `semanticCache.service.ts` | `getAiModel`, `SemanticCacheService` | `ISemanticCachePort` | Agente 07 | `modelCascade.test.ts` | Pronto | **Reutilizar** | Fallback seguro, cascade e cache semântico com redução de até 65% de consumo de tokens. |

---

## 2. Classificação Estratégica dos Itens

- **REUTILIZAR (Totalmente aderentes):**
  - `DomainEventMesh` (barramento de eventos).
  - `OptOutRepository` e `optOutService` (garantia de consentimento).
  - `PromiseGuardianAgent` (extração de compromissos).
  - `SellerPerformanceAggregatorService` (métricas de vendedores).
  - `RoleplayAIService` (treinamento e avaliação pedagógica).
  - `dealScoring` e `forecastCalibration` (probabilidade auditável).

- **CONECTAR (Pontes necessárias):**
  - Conectar conclusões de Roleplay ao Behavioral Engine via eventos do EventMesh.
  - Conectar o Guardião de Promessas ao Value Realization Tracker.
  - Conectar sinais de conversa ao motor de resgate de leads estagnados do Self-Driving CRM.

- **ESTENDER (Camadas novas sobre base sólida):**
  - `behavioralEngine.service.ts`: detecção de gargalos + gerador de missões personalizadas + premiação backend-only.
  - `selfDrivingCrm.service.ts`: orquestração reativa de cadência + resgate de leads inativos + 3 níveis de autonomia.
  - `roiSimulator.service.ts`: simulação econômica em 3 cenários + Business Case Web/PDF.
  - `valueRealization.service.ts`: acompanhamento contínuo de compromissos pós-venda.
  - `predictiveRevenueOracle.service.ts`: projeção 30/90/180 dias + What-If + recomendação supervisionada de alocação de contas.

- **CRIAR APENAS CONTRATOS CANÔNICOS:**
  - `src/shared/contracts/behavioralEngine.contract.ts`
  - `src/shared/contracts/selfDrivingCrm.contract.ts`
  - `src/shared/contracts/roiSimulator.contract.ts`
  - `src/shared/contracts/valueRealization.contract.ts`
  - `src/shared/contracts/predictiveRevenueOracle.contract.ts`
