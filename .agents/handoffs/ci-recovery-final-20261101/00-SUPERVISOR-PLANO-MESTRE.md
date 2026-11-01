# OPERAÇÃO DE RECUPERAÇÃO CI/CD, SONARQUBE, VISUAL REGRESSION E HOMOLOGAÇÃO FINAL
## PLANO MESTRE DO SUPERVISOR GERAL (AGENTE 00)

- **Repositório:** `MarksNN/Birthub-360`
- **Data:** 2026-11-01
- **Orquestrador:** Agente 00 — Supervisor Geral
- **Prioridade:** P1 — Estabilização, Auditoria e Homologação
- **Status do Plano:** APROVADO / EM EXECUÇÃO

---

### 1. OBJETIVO GERAL DA OPERAÇÃO

Coordenar, auditar e homologar a recuperação completa de todos os fluxos críticos de Integração Contínua (CI/CD), Qualidade Estática (SonarQube e CodeQL), Regressão Visual e Confiabilidade da Célula Comercial V3.1 e Testes Automatizados do Birthub 360.

Esta operação é regida pelos princípios fundamentais do `AGENTS.md`:
1. **P1 — Pensar antes de programar:** diagnóstico aprofundado antes de qualquer intervenção.
2. **P2 — Simplicidade primeiro:** correções cirúrgicas, sem camadas ou artifícios especulativos.
3. **P3 — Alterações cirúrgicas:** modificação estrita das causas raízes, sem tocar escopos alheios.
4. **P4 — Execução orientada a objetivos:** sucesso baseado em testes determinísticos, métricas e comprovação empírica — e nunca em falsos positivos ou bypasses.

---

### 2. MATRIZ DE DELEGAÇÃO E RESPONSABILIDADES

| Handoff | Domínio | Especialista Responsável | Suporte / Apoio | Status |
|---|---|---|---|---|
| **01** | Application Gate e Red Team V3.1 | Agente 08 (QA / Release) | Agente 07 (IA e Automações) | CONCLUÍDO (PASS) |
| **02** | Visual Regression (88 Superfícies) | Agente 03 (Design e UX) | Agente 08 (QA / Test Harness) | MAPEADO / DOCUMENTADO |
| **03** | SonarQube, SCA e Cobertura LCOV | Agente 08 (Qualidade) | Agente 01 (Plataforma e Segurança) | SANEADO / AUDITADO |
| **04** | Dependências, Waivers e Segurança | Agente 01 (Segurança) | Agente 08 (QA) / Agente 15 | AUDITADO (0 High/Critical) |
| **05** | Homologação Final do Birthub 360 | Agente 00 (Supervisor) | Agentes 01, 02, 03, 07, 08 | EM HOMOLOGAÇÃO |

---

### 3. PROTOCOLO DE EXECUÇÃO SEQUENCIAL

1. **Handoff 01:** Estabilização hermética do avaliador Red Team Comercial V3.1 (`commercialRedteamEvaluator.service.ts` e `commercialV3.test.ts`), medição empírica de latência e garantia de conformidade sem degradação de segurança.
2. **Handoff 02:** Verificação da matriz de 88 cenários de regressão visual (11 superfícies × 2 temas × 4 viewports), auditoria do workflow Linux Playwright e documentação da geração de baselines.
3. **Handoff 03:** Resolução do conflito SCA entre `bun.lock` e `package-lock.json` em `agente-codigo-local`, validação do relatório LCOV (`coverage/unit/lcov.info`) e estruturação do gate de SonarQube Cloud.
4. **Handoff 04:** Auditoria rigorosa de dependências vulneráveis, validação dos waivers ativos (`docs/security/AUDIT_WAIVERS.md`), checagem do script de waivers e fixação segura de ações do GitHub Actions.
5. **Handoff 05:** Execução das suítes de homologação: Typecheck, Biome/Lint, Build, Unit tests, Arquitetura e consolidação do relatório executivo.
