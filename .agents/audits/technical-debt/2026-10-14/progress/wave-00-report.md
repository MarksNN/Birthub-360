# Relatório — Onda 00

Estado: EM_REVISAO. Não integrada. Não verificada de ponta a ponta.

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

- `node --check scripts/release-gate.js` → exit 0.
- `node docs/audits/launch-2026-10-14/evidence/verify-release-gate.mjs` → exit 0. Baseline reproduzido (GO indevido com typecheck falhando). Oito falhas obrigatórias em NO-GO. Sucesso em GO. Script ausente em NO-GO.
- `node scripts/verify-docker-context.mjs` → exit 0.
- `node scripts/verify-technical-debt-inventory.cjs` na main `b2fb5a6f` → exit 0 (40/216). Reexecutar nesta branch depois do commit de status.
- Build Docker da imagem: NÃO EXECUTADO.
- `npm run lint`, `npm run typecheck` e a suíte completa: NÃO EXECUTADOS nesta onda. O gate novo os torna obrigatórios; executá-los aqui não é o que o verificador isolado cobre.

## CI do PR #742

Integrado por merge commit `b2fb5a6f`. Proteção clássica da `main` sem required checks e sem required reviews. Application gate, build e SonarQube falharam no PR e também na `main` `3afbae33` (formatador e Sonar preexistentes). O build do workflow falhou porque o application gate falhou. O diff do #742 era só inventário, validador e parecer.

## Riscos

- A imagem Docker ainda não foi construída; a reinstalação `npm install prisma@<exato>` continua resolvendo dependências transitivas da CLI.
- O release gate completo (`npm run release:check`) passa a executar e2e e audit e pode ficar vermelho por falhas preexistentes. Isso é o comportamento pedido.
- Parecer do Agente 24 sobre esta correção ainda não existe. Sem ele a onda não está aprovada para integração.
