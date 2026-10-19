# MATRIZ DE PROPRIEDADE — ONDA 04
**Data:** 18 de Outubro de 2026  
**Status:** PUBLICADA E VIGENTE  
**Orquestrador:** Agente 00  
**Auditor Independente:** Agente 24  
**Base:** `integracao/onda-04`  

---

## 1. Concorrência e Alocação dos Slots (Até 8 Especialistas Simultâneos)

Conforme a Seção 3 e Seção 15 do `AGENTS.md`, a execução da Onda 04 utiliza a capacidade máxima permitida de concorrência com separação rigorosa de propriedade de arquivos e isolamento de domínios.

| Slot | Agente Especialista | Domínio Funcional da Onda 04 | Arquivos sob Propriedade Exclusiva |
|---|---|---|---|
| **00** | Coordenador Global | Orquestração, baseline, gates, integração e relatórios | `.agents/runs/onda-04-*`, branch de integração |
| **01 (Slot 1)** | 18 — Contratos e API | Contratos tipados compartilhados das 5 frentes | `src/shared/contracts/bimodalLive.contract.ts`<br>`src/shared/contracts/methodologicalTwin.contract.ts`<br>`src/shared/contracts/mobileEdgeAi.contract.ts`<br>`src/shared/contracts/warRoomArena.contract.ts`<br>`src/shared/contracts/shadowCopywriting.contract.ts` |
| **02 (Slot 2)** | 12 — Voz e Telefonia | Eixo 5: Streaming bimodal live, barge-in, VAD, fallback | `src/features/voice/services/bimodalLiveOrchestrator.service.ts`<br>`tests/unit/voice/bimodalLive.service.test.ts` |
| **03 (Slot 3)** | 07 — IA e Automações | Eixo 8: Digital Twins Metodológicos (técnicas de vendas) | `src/features/roleplay/services/methodologicalTwin.service.ts`<br>`tests/unit/roleplay/methodologicalTwin.service.test.ts` |
| **04 (Slot 4)** | 09 — Mobile | Eixo 9: Mobile Edge AI, offline-first e geofencing | `src/features/mobile/services/mobileEdgeAi.service.ts`<br>`tests/unit/mobile/mobileEdgeAi.service.test.ts` |
| **05 (Slot 5)** | 13 — Swarm & Roleplay | Eixo 14: War Room Arena, simulações competitivas | `src/features/roleplay/services/warRoomArena.service.ts`<br>`tests/unit/roleplay/warRoomArena.service.test.ts` |
| **06 (Slot 6)** | 02 / 04 — Social Selling | Eixo 15: Shadow Copywriting, personalização de estilo | `src/features/social-selling/server/shadowCopywriting.service.ts`<br>`tests/unit/social-selling/shadowCopywriting.service.test.ts` |
| **07 (Slot 7)** | 08 — QA e Release | Testes de integração cross-domain, performance, gates | `tests/integration/onda04ComprehensiveFlow.integration.test.ts`<br>`docs/onda-04-checklist.html` |
| **08 (Slot 8)** | 21 / 15 — Segurança & LGPD | Revisão de PII, consentimento, áudio e isolamento de tenant | `.agents/runs/onda-04-lgpd-seguranca.md`<br>Políticas de retenção e expurgo |
| **Auditor** | 24 — Auditoria Independente | Parecer formal e validação de gates | `.agents/reviews/24-onda-04-revisao-independente.md`<br>`.agents/reviews/onda-04-evidencias.json` |

---

## 2. Regras de Não-Interferência e Exclusão Mútua

1. **Sem sobreposição de escrita:** Cada agente edita exclusivamente seus arquivos mapeados.
2. **Prisma e Migrations:** Nenhum especialista da Onda 04 edita `prisma/schema.prisma` ou `prisma/migrations/**` (permanecem trancados).
3. **App.tsx e Navegação:** Propriedade exclusiva do Agente 02.
4. **Queue e Workers:** Não há alteração concorrente em `src/lib/queue/**`.
5. **Auditoria Independente:** O Agente 24 não altera código de produção e revisa os diffs reais com base nos critérios P1-P4 do `AGENTS.md`.
