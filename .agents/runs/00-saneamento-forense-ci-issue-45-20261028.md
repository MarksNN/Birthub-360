# RELATÓRIO CONSOLIDADO — SANEAMENTO FORENSE E REGULARIZAÇÃO DO CI (ISSUE #45)

- **Repositório:** `MarksNN/Birthub-360`
- **Issue-Mestre:** `#45` (`https://github.com/MarksNN/Birthub-360/issues/45`)
- **Agente Coordenador:** `00` (Orquestrador Global)
- **Auditoria Independente:** `24` (Revisor Independente)
- **SHA Base da `main` Auditada:** `11f9dd38699dcdbb280be4e89f86157ad5f69201` (`2026-10-28T10:56:25Z`)
- **Branch de Saneamento:** `agente/00-saneamento-pr117-baselines-contratos`

---

## 1. Sumário Executivo (Fase 1 & Fase 2)

A auditoria forense inspecionou todos os workflows em `.github/workflows/`, o histórico de commits da `main` até `11f9dd38699dcdbb280be4e89f86157ad5f69201`, e os PRs `#25`, `#29`, `#43`, `#44`, `#108`, `#113`, `#114`, `#117` e correlatos (`#118` a `#129`).

### Principais Constatações Forenses
1. **Desacoplamento já resolvido, mas baseline corrompida pelo PR `#117` (`2a263d3f`):**
   - O commit `7ff56f16` já havia desacoplado `src/features/automations/cadenceIntegration.service.ts` de `src/features/cadence/services/adaptiveMultichannelCadence.service.ts` por meio do contrato `src/shared/contracts/multichannelCadence.contract.ts`.
   - Contudo, o commit `2a263d3f` (integrado via PR `#117` em `94d0ada5`) inseriu indevidamente um waiver obsoleto em `.dependency-cruiser-known-violations.json`, inflou o teto de `src/features/intelligence/components/IntelligenceHub.tsx` de `1334` para `1400` linhas em `docs/architecture/HOTSPOT_EXCEPTIONS.md` (apesar de o arquivo possuir `1255` linhas), removeu `'LEAD_ENRICHMENT_REQUESTED'` de `DomainEventType` em `src/shared/contracts/domainEventMesh.contract.ts` e esvaziou a persistência de `variants` e `metrics` em `src/features/intelligence/services/promptAbTesting.service.ts`.
2. **Correções já integradas na `main` entre `94d0ada5` e `11f9dd38`:**
   - **PR `#113` (`b29da3fa`):** Integrado em `2026-10-27T03:44:52Z` (ARIA labels em `BrandOrb.tsx` e `Pagination.tsx`).
   - **PR `#120` (`50032828`):** Integrado em `2026-10-27T02:13:28Z` (contraste de subtítulos no tema claro).
   - **PR `#123` (`aa990b29`):** Alinhou `sonar-project.properties` (`sonar.organization=marcelinmark26359876123123`, `sonar.projectKey=MarksNN_Birthub-360`) e adicionou validação estrutural (`scripts/ci/validate-sonarqube-config.mjs`).
   - **PR `#124` / PR `#129` (`ad0e858d`) + `f5442611`:** Atualizou `better-auth` de `^1.7.4` para `^1.7.14` (mitigando `GHSA-44JH-23M7-HPCF`, `GHSA-R4XP-PRCW-77QF` e `GHSA-965C-763C-88JM`).
   - **PR `#125` (`4d79eaa9`), PR `#126` (`eb99f1ae`), PR `#127` (`2ad0bf60`), PR `#128` (`abf7612e`):** Integraram Flywheel relacional com RLS, modularizaram `UniversalEcosystemPanel.tsx` (`937` linhas < `1000`), blindaram o helper E2E de signup, expandiram tool bindings (`copy.draft`, `churn.analyze`) e removeram dependência circular entre `supervisor.agent.ts` e `subSwarms.config.ts`.
3. **Workflows verdes que mascaram falhas reais (`continue-on-error: true` e skips):**
   - `Visual Regression` (`.github/workflows/visual-regression.yml`): possui `continue-on-error: true` no passo `Run Visual Tests`. Quando removido nos PRs `#118` e `#121`, o job reprova com `88 failed` por ausência das 88 imagens PNG de referência Linux (`11 superfícies × 2 temas × 4 viewports`) em `visual-regression/baselines/`.
   - `Dependency Review` (`.github/workflows/ci.yml` e `.github/workflows/dependency-review.yml`): possui `continue-on-error: true`.
   - `SonarQube` (`.github/workflows/sonarqube.yml`) vs `SonarCloud Code Analysis`: o token estava configurado em `vars.SONAR_TOKEN` em vez de `secrets.SONAR_TOKEN` (causando skip silencioso do scanner CLI), enquanto o Automatic Analysis do SonarCloud acusou `29.4%` de código duplicado (teto de `3.0%`) no histórico auditado.

---

## 2. Escopo das Correções Implementadas neste PR (Fase 3)

1. **`.dependency-cruiser-known-violations.json` (SHA restaurado: `d80edc61e83f094da67ff8682cc059499b163595`):**
   - Removida a entrada órfã `src/features/automations/cadenceIntegration.service.ts -> src/features/cadence/services/adaptiveMultichannelCadence.service.ts` (`no-cross-feature-imports`) introduzida por `2a263d3f`.
2. **`docs/architecture/HOTSPOT_EXCEPTIONS.md` (SHA restaurado: `4922a8fb451267b77806b8dfabaa3906c949a82e`):**
   - Revertido o teto de `src/features/intelligence/components/IntelligenceHub.tsx` de `1400 linhas` para `1334 linhas` (`teto = tamanho atual; o arquivo não pode crescer`).
3. **`src/shared/contracts/domainEventMesh.contract.ts` (SHA restaurado: `c56ddac13b835f8a12e645994e48f0982605dbca`):**
   - Restaurado o membro `'LEAD_ENRICHMENT_REQUESTED'` na união `DomainEventType`, eliminando a necessidade de cast inseguro em `src/features/automations/automation.engine.ts`.
4. **`src/features/intelligence/services/promptAbTesting.service.ts` (SHA: `697b2e07f83ecf01101334dd3bba50d6ecc22e83`):**
   - Restaurada a persistência de `variants` em `createPromptExperiment` e de `metrics` em `completePromptExperiment` usando a interface tipada `PromptExperimentDelegate` (zero `any`, zero regressão de contrato).
