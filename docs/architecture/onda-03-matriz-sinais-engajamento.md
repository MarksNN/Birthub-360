# ONDA 03 — MATRIZ DE SINAIS DE ENGAJAMENTO E REGRAS DE TRANSIÇÃO
**Eixo 7: Sinais Multicanais, Confiabilidade e Adaptação de Cadências**  
**Projeto:** Birth Hub 360°  
**Data:** Outubro de 2026  

---

## 1. Classificação dos Sinais de Engajamento

Os sinais recebidos pelo `SelfDrivingCrmService` são categorizados por **Canal**, **Tipo de Sinal**, **Confiabilidade intrínseca** e **Ação recomendada**:

| Canal | Tipo de Sinal | Confiabilidade | Peso Decisório | Ação no Self-Driving CRM |
|---|---|---|---|---|
| **Voz** (`voice_call`) | `CALL_ANSWERED` | Alta (1.0) | Alto | Manter cadência ativa por voz; sugerir agendamento imediato de demo. |
| **Voz** (`voice_call`) | `CALL_UNANSWERED` | Alta (1.0) | Médio | Acumular contador de tentativas frustradas (>= 2 aciona avaliação). |
| **WhatsApp** (`whatsapp`) | `WHATSAPP_REPLIED` | Alta (1.0) | Muito Alto | Priorizar canal WhatsApp; propor redução imediata de ligações frias. |
| **E-mail** (`email`) | `EMAIL_REPLIED` | Alta (1.0) | Alto | Sugerir transição para cadência consultiva assíncrona por e-mail. |
| **E-mail** (`email`) | `EMAIL_OPENED` | Baixa (0.4) | Muito Baixo | **Nunca** tratar como interesse de compra; apenas telemetria técnica. |
| **Reunião** (`meeting`) | `MEETING_SCHEDULED` | Alta (1.0) | Crítico | Suspender toques de prospecção fria; ativar cadência de pré-reunião. |
| **Reunião** (`meeting`) | `MEETING_COMPLETED` | Alta (1.0) | Crítico | Acionar motor de ROI e preparo de proposta de valor. |
| **Consentimento** | `OPTOUT_REQUESTED` | Alta (1.0) | Bloqueador | Bloquear imediatamente todos os canais e cancelar tarefas ativas. |

---

## 2. Regras de Adaptação Heurística
1. **Regra Voz Frustrada -> WhatsApp Receptivo:**
   - **Condição:** `unansweredCalls >= 2` E `whatsappReplies > 0`.
   - **Recomendação:** `reduce_calls_shift_whatsapp`.
   - **Ajuste proposto:** Reduzir toques de voz em 50% e antecipar mensagem de WhatsApp para horário comercial de maior resposta (14h - 17h).
2. **Regra Voz Frustrada -> E-mail Receptivo:**
   - **Condição:** `unansweredCalls >= 3` E `emailReplies > 0`.
   - **Recomendação:** `switch_to_email_consultative`.
   - **Ajuste proposto:** Migrar para e-mail com envio de material técnico ou caso de sucesso.
3. **Regra Chamada Atendida com Sucesso:**
   - **Condição:** `answeredCalls >= 1`.
   - **Recomendação:** `accelerate_touchpoints`.
   - **Ajuste proposto:** Agendamento rápido de reunião dentro de 48 horas.
