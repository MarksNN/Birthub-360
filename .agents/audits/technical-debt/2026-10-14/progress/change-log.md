# Change log — saneamento das dívidas 2026-10-14

## 2026-10-14T13:02:12-03:00 — importação

- Autor do registro: Agente 00.
- Escopo: importar o pacote forense. Nenhuma dívida foi corrigida.
- Achados criados no rastreador: 40, com os IDs originais.
- Transições para `RESOLVED` ou `VERIFIED`: nenhuma.
- Commit de correção: nenhum.
- Testes executados nesta importação: `node scripts/verify-technical-debt-inventory.cjs` após a geração dos arquivos. Gates de produto não foram executados.

## 2026-10-14 — commit de registro

- Commit que introduziu o inventário: `02ffe4587232bbe4abfbe10c5ff1114cc6b06043`.
- Nenhuma transição de status de achado.

## 2026-10-14T18:40:00-03:00 — Onda 00 em revisao

- Branch: `fix/debt-wave-00-release-gates`.
- Base: `b2fb5a6f` (main com o inventario do PR #742).
- DEBT-GATE-001, DEBT-OPS-002, DEBT-OPS-003 e DEBT-DOC-001 passaram a IN_REVIEW.
- DEBT-GOV-004 permanece BLOCKED ate o encerramento sem merge do PR #741.
- Teste isolado do gate: exit 0, 11 cenarios. Contexto Docker simulado: exit 0.
- Build de imagem Docker: NAO EXECUTADO.
- Nenhum achado foi marcado RESOLVED ou VERIFIED.

## 2026-10-14T19:10:00-03:00 — DEBT-GOV-004

- PR #741 fechado sem merge.
- Branch `tech-debt-audit-1898280509423632042` e worktrees `pr-741-*` preservadas.
- Status vivo: IN_REVIEW, nao RESOLVED. Falta parecer do Agente 24.

## 2026-10-15T00:45:00-03:00 — revalidação da Onda 00

- Autor do registro: Agente 00. Nenhum achado passou a RESOLVED ou VERIFIED.
- HEAD revalidado: `8f4b8be6d74eee12ed3c338bee8830a44b7aff4e`.
- Docker remoto (Windows 2, `docker-remoto`, Engine 29.8.0) respondeu no início. O build da imagem `birthhub360-audit-wave00:8f4b8be6` com `--resource memory=1024m` transferiu 43,28 MB de contexto, puxou `node:22-slim` e entrou em `npm ci`. O log parou nesse passo. A API do daemon deixou de responder (`docker ps` / `docker info` sem retorno). O cliente do build foi encerrado para aliviar o host. A imagem não ficou pronta. DEBT-OPS-002 continua sem build concluído.
- No worktree local: `npm ci` exit 0; `npm run lint` exit 0 (375 warnings); `npm run typecheck` exit 0; `npm run build` exit 0; `npm run test:unit` exit 1 (3 falhas, 4122 passaram, 1 skipped); `npm run test:architecture` exit 1 (4 violações); `npm audit` exit 1 (3 moderate).
- `npm run test:integration` não foi executado: o pretest usaria o container operacional `birthhub_postgres`. `npm run release:check` não foi reexecutado como comando único; os constituintes bloqueantes já falharam.
- PR #741 reconfirmado CLOSED, `mergedAt` null.

## 2026-10-15T02:40:00-03:00 — imagem da Onda 00

- Autor do registro: Agente 00. Nenhum achado passou a RESOLVED ou VERIFIED.
- Commit do Dockerfile testado: `aa5916423e8c9360410d2ef29d3f9b42e0c976f9`.
- `docker buildx build` exit 0. Imagem `sha256:093b2766dc5e73c87daff69dea3b10a28c668bd0decae6797b5d0f7e620331ad`, tag `birthhub360-audit-wave00:b68bdd92`, 7217122613 bytes.
- Na imagem, `docker run --network none`: `npx prisma --version` exit 0. Prisma 7.10.0, client 7.10.0, `schema-engine-debian-openssl-3.0.x` com 23510888 bytes, 139 diretórios de migration.
- A Onda 00 continua BLOCKED. Unitário, arquitetura e `npm audit` seguem vermelhos. Integração e `release:check` não foram executados.
