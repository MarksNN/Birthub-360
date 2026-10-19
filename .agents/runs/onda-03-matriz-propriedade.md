# MATRIZ DE PROPRIEDADE DE ARQUIVOS E ESPECIALISTAS — ONDA 03
**Data:** 2026-10-18  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Branch de Integração:** `integracao/onda-03`  
**Concorrência Máxima:** 8 Especialistas Simultâneos + Coordenador 00  

---

## 1. Atribuição de Domínios e Propriedade Exclusiva

| Especialista | Domínio | Arquivos Sob Sua Propriedade Exclusiva na Onda 03 | Responsabilidade Principal |
|---|---|---|---|
| **04 — CRM e BI** | Métricas Comerciais e Forecast | `src/features/commercial-intelligence/application/**`<br>`src/features/commercial-intelligence/services/**`<br>`src/features/crm/services/**` | Indicadores de receita, aging, forecast ponderado, cockpit executivo e dicionário de KPIs. |
| **05 — Prospecção** | Sinais e Qualificação | `src/features/prospecting/services/**`<br>`src/lib/enrichment/**` | Ingestão de sinais de prospecção, qualificação ICP e regras de contatos permitidos. |
| **07 — IA e Automações** | Recomendações e Coaching | `src/features/gamification/services/behavioralEngine.service.ts`<br>`src/features/gamification/services/seller-coaching.service.ts`<br>`src/features/intelligence/services/**` | Motor de Behavioral Engine, coaching adaptativo, recomendações supervisionadas. |
| **08 — QA e Release** | Validação, E2E e CI/CD | `tests/unit/**`<br>`tests/integration/**`<br>`tests/e2e/**`<br>`.github/workflows/**` | Testes automatizados unitários/integração das 5 jornadas, verificação de gates e integridade. |
| **13 — Swarm Autônomo** | Orquestração e Guardrails | `src/features/intelligence/agents/tactical/**`<br>`src/features/intelligence/services/guardrails.service.ts` | Guardrails de autonomia, integração do Guardião de Promessas e verificação de PII. |
| **17 — Cadência e Ciclo de Receita** | Self-Driving CRM | `src/features/cadence/services/selfDrivingCrm.service.ts`<br>`src/features/cadence/domain/**`<br>`src/features/cadence/infra/**` | Motor de cadências adaptativas, detecção de estagnação e opt-out unificado multi-canal. |
| **18 — Contratos e API** | Contratos e EventMesh | `src/shared/contracts/behavioralEngine.contract.ts`<br>`src/shared/contracts/selfDrivingCrm.contract.ts`<br>`src/shared/contracts/roiSimulator.contract.ts`<br>`src/shared/contracts/valueRealization.contract.ts`<br>`src/shared/contracts/predictiveRevenueOracle.contract.ts`<br>`src/shared/contracts/domainEventMesh.contract.ts` | Contratos de interface TypeScript, tipagem canônica e catálogo de eventos do EventMesh. |
| **23 — FinOps e Performance** | Eficiência e Estatística | `src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts`<br>`docs/architecture/onda-03-finops-performance.md` | Modelos estatísticos determinísticos/interpretáveis, calibração, orçamento de tokens e latência. |

---

## 2. Especialistas Rotativos e Funções de Apoio

- **Agente 02 (Produto e UX):** Responsável exclusivo por rotas, navegação e views (`src/App.tsx`, componentes visuais do Cockpit e visualização de missões).
- **Agente 01/01A (Plataforma e Dados):** Responsável exclusivo por `prisma/schema.prisma` e migrações.
- **Agente 10 (Infraestrutura e Observabilidade):** Monitoramento, métricas de runtime e SRE.
- **Agente 24 (Auditor Independente):** Auditoria externa obrigatória de cada entrega e emissão de parecer em `.agents/reviews/`.
- **Agente 00 (Coordenação Global):** Planejamento, gates intermediários, orquestração de merges e integridade global.

---

## 3. Regras de Isolamento e Não-Conflito

1. **Nenhum arquivo compartilhado com múltiplos editores:** Todas as interfaces são mediadas pelos contratos canônicos do Agente 18 em `src/shared/contracts/`.
2. **Separação Rígida de Camadas:**
   - Gamificação e Behavioral Engine isolados em `src/features/gamification/`.
   - Cadência e Self-Driving CRM isolados em `src/features/cadence/`.
   - ROI, Value Realization e Revenue Oracle isolados em `src/features/commercial-intelligence/`.
3. **Imutabilidade de Prompts:** Nenhum especialista altera arquivos em `.agents/prompts/` ou `.agents/runs/` além de seus relatórios designados.
4. **Gates a cada 2-3 integrações:** Nenhuma frente é fundida sem execução prévia de typecheck e testes de regressão.
