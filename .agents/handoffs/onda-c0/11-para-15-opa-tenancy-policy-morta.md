- De: 11
- Para: 15
- Onda: c0
- Status: superado
- Prioridade: normal

## Problema (histórico)

`infrastructure/opa/policies/tenancy.rego` (e o stack OPA) não era consultado por nenhuma rota;
risko de falsa sensação de isolamento de tenant.

## Resolução Formal (Missão 15 — 2026-10-10)

Opção (a) do handoff original: **remover**. Confirmado em `origin/main`:

- `infrastructure/opa/` inteiro ausente
- `src/middleware/opa.ts` ausente
- serviço `opa` ausente de `docker-compose.services.yml`
- Isolamento e autorização canônicos: Better Auth + `requireRole` +
  `src/lib/auth/authorization.ts` + RLS PostgreSQL (sem sidecar OPA)

Handoff arquivado como **superado**. Nenhuma rota muda de comportamento (código já não era
consumidor).
