# Baseline da main `acd6c614`, auditado pelo Agente 24

- **Main:** `acd6c61413d6e3fc617a1f8521e50a79072b22f0` (origin/main no fetch das 18:27 BRT de 25/10/2026).
- **Diag:** `agente/gha-diag-main-acd6c614` @ `7fda5ed16551960fb57f8553406e6e34ce8ae93a`. Tem 1 commit sobre a main.
- **Run:** 40231811960. Application gate no job 121285084471, de 17:40 a 18:24 BRT.

Este baseline serve de referência para as próximas diags. Ele deixa de valer quando a main avançar.

## Integridade da diag
- `git diff --stat acd6c614 7fda5ed1` mostra **só** `.github/workflows/ci.yml` (+15/−1).
- O blob do ci.yml é `d8a7e3a0`, **idêntico** ao do diag70 (`34ba0537`).
- Sobre o `diff 8397884a d8a7e3a0`: não é "só o if". Ele mostra o passo Re-bootstrap inteiro, já com o `if`, mais a linha `BOOTSTRAP_SUPERUSER_URL` no `.env.test`. O motivo é que `8397884a` é a v4e sobre a main pré-#70, e o #70 acrescentou exatamente esses 13 linhas à main (`git diff 58c0febd a2a8656d`).
- A afirmação equivalente foi verificada de forma exata. O merge de 3 vias (`git merge-file`) de base `58c0febd`, ours main `a2a8656d` e theirs v4e `8397884a` termina limpo. Ele difere de `d8a7e3a0` **apenas** por `if: ${{ !cancelled() }}` no Re-bootstrap (linha 234).
- Conclusão: a diag é main + v4e + o if no Re-bootstrap, sem mudança de código.

## Resultados (conferidos no log do job 121285084471)
| Etapa | Resultado |
|---|---|
| secret scan, trivy, dependency review, Audit, Lint, Prettier, working tree | verdes |
| Type Check | **88 erros** (step verde só por `continue-on-error`). md5 da lista ordenada `arquivo(l,c): error TSxxxx`: `5dcefe64bcc705bc429bf1faa3821503`, idêntica byte a byte à lista pós-#96 |
| Architecture (depcruise, cruise-coverage, hotspots) | verde |
| OpenAPI drift | verde ("Nenhuma deriva estrutural…", 73 prefixos, 464 paths, 74 routers) |
| Unit | Test Files 2 failed / 655 passed (657); **Tests 3 failed / 5114 passed / 1 skipped (5118)** |
| AI Resilience | 11/11 |
| Migrations + Re-bootstrap pós-migrate | verdes |
| DATA-007 | "No difference detected." |
| Integração | Test Files 1 failed / 104 passed; **Tests 1 failed / 728 passed / 2 skipped (731)**. `db-restricted-table-privileges.test.ts` 3/3 ✓ |
| Build + smoke (/health/live, ready, version) | verdes |
| E2E | **33 failed / 75 passed / 1 skipped**, com os mesmos 33 nomes do C3 (`diff` vazio) |
| job `build` (consolidação) | failure, esperado por causa do Integração e do E2E |

## Falhas de Unit (herdadas)
- `src/features/intelligence/agents/execution/__tests__/AgentExecutor.test.ts`: o arquivo não carrega (0 testes).
- `src/lib/ai/__tests__/gateway.test.ts` › AI gateway, 3 casos:
  - não reexecuta em erro 4xx — cai direto para o próximo provedor
  - rejeita respostas vazias do provedor
  - tenta Groq primeiro e só cai pro LiteLLM (último recurso) se Groq falhar

## Falha de Integração (herdada)
- `tests/integration/swarm-autonomous-mission-e2e.test.ts` › Missão real do enxame, ponta a ponta (scheduler autônomo → CRM → ledger) › detecta o follow-up vencido, roteia para o CRM, executa com o modelo e persiste o traço completo

## Falhas de E2E (33, todas em `tests/e2e/accessibility.spec.ts`)
Sobre "33 color-contrast": as violações axe no log não são só color-contrast. Aparecem `color-contrast` 489×, `no-focusable-content` 45× e `nested-interactive` 3× (impact serious). As contagens são **idênticas às do C3**, ou seja, a dívida é herdada e não é nova. O baseline usa os 33 nomes abaixo, e não apenas a regra.

