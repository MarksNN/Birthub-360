# PLANO DE EXECUÇÃO — ONDA 03: AUTONOMIA COMERCIAL
**Data:** 2026-10-18  
**Projeto:** Birth Hub 360°  
**Branch de Integração:** `integracao/onda-03`  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  

---

## 1. Missão
Implementar de ponta a ponta os quatro eixos da Onda 03 com supervisão humana rigorosa, segurança multi-tenant e sem atalhos:

1. **Evolução 09:** SDR Autônomo com Discagem Ativa por Voz e Agendamento no Google Calendar.
2. **Evolução 10:** Cadência Multicanal Adaptativa (E-mail, WhatsApp e Voz) com Opt-Out Unificado Cross-Channel.
3. **Evolução 11:** Rascunho Automático de Propostas Comerciais e Integração com Assinatura Digital.
4. **Evolução 12:** Painel de SLO e Trava de Limites de Autonomia de Agentes (Ajuste 5 - Human-in-the-loop).

---

## 2. Ordem de Implementação

### Etapa 1: Contratos Canônicos Compartilhados (`src/shared/contracts/`)
- `autonomousSdr.contract.ts`: Tipos de chamadas do SDR, intenções, qualificação e slots de agenda.
- `multichannelCadence.contract.ts`: Tipos de passos multicanal, regras de transição e opt-out unificado.
- `proposalAutomation.contract.ts`: Tipos de propostas comerciais em rascunho, itens, alçada e assinatura.
- `autonomyLimits.contract.ts`: Níveis de autonomia (L0 a L4), limites horários e painel de SLO.
- `domainEventMesh.contract.ts`: Adição dos 5 novos eventos de domínio.

### Etapa 2: Serviços de Domínio
- `autonomousSdr.service.ts`: Validação de horários via `CallingHoursPolicy`, qualificação determinística de leads e agendamento de reuniões.
- `adaptiveMultichannelCadence.service.ts`: Orquestração de passos com supressão de opt-out via `checkOptOutStatus`.
- `proposalAutomation.service.ts`: Geração de propostas com hash criptográfico e validação de alçada de descontos.
- `autonomyGovernor.service.ts`: Fiscalizador de alçadas e painel de SLO em tempo real.

### Etapa 3: Testes Automatizados
- Testes unitários para cada serviço.
- Testes de integração E2E cobrindo as 4 evoluções conectadas.

### Etapa 4: Gates Técnicos e Parecer do Agente 24
- `typecheck`, `lint`, `format:check`, `test:architecture`, `build`.
- Emissão do Parecer Aprovado do Agente 24.
