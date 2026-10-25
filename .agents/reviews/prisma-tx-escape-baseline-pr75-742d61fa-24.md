# Parecer 24: PR #75, ressalvas T1/L1/L2 (+R1/S1/A1/S3) do parecer 15

- Auditor: Agente 24
- Data: 2026-10-25 (BRT)
- PR: #75, branch `agente/01-prisma-tx-escape-baseline`, autor Agente 01
- Head auditado: **`742d61fa`** (o pedido citava `cd343eb2`; o head avançou às 12:16 BRT com `742d61fa`, que é o que vale)
- Base: main `6d63eb39`
- Método: análise estática, Biome 2.5.14 local, vitest local e `tsc` local (node_modules existente, sem `npm ci`). Os casos sintéticos foram revertidos e nada foi commitado.

## Veredito: **REPROVADO @ 742d61fa**

Um commit novo invalida este parecer.

- **P1 (bloqueia):** o PR introduz uma falha nova de formatação em `src`.
- **P2:** o baseline não é amarrado a linha nem a conteúdo.
- **Evidência obrigatória ausente:** o teste de integração T1 nunca rodou em CI.

## P1: falha nova de formatação
- `src/features/crm360/infra/PrismaCrm360Repository.ts:394`: o `// biome-ignore lint/plugin/no-prisma-tx-escape` adicionado por `cd343eb2` está com 4 espaços de indentação, e o Biome exige 6.
- Contagem de arquivos com falha em `biome format src`: main 61, #75 **62**. Esse é o único arquivo novo, e é um arquivo tocado pelo PR.
- Com o #71 mergeado, o step `Prettier check` (`biome format src`) passa a ficar verde, e este PR o deixaria vermelho de novo.
- Correção: reindentar a linha. Testei localmente: depois de `biome format --write`, a supressão continua funcionando (0 diagnósticos de plugin no arquivo).
- P3 relacionado: `tests/integration/prisma-tx-propagation.test.ts` também ficou fora do formato no bloco T1 (indentação do `rit(...)`). O CI só checa `src`, mas vale corrigir junto.

## (a) Baseline e teste de arquitetura: funciona para crescimento; P2 na granularidade
- O baseline é **por arquivo, com contagem** (`files: {path: n}`, total 44). Não é por arquivo+linha nem por hash. Também não é um glob amplo: lista 28 caminhos exatos. As 44 supressões em `src` batem com o total.
- Casos sintéticos locais (vitest no teste de arquitetura e `biome lint` com a config do repo):

  | Caso | Resultado |
  |---|---|
  | A: arquivo novo com uso suprimido | teste **falha** |
  | B: uso novo sem supressão (`prisma.$executeRawUnsafe` e `this.deps.prisma.$transaction`) | `biome lint` dá **2 erros**, nível error |
  | C: +1 uso suprimido num arquivo do baseline (PgLeadRepository) | teste **falha** (contagem cresceu) |
  | G: `new PrismaClient()` fora do singleton | lint dá **error**, e o teste L2 **falha** |
  | Baseline intacto | 10/10 testes passam; 0 erros de plugin em `src` |

- **P2, lacuna demonstrada:**
  - Caso D: na linha suprimida `PgLeadRepository.ts:83`, acrescentei `this.prisma.$executeRawUnsafe(String(process.env.X))` antes do `$queryRaw` legado, na mesma linha. Resultado: **lint verde e teste verde** (10/10).
  - Como a supressão não está amarrada ao conteúdo, um uso legado pode ser trocado por outro, ou acumular um segundo uso no mesmo statement, sem detecção. Em código formatado, o formatter tende a quebrar statements múltiplos em linhas separadas, mas um segundo uso dentro do mesmo statement continua coberto.
  - Pedido: amarrar o baseline a arquivo + hash do statement ou da linha suprimida (normalizado), ou exigir exatamente 1 ocorrência de `$queryRaw|$executeRaw|...|$transaction` na linha suprimida, com um caso negativo no teste.
- P3: o fixture S3 usa `npx --yes @biomejs/biome@2.5.14`. Em CI isso resolve para o binário local (mesma versão do lock); fora dele pode tentar rede. Prefira `node_modules/.bin/biome`.

