# MEMÓRIA TÉCNICA — EIXO 9: MOBILE EDGE AI, OFFLINE-FIRST E GEOFENCING CONSENTIDO
**Onda:** 04 — Experiência Comercial Avançada  
**Agente Responsável:** Agente 09 — Mobile / Agente 15 — Segurança Aplicada  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-04`

---

## 1. Contexto e Objetivo
Permitir que vendedores em campo acessem briefings completos de contas e reuniões em modo 100% offline (`mobileEdgeBriefing.service.ts`), sincronizem notas e atividades de forma resiliente após reconexão e utilizem geofencing consentido para sugestão não invasiva de abertura de briefings.

**Garantia Estrita de Privacidade:**
Entrar no raio geográfico de uma empresa cadastrada NUNCA dispara gravação de áudio, envio de mensagem ou ligação de forma autônoma. O microfone permanece inativo até ação humana deliberada e consentida.

---

## 2. Contratos e Interfaces Formais
Arquivo de contrato: `src/shared/contracts/mobileEdgeBriefing.contract.ts`
- `CachedMeetingBriefing`: Dados da empresa, contatos, histórico, oportunidades, riscos RevOps, objeções conhecidas, hash SHA-256 e status de expiração (`isStale`).
- `GeofenceLocationInput` & `GeofenceMatchResult`: Avaliação de proximidade com flag explícita `isRecordingBlocked: true`.
- `OfflineMutationRecord`: Fila de mutações com resolução de conflitos e garantia de idempotência.

---

## 3. Implementação Técnica
Arquivo de serviço: `src/features/mobile/server/mobileEdgeBriefing.service.ts`
- **Briefing Pré-Visita em Cache:**
  - Armazenamento local protegido com cálculo de hash criptográfico SHA-256 para integridade.
  - O vendedor em trânsito visualiza contatos-chave, dores mapeadas e riscos antes de entrar na reunião.
- **Geofencing Consentido:**
  - Cálculo de proximidade via fórmula de Haversine em metros.
  - Ao entrar no raio (ex: 200m), o sistema emite uma notificação local sugerindo a leitura do briefing (`PROMPT_OPEN_BRIEFING`).
  - O microfone é mantido bloqueado por design.
- **Sincronização Offline-First:**
  - Processamento em lote de notas tomadas durante a visita com tratamento de falhas e confirmação de entrega ao backend corporativo.

---

## 4. Testes e Evidências
- `tests/unit/mobile/mobileEdgeBriefing.service.test.ts`:
  - Geração e recuperação de briefing em cache com hash de integridade.
  - Proximidade de geofencing com trava de gravação automática (`isRecordingBlocked: true`).
  - Sincronização de mutações offline.
  - Multi-tenancy guard bloqueando vazamento de briefings entre organizações.
- `tests/integration/onda-04/onda04ComprehensiveFlow.integration.test.ts` (Jornada C).
