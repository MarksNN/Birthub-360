# Progresso do saneamento — 2026-10-14

`remediation-status.json` é o estado vivo de cada achado.
`change-log.md` registra cada mudança desse estado.

Estados permitidos: `OPEN`, `IN_PROGRESS`, `PATCH_PROPOSED`, `IN_REVIEW`, `TESTING`, `BLOCKED`, `RESOLVED`, `VERIFIED`, `REOPENED`, `ACCEPTED_RISK`.

`PATCH_PROPOSED` não encerra o achado.
`VERIFIED` exige `testsExecuted`, `validationResult`, `closureEvidence` e o parecer do Agente 24 sobre a correção.
`RESOLVED` exige `fixCommit` e `closureEvidence`, e ainda não é `VERIFIED`.

Não preencher SHA, URL de PR, data de teste ou nome de branch que não existam.
