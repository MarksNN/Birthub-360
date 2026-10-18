# MATRIZ DE PROPRIEDADE E CONCORRÊNCIA — ONDA 01
**Onda:** 01 — Fundação da Inteligência Autônoma  
**Coordenador:** Agente 00  
**Capacidade de Concorrência:** 8 Especialistas Simultâneos  
**Data:** 2026-10-18  

---

## 1. Atribuição de Domínios e Propriedade Exclusiva

| Especialista | Domínio | Arquivos e Diretórios Sob Propriedade Exclusiva | Fora de Escopo / Proibições |
|---|---|---|---|
| **01 — Plataforma e Dados** | Persistência, Schema, RLS e Multi-tenancy | `prisma/schema.prisma`<br>`prisma/migrations/**`<br>`src/lib/prisma.ts`<br>`src/lib/tenant-prisma.ts` | Não toca UI, filas (`src/lib/queue/**`) ou AI Gateway |
| **07 — IA e Automações** | RAG Híbrido, Curadoria, AI Gateway, FinOps | `src/features/knowledge/**`<br>`src/lib/ai/**`<br>`src/features/playbook/services/**` | Não toca `src/lib/queue/**` (exclusivo do 16) |
| **13 — Swarm de Agentes** | Governança de Runtime e Aprendizado Comercial | `src/features/intelligence/agents/**`<br>`src/features/intelligence/services/**` | Não altera gateway diretamente sem contrato |
| **16 — Runtime e Workers** | Event Mesh, Filas, Redis, Outbox | `src/lib/queue/**`<br>`worker.ts` | Não altera `server.ts` sem aprovação do 00 |
| **18 — Contratos e API** | Contratos Versionados, Documentação Viva | `src/shared/contracts/**`<br>`docs/**` (exceto `docs/security/**`) | Não implementa lógica de negócio nas features |
| **15 — Segurança Aplicada** | Tokenização PII, Guardrails, Consent Hash Chain | `src/lib/security/**`<br>`src/lib/ai/guardrails/**`<br>`docs/security/**` | Não altera models de produto sem handoff para 01 |
| **08 — QA e Release** | Testes Integrados, Gates, CI/CD | `tests/**`<br>`.github/workflows/**`<br>`scripts/ci/**` | Não edita código de produção |
| **12 — Voz e Telefonia** | Objeções em Transcrições e Eventos de Chamadas | `src/features/voice-hub/**`<br>`src/lib/voice-hub/**` | Não altera schemas ou filas diretamente |

---

## 2. Especialistas Rotativos (Acionamento sob Demanda)

- **Agente 04 (RevOps / CRM):** Validação de atribuição comercial e deals semelhantes (`src/features/commercial-intelligence/**`).
- **Agente 09 (Mobile):** Validação de sincronização offline de áudio de campo (`src/features/mobile/**`).
- **Agente 21 (LGPD & Privacidade):** Validação dos fluxos de exclusão e revogação de consentimento.
- **Agente 22 (Verificação de Realidade):** Comprovação de persistência real de dados sem mock.
- **Agente 23 (FinOps & Custos):** Auditoria de orçamentos de tokens, cache semântico e cascade.
- **Agente 24 (Revisão Independente):** Auditoria obrigatória de cada entrega.

---

## 3. Regras de Isolamento e Não-Interferência

1. **Fila e Workers:** `src/lib/queue/**` pertence exclusivamente ao Agente 16. O Agente 07 e o Agente 13 não alteram arquivos da fila diretamente.
2. **Schema e Banco:** Apenas o Agente 01 edita `prisma/schema.prisma`.
3. **Contratos:** Novos contratos são centralizados em `src/shared/contracts/` sob governança do Agente 18.
4. **Gates Locais:** Nenhum especialista integra sem antes passar por `npx tsc --noEmit` e testes locais.
