- De: 02
- Para: 04
- Onda: 11
- Status: resolvido
- Prioridade: alto

## Resolução (reconciliada 2026-10-10 — Agente 04, a pedido do 00; ref. parecer 24 `.agents/reviews/handoffs-2026-10-09-24.md` l.27)
Correção real: commit `ac2a942d` (2026-08-17). O domínio NÃO foi alterado — `ExecutiveOverview.coverageProtection/previousPeriod/forecastConfidence`, `PerformanceMetrics.funnelHistoricalTrackingSince` e `PipelineCreation.elapsedBusinessDays/totalBusinessDays` já existiam em `src/features/commercial-intelligence/domain/CommercialIntelligence.ts` (desde `876d13c7`/`a557d6ee`). O erro vinha dos consumidores:
1. `application/executiveExport.ts`: `businessDaysElapsed/businessDaysTotal` → `elapsedBusinessDays/totalBusinessDays` (nomes canônicos; os nomes antigos não existem no código).
2. `__tests__/executiveExport.unit.test.ts`: fixtures completadas com os campos acima.
Evidência @ `origin/main` 36cea202 (2026-10-10): `npx vitest run -c vitest.unit.config.ts executiveExport.unit.test.ts CommercialIntelligenceUseCases.unit.test.ts` → 82/82; `npm run typecheck` → 0 erros em `src/features/commercial-intelligence/**` (1 erro fora do escopo: `src/components/ui/KpiCard.tsx` TS2349, outra frente).
Errata: a versão de 2026-10-09 (`0a22c580`) dizia que o domínio ganhou `businessDaysElapsed/businessDaysTotal` e que imports foram limpos em `DiscoveryFilterPanel.tsx` — incorreto (`ESTADO_OPTIONS` é usado lá). Limpeza de imports não faz parte deste handoff.

## Problema
Erros de TypeScript na feature de `commercial-intelligence`:
1. `ExecutiveOverview` não está batendo com o tipo retornado (falta `coverageProtection`, `previousPeriod`, `forecastConfidence`).
2. `PerformanceMetrics` sentindo falta de `funnelHistoricalTrackingSince`.
3. Propriedades desconhecidas `businessDaysElapsed` e `businessDaysTotal` no `PipelineCreation`.
## Arquivo(s) envolvido(s)
- `src/features/commercial-intelligence/__tests__/executiveExport.unit.test.ts`
- `src/features/commercial-intelligence/application/executiveExport.ts`
## Alteração necessária
Atualizar as tipagens, mocks nos testes, e mapeamento na aplicação para alinhar as interfaces de `ExecutiveOverview`, `PerformanceMetrics` e `PipelineCreation`.
## Teste esperado
O comando `npx tsc --noEmit` deve rodar limpo para os arquivos do domínio de inteligência comercial.
## Contexto adicional
Detectado durante a validação global de TS na Onda 11 pelo Agente 02.