## (b) voice-hub com o client compartilhado: OK
- `src/lib/voice-hub/lib/prisma.ts` foi removido. Esse `new PrismaClient()` cru não tinha extensão de RLS/tenant, nem roteamento de tx, nem G1, e abria um pool próprio.
- O único importador (`middlewares/index.ts:151`, upsert de Tenant/User **apenas fora de produção**, dentro de `try/catch`) passou a usar `@/lib/prisma.js`. O mock duplicado em `apiKeyAuth.test.ts` saiu; o mock de `@/lib/prisma.js` continua.
- Os demais arquivos do voice-hub já usavam o singleton. Resultado: um pool de conexões a menos e RLS/tenant aplicados.
- Risco residual: em dev, o upsert agora passa pela extensão de RLS, o que pode exigir contexto de tenant. Fica só em dev e é tolerado pelo `try/catch`.
- `transactionContext.ts` (R1) não tinha importadores em `src`/`tests`. Só aparece citado em `scripts/generate-authoritative-master-plan.mjs` como texto de plano.

## T1: o código está correto, mas não há evidência de execução
- O teste exige `PrismaClientKnownRequestError` com `code: 'P2039'`, `meta.modelName: 'AuditLog'`, `meta.driverAdapterError.cause.code: '42501'` e a mensagem de RLS de `"AuditLog"`. Um sucesso vira erro explícito.
- O teste não tem `skip`/`skipIf` e não aceita outro erro. Ele exige P2039 **e** 42501 ao mesmo tempo, o que é mais estrito que "ou", e está correto se for esse o erro real.
- **Esse teste nunca executou em CI.** O `application gate` dos runs `40206141385` (742d61fa) e `40204755791` (cd343eb2) foi *skipped* porque o Trivy falha de forma herdada. Não há Postgres no box para rodar localmente. Sem essa execução não há APROVADO.

## (c) Falhas do autor: todas herdadas
- `tsc` local em 742d61fa: **107 erros, idênticos aos da main** (comparando arquivo+código+mensagem). Nenhum erro cai em arquivo tocado. **O #75 não introduz erro de tipo.**
- 107 × 99: 107 é a main; 99 é a validação com o #72, que corrige 8 erros. O #75 é baseado na main, então mostra 107.
- SonarQube em cd343eb2 (job `121203223862`): 3 arquivos / 5 testes falhando, exatamente os mesmos da main (`40203001370`):
  - `AgentExecutor` (import `guardrails.service.js`);
  - `voice-hub Sidebar:80`;
  - 4 testes do `gateway`.
- O SonarQube de 742d61fa ainda estava em andamento.
- Lint: os diagnósticos caem de 727 para 697 (o warn do plugin vira supressão). Não sobra nenhum diagnóstico de lint em arquivo tocado.

## (d) Checks no head 742d61fa
| Check | Resultado | Leitura |
|---|---|---|
| secret scan, Dependency Review (x2), Trivy (SARIF), Frontend bundle budget, CodeQL python | success | |
| Trivy gate e `trivy scan` | failure | Herdado (corrigido pelo #67) |
| `build` | failure | Consequência do Trivy |
| `application gate` | skipped | Lint, typecheck, unit, architecture, **integração** e build não rodaram |
| SonarQube, k6, Visual Regression, CodeQL js | em andamento | |

## Escopo e propriedade
- `biome.json` e `biome-plugins/**` não estão na tabela do §15.
- Nos arquivos de outros domínios, a mudança se limita a comentários de supressão (1 a 5 por arquivo). É o mínimo necessário para congelar o baseline e é aceitável.
- `package.json` e lock não foram alterados.

## Para virar APROVADO
1. Corrigir o P1 (indentação em `PrismaCrm360Repository.ts:394`) e confirmar com `biome format src` sem arquivo novo em relação à main.
2. Corrigir o P2: baseline por arquivo + hash do statement suprimido (ou 1 uso por linha suprimida), com o caso D como teste negativo.
3. Trazer evidência de execução do application gate com Postgres no head final: integração T1 verde mostrando P2039/42501, architecture e unit verdes. Isso pode vir de uma run de validação sobre main + #67 (para destravar o Trivy), ou de uma run em que só o typecheck herdado esteja isolado, como no caminho proposto no parecer combinado.