```
tests/e2e/accessibility.spec.ts:96:3 › Acessibilidade automática (axe-core) › Painel Central (dashboard) não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:104:3 › Acessibilidade automática (axe-core) › Pipeline CRM não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:111:3 › Acessibilidade automática (axe-core) › Meu Workspace (sem cargo atribuído) não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:123:3 › Acessibilidade automática (axe-core) › Configurações não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:132:3 › Acessibilidade automática (axe-core) › Market Intelligence não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:141:3 › Acessibilidade automática (axe-core) › Cadência não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:153:3 › Acessibilidade automática (axe-core) › Prospecção não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:160:3 › Acessibilidade automática (axe-core) › Visão 360 do CRM não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:167:3 › Acessibilidade automática (axe-core) › Mesa de Tratamento não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:174:3 › Acessibilidade automática (axe-core) › Central de Inteligência (IA) não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:183:3 › Acessibilidade automática (axe-core) › Empresas não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:190:3 › Acessibilidade automática (axe-core) › Contatos não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:197:3 › Acessibilidade automática (axe-core) › Atividades não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:204:3 › Acessibilidade automática (axe-core) › Chatbook não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:211:3 › Acessibilidade automática (axe-core) › Roleplay não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:218:3 › Acessibilidade automática (axe-core) › Matriz de Qualificação não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:225:3 › Acessibilidade automática (axe-core) › Matriz de Objeções não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:232:3 › Acessibilidade automática (axe-core) › Academia de Treinamento não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:239:3 › Acessibilidade automática (axe-core) › Guia Bitrix não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:246:3 › Acessibilidade automática (axe-core) › Relatórios não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:253:3 › Acessibilidade automática (axe-core) › Integrações não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:260:3 › Acessibilidade automática (axe-core) › Base de Conhecimento não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:267:3 › Acessibilidade automática (axe-core) › Analytics não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:274:3 › Acessibilidade automática (axe-core) › Análise Ganhos/Perdas não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:281:3 › Acessibilidade automática (axe-core) › Propostas não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:288:3 › Acessibilidade automática (axe-core) › Comercial Inteligente não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:297:3 › Acessibilidade automática (axe-core) › Agenda não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:304:3 › Acessibilidade automática (axe-core) › Notificações não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:311:3 › Acessibilidade automática (axe-core) › Automações não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:318:3 › Acessibilidade automática (axe-core) › Uso/Faturamento não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:325:3 › Acessibilidade automática (axe-core) › Equipe não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:333:3 › Acessibilidade automática (axe-core) › Editor de documentos não tem violações críticas/sérias
tests/e2e/accessibility.spec.ts:340:3 › Acessibilidade automática (axe-core) › Tela de boas-vindas (pré-login) não tem violações críticas/sérias
```

