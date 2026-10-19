# MEMÓRIA TÉCNICA — EIXO 8: DIGITAL TWINS METODOLÓGICOS (MENTORIA INSPIRADA EM TÉCNICAS VENCEDORAS)
**Onda:** 04 — Experiência Comercial Avançada  
**Agente Responsável:** Agente 07 — IA e Automações / Agente 13 — Enxame de Agentes  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-04`

---

## 1. Contexto e Objetivo
Permitir que o Birthub 360° identifique técnicas comerciais de alta eficácia (SPIN Selling, Challenger Sale, Sandler) a partir de padrões observados em negócios ganhos e sessões de Roleplay, transformando-as em mentores sintéticos de treinamento pedagógico (`methodologicalMentor.service.ts`).

**Garantia Ética e Regulatória Fundamental:**
Não são criados clones de identidade, voz ou personalidade de vendedores humanos reais. Toda mentoria opera através de treinadores metodológicos sintéticos curados por comitês de gestão comercial.

---

## 2. Contratos e Interfaces Formais
Arquivo de contrato: `src/shared/contracts/methodologicalDigitalTwin.contract.ts`
- `CommercialTechniquePattern`: Padrão de técnica (`techniqueId`, `category`, `description`, `triggerContext`, `exampleSyntheticSnippet`, `evaluationChecklist`, `recommendedTalkRatioTarget`).
- `MethodologicalMentorProfile`: Perfil do mentor sintético com flag inviolável `isSyntheticCoach: true`.
- `MentorshipExercise` e `MentorshipEvaluation`: Exercícios práticos com cálculo de aderência a SPIN (`spinAdherencePercent`), proporção de fala/escuta (`talkRatioPercent`) e feedback pedagógico acionável.

---

## 3. Implementação Técnica
Arquivo de serviço: `src/features/roleplay/services/methodologicalMentor.service.ts`
- **Catálogo de Padrões Canônicos:** Padrões pré-carregados para investigação de implicação e necessidades de solução (SPIN).
- **Curadoria e Não-Inferência Psicológica:** O avaliador foca exclusivamente na técnica verbal e estrutura de perguntas, sem inferir emoção, saúde mental ou capacidade cognitiva do vendedor.
- **Integração com DomainEventMesh:** Disparo de evento `METHODOLOGICAL_MENTORSHIP_COMPLETED` correlacionado ao exercício para retroalimentação da Gamificação.

---

## 4. Testes e Evidências
- `tests/unit/roleplay/methodologicalMentor.service.test.ts`:
  - Listagem e registro de técnicas com validação de categorias.
  - Criação de mentor com garantia `isSyntheticCoach: true`.
  - Avaliação de resposta com cálculo de aderência metodológica (score >= 80%).
  - Multi-tenancy guard bloqueando acesso entre organizações.
- `tests/integration/onda-04/onda04ComprehensiveFlow.integration.test.ts` (Jornada B).
