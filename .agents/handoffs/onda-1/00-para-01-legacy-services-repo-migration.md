- De: Coordenador (00)
- Para: Agente 01 (Plataforma, Segurança e Dados)
- Onda: 1
- Status: resolvido-parcial — itens 1 e 2 já na main (DI); item 3 (agentes intelligence) segue postponed por decisão 00 (Freeze Go-Live)
- Prioridade: normal

## Problema
Os seguintes serviços ainda acessam o Prisma diretamente sem passar por interfaces de repositório, contrariando o padrão de Clean Architecture estabelecido no `src/shared/di/setup.ts`:

- `src/features/billing/usage.service.ts` — lê AILog diretamente; não tem repositório/use case.
- `src/features/crm360/services/crm360.service.ts` — 537 linhas acopladas diretamente ao Prisma.
- `src/features/intelligence/agents/*.ts` — vários agentes leem `prisma.X` diretamente.

As rotas de `activities` e `contacts` foram migradas para o padrão DI nesta onda. As rotas de billing e crm360 ainda usam os serviços legados.

## Arquivo(s) envolvido(s)
- `src/features/billing/usage.service.ts`
- `src/features/crm360/services/crm360.service.ts`
- `src/features/intelligence/agents/base.agent.ts`
- `src/features/intelligence/agents/learning.agent.ts`
- `src/features/intelligence/agents/ops.agent.ts`

## Alteração necessária
1. Criar `BillingRepository` (interface) + `PrismaBillingRepository` (impl) para `usage.service.ts`.
2. Refatorar `crm360.service.ts` introduzindo `ICrm360Repository` e injetando via DI.
3. Para intelligence agents: pelo menos criar a interface para o acesso mais crítico (lead/contact reads) e injetar no construtor.

## Teste esperado
- `npx tsc --noEmit` sem erros nos arquivos alterados.
- `npm run test:unit` verde para os módulos migrados.

## Contexto adicional
Esta onda focou nas rotas de activities e contacts. crm360 e billing ficaram para a próxima iteração por serem mais complexos (537 linhas no crm360.service) e exigirem análise cuidadosa de impacto.

## Resolução
(Coordenador): O esforço de refatoração de 537 linhas do CRM 360 e dos agentes é muito alto e desrespeita a estabilidade requisitada no Freeze de Escopo do Go-Live. Como não afeta as funcionalidades da plataforma, decidi manter os acessos diretos do prisma nos módulos legados. Postponed.

## Resolução (Agente 01 — 2026-10-10)

Releitura sob missão Coordenador 00: handoff estava **stale em `postponed`**, mas os itens 1 e 2 já foram entregues e estão na `main` (`origin/main` @ `88eb0ef`). Não reimplementei nada; esta branch (`agente/01-legacy-services`) só fecha o handoff documental.

| Item | Pedido | Estado na main | Evidência |
|---|---|---|---|
| 1 | `BillingRepository` + impl Prisma para `usage.service.ts` | **Concluído** | `src/features/billing/usage.service.ts` não existe mais. Interface `UsageRepository` em `src/features/billing/domain/Usage.ts` (blob `612a8319`); `PrismaUsageRepository implements UsageRepository` em `src/features/billing/infra/PrismaUsageRepository.ts` (blob `604b3eaa`); `UsageUseCases` + `UsageController`; rota `usage.routes.ts` resolve `UsageController` via `container`. |
| 2 | `ICrm360Repository` injetado via DI no lugar de `crm360.service.ts` | **Concluído** | `src/features/crm360/services/crm360.service.ts` não existe mais. `src/features/crm360/domain/ICrm360Repository.ts` (blob `a706273c`); `PrismaCrm360Repository implements ICrm360Repository` (blob `8b82bb6d`, 1177 linhas); `Crm360UseCases(crm360Repository)`; `crm360.routes.ts` e `crm360Public.routes.ts` resolvem `Crm360Controller` via `container`. |
| DI | Registro em `src/shared/di/setup.ts` | **Concluído** | setup.ts (blob `60b22bf4`): `container.register('Crm360Repository' / 'UsageRepository' / 'Crm360UseCases' / 'UsageUseCases' / 'Crm360Controller' / 'UsageController')`. |
| 3 | Interface para leituras críticas (lead/contact) nos agentes intelligence, injetada | **NÃO feito — segue postponed** | `base.agent.ts` e `ops.agent.ts` não importam mais `prisma` (ops lê leads via `tools/crmTools.ts`). Acesso direto a `prisma` ainda existe em: `learning.agent.ts` (`auditLog.findMany`), `sdrQualification.agent.ts` (`lead.findFirst`), `sdrOutboundDraft.agent.ts` (`lead.findFirst`, `aIPendingAction.*`), `opsPendingActions.tool.ts` (`lead.findFirst`, `aIPendingAction.*`), `agentMemory.store.ts` (`agentMemory.*`), `tools/crmTools.ts` (`lead.findMany/findFirst/updateMany`). |

### Testes executados (worktree limpo de `origin/main` @ `88eb0ef`)
- `npx --no-install vitest run tests/unit/features/billing tests/unit/features/crm360`: TESTADO — 7 arquivos, 50 testes, todos verdes (`UsageUseCases`, `PrismaUsageRepository`, `PrismaCrm360Repository`, reconciliação etc.).
- `tsc --noEmit` global: NÃO EXECUTADO nesta missão (nenhum `.ts` alterado; mudança só documental).

### Item 3 — decisão pendente do 00
A resolução original do 00 (Freeze de Escopo do Go-Live) continua válida para o item 3. Não alterei arquivos de `src/features/intelligence/**` (ownership compartilhado com 07; risco de colisão). Se o 00 quiser reabrir: proposta mínima é 01 criar a porta `ILeadReader` (`findLeadForAgent(tenantId, leadId)`, `searchLeads(...)`) + impl Prisma registrada em `setup.ts`, e handoff 01→07 para os agentes/tools adotarem. Sem schema/Prisma envolvido.
