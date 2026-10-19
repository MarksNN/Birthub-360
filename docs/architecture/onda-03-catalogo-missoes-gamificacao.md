# ONDA 03 — CATÁLOGO DE MISSÕES ADAPTATIVAS E REGRAS DE RECOMPENSA
**Eixo 4: Gamificação Baseada em Gargalos e Evidências Reais**  
**Projeto:** Birth Hub 360°  
**Data:** Outubro de 2026  

---

## 1. Princípios de Desenho de Missões
As missões adaptativas não são tarefas genéricas de engajamento diário, mas **intervenções direcionadas a gargalos diagnosticados estatisticamente**. Elas seguem três regras fundamentais:
1. **Evidência Comprovável:** Concluir uma missão requer nota mínima em simulação de Roleplay ou avanço operacional no CRM (reuniões agendadas, ligações qualificadas).
2. **Recompensas Reais e Auditáveis:** O backend credita pontos e badges utilizando verificação de integridade e idempotência.
3. **Escalonamento Pedagógico:** Missões sugerem recursos complementares de Playbook e técnicas para sanar o desvio detectado.

---

## 2. Catálogo Oficial de Missões

| Código | Título | Indicador de Origem | Critério Verificável de Conclusão | Recompensa XP | Insígnia (Badge) | Validade |
|---|---|---|---|---|---|---|
| **MSN-COLD-CALL** | Mestre do Primeiro Contato | `cold_call_conversion` < 5% | 3 simulações de Cold Call no Roleplay com pontuação >= 80 | 150 XP | `Cold Call Specialist` | 7 dias |
| **MSN-PRICE-OBJ** | Negociador de Elite | `price_objection_handling` < 60% | 3 simulações de Contorno de Objeção de Preço com nota >= 85 | 200 XP | `Negociador de Elite` | 5 dias |
| **MSN-QUALIF-SPIN** | Diagnóstico Cirúrgico | `qualification_depth` < 50% | 2 sessões de Roleplay focadas em perguntas de Implicação e Necessidade de Solução (SPIN) com score >= 85 | 180 XP | `Diagnosticador Mestre` | 7 dias |
| **MSN-RECOVERY** | Resgatador Proativo | `lead_recovery_rate` < 10% | 5 abordagens de resgate consultivo enviadas a leads estagnados autorizados | 220 XP | `Mestre do Resgate` | 10 dias |
| **MSN-SPEED-TO-LEAD**| Resposta Relâmpago | `response_time_sla` > 60 min | 10 primeiros contatos realizados em menos de 15 minutos do recebimento do lead | 250 XP | `Velocista Comercial` | 7 dias |

---

## 3. Matriz de Níveis e Progressão de Vendedores

A pontuação acumulada (XP) no backend governa a progressão do vendedor nos níveis oficiais:

| Nível | Título | Faixa de XP | Autonomia e Benefícios |
|---|---|---|---|
| **Nível 1** | Consultor Trainee | 0 – 499 XP | Acesso a simulações básicas e supervisão integral |
| **Nível 2** | Consultor Pleno | 500 – 1.499 XP | Prioridade no recebimento de leads inbound de ticket médio |
| **Nível 3** | Especialista Sênior | 1.500 – 3.499 XP | Qualificado para negociações de contas enterprise e mentoria |
| **Nível 4** | Negociador Master | 3.500 – 6.999 XP | Participação no Comitê de Alocação e contas estratégicas |
| **Nível 5** | Líder de Elite | 7.000+ XP | Habilitado para conduzir business cases complexos e roleplay avançado |

---

## 4. Regras Anti-Fraude e Idempotência
1. **Verificação de Hash:** Cada requisição de `claimMissionReward` submete a evidência de conclusão. O backend calcula:
   ```typescript
   const hash = crypto.createHash('sha256').update(`${orgId}:${sellerId}:${missionId}:${evidence}`).digest('hex');
   ```
2. **Bloqueio de Duplicidade:** Se o hash já constar no histórico da missão, a operação retorna a recompensa pré-existente com flag `idempotencyApplied: true`.
3. **Validação de Nota em Roleplay:** O backend rejeita conclusão de missões cujo score reportado seja inferior ao `minimumScoreRequired` da missão.
4. **Isolamento de Tenant:** Vendedor do Tenant A não pode concluir missões nem receber pontos do Tenant B.
