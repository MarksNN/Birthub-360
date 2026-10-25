De: gha — Agente de CI/GitHub Actions (workflows sob 08 — QA e Release)
Para: 01 — Plataforma e Dados
Onda: 52
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: GHA-TYPECHECK-01 (run 40204212570)
Sprint destino: desbloqueio do application gate (`Run Type Check`) após #67 → #71 → #72

## Problema

Com #67 + #71 + #72 combinados, o application gate do Release passa por audit, prisma generate, lint e format e para em `Run Type Check`. O maior bloco dos erros herdados da main (66 dos 99) vem de código que usa modelos, campos ou valores de enum do Prisma que **não existem em `prisma/schema.prisma`** (o client gerado não os contém). Cabe ao 01, dono do schema e das migrations (§15), decidir caso a caso entre:

- (a) criar modelo/campo/enum + migration, quando a feature é intencional; ou
- (b) declarar que o schema está correto e devolver a correção ao dono do código: **06** para `src/features/integrations/*` e **07** para `src/features/intelligence/*`.

Este handoff não altera código nem schema.

## Arquivo(s) envolvido(s)

- `prisma/schema.prisma` e `prisma/migrations/` (decisão do 01)
- `src/shared/contracts/domainEventMesh.contract.ts` (`DomainEventType` é contrato TS, não enum Prisma)
- Código consumidor: 5 arquivos de integrações (parte do 06) e 15 arquivos de inteligência (parte do 07), listados abaixo.

## Evidência

