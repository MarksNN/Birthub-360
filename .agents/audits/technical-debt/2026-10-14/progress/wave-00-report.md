# Relatório — Onda 00

Estado: BLOQUEADA. Não integrada. Revalidação de 2026-10-15 não fechou DEBT-OPS-002 e não deixou os gates de produto verdes.

## Resumo

- Onda: 00 — baseline, release gates e governança inicial.
- Objetivo: impedir STATUS: GO com gate obrigatório falhando, fixar a CLI do Prisma na imagem e excluir contexto Docker efêmero.
- IDs nesta branch: DEBT-GATE-001, DEBT-OPS-002, DEBT-OPS-003, DEBT-DOC-001 (comando de compose exigido pelo verificador).
- DEBT-GOV-004: ainda BLOCKED nesta revisão; o encerramento do PR #741 é operação GitHub separada. A branch `tech-debt-audit-1898280509423632042` e as worktrees `pr-741-*` não devem ser apagadas.
- Responsáveis: 08 (gate, Docker), 08A (PR #741), 00 (orquestração), 24 (parecer ainda pendente).
- Base: `b2fb5a6f`.
- Branch: `fix/debt-wave-00-release-gates`.

## Alterações

- `scripts/release-gate.js`: lint, typecheck, arquitetura, unitário, integração, e2e, build e `npm audit` são bloqueantes. Script ausente no `package.json` não é executado e produz NO-GO. Falha de spawn (`status` nulo ou erro) também produz NO-GO.
- `Dockerfile`: a CLI do Prisma reinstalada depois do `npm prune` usa a versão já resolvida em `node_modules/prisma`, e o build quebra se CLI, client e lock divergirem.
- `.dockerignore`: exclui `.worktrees`, `.tmp`, `tmp`, `temp` e `**/*.tmp`, mantendo `prisma/migrations`.
- `docs/development/LOCAL_FIRST.md` e `docs/release/GO-LIVE-CHECKLIST.md`: comando composto dos dois arquivos compose, explícito como infraestrutura apenas.
- `docs/audits/launch-2026-10-14/evidence/verify-release-gate.mjs`: baseline pinado em `b2fb5a6f`, porque depois do fix o `HEAD` deixa de reproduzir o defeito.

## Testes

Verificadores isolados, reexecutados em 2026-10-15 no HEAD `8f4b8be6`:

- `node docs/audits/launch-2026-10-14/evidence/verify-release-gate.mjs` → exit 0. Baseline reproduzido. 11 casos.
- `node scripts/verify-docker-context.mjs` → exit 0.
- `node scripts/verify-technical-debt-inventory.cjs` → exit 0 (40 achados, 216 verificações).

Suíte npm no worktree `C:\Github\Birthub-360\.worktrees\debt-wave-00`, Node v24.20.0, após `npm ci` exit 0 (Prisma Client 7.10.0):

- `npm run lint` → exit 0. 375 warnings, 1 info, 0 errors.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0. Vite em 37,64 s e `verify:pwa-precache` ok.
- `npm run test:unit` → exit 1. 507 arquivos: 3 falharam, 504 passaram. Testes: 3 falharam, 4122 passaram, 1 skipped. Falhas: `openapiRouteInventory` (prefixo `roleplay`), `Settings.test.tsx` (aria-pressed do modo escuro), `providers.golden.test.ts` (groq, body já lido). Nenhuma dessas falhas está no diff da Onda 00.
- `npm run test:architecture` → exit 1. 4 violações de dependency-cruiser fora do diff desta onda.
- `npm audit` → exit 1. 3 moderate (`sprintf-js` / `mammoth`). Sem `npm audit fix --force`.
- `npm run test:integration` → NÃO EXECUTADO. O pretest procura `birthhub_postgres` e criaria `prospectordb_test` nesse volume operacional.
- `npm run test:e2e` → NÃO EXECUTADO.
- `npm run release:check` → NÃO EXECUTADO como comando único. Lint, typecheck e build passaram; unitário, arquitetura e audit já reprovam, então o gate seria NO-GO.

## Revalidação Docker — 2026-10-15

- Transporte: Docker CLI 29.8.0 local com Buildx 0.38.0 e `DOCKER_HOST=ssh://docker-remoto`. O daemon remoto é o Engine 29.8.0, API 1.56, Compose v5.5.1.
- Host do daemon: 7,9 GB de RAM, cerca de 0,6 GB livres no início; VM Docker com 3871 MB, swap de 1024 MB já cheio; containers existentes em torno de 2,6 GB. Disco C: 12,9 GB livres. Limite do build: `--resource memory=1024m`, para não estourar a VM.
- Tag pedida: `birthhub360-audit-wave00:8f4b8be6`. Não substitui imagem existente. Não houve deploy.
- O build chegou a transferir o contexto (43,28 MB) e a concluir os `apt-get` do builder e do runner. Parou com o log em `#10 RUN npm ci --ignore-scripts` no segundo 528, sem nova linha. `docker ps` passou a responder 500 e depois não retornou em 45 s. `docker info` também não retornou. O cliente local do build foi encerrado. `wsl -d docker-desktop` também não retornou. Docker Desktop não foi reiniciado.
- Resultado do build: NÃO CONCLUÍDO. Exit code final da imagem: ausente. `npx prisma --version` dentro da imagem: NÃO EXECUTADO. DEBT-OPS-002 permanece sem a prova exigida.
- Snapshot anterior dos containers foi gravado em `%TEMP%\wave00-containers-before.txt`. O snapshot posterior não pôde ser lido porque a API do daemon não respondeu. `birthhub_temporal` já estava `Restarting` antes do build.

## CI do PR #742

Integrado por merge commit `b2fb5a6f`. Proteção clássica da `main` sem required checks e sem required reviews. Application gate, build e SonarQube falharam no PR e também na `main` `3afbae33` (formatador e Sonar preexistentes). O build do workflow falhou porque o application gate falhou. O diff do #742 era só inventário, validador e parecer.

## Riscos

- A imagem Docker não foi concluída. O host do daemon ficou sem resposta na API durante o `npm ci` limitado a 1024 MB. A reinstalação da CLI continua sem prova de execução.
- O release gate de produto não está verde: unitário, arquitetura e `npm audit` falharam por itens fora do diff desta onda. Integração não rodou de propósito, para não escrever no Postgres operacional.
- Sem build concluído e sem gates de produto verdes, a Onda 00 não libera a Onda 01 e o PR #748 não deve ser integrado.
