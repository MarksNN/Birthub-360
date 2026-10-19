# MATRIZ DE PROPRIEDADE E CONCORRÊNCIA — ONDA 05
**Onda:** 05 — Escala, Governança e Recursos Experimentais  
**Base:** `integracao/onda-05`  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Data:** 2026-10-18  

---

## 1. Mapeamento de Propriedade Exclusiva

| Especialista | Domínio | Arquivos e Diretórios sob Propriedade Exclusiva |
|---|---|---|
| **Agente 18** | Contratos & Tipos Compartilhados | `src/shared/contracts/multimodalRoleplay.contract.ts`<br>`src/shared/contracts/predictiveRevenueOracle.contract.ts`<br>`src/shared/contracts/multiRegionResilience.contract.ts`<br>`src/shared/contracts/continuousSecurityAudit.contract.ts`<br>`src/shared/contracts/domainEventMesh.contract.ts` |
| **Agente 13** | Enxame de Agentes / Roleplay Multimodal | `src/features/roleplay/services/multimodalRoleplaySimulator.service.ts` |
| **Agente 04** | CRM, BI e Inteligência de Receita | `src/features/commercial-intelligence/services/predictiveRevenueOracle.service.ts` |
| **Agente 10 / 16** | Infraestrutura, Runtime e Escala | `src/lib/runtime/services/multiRegionResilience.service.ts` |
| **Agente 15** | Segurança Aplicada & Governança | `src/lib/security/services/continuousSecurityAudit.service.ts` |
| **Agente 08** | QA e Release | `tests/unit/contracts/onda05Contracts.test.ts`<br>`tests/unit/roleplay/multimodalRoleplaySimulator.service.test.ts`<br>`tests/unit/commercial-intelligence/predictiveRevenueOracle.service.test.ts`<br>`tests/unit/runtime/multiRegionResilience.service.test.ts`<br>`tests/unit/security/continuousSecurityAudit.service.test.ts`<br>`tests/integration/onda05ComprehensiveFlow.integration.test.ts` |
| **Agente 24** | Auditoria Independente | `.agents/reviews/24-onda-05-revisao-independente.md`<br>`.agents/reviews/onda-05-evidencias.json`<br>`.agents/reviews/checklist-onda-05.html` |
| **Agente 00** | Coordenação Global | `.agents/runs/onda-05-*`<br>`.agents/plans/onda-05-*` |

---

## 2. Regras de Isolamento e Não-Interferência

1. **Slots Exclusivos:**
   - Agente 18 inicia primeiro para congelar contratos de tipo antes das implementações de domínio.
   - Agentes 13, 04, 10/16 e 15 implementam em seus domínios sem tocar em arquivos adjacentes (P3 — Alterações cirúrgicas).
   - Agente 08 unifica testes e homologa o fluxo E2E.
   - Agente 24 revisa a entrega com independência total antes de autorizar qualquer transição.
2. **Tenancy:** Todo payload e consulta exige `organizationId` obrigatório com verificação no início do método.
3. **LGPD / Segurança:** Dados de roleplay não usam identidades de pessoas físicas reais; dados de forecast respeitam segregação contábil por tenant; varreduras de segurança não loggam credenciais ou segredos em texto claro.