## Os 88 erros de tsc (md5 5dcefe64bcc705bc429bf1faa3821503)
```
src/features/intelligence/agents/base.agent.ts(103,7): error TS2322
src/features/intelligence/agents/base.agent.ts(104,7): error TS2322
src/features/intelligence/agents/base.agent.ts(61,7): error TS2322
src/features/intelligence/agents/base.agent.ts(62,7): error TS2322
src/features/intelligence/agents/churnPrevention.agent.ts(49,9): error TS2416
src/features/intelligence/agents/contract.agent.ts(80,9): error TS2416
src/features/intelligence/agents/forecast.agent.ts(42,9): error TS2416
src/features/intelligence/agents/onboarding.agent.ts(69,9): error TS2416
src/features/intelligence/agents/pricing.agent.ts(41,9): error TS2416
src/features/intelligence/agents/proposal.agent.ts(77,9): error TS2416
src/features/intelligence/agents/quality.agent.ts(54,9): error TS2416
src/features/intelligence/agents/research.agent.ts(69,9): error TS2416
src/features/intelligence/agents/success.agent.ts(62,9): error TS2416
src/features/intelligence/agents/upsell.agent.ts(47,9): error TS2416
src/features/intelligence/services/aiPendingAction.service.ts(253,11): error TS2353
src/features/intelligence/services/autonomyCircuitBreaker.service.ts(119,11): error TS2322
src/features/intelligence/services/autonomyCircuitBreaker.service.ts(161,13): error TS2322
src/features/intelligence/services/autonomyCircuitBreaker.service.ts(223,14): error TS2353
src/features/intelligence/services/enhancedCircuitBreaker.service.ts(49,5): error TS2322
src/features/intelligence/services/enhancedCircuitBreaker.service.ts(69,5): error TS2322
src/features/intelligence/services/modelBenchmark.service.ts(106,7): error TS2353
src/features/intelligence/services/modelBenchmark.service.ts(110,7): error TS2353
src/features/intelligence/services/modelBenchmark.service.ts(115,14): error TS2339
src/features/intelligence/services/modelBenchmark.service.ts(115,41): error TS2339
src/features/intelligence/services/proactiveAlerts.service.ts(105,7): error TS2353
src/features/intelligence/services/proactiveAlerts.service.ts(110,14): error TS2339
src/features/intelligence/services/proactiveAlerts.service.ts(110,41): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(112,16): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(129,35): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(177,16): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(183,38): error TS2503
src/features/intelligence/services/promptAbTesting.service.ts(212,17): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(78,35): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(93,16): error TS2339
src/features/intelligence/services/promptAbTesting.service.ts(96,40): error TS2503
src/features/intelligence/services/swarmAudit.service.ts(102,21): error TS7006
src/features/intelligence/services/swarmAudit.service.ts(135,12): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(136,12): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(137,12): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(142,12): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(147,12): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(48,18): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(92,12): error TS2339
src/features/intelligence/services/swarmAudit.service.ts(98,12): error TS2339
src/features/intelligence/services/swarmRealtimeDashboard.service.ts(104,46): error TS2339
src/features/intelligence/services/swarmRealtimeDashboard.service.ts(85,7): error TS2322
src/features/intelligence/services/theme.service.ts(16,30): error TS2339
src/features/intelligence/services/theme.service.ts(36,16): error TS2339
src/features/intelligence/tools/advancedCommercialTools.ts(295,18): error TS2322
src/features/intelligence/tools/advancedCommercialTools.ts(300,11): error TS2561
src/features/intelligence/tools/advancedCommercialTools.ts(308,29): error TS2551
src/features/intelligence/tools/advancedCommercialTools.ts(312,34): error TS2339
src/features/intelligence/tools/advancedCommercialTools.ts(315,21): error TS2551
src/features/intelligence/tools/advancedCommercialTools.ts(315,45): error TS2551
src/features/intelligence/tools/advancedCommercialTools.ts(59,21): error TS2339
src/features/intelligence/tools/leadEnrichmentTool.ts(79,52): error TS2339
src/features/intelligence/tools/leadEnrichmentTool.ts(85,40): error TS2345
src/features/intelligence/tools/leadEnrichmentTool.ts(86,35): error TS2345
src/features/intelligence/tools/leadEnrichmentTool.ts(87,45): error TS2345
src/features/intelligence/tools/leadEnrichmentTool.ts(88,47): error TS2345
src/features/intelligence/tools/promoteAndEnrichTool.ts(74,17): error TS2322
src/features/intelligence/tools/scriptAndPromptTool.ts(120,13): error TS2353
src/features/intelligence/tools/scriptAndPromptTool.ts(77,157): error TS2339
src/features/intelligence/tools/scriptAndPromptTool.ts(77,39): error TS2339
src/features/intelligence/tools/universalEmailTool.ts(279,17): error TS2322
src/features/intelligence/tools/universalEmailTool.ts(280,17): error TS2322
src/features/intelligence/tools/universalEmailTool.ts(281,17): error TS2322
src/features/intelligence/tools/universalEmailTool.ts(283,17): error TS2322
src/features/intelligence/tools/universalMeetingsTool.ts(108,13): error TS2322
src/features/intelligence/tools/universalMeetingsTool.ts(170,11): error TS2353
src/features/intelligence/tools/universalMeetingsTool.ts(183,15): error TS2353
src/features/intelligence/tools/universalMeetingsTool.ts(306,11): error TS2322
src/features/intelligence/tools/universalMeetingsTool.ts(307,11): error TS2322
src/features/intelligence/tools/universalMeetingsTool.ts(309,11): error TS2322
src/features/intelligence/tools/universalMeetingsTool.ts(96,34): error TS2551
src/features/intelligence/tools/universalMessagingTool.ts(121,33): error TS2783
src/features/intelligence/tools/universalNotificationsTool.ts(61,11): error TS2322
src/features/intelligence/tools/universalOfficeDocsTool.ts(180,34): error TS2339
src/features/intelligence/tools/universalOfficeDocsTool.ts(192,13): error TS2353
src/features/intelligence/tools/universalTasksAndNotesTool.ts(142,13): error TS2353
src/features/intelligence/tools/universalTasksAndNotesTool.ts(183,13): error TS2353
src/features/intelligence/tools/universalTasksAndNotesTool.ts(253,11): error TS2322
src/features/intelligence/tools/universalTasksAndNotesTool.ts(254,11): error TS2322
src/features/intelligence/tools/universalTasksAndNotesTool.ts(257,11): error TS2322
src/features/intelligence/tools/universalTasksAndNotesTool.ts(405,35): error TS2339
src/features/job-roles/services/toolExecutors.ts(646,7): error TS2322
src/lib/ai/gateway/dynamic-routing.ts(14,39): error TS2307
src/lib/ai/gateway/streaming.ts(27,4): error TS2355
```

## Como usar nas próximas diags
Uma diag está "igual ao baseline" quando cumpre todos os critérios abaixo:
- o multiset `arquivo+código` do tsc é igual (linhas podem deslocar só nos arquivos tocados);
- Unit tem apenas AgentExecutor (load) e gateway ×3;
- Integração tem apenas o swarm, e privileges 3/3;
- E2E tem os mesmos 33 nomes;
- drift, Architecture, DATA-007, Build e smoke estão verdes.
