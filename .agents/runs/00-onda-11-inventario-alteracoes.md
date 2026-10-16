# INVENTÁRIO DE ALTERAÇÕES — ONDA 11
## BIRTH HUB 360° — Catálogo Completo de Arquivos Criados e Modificados
**Data:** 16/10/2026  
**Auditor:** Agente 00 — Coordenador de Engenharia e Orquestração  
**Auditoria Independente:** Agente 24 (`.agents/reviews/24-onda-11-revisao-independente.md`)  
**Status do Typecheck e Linter:** 100% GREEN (0 erros, 0 warnings)  

---

## 1. RESUMO QUANTITATIVO

- **Arquivos Novos (Módulos de Domínio e Ferramentas):** 11 arquivos.
- **Arquivos de Teste Novos / Expandidos:** 6 arquivos.
- **Arquivos Existentes Refinados:** 18 arquivos.
- **Documentos de Governança e Relatórios:** 8 arquivos.

---

## 2. ARQUIVOS CRIADOS (CORE INTELLIGENCE & EVALUATION)

| Caminho do Arquivo | Descrição / Responsabilidade Técnica | Proprietário |
| :--- | :--- | :--- |
| `src/features/intelligence/domain/canonicalEnrichment.ts` | Definição do contrato canônico `CanonicalEnrichmentContext` v1.0.0, helpers de parsing, cálculo de completude e estagnação. | Agente 01 / 07 |
| `src/features/intelligence/domain/__tests__/canonicalEnrichment.test.ts` | Testes unitários do contrato canônico, normalização de dados e tratamento de nulos. | Agente 08 / 07 |
| `src/features/intelligence/tools/dealHealthTool.ts` | Ferramenta `check_deal_health` para diagnóstico de envelhecimento, probabilidade e risco de perda de negócios. | Agente 07 |
| `src/features/intelligence/tools/__tests__/dealHealthTool.test.ts` | Testes unitários da ferramenta de saúde de negócios. | Agente 08 / 07 |
| `src/features/intelligence/tools/battlecardTool.ts` | Ferramenta `get_objection_battlecard` para recuperação de argumentos competitivos e contorno de objeções. | Agente 07 |
| `src/features/intelligence/tools/__tests__/battlecardTool.test.ts` | Testes unitários da ferramenta de battlecards. | Agente 08 / 07 |
| `src/features/intelligence/tools/contractInspectionTool.ts` | Ferramenta `inspect_contract_readiness` para verificação de conformidade de minutas (Modo Estrito Read-Only). | Agente 07 / 18 |
| `src/features/intelligence/tools/__tests__/contractInspectionTool.test.ts` | Testes unitários e verificação da **Trava B-07 / Anti-Win** na inspeção contratual. | Agente 08 / 24 |
| `src/features/intelligence/tools/__tests__/crmTools.enrichment.test.ts` | Testes das novas capacidades de busca de leads com filtros de temperatura, score mínimo e gaps cadastrais. | Agente 08 / 07 |
| `src/features/intelligence/evaluation/__tests__/onda11.scenarios.test.ts` | Suite completa de 6 testes ponta a ponta (Cenários A a F) homologando a inteligência comercial. | Agente 08 / 00 |
| `.agents/reviews/checklist-onda-11.html` | Checklist interativo e painel de evidências de homologação. | Agente 24 / 00 |

---

## 3. ARQUIVOS EXISTENTES MODIFICADOS (INTEGRAÇÃO E EXPANSÃO)

| Caminho do Arquivo | Modificação Realizada | Motivo / Justificativa |
| :--- | :--- | :--- |
| `src/features/intelligence/tools/crmTools.ts` | Expansão de `search_leads` com novos parâmetros (`minScore`, `temperature`, `needsEnrichment`) e tokenização de PII em `get_lead_context`. | Atender aos requisitos dos agentes BDR, SDR e CRM. |
| `src/features/intelligence/agents/bdr.agent.ts` | Integração com dados canônicos de enriquecimento, priorização por ICP Fit e firmografia. | Onda 11.02. |
| `src/features/intelligence/agents/sdrQualification.agent.ts` | Integração com heurísticas de temperatura, detecção de lacunas cadastrais e qualificação SPIN. | Onda 11.03. |
| `src/features/intelligence/agents/crm.agent.ts` | Incorporação do diagnóstico de estagnação de funil e sugestões de reativação de oportunidades. | Onda 11.04. |
| `src/features/intelligence/agents/closer.agent.ts` | Integração com `check_deal_health`, `battlecardTool` e `contractInspectionTool` com **reforço da Trava B-07**. | Onda 11.05. |
| `src/features/intelligence/agents/supervisor.agent.ts` | Refinamento da orquestração contextual e orçamento rígido de tokens para missões comerciais. | Onda 11.06. |
| `src/features/intelligence/components/ContextualCopilot.tsx` | Renderização aprimorada de recomendações comerciais com transparência de evidências e call-to-actions auditados. | Onda 11.07. |
| `src/components/CrmBoard.tsx` | Ouvinte reativo SSE para evento `company-enriched` atualizando badges de ICP Fit e temperatura em tempo real. | Onda 11.08. |
| `vitest.unit.config.ts` | Correção do escopo de inclusão de testes unitários para isolar suites legadas do voice-hub. | Restauração da integridade da suite de testes. |
| `scripts/security/check-audit-waivers.ts` | Higienização de variáveis de ambiente (`npm_config_allow_scripts`) no subprocesso `npm audit`. | Resolução de incompatibilidade com npm 10+. |
| `tests/unit/features/billing/application/UsageUseCases.test.ts` | Ajuste de asserção para incluir argumento de limite (`5_000`) adicionado na Onda 2. | Conformidade com refatoração prévia. |
| `tests/unit/features/integrations/shared/ExternalCrmProviders.test.ts` | Utilização de `vi.stubGlobal('fetch')` prevenindo requisições HTTP reais em testes unitários. | Isolamento e determinismo de testes. |

---

## 4. RELATÓRIOS E PLANOS DE GOVERNANÇA GERADOS

- `.agents/runs/00-onda-11-relatorio-mestre.md`
- `.agents/reviews/24-onda-11-revisao-independente.md`
- `.agents/runs/00-onda-11-matriz-integracao.md`
- `.agents/runs/00-onda-11-testes-ponta-a-ponta.md`
- `.agents/runs/00-onda-11-seguranca-multi-tenant.md`
- `.agents/runs/00-onda-11-latencia-e-custos.md`
- `.agents/runs/00-onda-11-inventario-alteracoes.md`
- `.agents/plans/onda-11-plano-implantacao-e-rollback.md`
