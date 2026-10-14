# Relatório — Onda 01 (parcial)

Estado: EM_REVISAO dos achados abaixo. Não integrada. Não é a onda inteira.

## IDs nesta branch

- DEBT-SEC-001: logs de reset e verificação não recebem mais URL, token nem e-mail. O reset sem SMTP continua lançando erro observável. A verificação sem SMTP continua retornando, porque a conta já existe, mas o log não leva o link.
- DEBT-LGPD-001: `OptOutRecord` é gravado antes da anonimização. Falha de supressão propaga e não chega no `contact.update`. Os `.catch(() => {})` que engoliam o erro foram removidos.
- DEBT-DB-001: `LOCAL_FIRST.md` passa a usar `prospector_app` na `DATABASE_URL` e reserva `DIRECT_URL` ao superusuário de bootstrap. `create-app-role.sql` explicita `NOBYPASSRLS` na criação e no `ALTER` de um papel já existente.

Ainda abertos nesta onda: DEBT-LGPD-002, DEBT-DB-002, DEBT-UX-001.

## Testes

- `node docs/audits/launch-2026-10-14/evidence/verify-lgpd-optout.mjs` → exit 0. Falha de supressão antes da anonimização; supressão registrada antes de destruir identificadores.
- `node scripts/verify-auth-log-redaction.mjs` → exit 0.
- `src/shared/services/__tests__/dataSubjectErasure.unit.test.ts` atualizado para exigir opt-out antes do update. Vitest NÃO EXECUTADO: `node_modules` ausente nesta máquina.
- Postgres descartável, RLS real e troca de sessão no CacheStorage: NÃO EXECUTADOS.

## Base

- Branch: `fix/debt-wave-01-security-lgpd`
- Base: `b2fb5a6f`
- Parecer do Agente 24: pendente. Sem ele estes achados não estão VERIFIED.
