# MEMÓRIA TÉCNICA — EVOLUÇÃO 09: SDR AUTÔNOMO COM DISCAGEM ATIVA E GOOGLE CALENDAR
**Onda:** 03 — Autonomia Comercial: Agentes Autônomos Supervisionados e Execução Multicanal Confiável  
**Agente Responsável:** Agente 12 — Voz e Telefonia / Agente 07 — IA e Automações  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-03`

---

## 1. Contexto e Objetivo
Permitir que o Birthub 360° execute discagem ativa supervisionada por voz (`VoiceHub` / `autonomousSdr.service.ts`), conversando com leads de forma contextual, qualificando intenção de compra e realizando agendamento direto em Google Calendar (`CalendarService`) dentro da janela regulatória permitida por lei e boas práticas de telecomunicações.

---

## 2. Contratos e Interfaces Formais
Arquivo de contrato: `src/shared/contracts/autonomousSdr.contract.ts`
- `SdrCallInput`: Dados do lead, organização, telefone, roteiro, persona e `referenceTimestamp` para validação determinística de horário.
- `SdrCallResult`: Status da chamada (`completed`, `busy`, `no_answer`, `opt_out`, `rescheduled`, `blocked_out_of_hours`), transcrição, intenção inferida e `meetingScheduled`.
- `CalendarMeetingProposal`: Dados da reunião com validação de horário comercial, fuso horário e link de videoconferência gerado.

---

## 3. Implementação Técnica
Arquivo de serviço: `src/features/ai-voice/server/autonomousSdr.service.ts`
- **Calling Hours Policy:** Integração com `isWithinCallWindow` (`coldCall.policy.ts`). Discagens fora do intervalo de segunda a sexta, 08:00 às 18:00 (horário de Brasília) são sumariamente bloqueadas com status `blocked_out_of_hours` e disparando log de auditoria.
- **Detecção de Opt-Out:** Durante a chamada, se o prospect expressar intenção de não ser mais contatado, o evento canônico `OPT_OUT_REQUESTED` é publicado no `DomainEventMesh` com escopo unificado, bloqueando contatos futuros.
- **Agendamento em Calendário:** Ao confirmar interesse e horário disponível, o SDR consulta slots livres via `CalendarService`, reserva a agenda corporativa e emite o evento `MEETING_SCHEDULED`.
- **Rastreabilidade e Gravação:** Registro de chamada persistido com metadados de duração, qualidade de áudio (MOS), transcrição sanitizada sem dados de cartão/documento e correlação com o lead no CRM.

---

## 4. Testes de Unidade e Integração
- `tests/unit/ai-voice/autonomousSdr.service.test.ts`:
  - Bloqueio determinístico de ligações fora do horário comercial (fim de semana ou noite).
  - Execução nominal de discagem, diálogo e agendamento de reunião com sucesso.
  - Registro automático de opt-out caso o lead solicite descadastramento.
  - Publicação de eventos `CALL_COMPLETED` e `MEETING_SCHEDULED` no `DomainEventMesh`.
- `tests/integration/onda03ComprehensiveFlow.integration.test.ts` (Jornada A).

---

## 5. Garantias de Segurança, Multi-Tenancy e LGPD
- **Isolamento de Tenant:** Cada chamada valida `organizationId` do operador e do lead.
- **LGPD:** A gravação e transcrição passam por mascaramento de PII sensível antes do armazenamento e indexação.
- **SLO de Latência:** Limite de 800ms no loop de resposta de áudio (VAD -> STT -> LLM -> TTS).
