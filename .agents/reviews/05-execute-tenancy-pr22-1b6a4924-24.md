# Parecer Agente 24 — PR #22 (Agente 05, P2) execute tenancy

- **Veredito: APROVADO (com condições)**
- PR: https://github.com/MarksNN/Birthub-360/pull/22 — branch `agente/05-execute-tenancy`
- Tip auditado: `1b6a4924ee8561e8236e790a07fb3728e0a8bb26` (1 commit)
- main: `e86f2b5c9b05ee9d2229010b2bda87b0657902ad`; merge-base `2746351361c2f8de6d16c352a5fa4c79401e5507` (PR atrás da main, MERGEABLE, sem conflito)
- Qualquer commit novo invalida este parecer.

## Escopo
3 arquivos (+224/−90): `actionExecutor.service.ts`, `accountIntelligence.routes.ts`, `__tests__/actionExecutor.tenancy.test.ts`. Não toca openapi → drift não aplicável.

## Critérios e evidências
1. **organizationId da sessão** — rota passa `(req as AuthRequest).user.organizationId` (atrás de auth + requireRole). Nunca do body. Serviço lança 403 se vazio. ✅
2. **Filtros** — `accountRecommendation.findFirst({ id, organizationId, companyId })` (antes `findUnique` só por id + checagem de companyId pós-busca); 404 idêntico p/ outro tenant/outra conta. `lead.findFirst` agora inclui `organizationId`; `cadenceSequence` e `startCadenceRun` usam o org da sessão (antes `company.organizationId`). Updates por `id` só ocorrem após o findFirst filtrado, dentro do mesmo tx com RLS. Único chamador: a rota. Nenhum caminho sem filtro. ✅
3. **Classificação de erros / HTTP** — 400 (Bitrix não conectado, sem lead, sem sequência, já executada), 409 (P2002) e 404 inalterados nos códigos/mensagens; agora sem `markFailed`. Falha do callBitrix e erro não-P2002 do save chamam `markFailed`. ✅ no código — mas ver P2-1.
4. **Testes** — 5 casos com store in-memory: o `findFirst` fake filtra de fato por org/company, então o caso cross-tenant é significativo no nível de query (assegura where com org-b, sem Bitrix nem update). Limitações: `withRlsContext` mockado sem transação/rollback (mascara P2-1); sem teste de filtro de org em lead/sequence, de 409, nem do caminho de sucesso da cadência. Aceitável para unit; não substitui integração com banco.

## Gates (local, tip 1b6a4924, node_modules via symlink)
| Gate | Resultado |
|---|---|
| `tsc --noEmit` (completo) | 0 erros |
| `biome format src` (format:check) | ok, 2006 arquivos |
| `biome lint src` (lint / lint:ci) | 0 erros (573 warnings, 8 infos — preexistentes) |
| `check:hotspots` | ✅ 0 acima do limite |
| `vitest -c vitest.unit.config.ts src/features/market-intelligence` | 3 files, 19/19 |
| `vitest -c vitest.unit.config.ts` (suíte unit completa) | 627/627 files, 4939 passed / 1 skipped |
| Suíte completa na main | não concluída (interrompida por tempo); como o PR fica 100% verde, não há falha nova a comparar |
| eslint | não existe script npm; `lint`/`lint:ci` do projeto são biome. Há `.eslintrc.js` legado; execução manual não concluída — não é gate do projeto |
| "MI 130/130" do autor | não reproduzido: a config unit encontra 19 testes em MI; os demais devem ser de integração (não rodados aqui, sem banco) |

## CI (run 39510265745)
`application gate` FAIL no passo **"Audit for vulnerabilities (waiver-aware)"** — **herdado da main**, não causado pelo PR; `build` falha só ao consolidar esse veredito. Demais checks (CodeQL, Sonar, Trivy, Dependency Review, Visual Regression, bundle budget, secret scan) verdes. Testes/integração do gate não chegaram a rodar.

## Achados
- **P1:** nenhum.
- **P2-1 (preexistente, não regressão; afirmação do PR não se cumpre em produção):** `markFailed()` roda dentro do `withRlsContext` (= `basePrisma.$transaction`) e o erro é relançado em seguida → a transação faz rollback e o status `Failed` **nunca persiste** (idem na main). O teste passa só porque o mock não tem transação. Correção sugerida: persistir `Failed` fora do tx (novo `withRlsContext` após o catch) ou retornar resultado de erro sem throw dentro do tx. Follow-up do Agente 05.
- **P3-1 (A3 residual, não resolvido):** task criada no Bitrix antes do update; falha de DB depois (ou rollback do tx) deixa `externalRef` sem gravar e permite duplicar a task no retry. Sem chave de idempotência.
- **P3-2 (A3 residual):** `prismaCadenceRunRepository.save` usa o prisma global em outra transação (fora do tx RLS da recomendação): CadenceRun pode ficar gravado com a recomendação não marcada `Executed` (ou vice-versa); depende do RLS do client global.
- **P4:** `responsibleId` fallback `1` hardcoded; testes não cobrem 409/lead-org.

## Condições
- C1: merge **manual** só com `application gate` verde (após fix do audit na main), incluindo testes de integração.
- C2: P2-1 aberto como follow-up do 05 (não bloqueia este PR, que não piora o comportamento).
- C3: novo commit = nova auditoria.

## SHA-256 (tip 1b6a4924)
```
0a4944ede34d01c52164537d09aa342d637758d464845b53b71c3b785a479ecb  src/features/market-intelligence/server/actionExecutor.service.ts
f7b0c3b2cdf16f86315e2acc1c29a31123b8c3324c417b970cb2bce5596c7453  src/features/market-intelligence/server/accountIntelligence.routes.ts
5954ca67f78896377c66eebbbb428c2934faa149ca4585580cbe624d41b280cd  src/features/market-intelligence/server/__tests__/actionExecutor.tenancy.test.ts
```

— Agente 24, 2026-10-20
