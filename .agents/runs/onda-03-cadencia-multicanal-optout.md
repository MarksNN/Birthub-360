# MEMÓRIA TÉCNICA — EVOLUÇÃO 10: CADÊNCIA MULTICANAL ADAPTATIVA E OPT-OUT UNIFICADO
**Onda:** 03 — Autonomia Comercial: Agentes Autônomos Supervisionados e Execução Multicanal Confiável  
**Agente Responsável:** Agente 17 — Cadência Multicanal e Ciclo de Receita / Agente 21 — Privacidade e LGPD  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-03`

---

## 1. Contexto e Objetivo
Orquestrar interações através de múltiplos canais (E-mail, WhatsApp e Voz) de maneira adaptativa com base no perfil de engajamento do lead, garantindo que o opt-out em qualquer um dos canais ou em nível global seja imediatamente propagado e respeitado por todos os agentes e automações (Art. 18 LGPD).

---

## 2. Contratos e Interfaces Formais
Arquivos de contrato:
- `src/shared/contracts/multichannelCadence.contract.ts`
- `src/shared/contracts/selfDrivingCrm.contract.ts`

Principais interfaces:
- `CadenceExecutionInput`: Identificação de lead, canal de preferência, histórico de toques, regras de intervalo e contexto de negócio.
- `CadenceNextStep`: Próxima ação recomendada (canal, template, delay, razão da escolha do canal).
- `UnifiedOptOutRecord`: Registro de opt-out com carimbo de tempo, canal de origem (`email`, `whatsapp`, `voice`, `global`), justificativa e ID do tenant.
- `SelfDrivingRecommendation`: Sugestões autônomas de avanço de pipeline ou reativação de leads estagnados submetidas ao gate humano.

---

## 3. Implementação Técnica
Arquivos de serviço:
- `src/features/cadence/services/adaptiveMultichannelCadence.service.ts`
- `src/features/cadence/services/selfDrivingCrm.service.ts`

- **Opt-Out Unificado Cross-Channel:**
  - O repositório `OptOutRepository` armazena e consulta opt-outs por `organizationId`, `leadId`, e-mail e telefone.
  - Se um lead solicita opt-out via WhatsApp, ligações de voz e envios de e-mail promocionais são imediatamente congelados para aquele contato.
  - Caso o lead faça uma nova solicitação de descadastramento em qualquer canal, o status é registrado como irreversível para comunicações ativas, mantendo apenas logs de auditoria exigidos pelo marco regulatório.
- **Roteamento Dinâmico de Canal (Adaptive Routing):**
  - O algoritmo avalia os últimos sinais de engajamento: se abriu e-mails recentemente, prioriza e-mail; se respondeu mais rápido via WhatsApp, seleciona WhatsApp; se ignorou mensagens escritas mas atendeu no passado, sugere contato por voz no horário preferencial.
- **Self-Driving CRM com Human-in-the-Loop:**
  - Detecta leads estagnados (`LEAD_STAGNATED`) e gera recomendações de reativação (`LEAD_REACTIVATION_SUGGESTED`).
  - Nenhuma ação invasiva é disparada sem aprovação do gestor quando o lead excede limites de risco ou valor financeiro elevado.

---

## 4. Testes de Unidade e Integração
- `tests/unit/cadence/adaptiveMultichannelCadence.service.test.ts`:
  - Bloqueio imediato de disparo quando existe opt-out global ou por canal.
  - Seleção inteligente de canal baseada em histórico de taxas de conversão.
  - Propagação correta de eventos `CADENCE_STEP_EXECUTED` e `CADENCE_OPT_OUT_ENFORCED`.
- `tests/integration/onda03ComprehensiveFlow.integration.test.ts` (Jornada B e Teste de Isolamento Multi-Tenant).

---

## 5. Garantias de Privacidade e Tenancy
- **LGPD:** Cumprimento rigoroso do direito à revogação de consentimento e bloqueio de tratamento comercial ativo.
- **Isolamento de Tenant:** O opt-out de um lead em um tenant Alpha jamais contamina a base de um tenant Beta independente, a menos que compartilhem a mesma entidade jurídica de tratamento autorizada.