- Run de validação combinada `40204212570` (Central Birth Hub 360 Release, branch `agente/gha-validate-67-71-72-v2`, head `def647989e60b922b5fec2c12ab29e48e3f93a73` = main `6d63eb39` + #67 + #71 + #72), job `121201704278` (application gate): `audit`, `prisma generate`, `lint`, `format` e `clean-tree` verdes; **`Run Type Check` (`npm run typecheck` = `tsc --noEmit`) falha** com 99 erros únicos em 38 arquivos. https://github.com/MarksNN/Birthub-360/actions/runs/40204212570
- Reprodução local com o mesmo comando e o mesmo Node do CI (v22.23.3, `npm ci` + `npx prisma generate` + `npm run typecheck`):
  - main pura `6d63eb39`: **107** erros únicos (42 arquivos);
  - validação `def64798`: **99** erros únicos (38 arquivos), lista idêntica à do job de CI;
  - comparação por arquivo+código+mensagem (ignorando linha/coluna deslocada pela formatação): **0 erros novos**; 8 erros da main somem com o #72 (`WhatsAppIcon`, `calendly connectionId`, `supervisor sessionId`, `chat-model logger`).
  - Os 99 restantes são **herdados da main** (nenhum introduzido por #67/#71/#72). Arquivos criados nos commits `20eed2c8`, `cdea0bc9`, `d9ea7a3a`, `0c4fe2fd`, `dfe7517c` e `58e9fd87`.
- Formato das linhas abaixo: `arquivo:linha:coluna` na main `6d63eb39` e, entre colchetes, a posição equivalente após #71/#72 (validação `def64798`).

### Parte de integrações (correção de código pelo 06, se o 01 optar por (b)) — 11 erros, 5 arquivos

```
src/features/integrations/calendly/calendly.service.ts:43:35  [pós #71/#72: :43:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:67:17  [pós #71/#72: :67:17]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:79:35  [pós #71/#72: :77:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:119:35  [pós #71/#72: :117:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:188:35  [pós #71/#72: :189:35]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/calendly/calendly.service.ts:202:16  [pós #71/#72: :203:16]  TS2339 Property 'calendlyConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/googleSheets/googleSheets.service.ts:9:35  [pós #71/#72: :9:35]  TS2339 Property 'googleSheetsConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/hubspot/hubspot.service.ts:24:35  [pós #71/#72: :24:35]  TS2339 Property 'hubspotConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/integrations/notion/notion.service.ts:19:35  [pós #71/#72: :19:35]  TS2551 Property 'notionConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'. Did you mean 'omieConnection'?
src/features/integrations/zoom/zoom.service.ts:38:35  [pós #71/#72: :38:35]  TS2551 Property 'zoomConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'. Did you mean 'omieConnection'?
src/features/integrations/zoom/zoom.service.ts:61:35  [pós #71/#72: :61:35]  TS2551 Property 'zoomConnection' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'. Did you mean 'omieConnection'?
```

Os modelos `CalendlyConnection`, `GoogleSheetsConnection`, `HubspotConnection`, `NotionConnection` e `ZoomConnection` não existem no schema. O tsc sugere `omieConnection`, que existe.

### Parte de inteligência (correção de código pelo 07, se o 01 optar por (b)) — 55 erros, 15 arquivos

```
src/features/intelligence/services/aiPendingAction.service.ts:253:11  [pós #71/#72: :253:11]  TS2353 Object literal may only specify known properties, and 'organizationId' does not exist in type '((Without<NoteCreateInput, NoteUncheckedCreateInput> & NoteUncheckedCrea...
src/features/intelligence/services/autonomyCircuitBreaker.service.ts:119:11  [pós #71/#72: :119:11]  TS2322 Type '"AUTONOMY_CIRCUIT_BREAKER_TRIPPED"' is not assignable to type 'DomainEventType'.
src/features/intelligence/services/autonomyCircuitBreaker.service.ts:161:13  [pós #71/#72: :161:13]  TS2322 Type '"AUTONOMY_CIRCUIT_BREAKER_RECOVERED"' is not assignable to type 'DomainEventType'.
src/features/intelligence/services/autonomyCircuitBreaker.service.ts:223:14  [pós #71/#72: :223:14]  TS2353 Object literal may only specify known properties, and 'active' does not exist in type 'OrganizationWhereInput'.
src/features/intelligence/services/modelBenchmark.service.ts:103:7  [pós #71/#72: :106:7]  TS2353 Object literal may only specify known properties, and 'modelName' does not exist in type 'AIPendingActionWhereInput'.
src/features/intelligence/services/modelBenchmark.service.ts:107:7  [pós #71/#72: :110:7]  TS2353 Object literal may only specify known properties, and 'status' does not exist in type 'AIPendingActionSelect<DefaultArgs>'.
src/features/intelligence/services/modelBenchmark.service.ts:112:7  [pós #71/#72: :115:14]  TS2339 Property 'status' does not exist on type '{ id: string; action: string; entity: string; organizationId: string | null; attempts: number; createdAt: Date; updatedAt: Da...
src/features/intelligence/services/modelBenchmark.service.ts:112:34  [pós #71/#72: :115:41]  TS2339 Property 'status' does not exist on type '{ id: string; action: string; entity: string; organizationId: string | null; attempts: number; createdAt: Date; updatedAt: Da...
src/features/intelligence/services/proactiveAlerts.service.ts:102:7  [pós #71/#72: :105:7]  TS2353 Object literal may only specify known properties, and 'status' does not exist in type 'AIPendingActionSelect<DefaultArgs>'.
src/features/intelligence/services/proactiveAlerts.service.ts:107:7  [pós #71/#72: :110:14]  TS2339 Property 'status' does not exist on type '{ id: string; action: string; entity: string; organizationId: string | null; attempts: number; createdAt: Date; updatedAt: Da...
src/features/intelligence/services/proactiveAlerts.service.ts:107:34  [pós #71/#72: :110:41]  TS2339 Property 'status' does not exist on type '{ id: string; action: string; entity: string; organizationId: string | null; attempts: number; createdAt: Date; updatedAt: Da...
src/features/intelligence/services/promptAbTesting.service.ts:78:35  [pós #71/#72: :78:35]  TS2339 Property 'promptExperiment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/promptAbTesting.service.ts:93:16  [pós #71/#72: :93:16]  TS2339 Property 'promptExperiment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/promptAbTesting.service.ts:96:40  [pós #71/#72: :96:40]  TS2503 Cannot find namespace 'Prisma'.
src/features/intelligence/services/promptAbTesting.service.ts:112:16  [pós #71/#72: :112:16]  TS2339 Property 'promptExperiment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/promptAbTesting.service.ts:127:35  [pós #71/#72: :129:35]  TS2339 Property 'promptExperiment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/promptAbTesting.service.ts:173:16  [pós #71/#72: :177:16]  TS2339 Property 'promptExperiment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/promptAbTesting.service.ts:179:38  [pós #71/#72: :183:38]  TS2503 Cannot find namespace 'Prisma'.
src/features/intelligence/services/promptAbTesting.service.ts:210:17  [pós #71/#72: :212:17]  TS2339 Property 'promptExperiment' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:48:18  [pós #71/#72: :48:18]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:92:12  [pós #71/#72: :92:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:98:12  [pós #71/#72: :98:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:102:21  [pós #71/#72: :102:21]  TS7006 Parameter 'l' implicitly has an 'any' type.
src/features/intelligence/services/swarmAudit.service.ts:135:12  [pós #71/#72: :135:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:136:12  [pós #71/#72: :136:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:137:12  [pós #71/#72: :137:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:142:12  [pós #71/#72: :142:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmAudit.service.ts:147:12  [pós #71/#72: :147:12]  TS2339 Property 'swarmAuditLog' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/swarmRealtimeDashboard.service.ts:88:7  [pós #71/#72: :85:7]  TS2322 Type '"Running"' is not assignable to type 'AgentMemoryStatus | EnumAgentMemoryStatusFilter<"AgentMemory"> | undefined'.
src/features/intelligence/services/swarmRealtimeDashboard.service.ts:107:46  [pós #71/#72: :104:46]  TS2339 Property 'agentRole' does not exist on type '{ success: never; latencyMs: number; costUsd: never; }'.
src/features/intelligence/services/theme.service.ts:16:30  [pós #71/#72: :16:30]  TS2339 Property 'userTheme' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/services/theme.service.ts:34:16  [pós #71/#72: :36:16]  TS2339 Property 'userTheme' does not exist on type 'PrismaClient<PrismaClientOptions, never, DefaultArgs>'.
src/features/intelligence/tools/advancedCommercialTools.ts:48:21  [pós #71/#72: :59:21]  TS2339 Property 'observations' does not exist on type '{ company: { id: string; organizationId: string; segment: string | null; city: string | null; state: string | null; sta...
src/features/intelligence/tools/advancedCommercialTools.ts:273:26  [pós #71/#72: :295:18]  TS2322 Type '"Em_Negociacao"' is not assignable to type 'LeadStatus'.
src/features/intelligence/tools/advancedCommercialTools.ts:277:11  [pós #71/#72: :300:11]  TS2561 Object literal may only specify known properties, but 'copilotoHealthSnapshots' does not exist in type 'LeadInclude<DefaultArgs>'. Did you mean to write 'copilotoDealH...
src/features/intelligence/tools/advancedCommercialTools.ts:285:29  [pós #71/#72: :308:29]  TS2551 Property 'lastInteractionAt' does not exist on type '{ source: string | null; id: string; organizationId: string; status: LeadStatus; temperature: LeadTemperature | nu...
src/features/intelligence/tools/advancedCommercialTools.ts:289:34  [pós #71/#72: :312:34]  TS2339 Property 'copilotoHealthSnapshots' does not exist on type '{ source: string | null; id: string; organizationId: string; status: LeadStatus; temperature: LeadTemperatur...
src/features/intelligence/tools/advancedCommercialTools.ts:292:21  [pós #71/#72: :315:21]  TS2551 Property 'company' does not exist on type '{ source: string | null; id: string; organizationId: string; status: LeadStatus; temperature: LeadTemperature | null; owner:...
src/features/intelligence/tools/advancedCommercialTools.ts:292:45  [pós #71/#72: :315:45]  TS2551 Property 'company' does not exist on type '{ source: string | null; id: string; organizationId: string; status: LeadStatus; temperature: LeadTemperature | null; owner:...
src/features/intelligence/tools/leadEnrichmentTool.ts:79:52  [pós #71/#72: :79:52]  TS2339 Property 'observations' does not exist on type '{ company: { id: string; organizationId: string; segment: string | null; city: string | null; state: string | null; sta...
src/features/intelligence/tools/scriptAndPromptTool.ts:68:39  [pós #71/#72: :77:39]  TS2339 Property 'name' does not exist on type '{ company: { id: string; organizationId: string; segment: string | null; city: string | null; state: string | null; status: Com...
src/features/intelligence/tools/scriptAndPromptTool.ts:68:157  [pós #71/#72: :77:157]  TS2339 Property 'industry' does not exist on type '{ company: { id: string; organizationId: string; segment: string | null; city: string | null; state: string | null; status:...
src/features/intelligence/tools/scriptAndPromptTool.ts:111:13  [pós #71/#72: :120:13]  TS2353 Object literal may only specify known properties, and 'title' does not exist in type 'Without<PromptCreateInput, PromptUncheckedCreateInput> & PromptUncheckedCreateInp...
src/features/intelligence/tools/universalMeetingsTool.ts:89:34  [pós #71/#72: :96:34]  TS2551 Property 'durationMinutes' does not exist on type '{ id: string; active: boolean; organizationId: string; title: string; createdAt: Date; updatedAt: Date; description:...
src/features/intelligence/tools/universalMeetingsTool.ts:101:13  [pós #71/#72: :108:13]  TS2322 Type '"Meeting"' is not assignable to type 'ActivityType | EnumActivityTypeFilter<"Activity"> | undefined'.
src/features/intelligence/tools/universalMeetingsTool.ts:164:15  [pós #71/#72: :183:15]  TS2353 Object literal may only specify known properties, and 'organizationId' does not exist in type '((Without<NoteCreateInput, NoteUncheckedCreateInput> & NoteUncheckedCrea...
src/features/intelligence/tools/universalMeetingsTool.ts:276:11  [pós #71/#72: :306:11]  TS2322 Type '"Meeting"' is not assignable to type 'ActivityType'.
src/features/intelligence/tools/universalMeetingsTool.ts:277:11  [pós #71/#72: :307:11]  TS2322 Type '"Pending"' is not assignable to type 'ActivityStatus | undefined'.
src/features/intelligence/tools/universalNotificationsTool.ts:56:11  [pós #71/#72: :61:11]  TS2322 Type '"Info" | "Success" | "Warning" | "Alert"' is not assignable to type 'NotificationKind | undefined'.
src/features/intelligence/tools/universalOfficeDocsTool.ts:174:13  [pós #71/#72: :192:13]  TS2353 Object literal may only specify known properties, and 'organizationId' does not exist in type '((Without<NoteCreateInput, NoteUncheckedCreateInput> & NoteUncheckedCrea...
src/features/intelligence/tools/universalTasksAndNotesTool.ts:121:13  [pós #71/#72: :142:13]  TS2353 Object literal may only specify known properties, and 'organizationId' does not exist in type 'NoteWhereInput'.
src/features/intelligence/tools/universalTasksAndNotesTool.ts:156:13  [pós #71/#72: :183:13]  TS2353 Object literal may only specify known properties, and 'organizationId' does not exist in type '((Without<NoteCreateInput, NoteUncheckedCreateInput> & NoteUncheckedCrea...
src/features/intelligence/tools/universalTasksAndNotesTool.ts:225:11  [pós #71/#72: :253:11]  TS2322 Type '"Task"' is not assignable to type 'ActivityType'.
src/features/intelligence/tools/universalTasksAndNotesTool.ts:226:11  [pós #71/#72: :254:11]  TS2322 Type '"Pending"' is not assignable to type 'ActivityStatus | undefined'.
src/features/intelligence/tools/universalTasksAndNotesTool.ts:366:35  [pós #71/#72: :405:35]  TS2339 Property 'title' does not exist on type '{ type: ActivityType; date: Date; id: string; organizationId: string; status: ActivityStatus; owner: string; observations: str...
```

Observações para a decisão:

- Não existem no schema os modelos `PromptExperiment` (`promptExperiment`), `SwarmAuditLog` (`swarmAuditLog`) e `UserTheme` (`userTheme`).
  - `swarmAudit.service.ts:102` (TS7006) é consequência direta da ausência de `swarmAuditLog`.
  - `promptAbTesting.service.ts:96/179` (TS2503) é um import ausente de `Prisma`, que é correção de código.
- **Enums.** O código usa valores em inglês, mas os enums do schema estão em português:
  - `ActivityType`: o código usa `Meeting`/`Task`; o schema tem `Reuniao`/`Tarefa`.
  - `ActivityStatus`: o código usa `Pending`; o schema tem `Pendente`.
  - `NotificationKind`: o código usa `Success`/`Warning`/`Alert`; o schema tem `Sucesso`/`Alerta`/`Erro`.
  - `AgentMemoryStatus`: o código usa `Running`; o schema tem só `Completed`/`Failed`.
  - `LeadStatus`: o código usa `Em_Negociacao`, que não existe no schema.
  - Isso indica correção de código (b), salvo decisão contrária do 01.
- **Campos ausentes:**
  - `Note.organizationId`
  - `Organization.active`
  - `AIPendingAction.modelName` / `AIPendingAction.status`
  - `Lead.lastInteractionAt` / `Lead.copilotoHealthSnapshots` / `Lead.company`
  - `Company.observations` / `name` / `industry`
  - `Prompt.title`
  - `durationMinutes` (em `universalMeetingsTool.ts:89`)
- `autonomyCircuitBreaker.service.ts:119/161` usa `AUTONOMY_CIRCUIT_BREAKER_TRIPPED/RECOVERED`, que não estão no union `DomainEventType` em `src/shared/contracts/domainEventMesh.contract.ts`.

## Alteração necessária

1. Para cada modelo, campo e enum acima, registrar a decisão (a) ou (b) neste handoff.
2. Em (a), criar a migration e o schema sob ownership do 01, sem quebrar os dados existentes.
3. Em (b), confirmar que o schema está correto e reencaminhar a linha ao 06 (`gha-para-06-typecheck-integrations.md`) ou ao 07 (`gha-para-07-typecheck-ai-agents.md`).

## Teste esperado

- `npx prisma generate` seguido de `npm run typecheck`: os 66 erros acima somem, sem erros novos.
- `npx prisma migrate diff` e o drift check do CI ficam limpos, se houver migration.
- Ao final do conjunto 01/06/07, o application gate do Release avança além de `Run Type Check`.

## Contexto adicional

- Listas completas: `tsc-main.txt` (107), `tsc-validate.txt` (99) e `tsc-diff.txt` (0 novos), geradas pelo agente GHA. O conteúdo relevante está reproduzido acima.
- O typecheck nunca foi alcançado na main porque Trivy e lint falhavam antes. Os erros são anteriores às PRs #67/#71/#72.
