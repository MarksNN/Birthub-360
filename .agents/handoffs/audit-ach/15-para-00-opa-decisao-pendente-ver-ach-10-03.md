- De: 15 (auditoria ACH-15-05)
- Para: 00
- Onda: audit-ach
- Status: superado
- Prioridade: normal (P2)

## Problema (histórico)

ACH-15-05 pedia decisão: montar `opaMiddleware` ou remover infraestrutura OPA. Duplicado de
ACH-10-03 (ver `10-para-00-opa-middleware-decisao-pendente.md`).

## Resolução Formal (Missão 15 — 2026-10-10)

Decisão: **remover / descontinuar** (Agente 00 + Marcelo). Verificação em `origin/main`:

| Artefato | Estado |
|---|---|
| `src/middleware/opa.ts` | ausente |
| `infrastructure/opa/**` | ausente |
| serviço `opa` em `docker-compose.services.yml` | ausente |
| `opaMiddleware` / `OPA_URL` / `openpolicyagent` no código | zero hits de busca |
| RBAC nativo (`requireRole`, `authorization.ts`) | intacto |

Handoffs irmãos fechados neste PR:
- `.agents/handoffs/onda-os/15-para-10-mount-opa-middleware.md`
- `.agents/handoffs/onda-c0/11-para-15-opa-tenancy-policy-morta.md`
- `.agents/handoffs/audit-ach/10-para-00-opa-middleware-decisao-pendente.md` (já tinha
  resolução 00; este PR confirma execução)

Branch: `agente/15-remove-opa`. Agente 24 audita antes do merge.
