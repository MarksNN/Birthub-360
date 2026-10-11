- De: 15
- Para: 10
- Onda: os
- Status: superado
- Prioridade: normal

## Problema (histórico)

Middlewares de segurança precisavam ser montados no `server.ts`, mas o Agente 15 não tinha
permissão de edição desse arquivo. Este handoff pedia importar `opaMiddleware` de
`src/middleware/opa.ts` e montá-lo em `server.ts`.

## Resolução Formal (Missão 15 — 2026-10-10)

**Não montar.** OPA foi descontinuado (decisão Agente 00 + Marcelo). Remoção de código morto
já refletida em `origin/main`:

- `src/middleware/opa.ts` — ausente (diretório `src/middleware/` inexistente)
- `infrastructure/opa/policies/**` — ausente
- serviço `opa` em `docker-compose.services.yml` — ausente
- RBAC canônico mantido: `src/shared/middlewares/requireRole.ts` +
  `src/lib/auth/authorization.ts` (Better Auth + hierarquia de papéis)

Handoff arquivado como **superado**. Não há ação para o Agente 10.
