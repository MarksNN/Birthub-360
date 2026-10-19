# PLANO DE EXECUÇÃO — ONDA 04
**Data:** 18 de Outubro de 2026  
**Projeto:** BIRTH HUB 360°  
**Orquestrador:** Agente 00 — Orquestrador Global  
**Auditor Independente:** Agente 24  
**Base:** `integracao/onda-04`  

---

## 1. Missão Estratégica da Onda 04

Implementar e homologar cinco evoluções da experiência comercial avançada, unindo inteligência de voz em tempo real, mentoria metodológica de vendas, mobile edge AI com offline-first, treinamentos competitivos e colaborativos (War Room Arena) e personalização consentida de comunicação (Shadow Copywriting).

---

## 2. As Cinco Frentes de Implementação

### Eixo 5 — Copiloto Bimodal Live (Voz Natural em Tempo Real)
- **Agentes:** 12 (Voz) e 07 (IA), suporte de 18 (Contratos) e 23 (FinOps).
- **Entregáveis de Código:**
  - `src/shared/contracts/bimodalLive.contract.ts`: Tipagem rigorosa para sessões, pacotes de áudio, detecção de turnos, eventos de barge-in, telemetria de latência p50/p95/p99 e fallbacks.
  - `src/features/voice/services/bimodalLiveOrchestrator.service.ts`: Orquestrador de streaming com suporte a VAD, interrupção imediata da resposta da IA (barge-in), isolamento multi-tenant e fallback automático para pipeline STT/TTS convencional quando o canal live oscilar.
  - `tests/unit/voice/bimodalLive.service.test.ts`: Testes de turnos, interrupção, reconexão, timeout, fallback e proteção de dados.

### Eixo 8 — Digital Twins Metodológicos (Mentoria de Vendas)
- **Agentes:** 07 (IA), 13 (Swarm/Roleplay), 04 (CRM) e 15 (Segurança).
- **Entregáveis de Código:**
  - `src/shared/contracts/methodologicalTwin.contract.ts`: Contrato de extração metodológica (SPIN Selling, perguntas abertas, proporção fala/escuta, ancoragem de preço, superação de objeções).
  - `src/features/roleplay/services/methodologicalTwin.service.ts`: Serviço de extração e mentoria simulada. Gera persona de treinador sintético (sem clonar identidade ou voz de vendedores reais) para guiar o vendedor com base em práticas comprovadas do tenant.
  - `tests/unit/roleplay/methodologicalTwin.service.test.ts`: Testes de extração com amostra suficiente vs insuficiente, anonimização, isolamento de tenant e avaliação pedagógica.

### Eixo 9 — Mobile Edge AI e Offline-First
- **Agentes:** 09 (Mobile), 07 (IA), 02 (UX) e 15 (Segurança).
- **Entregáveis de Código:**
  - `src/shared/contracts/mobileEdgeAi.contract.ts`: Contrato de briefings offline, notas de campo com consentimento, geofencing voluntário e política de limpeza em logout.
  - `src/features/mobile/services/mobileEdgeAi.service.ts`: Gerenciamento de briefing pré-visita em cache criptografado local, geofencing consentido (apenas sugestão de abertura de briefing, sem gravação ou tracking desnecessário), integração com `offlineSync.service.ts` e expurgo de dados locais no logout.
  - `tests/unit/mobile/mobileEdgeAi.service.test.ts`: Testes de funcionamento offline, detecção de geofence autorizada vs negada, expurgo em logout e conciliação de fila.

### Eixo 14 — War Room Arena (Simulações Competitivas de Vendas)
- **Agentes:** 02 (UX), 03 (Design), 07 (IA) e 13 (Swarm).
- **Entregáveis de Código:**
  - `src/shared/contracts/warRoomArena.contract.ts`: Contrato tipado para lobbies de simulação, duelos de objeção, treinamento em equipe, critérios de avaliação pedagógica e atribuição de pontos/badges.
  - `src/features/roleplay/services/warRoomArena.service.ts`: Orquestrador de partidas e duelos, avaliação transparente por rubricas objetivas e integração idempotente com o motor de Gamificação (`behavioralEngine.service.ts` e `calculateSellerLevel`).
  - `tests/unit/roleplay/warRoomArena.service.test.ts`: Testes de fluxo de rodadas, avaliação pedagógica, idempotência na pontuação e proteção contra manipulação.

### Eixo 15 — Shadow Copywriting (Personalização de Estilo Comercial)
- **Agentes:** 07 (IA), 02 (UX), 15 (Segurança) e 21 (LGPD).
- **Entregáveis de Código:**
  - `src/shared/contracts/shadowCopywriting.contract.ts`: Contrato tipado de perfil de estilo (formalidade, brevidade, saudações, emojis, tom consultivo), consentimento explícito e revogabilidade.
  - `src/features/social-selling/server/shadowCopywriting.service.ts`: Serviço de extração e aplicação de estilo, separando dados factuais (RAG/Playbook) do tom pessoal do vendedor. Revisão humana obrigatória antes do disparo e expurgo total de dados mediante revogação.
  - `tests/unit/social-selling/shadowCopywriting.service.test.ts`: Testes de extração com amostras voluntárias, geração preservando fatos, revogação de consentimento, isolamento entre vendedores e bloqueio de prompt injection.

---

## 3. Ordem de Execução por Ondas Internas

1. **Etapa 1 — Contratos Compartilhados (Slot 1 - Agente 18):**
   - Criação de `bimodalLive.contract.ts`, `methodologicalTwin.contract.ts`, `mobileEdgeAi.contract.ts`, `warRoomArena.contract.ts` e `shadowCopywriting.contract.ts`.
2. **Etapa 2 — Implementações dos Especialistas (Slots 2 a 6 - Agentes 12, 07, 09, 13, 02):**
   - Criação dos 5 serviços de domínio correspondentes e suas suítes de testes unitários.
3. **Etapa 3 — Integração Cross-Domain e Testes E2E (Slot 7 - Agente 08):**
   - Criação de `tests/integration/onda04ComprehensiveFlow.integration.test.ts` cobrindo as 5 jornadas E2E.
4. **Etapa 4 — Validação dos Quality Gates:**
   - Execução de `typecheck`, `lint`, `format:check`, `test:architecture`, `test:unit`, `test:integration`, `build`.
5. **Etapa 5 — Auditoria Independente do Agente 24:**
   - Registro de evidências em `.agents/reviews/onda-04-evidencias.json` e emissão do parecer formal `.agents/reviews/24-onda-04-revisao-independente.md`.
6. **Etapa 6 — Documentação Executiva e Checklist Interativo:**
   - Produção dos relatórios técnicos obrigatórios e do checklist HTML interativo.
