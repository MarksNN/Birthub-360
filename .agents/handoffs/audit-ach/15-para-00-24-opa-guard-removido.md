- De: 15
- Para: 00 e 24
- Onda: audit-ach
- Status: aberto (aguardando auditoria 24)
- Prioridade: P3

## Follow-up P3 (pós aprovação 15-remove-opa)

Coordenador 00: 24 aprovou docs OPA; follow-up P3 — `opaGuard.ts` residual não montado.

## Removido nesta branch (`agente/15-remove-opa-guard`)

- `src/shared/security/opaGuard.ts`
- `src/shared/security/opaGuard.spec.ts`
- `tests/unit/shared/security/opaGuard.test.ts`

## Verificação

- Nenhum import/montagem fora dos próprios testes (busca `opaGuard.js` / `OPA_URL` / `birthhub/authz`)
- RBAC canônico intacto: `requireRole` + `authorization.ts`
- Sem alteração em `server.ts` / deps

## Pedido ao 24

Auditar remoção; confirmar zero regressão de autorização.
