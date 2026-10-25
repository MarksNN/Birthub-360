# Parecer 24: validação combinada de #67, #71 e #72 (merge def64798)

- Auditor: Agente 24 (Revisão Independente)
- Data: 2026-10-25 (BRT)
- Base: main `6d63eb39`
- Heads auditados: #67 `d07b006b`, #71 `64ec87e0`, #72 `91f3f138`
- Merge de validação: `def64798` (branch `agente/gha-validate-67-71-72-v2`), tree `548e63de`
- Runs analisados: CI `40204212570` (job Type Check `121201704278`), SonarQube `40204212548` (def64798) e `40203001370` (main)
- Método: análise estática, reprodução local do merge, `tsc` local com node_modules existente (sem `npm ci`) e leitura dos logs de CI.

## Veredito

| PR | Head | Veredito |
|---|---|---|
| #67 | `d07b006b` | **BLOQUEADO**: testes obrigatórios de integração, build/smoke e E2E não executados |
| #71 | `64ec87e0` | **BLOQUEADO**: mesmo motivo (risco técnico baixo, ver §5) |
| #72 | `91f3f138` | **BLOQUEADO**: mesmo motivo, mais o P2 de ratificação do 07 |

Qualquer commit novo em uma das três branches invalida este parecer.

## 1. Integridade do merge: OK
- A reprodução local de `6d63eb39 + #67 + #71 + #72` gera a tree `548e63def23c32fa400f9c7cbea95f8d8390849a`, idêntica à de `def64798`.
- `rev-list --no-merges` exclusivo da validação: 0 commits. Os parents batem com os heads acima.

## 2. Delta do #72 desde `10ba0e91`: OK, com um P2
- Os P3 foram aplicados:
  - o helper usa `typeof`;
  - o teste de correlationId cobre config presente, `undefined`, `{}`, `{configurable:{}}`, `''` e `123`;
  - vitest local nos 3 arquivos de supervisor: 21 testes passaram.
- Resolução do merge com #71: reproduzi bit a bit (tree `ce595431`). O diff `/workspace/conflict-resolution-72-merge-71.diff` tem 3 arquivos:
  - calendly e piiDetection: só espaços e vírgulas;
  - supervisor: espaços, mais `x as string || y` → `(x as string) || y`. Como `as` tem precedência maior que `||`, a semântica não muda. É formatação pura.
- Escopo: os 9 arquivos estão dentro da missão (lint, WhatsAppIcon, supervisor, calendly, pii).
- **P2:** o registro de decisão do 07 diz "owner review aprovado @10ba0e91", mas o #72 não tem nenhum review nem comentário no GitHub. O registro foi escrito pelo autor em nome do 07. O 07 precisa ratificar de forma rastreável, por comentário/review no PR ou por handoff próprio, antes de qualquer APROVADO.

## 3. Run `40204212570`
- Verdes de fato: secret scan, Trivy (upload SARIF ok), dependency review, npm audit, prisma generate, lint, format e clean tree.
- Type Check falhou. Por isso não rodaram Architecture, OpenAPI drift, Unit, AI Resilience, Migrations, Golden, **integração**, **Build**, **smoke** e **Playwright E2E** (todos skipped).

## 4. tsc main × validação: dentro da exceção do Marks
- main `6d63eb39`: 107 erros. def64798: 99 erros. O `tsc` local reproduz exatamente o job `121201704278`.
- As listas `/workspace/tsc-main.txt` e `/workspace/tsc-validate.txt` do GHA são idênticas às minhas, linha a linha.
- **0 erros novos.** Os 8 erros removidos são exatamente as correções do #72 (WhatsAppIcon e afins).
- Nenhum erro cai em linha própria do #72. Três erros caem em linhas que o #71 só reformatou, com mensagem idêntica à da main.
- Isso explica o 107 × 99 citado no #75 e no #76: 107 é a main, 99 é o estado depois do #72.
- A condição da exceção (≤ 99 e 0 novos) está atendida. A exceção cobre **só** o typecheck herdado.

## 5. Testes obrigatórios: critério que bloqueia

Evidência parcial existe em def64798, em workflows fora do gate:

| Evidência | Run | Resultado |
|---|---|---|
| Unit completo (`npm run test:unit -- --coverage`, com `npm ci` e as bumps do #67) | SonarQube `40204212548` | 655 arquivos, 4 testes falhando |
| Unit na main, para comparação | `40203001370` | 5 testes falhando (3 arquivos) |
| Frontend build (`Build frontend` e bundle budget) | `40204212580` | success |
| App sobe com migrations e k6 em rotas críticas e autenticadas | `40204212562` | success |
| Visual Regression (Playwright, com migrations) | `40204212558` | success |

Detalhe do unit:
- Os 3 arquivos que falham são os mesmos da main: `voice-hub/components/Sidebar.test.tsx:80`, `lib/ai/__tests__/gateway.test.ts:143/172/290` e `AgentExecutor.test.ts` (import inexistente de `guardrails.service.js`).
- Os testes que falham na validação são um subconjunto dos que falham na main: **0 falhas novas** e 1 a menos (circuit breaker do gateway).
- Confirmo a afirmação do GHA: gateway `:143/:172/:290` continua falhando com o #72. É herdado e não fecha aqui.

**Não executado em nenhum run:** integração (auth/RBAC/tenant isolation), Build de produção com smoke, E2E Playwright, Architecture tests, OpenAPI drift, AI Resilience e Golden.

O impacto por PR:
- **#72:** mexe em swarm, Calendly e WhatsAppIcon (UI). Integração e E2E são obrigatórios. Observação: `prisma.calendlyConnection` não existe no schema, então o runtime Calendly já está quebrado de forma herdada. O #72 não muda isso, mas também não pode ser validado por integração.
- **#67:** muda dependências de runtime do servidor (body-parser 2.3.0→2.4.0, qs 6.16.0→6.16.1, undici 6.29.0→6.29.1). O parsing de body afeta todas as rotas, então integração e smoke de build são obrigatórios. O k6 autenticado é um bom indício, mas não substitui a suíte de integração.
- **#71:** só formatação, reprodução bit a bit e equivalência já provadas. O risco técnico é baixo. Mesmo assim o gate obrigatório não rodou, e o parecer fica BLOQUEADO por regra (falta de evidência não é aprovação). A mesma run de evidência desbloqueia os três.

## 6. Caminho mínimo de evidência (pedido ao GHA)
1. Criar uma branch descartável `agente/gha-validate-67-71-72-v3` = `def64798` + 1 commit que adicione **apenas** `continue-on-error: true` ao step `Run Type Check` do `ci.yml`. É só uma branch de evidência, nunca mergeada. Dar ciência ao 08 (dono do workflow) e citar este parecer.
2. Rodar o CI e anexar o link da run e o job de cada step: Architecture, OpenAPI, Unit, AI Resilience, Migrations, Golden, integração, Build, smoke e E2E.
3. Se algum desses steps falhar, rodar a mesma alteração sobre `6d63eb39 + #67` (baseline) para classificar a falha como herdada ou nova, com lista teste a teste.
4. Os heads #67/#71/#72 não podem mudar. Se mudarem, é preciso um novo merge de validação.
5. Para o #72, o 07 precisa ratificar o registro de decisão (P2).

Com (2) verde, ou só com falhas provadamente herdadas via (3), e com (5) feito, o 24 reaudita e pode emitir APROVADO nos três PRs.
Alternativa local: unit já está coberto pelo Sonar. Integração exige Postgres com RLS e o box não tem isso montado, então o CI é o caminho mais curto.
