De: gha — Agente de CI/GitHub Actions (workflows sob 08 — QA e Release)
Para: 07 — IA e Automações
Onda: 52
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: GHA-TYPECHECK-07 (run 40204212570)
Sprint destino: desbloqueio do application gate (`Run Type Check`) após #67 → #71 → #72

## Problema

`Run Type Check` falha no application gate com erros herdados da main em `src/features/intelligence/*`, `src/lib/ai/*` e `src/features/job-roles/*`. Além disso, o workflow SonarQube falha por testes de IA sem dono. Este handoff consolida:

- os grupos 2, 3 e 4;
- a parte de código de inteligência do grupo 1 (Prisma), que depende da decisão do 01;
- os testes `AgentExecutor.test.ts` e `gateway.test.ts`.

Este handoff não altera código.

## Arquivo(s) envolvido(s)

- `src/features/intelligence/agents/base.agent.ts` e 10 agentes que sobrescrevem `run`
- `src/lib/ai/gateway/dynamic-routing.ts`, `src/lib/ai/gateway/streaming.ts` e `src/lib/ai/gateway/chat-model.ts`
- `src/features/intelligence/services/*` e `src/features/intelligence/tools/*` (listados abaixo)
- `src/features/job-roles/services/toolExecutors.ts`
- `src/features/intelligence/agents/execution/__tests__/AgentExecutor.test.ts` e `src/lib/ai/__tests__/gateway.test.ts`

## Evidência

