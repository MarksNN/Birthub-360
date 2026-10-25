# Parecer 24: PR #75, reauditoria (P1/P2/P3 do parecer 24 + S1b do parecer 15)

- Auditor: Agente 24 (revisão independente)
- Data: 2026-10-25, ~12:45 BRT
- PR: #75, branch `agente/01-prisma-tx-escape-baseline`, autor Agente 01
- Head auditado: **`75aac8704d7dd5bc704dfb5071dcfa4b44ebbdea`** (`75aac870`)
- Parecer anterior: REPROVADO @ `742d61fa` (commit do parecer `e7194fc4`, `.agents/reviews/prisma-tx-escape-baseline-pr75-742d61fa-24.md`)
- Base do PR: `6d63eb39`. A main atual é `333af2ab` (#76 e #69 acima da base, só docs). `git merge-tree --write-tree origin/main 75aac870` sai limpo (árvore `197b13f5`), sem conflito.
- Método: clone local `/workspace/b360-24r`, com node_modules existente e sem `npm ci`; Biome 2.5.14 local; vitest; `tsc`; Postgres 17 + pgvector efêmero e privado (`/tmp`, porta 55475, removido no fim). Nenhuma alteração no código auditado; as mutações foram revertidas e o working tree ficou limpo.

## Veredito: **BLOQUEADO @ 75aac870**

Não encontrei defeito real. P1, P2 e P3 estão corrigidos e as mutações independentes foram todas pegas.

O bloqueio é só evidência externa: **o application gate não rodou em CI para o head.** O run `40207456089` tem `trivy scan` com falha herdada, a mesma da main `333af2ab`, que o #67 corrige. Por isso `application gate` ficou *skipped*, e unit, architecture e **integração T1** não executaram no CI. Um commit novo invalida este parecer.

## Incremento 742d61fa..75aac870 (5 arquivos, +525/−162)
- `PrismaCrm360Repository.ts:394`: só a reindentação do `biome-ignore`, de 4 para 6 espaços.
- `tests/integration/prisma-tx-propagation.test.ts`: só a reindentação do bloco T1 (`rit(...)`), sem mudança semântica.
- `prisma-tx-escape-baseline.json`: passou de `{arquivo: contagem}` para `{arquivo: ["<método>:<sha256[0..16]>"]}`. São 28 arquivos e 44 chaves, `total: 44`, e as 44 supressões em `src` batem.
- `tests/unit/architecture/prisma-tx-escape-usage.ts` (novo): analisador baseado no AST do TypeScript.
  - Casa o mesmo padrão do `.grit`: `prisma`, `$_.prisma` ou nome pontilhado terminado em `prisma`/`Prisma`, com os 7 métodos.
  - A chave é calculada sobre o statement que contém o uso, normalizado como tokens sem comentários.
  - Cada supressão tem que cobrir exatamente 1 uso na linha suprimida.
- `prisma-tx-escape-baseline.test.ts`:
  - multiconjunto de chaves por arquivo, nos dois sentidos (crescimento e folga);
  - paridade "todo uso está numa linha suprimida";
  - caso D com 4 variantes e controle de reformatação;
  - S1b: `.mts`, `.cts`, `.jsx` e pastas com ponto;
  - P3: o fixture usa `node_modules/.bin/biome` e confere a versão 2.5.14.

Fora de `src`, o PR inteiro toca 39 arquivos, 32 deles em `src`, e nada de runtime além de comentários de supressão e da remoção já auditada do client do voice-hub. `package.json` e lock não foram alterados.

## Evidência local

| Critério | Comando | Resultado |
|---|---|---|
| P1: formatação | `biome format src` na main `333af2ab` e no head | **61 = 61**, conjunto de arquivos idêntico (`diff` vazio); nenhum arquivo tocado pelo PR falha |
| Lint | `biome lint src` | main: 727 diagnósticos (10 erros / 704 warns / 13 infos). Head: 697 (10 / 674 / 13). Os 10 erros são os herdados (`WhatsAppIcon`, calendly, supervisor, chat-model, `useConst`, `noAssignInExpressions`, que o #72 corrige). 0 diagnósticos de plugin e 0 diagnósticos em arquivos tocados |
| Baseline/arquitetura | `vitest run tests/unit/architecture/prisma-tx-escape-baseline.test.ts` | **14/14** |
| Integração T1 | Postgres 17 + pgvector privado, `bootstrap-app-role.sh` (prospector_app/migrator), `prisma migrate deploy`, `vitest -c vitest.integration.config.ts tests/integration/prisma-tx-propagation.test.ts` | **14/14**, 0 skip. O log mostra `PrismaClientKnownRequestError` `P2039`, `modelName: AuditLog`, `driverAdapterError.cause.code: 42501`, "new row violates row-level security policy for table \"AuditLog\"" |
| Typecheck | `tsc --noEmit` (com `prisma generate` atualizado) | **107 erros, idênticos à main** (diff vazio) |

Ressalvas da evidência local:
- O CI usa `pgvector:pg16`; localmente usei PG17. É evidência local, não substitui o CI.
- A primeira rodada de `tsc` deu 118, por causa de um client Prisma gerado e velho no node_modules local (modelos `AccountGraph*` e `WinLossAutopsyReport`). Depois do `prisma generate`, deu 107 = main. Foi artefato do ambiente, não do PR.

## Mutações independentes (do auditor, revertidas)
Cada linha da tabela é: vitest do teste de baseline + `biome lint` do arquivo mutado.

| # | Mutação | vitest | biome plugin |
|---|---|---|---|
| M1 | `$executeRawUnsafe` extra na **mesma linha suprimida** (`PgDncRepository` l.16) | **falha** (P2 "cobre 2 usos" + folga) | 0 (lint verde) |
| M2 | troca de método `$executeRaw` → `$executeRawUnsafe` (`PgDnc` l.23) | **falha** (chave nova + folga) | 0 |
| M3 | SQL alterado numa linha **não** suprimida do statement (`FROM campaigns` → `campaigns_shadow`, `PgCampaign`) | **falha** (chave muda) | 0 |
| M4 | segundo uso no mesmo statement, na linha seguinte (`activity.service` l.82) | **falha** (3 testes) | 1 error |
| M5 | arquivo novo `.mts` com uso suprimido | **falha** | 0 |
| M6 | arquivo novo em pasta com ponto (`src/.zz24/x.ts`) | **falha** | 0 |
| M7 | arquivo novo `.cts` com uso suprimido | **falha** | 0 |
| M8 | supressão genérica `lint/plugin` em `.jsx` novo | **falha** (genérica + paridade) | 0 |
| M9 | mover o par supressão+uso de `PgDnc` para `PgLead` | **falha** | 0 |
| M10 | `/* biome-ignore */` inline com uso extra antes do legado (`PgCampaign` l.70) | **falha** | 0 |
| M11 | remover um uso sem atualizar o baseline | **falha** (folga) | 0 |
| M12 | controle: só um comentário dentro do statement | passa (correto) | 0 |

11 de 11 mutações foram pegas, e o controle passou. Em M1, M2, M3, M5 a M7 e M9 a M11 o lint fica verde, e só o teste de baseline pega a mutação. Isso confirma que o fechamento do P2 depende do teste de baseline rodar no CI (`test:unit` inclui `tests/unit/**`), o que reforça o bloqueio.

## CI no head 75aac870 (runs criados às 12:32 BRT)

| Run | Resultado |
|---|---|
| Central Birth Hub 360 Release `40207456089` | failure: `trivy scan` falha (herdado, igual à main `333af2ab`); `build` falha por consequência; **`application gate` skipped** |
| Security - Trivy `40207456129` | failure (herdado) |
| Dependency Review, CodeQL, Frontend Bundle Budget, Endpoint Latency Budget | success |
| SonarQube, Visual Regression | in_progress |

## Achados
- **P1:** nenhum.
- **P2:** nenhum. O P2 anterior foi corrigido e verificado com M1 a M4 e M9 a M11.
- **P3:** nenhum novo.
  - O P3 anterior foi corrigido: o fixture usa o binário local com versão conferida.
  - O bloco T1 foi reformatado. O `biome.json` não inclui `tests/`, então a verificação foi visual, pelo diff.
- **P4 (informativo, não bloqueia):**
  1. A chave amarra o texto do statement, não valores externos. Nos wrappers genéricos `src/features/prospecting/outbound/server/db.ts:33/45` (`$queryRawUnsafe(pgSql, ...params)`), o SQL vem do chamador, e mudar o SQL no chamador não muda a chave. É legado; o G1 em runtime cobre.
  2. Tanto o `.grit` quanto o analisador ignoram aliases (`const db = prisma`), `prisma['$queryRaw']`, `(prisma).$x` e `prisma!.$x`. Isso está documentado no `.grit` e a paridade é consistente.
  3. A branch está 2 commits atrás da main (#76 e #69, só docs). O merge é limpo, não precisa de rebase.
- Tenancy/LGPD: o incremento não muda runtime, RLS nem migrations. O T1 confirma localmente que o RLS de `AuditLog` recusa a escrita cross-tenant dentro do tx.

## Para virar APROVADO
1. Ter um run do `application gate` no head final (ou num SHA cuja árvore seja igual a main + #75) com os seguintes passos verdes:
   - `test:unit`, incluindo o `prisma-tx-escape-baseline.test.ts` 14/14;
   - `test:architecture`;
   - `test:integration`, com `prisma-tx-propagation.test.ts` verde (T1 P2039/42501).
   
   Hoje isso depende do #67 (Trivy) e do #71/#72 (lint/format). Uma validação main + #67 + #71 + #72 + #75 com typecheck isolado como herdado serve.
2. Se o head mudar, reauditar: no mínimo, o diff e o baseline 14/14.
