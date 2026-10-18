# MATRIZ DE PROPRIEDADE DOS AGENTES — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação, Estabilização e Governança`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md` (Governança Global de Agentes)  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Modelo de Concorrência e Alocação de Slots

Conforme as regras de concorrência de `AGENTS.md` (§13 e §14):
- **Capacidade do Coordenador:** 1 slot reservado ao Agente 00.
- **Capacidade de Especialistas:** Até 8 especialistas simultâneos com isolamento estrito de branch e worktree.
- **Escalonamento Seguro:** 3 → 4 → 6 → 8 agentes com portas de integração intermediárias a cada 2–3 merges.
- **Slots Exclusivos e de Exclusão Mútua:**
  - 01 ↔ 01A nunca concorrem simultaneamente em migrações/schema.
  - 06 ↔ 06A nunca concorrem simultaneamente no módulo de integrações.
  - 16 ↔ 06/07 nunca escrevem concorrentemente em `src/lib/queue/**`.

### Bateria Oficial da Onda 00 (8 Especialistas + Coordenação)

| Slot | Agente | Domínio Funcional | Propriedade Exclusiva de Arquivos |
|:---:|---|---|---|
| **00** | **00 — Coordenador** | Orquestração Global e Integração | `.agents/runs/**`, governança de onda, integração |
| **01** | **01 — Plataforma e Dados** | Banco de Dados, Prisma, Tenancy e RLS | `prisma/schema.prisma`, `prisma/migrations/**`, `src/lib/prisma.ts` |
| **02** | **04 — CRM e BI** | Métricas Comerciais, Forecast, Pipeline | `src/features/crm/**`, `src/features/crm360/**`, `src/features/commercial-intelligence/**` |
| **03** | **06 — Integrações e Bitrix** | Bitrix24, Telefonia, Webhooks e Provedores | `src/features/integrations/**`, `src/lib/voice-hub/**` |
| **04** | **08 — QA e Release** | CI/CD, Pipelines, Gates e Releases | `.github/workflows/**`, `Dockerfile`, `docker-compose.yml`, scripts de CI |
| **05** | **10 — Infraestrutura e SRE** | Redis, Cluster, Observabilidade, Docker | `infrastructure/**`, `k8s/**`, `argocd/**`, `charts/**`, `docker/**` |
| **06** | **14 — Ambiente e Test Harness** | Harness de Testes, Determinismo e Fixtures | `tests/**`, `vitest.*.config.ts`, `playwright.config.ts`, `scripts/test/**` |
| **07** | **15 — Segurança Aplicada** | Criptografia, PII, Segredos e Sanitização | `src/lib/security/**`, `src/lib/ai/guardrails/**`, rotação de chaves |
| **08** | **18 — Contratos e API** | Contratos de Composição, OpenAPI e DTOs | `src/shared/contracts/**`, `docs/openapi.yaml`, validação de deriva |
| **AUDIT** | **24 — Revisão Independente** | Auditoria e Parecer Independente | `.agents/reviews/**` (não altera código de produto) |

---

## 2. Mapa Detalhado de Propriedade por Diretório e Arquivo

```text
c:\Github\Birthub-360
├── .github/workflows/**                 --> Agente 08 (QA e Release)
├── Dockerfile, docker-compose*.yml      --> Agente 08 (CI) / Agente 10 (Infra)
├── prisma/schema.prisma                 --> Agente 01 (Plataforma, Segurança e Dados)
├── prisma/migrations/**                 --> Agente 01 (Plataforma, Segurança e Dados)
├── src/App.tsx, Sidebar.tsx             --> Agente 02 (Produto e UX)
├── src/shared/contracts/**              --> Agente 18 (Contratos e API)
├── src/shared/di/setup.ts               --> Agente 00 / Agente 18 (Composition Root)
├── src/lib/queue/**                     --> Agente 16 (Runtime e Filas)
├── src/lib/security/**                  --> Agente 15 (Segurança Aplicada)
├── src/lib/ai/gateway/**                --> Agente 07 (IA e Automações)
├── src/features/commercial-intelligence --> Agente 04 (CRM e BI)
├── src/features/integrations/bitrix/**  --> Agente 06 / Agente 06A (Integrações)
├── src/features/voice-hub/**            --> Agente 12 (Voz e Telefonia)
├── src/features/mobile/**               --> Agente 09 (Mobile)
├── android/**, capacitor.config.ts      --> Agente 09 (Mobile)
├── tests/**                             --> Agente 14 (Harness) / Agente 08 (QA)
├── .agents/runs/**                      --> Agente 00 (Coordenação)
├── .agents/reviews/**                   --> Agente 24 (Auditor Independente)
└── .agents/handoffs/**                  --> Cada autor cria; destinatário resolve
```

---

## 3. Protocolo de Aprovação Especial

Conforme §15 do `AGENTS.md`:
1. `server.ts` e `worker.ts`: Exigem aprovação formal do Agente 00. Nenhuma alteração é comitada diretamente sem demonstrar necessidade estrita de composition root ou lifecycle do processo.
2. `package.json` e `package-lock.json`: Exigem aprovação formal do Agente 00. Não é permitido adicionar dependências sem comprovar insuficiência da biblioteca já instalada.
3. `AGENTS.md` e `.agents/prompts/**`: Congelados contra edição autônoma de qualquer agente (decisão humana soberana).

---

## 4. Regras de Isolamento Git e Worktrees

1. **Branch de Integração:** `integracao/onda-00`.
2. **Branches de Especialistas:** Formato `agente/<NN>-onda-00-<slug>`.
3. **Isolamento Físico:** Cada especialista em execução paralela opera exclusivamente em seu diretório de checkout/worktree isolado.
4. **Resolução de Conflitos:** Nenhum agente apaga código alheio. Conflitos cross-domain geram handoff estruturado em `.agents/handoffs/onda-00/`.