- Run de validação combinada `40204212570` (Central Birth Hub 360 Release, branch `agente/gha-validate-67-71-72-v2`, head `def647989e60b922b5fec2c12ab29e48e3f93a73` = main `6d63eb39` + #67 + #71 + #72), job `121201704278` (application gate): `audit`, `prisma generate`, `lint`, `format` e `clean-tree` verdes; **`Run Type Check` (`npm run typecheck` = `tsc --noEmit`) falha** com 99 erros únicos em 38 arquivos. https://github.com/MarksNN/Birthub-360/actions/runs/40204212570
- Reprodução local com o mesmo comando e o mesmo Node do CI (v22.23.3, `npm ci` + `npx prisma generate` + `npm run typecheck`):
  - main pura `6d63eb39`: **107** erros únicos (42 arquivos);
  - validação `def64798`: **99** erros únicos (38 arquivos), lista idêntica à do job de CI;
  - comparação por arquivo+código+mensagem (ignorando linha/coluna deslocada pela formatação): **0 erros novos**; 8 erros da main somem com o #72 (`WhatsAppIcon`, `calendly connectionId`, `supervisor sessionId`, `chat-model logger`).
  - Os 99 restantes são **herdados da main** (nenhum introduzido por #67/#71/#72). Arquivos criados nos commits `20eed2c8`, `cdea0bc9`, `d9ea7a3a`, `0c4fe2fd`, `dfe7517c` e `58e9fd87`.
- Formato das linhas abaixo: `arquivo:linha:coluna` na main `6d63eb39` e, entre colchetes, a posição equivalente após #71/#72 (validação `def64798`).

### Grupo 2: assinatura de `BaseAgent.run` e tipos nulos em `base.agent.ts` (14 erros, 11 arquivos)

```
src/features/intelligence/agents/base.agent.ts:61:7  [pós #71/#72: :61:7]  TS2322 Type 'string | undefined' is not assignable to type 'string | null'.
src/features/intelligence/agents/base.agent.ts:62:7  [pós #71/#72: :62:7]  TS2322 Type 'string | undefined' is not assignable to type 'string | null'.
src/features/intelligence/agents/base.agent.ts:102:7  [pós #71/#72: :103:7]  TS2322 Type 'string | undefined' is not assignable to type 'string | null'.
src/features/intelligence/agents/base.agent.ts:103:7  [pós #71/#72: :104:7]  TS2322 Type 'string | undefined' is not assignable to type 'string | null'.
src/features/intelligence/agents/churnPrevention.agent.ts:44:9  [pós #71/#72: :49:9]  TS2416 Property 'run' in type 'ChurnPreventionAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/contract.agent.ts:80:9  [pós #71/#72: :80:9]  TS2416 Property 'run' in type 'ContractAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/forecast.agent.ts:37:9  [pós #71/#72: :42:9]  TS2416 Property 'run' in type 'ForecastAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/onboarding.agent.ts:69:9  [pós #71/#72: :69:9]  TS2416 Property 'run' in type 'OnboardingAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/pricing.agent.ts:36:9  [pós #71/#72: :41:9]  TS2416 Property 'run' in type 'PricingAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/proposal.agent.ts:77:9  [pós #71/#72: :77:9]  TS2416 Property 'run' in type 'ProposalAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/quality.agent.ts:49:9  [pós #71/#72: :54:9]  TS2416 Property 'run' in type 'QualityAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/research.agent.ts:69:9  [pós #71/#72: :69:9]  TS2416 Property 'run' in type 'ResearchAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/success.agent.ts:62:9  [pós #71/#72: :62:9]  TS2416 Property 'run' in type 'SuccessAgent' is not assignable to the same property in base type 'BaseAgent'.
src/features/intelligence/agents/upsell.agent.ts:42:9  [pós #71/#72: :47:9]  TS2416 Property 'run' in type 'UpsellAgent' is not assignable to the same property in base type 'BaseAgent'.
```

Os 10 agentes declaram um `run` incompatível com o de `BaseAgent` (TS2416). `base.agent.ts` atribui `string | undefined` a campos `string | null`.

### Grupo 3: `lib/ai` (import de tokenQuota e retorno de streaming) (2 erros)

```
src/lib/ai/gateway/dynamic-routing.ts:14:39  [pós #71/#72: :14:39]  TS2307 Cannot find module '../../finops/tokenQuota.service.js' or its corresponding type declarations.
src/lib/ai/gateway/streaming.ts:27:4  [pós #71/#72: :27:4]  TS2355 A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
```

- `dynamic-routing.ts:14` importa `../../finops/tokenQuota.service.js`, que não existe nesse caminho.
- `streaming.ts:27` declara um tipo de retorno, mas nem todo caminho retorna valor.

### Grupo 4: diversos (null/undefined, `enhancedCircuitBreaker`, ferramentas do enxame, `toolExecutors`) (17 erros, 9 arquivos)

```
src/features/intelligence/services/enhancedCircuitBreaker.service.ts:50:5  [pós #71/#72: :49:5]  TS2322 Type 'number' is not assignable to type '0 | 1 | 2 | 3'.
src/features/intelligence/services/enhancedCircuitBreaker.service.ts:73:5  [pós #71/#72: :69:5]  TS2322 Type 'number' is not assignable to type '0 | 1 | 2 | 3'.
src/features/intelligence/tools/leadEnrichmentTool.ts:85:40  [pós #71/#72: :85:40]  TS2345 Argument of type '{ fantasyName: string; socialReason: string; cnaeMain: string | undefined; size: string | undefined; cadastralSituation: string | undefined; city: st...
src/features/intelligence/tools/leadEnrichmentTool.ts:86:35  [pós #71/#72: :86:35]  TS2345 Argument of type '{ fantasyName: string; socialReason: string; cnaeMain: string | undefined; size: string | undefined; cadastralSituation: string | undefined; city: st...
src/features/intelligence/tools/leadEnrichmentTool.ts:87:45  [pós #71/#72: :87:45]  TS2345 Argument of type '{ fantasyName: string; socialReason: string; cnaeMain: string | undefined; size: string | undefined; cadastralSituation: string | undefined; city: st...
src/features/intelligence/tools/leadEnrichmentTool.ts:88:47  [pós #71/#72: :88:47]  TS2345 Argument of type '{ fantasyName: string; socialReason: string; cnaeMain: string | undefined; size: string | undefined; cadastralSituation: string | undefined; city: st...
src/features/intelligence/tools/promoteAndEnrichTool.ts:74:17  [pós #71/#72: :74:17]  TS2322 Type '{ name: string; role: string; email: string | undefined; phone: string | undefined; } | undefined' is not assignable to type '{ name: string; role?: string | und...
src/features/intelligence/tools/universalEmailTool.ts:273:17  [pós #71/#72: :279:17]  TS2322 Type 'string | null' is not assignable to type 'string'.
src/features/intelligence/tools/universalEmailTool.ts:274:17  [pós #71/#72: :280:17]  TS2322 Type 'string | null' is not assignable to type 'string'.
src/features/intelligence/tools/universalEmailTool.ts:275:17  [pós #71/#72: :281:17]  TS2322 Type 'string | null' is not assignable to type 'string'.
src/features/intelligence/tools/universalEmailTool.ts:277:17  [pós #71/#72: :283:17]  TS2322 Type 'number | null' is not assignable to type 'number'.
src/features/intelligence/tools/universalMeetingsTool.ts:151:11  [pós #71/#72: :170:11]  TS2353 Object literal may only specify known properties, and 'fallback' does not exist in type '{ organizationId?: string | undefined; feature?: string | undefined; systemIns...
src/features/intelligence/tools/universalMeetingsTool.ts:279:11  [pós #71/#72: :309:11]  TS2322 Type 'string | null' is not assignable to type 'string | undefined'.
src/features/intelligence/tools/universalMessagingTool.ts:118:33  [pós #71/#72: :121:33]  TS2783 'success' is specified more than once, so this usage will be overwritten.
src/features/intelligence/tools/universalOfficeDocsTool.ts:165:34  [pós #71/#72: :180:34]  TS2339 Property 'document' does not exist on type 'IngestResult'.
src/features/intelligence/tools/universalTasksAndNotesTool.ts:229:11  [pós #71/#72: :257:11]  TS2322 Type 'string | null' is not assignable to type 'string | undefined'.
src/features/job-roles/services/toolExecutors.ts:646:7  [pós #71/#72: :646:7]  TS2322 Type '(ctx: ToolExecutionContext) => Promise<{ summary: string; facts: never[]; metrics: { universalToolsBound: number; promptTokens?: undefined; completionTokens?: un...
```

### Grupo 1, parte de inteligência (Prisma): depende da decisão do 01 (55 erros, 15 arquivos)

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

Se o 01 optar por correção de código, provavelmente para os enums (o código usa `Meeting`/`Task`/`Pending`/`Running`/`Success`/`Warning`/`Alert`, mas o schema tem `Reuniao`/`Tarefa`/`Pendente`/`Completed|Failed`/`Sucesso`/`Alerta`/`Erro`), a correção dessas linhas é do 07. `DomainEventType` (`autonomyCircuitBreaker.service.ts:119/161`) é contrato TS em `src/shared/contracts/domainEventMesh.contract.ts`.

### Já fechados pelo #72 (sem ação do 07)

```
src/components/ui/AIEmailGenerator.tsx:384:20  [FECHADO por #72]  TS2304 Cannot find name 'WhatsAppIcon'.
src/components/ui/AIEmailGenerator.tsx:522:61  [FECHADO por #72]  TS2304 Cannot find name 'WhatsAppIcon'.
src/components/ui/Timeline.tsx:50:17  [FECHADO por #72]  TS2304 Cannot find name 'WhatsAppIcon'.
src/features/integrations/calendly/calendly.service.ts:166:9  [FECHADO por #72]  TS18004 No value exists in scope for the shorthand property 'connectionId'. Either declare one or provide an initializer.
src/features/integrations/calendly/calendly.service.ts:172:32  [FECHADO por #72]  TS18004 No value exists in scope for the shorthand property 'connectionId'. Either declare one or provide an initializer.
src/features/intelligence/agents/supervisor.agent.ts:336:34  [FECHADO por #72]  TS2304 Cannot find name 'sessionId'.
src/lib/ai/gateway/chat-model.ts:187:5  [FECHADO por #72]  TS2304 Cannot find name 'logger'.
src/lib/ai/gateway/chat-model.ts:194:3  [FECHADO por #72]  TS2304 Cannot find name 'logger'.
```

### Testes sem dono apontados pelo SonarQube (workflow `SonarQube Analysis`, passo `Run Tests with Coverage`)

**Main `6d63eb39`:** run `40203001370`, job `121197953969`, https://github.com/MarksNN/Birthub-360/actions/runs/40203001370. Resultado: `Test Files 3 failed | 651 passed`, `Tests 5 failed | 5093 passed`.

**Validação `def64798` (main + #67/#71/#72):** run `40204212548`, job `121201569205`. Resultado: `Test Files 3 failed | 652 passed`, `Tests 4 failed | 5096 passed`.

1. `src/features/intelligence/agents/execution/__tests__/AgentExecutor.test.ts` (suite inteira falha ao carregar)
   - `Error: Failed to resolve import "../../services/guardrails.service.js" from ".../execution/__tests__/AgentExecutor.test.ts". Does the file exist?` em `AgentExecutor.test.ts:14` na main (`:18` após #71).
   - Causa: os imports foram copiados de `execution/AgentExecutor.ts` sem ajustar a profundidade de `__tests__/`. Caminhos que não resolvem a partir do teste:
     - `../../services/guardrails.service.js` (linha 14): o certo é `../../../services/...`
     - `../../../../lib/ai/budget.js` (15) e `../../../../lib/ai/checkpointer.js` (16): o certo é `../../../../../lib/ai/...`
     - `../agentMemory.store.js` (17, 18) e `../learning.agent.js` (19): o certo é `../../...`
     - Os `vi.mock` das linhas 22–26 têm o mesmo problema.
   - Arquivo criado em `cdea0bc9`.
2. `src/lib/ai/__tests__/gateway.test.ts`
   - **Main:** 4 testes falham com `ReferenceError: logger is not defined` em `src/lib/ai/gateway/chat-model.ts:194:3` (`callWithDynamicRouting`, chamado via `chat-model.ts:245:42`). Testes afetados:
     - `gateway.test.ts:126` "tenta Groq primeiro…"
     - `:172` "rejeita respostas vazias"
     - `:282` "não reexecuta em erro 4xx"
     - `:309` "abre o circuit breaker"
   - **O #72 importa o `logger` e fecha o `ReferenceError`, mas não fecha tudo.** Na validação, `:309` (circuit breaker) passa, e **3 testes continuam falhando** por comportamento do roteamento dinâmico:
     - `gateway.test.ts:143:24` "tenta Groq primeiro e só cai pro LiteLLM…": `expected 'https://api.groq.com/openai/v1/chat/completions' to be 'http://litellm.test/v1/chat/completions'`. A 2ª chamada volta ao Groq em vez de cair no LiteLLM.
     - `gateway.test.ts:172:64` "rejeita respostas vazias do provedor": esperava `resposta vazia`, recebeu `Os motores de IA estão indisponíveis (Ollama/LiteLLM). vLLM/Groq/OpenAI/OpenRouter: Erro sem detalhes… LiteLLM: Body is unusable: Body has already been read`.
     - `gateway.test.ts:290:40` "não reexecuta em erro 4xx — cai direto para o próximo provedor": mesma asserção de URL (Groq em vez de LiteLLM na 2ª chamada).
   - Hipótese a confirmar pelo 07: `callWithDynamicRouting` (`chat-model.ts` ~187–194) tenta a cadeia dinâmica e depois repete a cadeia estática, o que reaproveita o mesmo `Response` (`Body has already been read`) e altera a ordem esperada de fallback.

## Alteração necessária

1. **Grupo 2:** alinhar a assinatura de `run` entre `BaseAgent` e os 10 agentes (ou tornar a base genérica) e normalizar `undefined` → `null` em `base.agent.ts`.
2. **Grupo 3:** corrigir o caminho ou criar o módulo `tokenQuota.service` (verificar `src/features/finops` ou o equivalente) e garantir o retorno em todos os caminhos de `streaming.ts`.
3. **Grupo 4:**
   - estreitar os tipos (`?? ''` ou `?? undefined` conforme o contrato);
   - `enhancedCircuitBreaker` deve retornar `0|1|2|3`;
   - remover a duplicata de `success` em `universalMessagingTool.ts:118`;
   - ajustar `IngestResult.document` e `fallback` em `universalMeetingsTool.ts:151`;
   - alinhar o retorno do executor em `toolExecutors.ts:646` a `ToolExecutionOutput`.
4. **Grupo 1, parte de inteligência:** aplicar após a decisão do 01.
5. **Testes:** corrigir os caminhos relativos de `AgentExecutor.test.ts` e corrigir a ordem de fallback e o reuso de body em `callWithDynamicRouting` (ou atualizar o teste se a nova ordem for intencional, com justificativa).
6. Sem `@ts-ignore`, sem `any` e sem waivers.

## Teste esperado

- `npm run typecheck`: zero erros nos arquivos acima, sem erros novos.
- `npx vitest run src/features/intelligence/agents/execution/__tests__/AgentExecutor.test.ts src/lib/ai/__tests__/gateway.test.ts` verde.
- Workflow SonarQube: `Run Tests with Coverage` sem falhas nesses arquivos.

## Contexto adicional

- O #72 já inclui `logger` em `chat-model.ts` e `supervisorNode(state, config?: RunnableConfig)` (decisão `07-para-00-correlationid-supervisor-thread-id.md`).
- Arquivos majoritariamente criados em `20eed2c8` e `cdea0bc9`.
