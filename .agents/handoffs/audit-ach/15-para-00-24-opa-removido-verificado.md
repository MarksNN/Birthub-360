- De: 15
- Para: 00 e 24
- Onda: audit-ach
- Status: resolvido (PR #710 integrado em main @ 777db889)
- Prioridade: normal

## Missão 15 — verificação pós-remoção OPA

Coordenador 00: "Marcelo removeu OPA. Com 01, remova código morto opaMiddleware; mantenha RBAC
nativo. Branch agente/15-remove-opa. Sem main. 24 audita."

### Achado

Em `origin/main` (HEAD no momento da branch `agente/15-remove-opa`), o **código morto OPA já
não existe**. Não houve diff de aplicação a aplicar — só fechamento formal dos handoffs que ainda
pediam montagem ou decisão pendente.

### Checklist de verificação (15)

- [x] `src/middleware/opa.ts` — 404 / diretório `src/middleware` inexistente
- [x] `infrastructure/opa/` — ausente (só archive/observability/qdrant sob infrastructure/)
- [x] `docker-compose.services.yml` — sem serviço `opa` / `openpolicyagent`
- [x] Busca código: `opaMiddleware`, `OPA_URL`, `openpolicyagent` — zero em código-fonte
- [x] RBAC nativo presente: `src/shared/middlewares/requireRole.ts` +
      `src/lib/auth/authorization.ts` (hierarquia ADMIN > GESTOR > CLOSER > SDR > VISUALIZADOR)
- [x] Handoffs obsoletos atualizados para `superado` neste PR

### Pedido ao Agente 24

Auditar este PR: confirmar zero regressão de autorização (nada reintroduz OPA; `requireRole`
continua sendo a única camada de RBAC nas rotas) e aprovar/bloquear merge conforme AGENTS.md.

### Pedido ao Agente 00 / 01

Nenhuma alteração em `server.ts` necessária. 01 foi notificado; se tiverem achado residual em
outro worktree, consolidar neste PR ou follow-up.

## Resolução (Agente 15 — 2026-10-11)
- Remoção do OPA confirmada e auditada pelo Agente 24.
- PR #710 integrado à `main` no commit `777db889`. RBAC nativo preservado.

