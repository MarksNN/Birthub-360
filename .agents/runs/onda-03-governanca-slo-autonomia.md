# MEMÓRIA TÉCNICA — EVOLUÇÃO 12: GOVERNANÇA DE SLO E TRAVA DE LIMITES DE AUTONOMIA
**Onda:** 03 — Autonomia Comercial: Agentes Autônomos Supervisionados e Execução Multicanal Confiável  
**Agente Responsável:** Agente 13 — Enxame Autônomo e Governança de Agentes / Agente 10 — Infraestrutura, Observabilidade e SRE  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-03`

---

## 1. Contexto e Objetivo
Assegurar controle total, previsibilidade operacional e conformidade com limites de risco na atuação dos agentes de IA (SDR, Copiloto, Cadência, Negociador). A trava de limites de autonomia (`autonomyGovernor.service.ts`) e o monitoramento contínuo de Service Level Objectives (SLOs) garantem que nenhum agente opere fora das barreiras de segurança pré-estabelecidas e que qualquer degradação de performance acione disjuntores automáticos (circuit breakers).

---

## 2. Contratos e Interfaces Formais
Arquivo de contrato: `src/shared/contracts/autonomyLimits.contract.ts`
- `AgentActionRequest`: Agente solicitante, tipo de ação (`send_email`, `make_call`, `apply_discount`, `move_stage`, `create_task`), parâmetros, impacto financeiro e identificador do tenant.
- `AutonomyEvaluationResult`: Decisão (`ALLOWED`, `REQUIRES_HUMAN_APPROVAL`, `BLOCKED`), código da regra violada, justificativa detalhada e metadados de telemetria.
- `AgentSloMetrics`: Latência p95/p99, taxa de sucesso de chamadas/mensagens, taxa de alucinação detectada, consumo de tokens e taxa de intervenção humana (escalations).

---

## 3. Implementação Técnica
Arquivo de serviço: `src/features/intelligence/services/autonomyGovernor.service.ts`
- **Tiers de Autonomia e Alçadas:**
  - **Tier 0 (Informativo/Leitura):** Execução 100% autônoma (consultas a grafos, enriquecimento, geração de resumos).
  - **Tier 1 (Operação Leve):** Ações de baixo risco permitidas dentro de cotas horárias (envio de e-mail de follow-up previamente revisado, criação de lembretes).
  - **Tier 2 (Operação Média):** Discagem ativa, concessão de pequenos descontos (<=10%), reagendamentos dentro de faixas normais.
  - **Tier 3 (Operação Crítica):** Fechamento de negócios, alterações de dados bancários, exclusão de registros, descontos acima de 10% — **BLOQUEADO para IA autônoma; EXIGE APROVAÇÃO HUMANA OBRIGATÓRIA**.
- **Circuit Breaker Operacional:**
  - Se a taxa de erro do agente ultrapassar 5% na janela móvel de 15 minutos, o governador rebaixa imediatamente o nível de autonomia do agente para Tier 0 (apenas leitura/sugestão) e emite alerta de emergência no `DomainEventMesh` (`AUTONOMY_CIRCUIT_BREAKER_TRIPPED`).
- **Dashboard de SLO e Telemetria:**
  - Exposição de métricas de saúde operacional e aderência aos objetivos de serviço para consumo do SRE e liderança comercial.

---

## 4. Testes de Unidade e Integração
- `tests/unit/intelligence/autonomyGovernor.service.test.ts`:
  - Aprovação imediata de operações dentro dos limites de Tier 1.
  - Interceptação com retenção para aprovação humana em requisições de Tier 3.
  - Ativação imediata do Circuit Breaker sob injeção de falhas consecutivas ou violações de taxa de erro.
  - Isolamento estrito de políticas e cotas por organização (multi-tenant).
- `tests/integration/onda03ComprehensiveFlow.integration.test.ts` (Jornada D).

---

## 5. Auditoria e Rastreabilidade
- Toda tentativa de extrapolação de limites de autonomia é registrada como incidente com timestamp, payload completo e agente emissor.
- Não há brechas para escalonamento de privilégios ou bypass do governador por chamadas diretas de agentes ao banco de dados.
