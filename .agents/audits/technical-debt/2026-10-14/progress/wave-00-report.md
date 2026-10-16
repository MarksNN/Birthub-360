# Relatório — Onda 00

Estado: BLOQUEADA. Não integrada. A integração isolada de 2026-10-16 passou (85 arquivos, 625 testes, 2 skipped). O e2e rodou e terminou exit 1 (73 falharam, 85 passaram, 1 skipped). Unitário, arquitetura e audit continuam vermelhos. A Onda 01 não começa.

## Resumo

- Onda: 00 — baseline, release gates e governança inicial.
- Objetivo: impedir STATUS: GO com gate obrigatório falhando, fixar a CLI do Prisma na imagem e excluir contexto Docker efêmero.
- IDs nesta branch: DEBT-GATE-001, DEBT-OPS-002, DEBT-OPS-003, DEBT-DOC-001 (comando de compose exigido pelo verificador).
- DEBT-GOV-004: ainda BLOCKED nesta revisão; o encerramento do PR #741 é operação GitHub separada. A branch `tech-debt-audit-1898280509423632042` e as worktrees `pr-741-*` não devem ser apagadas.
- Responsáveis: 08 (gate, Docker), 08A (PR #741), 00 (orquestração), 24 (parecer BLOQUEADO em `onda-00-reval2-20261015-24.md`).
- Base: `b2fb5a6f`.
- Branch: `fix/debt-wave-00-release-gates`.

## Alterações

- `scripts/release-gate.js`: lint, typecheck, arquitetura, unitário, integração, e2e, build e `npm audit` são bloqueantes. Script ausente no `package.json` não é executado e produz NO-GO. Falha de spawn (`status` nulo ou erro) também produz NO-GO.
- `Dockerfile`: a CLI do Prisma reinstalada depois do `npm prune` usa a versão já resolvida em `node_modules/prisma`, o postinstall de `@prisma/engines` baixa o `schema-engine`, e o build quebra se CLI, client e lock divergirem ou se o binário não existir. O builder usa `NODE_OPTIONS=--max-old-space-size=2048` só nesse estágio.
- `.dockerignore`: exclui `.worktrees`, `.tmp`, `tmp`, `temp` e `**/*.tmp`, mantendo `prisma/migrations`. Reabre só `identidade-visual/birthhub360/tokens` e `logos`, que o Vite importa.
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

## Imagem concluída — 2026-10-15

- Commit dos arquivos de build: `aa5916423e8c9360410d2ef29d3f9b42e0c976f9`. A tag usada no build ainda diz `b68bdd92` porque esse era o HEAD quando o `docker build` começou. O digest identifica a imagem.
- Comando: `docker buildx build --progress=plain --resource memory=2560m --resource memory-swap=2560m -t birthhub360-audit-wave00:b68bdd92`. Exit 0.
- Imagem: `sha256:093b2766dc5e73c87daff69dea3b10a28c668bd0decae6797b5d0f7e620331ad`, 7217122613 bytes, criada `2026-10-15T05:37:47Z`.
- O builder imprimiu `schema-engine schema-engine-debian-openssl-3.0.x` e `prisma CLI/client/lock 7.10.0`.
- Prova na imagem final, com `--network none`, `--memory=512m` e sem `DATABASE_URL` operacional: `npx prisma --version` exit 0. Prisma 7.10.0, `@prisma/client` 7.10.0, Schema Engine `0edf323efd1d98336f3f0a68684b56f689b900d3` em `node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x` (23510888 bytes), 139 diretórios em `prisma/migrations`.
- Depois do reinício do Docker, Postgres, Redis, MinIO, Meilisearch e Ollama estavam Up. Langfuse, Grafana, Prometheus, Loki, Tempo, ClickHouse e o coletor ficaram Exited (255). `birthhub_temporal` continuou Restarting. Nenhum container operacional foi parado por este trabalho.
- DEBT-OPS-002 tem a prova da imagem. O achado não passa a RESOLVED. O release da Onda 00 continua BLOCKED.

## CI do PR #742

Integrado por merge commit `b2fb5a6f`. Proteção clássica da `main` sem required checks e sem required reviews. Application gate, build e SonarQube falharam no PR e também na `main` `3afbae33` (formatador e Sonar preexistentes). O build do workflow falhou porque o application gate falhou. O diff do #742 era só inventário, validador e parecer.

## Riscos

- A imagem de auditoria foi construída e a CLI respondeu sem rede. O release gate de produto não está verde: unitário, arquitetura e `npm audit` falharam por itens fora do diff desta onda. Integração não rodou de propósito, para não escrever no Postgres operacional.
- Sem gates de produto verdes e sem parecer novo do Agente 24 sobre `aa591642`, a Onda 00 não libera a Onda 01 e o PR #748 não deve ser integrado.

## Revalidação de 2026-10-15 18:20 -03

HEAD `8b4b3c84bae19b8d3c661e8078d8d209db5e8b00`.

- SSH e Engine remotos disponíveis. O build da imagem ficou no Docker local do Windows 1 porque o Windows 2 tinha 808 MB livres e 19 containers dentro de uma VM de 3,33 GiB.
- `docker buildx build` exit 0. Tag `birthhub360-audit-wave00:8b4b3c84`. Digest `sha256:77859747ed461550aaf6d8cdb915c044f53a99641f40a6081d2adf182433d85b`. 7217047330 bytes.
- Prisma na imagem, sem rede: 7.10.0, igual ao client e ao lock. Schema engine de 23510888 bytes. 139 diretórios de migration. Imagem removida depois do registro.
- `npm run lint` exit 0. `npm run typecheck` exit 0. `npm run build` exit 0.
- `npm run test:unit` exit 1. Três falhas fora do diff: prefixo OpenAPI `roleplay`, `aria-pressed` do modo escuro, adapter Groq com body já lido.
- `npm run test:architecture` exit 4. Quatro violações de dependency-cruiser fora do diff.
- `npm audit` exit 1. Três moderate em `sprintf-js` / `mammoth`.
- Integração isolada exit 1. 30 arquivos falharam, 55 passaram. 46 testes falharam, 378 passaram, 203 skipped. Postgres e Redis descartáveis no Windows 2. `birthhub_postgres` não foi usado. `prisma migrate deploy` exit 0.
- `npm run test:e2e` não executado. `npm run release:check` não executado como comando único; seria NO-GO.
- PR #741 continua CLOSED sem merge.
- Pareceres: `.agents/reviews/onda-00-reval2-20261015-08-qa.md` e `.agents/reviews/onda-00-reval2-20261015-24.md`. Veredito: BLOQUEADO. Sem merge. Sem deploy. Sem Onda 01.

## Revalidação de 2026-10-16 12:45 -03

HEAD ainda `06d81153c309ad8662d5d55c12b4972a1b8db139`. Nenhum achado passou a RESOLVED ou VERIFIED. `releaseStatus` continua BLOCKED.

- Integração, sem `npm run test:integration` (o pretest escreveria em `birthhub_postgres`): `npx dotenv-cli -e .env.test -- npx prisma migrate deploy` exit 0, 139 migrations, banco `prospectordb_test` em `127.0.0.1:55434`. Depois `npx dotenv-cli -e .env.test -- npx vitest run -c vitest.integration.config.ts --no-file-parallelism` exit 0. 85 arquivos passaram. 625 testes passaram, 2 skipped. Duração 839,64 s. Redis respondeu antes da suíte. Containers só desta rodada: `birthhub360-audit-wave00-pg`, `birthhub360-audit-wave00-redis`, `birthhub360-audit-wave00-meili`, volume `birthhub360-audit-wave00-pgdata`, todos em `127.0.0.1`. Foram removidos depois do registro. `birthhub_postgres`, `birthhub_redis` e `birthhub_meilisearch` seguiram Up (healthy).
- E2E, sem `npm run test:e2e`: a primeira chamada `npx dotenv-cli -e .env.test -- npx playwright test` no worktree exit 1 em 68,5 s, `Timed out waiting 60000ms from config.webServer`. Com o servidor já no ar, `GET /login` respondia 404. `send` trata o segmento `.worktrees` do caminho absoluto como arquivo oculto e o `res.sendFile` do fallback SPA devolve 404. O mesmo código, com cwd num junction sem segmento oculto (`C:\Users\Marks\AppData\Local\Temp\wave00-e2e-cwd`), fez `GET /login` responder 200. Playwright reusou esse servidor (`reuseExistingServer`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` no Chrome instalado, ffmpeg do Playwright em cache local). Exit 1. 73 falharam, 85 passaram, 1 skipped, 33,8 min. 34 falhas são contraste do axe em `accessibility.spec.ts`. As outras são timeout de clique, locator ausente ou dois botões com o mesmo nome no Kanban. Fora do diff da Onda 00. Não corrigidas aqui.
- `npm run release:check` não foi executado como comando único. Unitário, arquitetura, audit e e2e já reprovam, então o gate seria NO-GO.
- PR aberto deste origin: https://github.com/MarksNN/Birthub-360/pull/3 (`fix/debt-wave-00-release-gates`). `gh pr view 741` neste origin não resolve o número. A ref `origin/pr/741` está gone. O registro de 2026-10-15 sobre o PR #741 permanece histórico. DEBT-GOV-004 não vira RESOLVED.
- A prova de imagem de `8b4b3c84` não foi refeita. DEBT-OPS-002 continua IN_REVIEW / TESTED_OFFLINE.
