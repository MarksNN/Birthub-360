# BASELINE DE EXECUÇÃO — ONDA 02
**Data:** 2026-10-18  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Branch de Integração:** `integracao/onda-02`  
**Commit Base:** `96d53f01` (originário de `main`)  
**Status Pré-Execução:** APROVADO / AMBIENTE LIMPO  

---

## 1. Verificação dos Portões Pré-Voo (Gates Técnicos)

| Gate | Comando Executado | Resultado | Status |
|---|---|---|:---:|
| **TypeScript Typecheck** | `npm run typecheck` | 1.945+ arquivos checados, 0 erros | **PASS** |
| **Biome Linter** | `npm run lint` | 1.945 arquivos inspecionados, 0 erros | **PASS** |
| **Formatação Biome** | `npm run format:check` | 1.945 arquivos conformes | **PASS** |
| **Arquitetura & Limites** | `npm run test:architecture` | `depcruise` (0 violações), coverage (100%), hotspots (0 >1000L sem exceção) | **PASS** |
| **Sincronia OpenAPI** | `npm run verify:openapi-drift` | 443 endpoints, 74 routers, 0 deriva estrutural | **PASS** |
| **Prisma Schema** | `npx prisma validate` | Schema válido sintática e estruturalmente | **PASS** |
| **Build de Produção** | `npm run build` | Frontend Vite + esbuild backend `dist/server.cjs` (3.0MB) | **PASS** |
| **Auditoria Onda 01** | `.agents/reviews/onda-01-revisao-independente-24.md` | Parecer APROVADO formalmente pelo Agente 24 | **PASS** |

---

## 2. Inventário de Recursos Pré-Existentes para a Onda 02

1. **Sinais de Mercado e Gatilhos:**
   - Taxonomia de sinais: `src/features/market-intelligence/domain/accountSignalTaxonomy.ts`.
   - Rotas e serviço de sinais: `src/features/prospecting/outbound/server/signals.ts`.
   - Componentes visuais de radar: `src/features/signals-risks/components/SignalsRadarTab.tsx` e `SignalsAndRisksHub.tsx`.
2. **Comitê de Decisão e Influenciadores:**
   - Serviço de comitê de decisão: `src/features/contacts/services/decision-committee.service.ts`.
   - Papeis B2B (Decisor, Champion, Bloqueador, Usuário, Financeiro).
3. **FitScore e Calibração ICP:**
   - Cálculo de FitScore: `src/features/prospecting/services/enrichment/fitScore.ts`.
   - Calibração de pesos: `src/features/prospecting/services/enrichment/fitScoreCalibration.ts`.
4. **Alertas de Churn e Oportunidades Estagnadas:**
   - Predição de churn: `src/features/analytics/services/churn-prediction.service.ts`.
   - Agente de retenção supervisionado: `src/features/intelligence/agents/churnRetention.agent.ts`.
   - SLA e estagnação em pipeline: `src/lib/voice-hub/services/slaScheduler.ts`.

---

## 3. Metas Técnicas e Critérios de Aceite da Onda 02

1. **Evolução 05 — Rastreador de Sinais de Expansão e Vagas:**
   - Detecção de sinais em Diários Oficiais, Notícias e Vagas com extração de cargos-chave.
   - Normalização para a taxonomia canônica `AccountSignalTaxonomy`.
2. **Evolução 06 — Grafo do Comitê de Decisão B2B:**
   - Estruturação do comitê com identificação de Decisor Econômico, Champion e Risco de Bloqueio.
   - Associação de contatos a oportunidades com métricas de cobertura de comitê (>60%).
3. **Evolução 07 — FitScore Preditivo Dinâmico:**
   - Algoritmo de score ponderado (0 a 100) calibrado por dados firmográficos, tecnográficos e sinais recentes.
   - Decomposição explicável dos fatores positivos e negativos.
4. **Evolução 08 — Alertas Automatizados de Churn & Estagnação (RevOps C1):**
   - Gatilho preditivo disparado por inatividade, queda de engajamento ou SLA vencido.
   - Publicação de evento `REVENUE_RISK_DETECTED` no `DomainEventMesh`.
