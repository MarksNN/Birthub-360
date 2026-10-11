- De: Onda 10.1 — P0 Security Closure (sessão Claude Code on the web, tag `v1.0.0-rc.1`)
- Para: Patricia (revisão de PR/merge/push)
- Onda: 10.1 (`PROMPT 10.1 — P0 SECURITY CLOSURE`)
- Status: **RESOLVED** (pendência de exclusão da tag remota)
- Branch original: `claude/p0-security-tag-exposure-4txa6g`
- PR docs: https://github.com/maarkss1/Birthub-360/pull/502
- Branch desta atualização: `agente/15-sec-2026-001-tag-resolved`

## O que este PR/handoff cobria

Documentação do incidente SEC-2026-001 (exposição histórica via tag `v1.0.0-rc.1`)
e a remoção da tag do remote — o item que fecha o vetor de exposição.

## Resolução Formal — exclusão da tag (2026-10-10)

**RESOLVED.** Tag remota `v1.0.0-rc.1` confirmada **ausente** em
`MaarkssN/Birthub-360` por Marcelo + Juni (2026-10-10).

Verificação independente (Agente 15):

- `GET /repos/MaarkssN/Birthub-360/git/refs/tags/v1.0.0-rc.1` → **HTTP 404**
- `list_tags` no remote: sem `v1.0.0-rc.1`

Sem force-push. Sem recrear a tag.

Registro anterior no incidente (`docs/security/incidents/SEC-2026-001-historical-tag-exposure.md`)
já apontava remoção em 2026-09-15; esta nota **reconfirma** o estado no remote canônico
`MaarkssN/Birthub-360` em 2026-10-10.

## O que NÃO fecha com esta ação

O incidente permanece **PARTIALLY RESOLVED** no doc de incidente enquanto restar:

- Reverificação direta dos 2 webhooks Bitrix24 (Birth Hub 360) no painel Bitrix24

Essas rotações/credenciais seguem fora deste handoff de exclusão de tag.

## Pedido ao Agente 24

Auditar: confirmar ausência da tag no remote e que este handoff não reabre
ação destrutiva de refs.
