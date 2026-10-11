De: 17 — Cadência
Para: 01 — Dados / Schema Prisma
Onda: onda-enxuta (P0 #693, item 8)
Status: aberto
Prioridade: normal
Bloqueador-ref: P0 #693 item 8 — eliminar `$queryRawUnsafe`/`$executeRawUnsafe` no discador
Sprint destino: onda-enxuta

## Problema
Os repositórios do discador (`src/features/cadence/dialer`) operam sobre as tabelas SQL próprias criadas pelas migrations do módulo (`call_attempts`, `dnc_list`, snake_case), que divergem dos models Prisma `CallAttempt` e `DncList` em `prisma/schema.prisma`:

- `call_attempts` (SQL) tem `lead_id`, `campaign_id`, `agent_dn`, `status`, `provider_call_id`, `started_at`, `ended_at`. O model `CallAttempt` não tem `providerCallId`, `startedAt` nem `endedAt` (tem `duration`, `createdAt`, `updatedAt`), `leadId`/`agentDn` são opcionais e não há mapeamento `@@map("call_attempts")`/`@map` snake_case.
- `dnc_list` (SQL legado) tem `phone` como PK + `reason` + `created_at`, **sem organização**. O model `DncList` tem `id`, `organizationId` obrigatório (unique `[organizationId, phone]`) e não tem `reason`.
- O índice único parcial `uq_call_attempts_active_agent_dn` (migration 002 do discador) não existe no schema Prisma.

Por isso a missão 17 migrou para `$queryRaw`/`$executeRaw` tipados (tagged templates `Prisma.sql` / `Prisma.join`) e **não** para o Client CRUD — usar `prisma.callAttempt.*` / `prisma.dncList.*` hoje gravaria em outra tabela/forma e quebraria o discador.

## Arquivo(s) envolvido(s)
- `prisma/schema.prisma` — dono 01 (não editado por 17).
- `src/features/cadence/dialer/infrastructure/db/migrations/001_init.sql`, `002_concurrency_safety.sql` — referência do formato real.
- `src/features/cadence/dialer/infrastructure/db/repositories/PgCallAttemptRepository.ts`, `PgDncRepository.ts` — consumidores (dono 17).

## Evidência
- `prisma/schema.prisma`: `model CallAttempt { id, campaignId, leadId?, agentDn?, status, duration?, createdAt, updatedAt }` e `model DncList { id, phone, organizationId, createdAt, @@unique([organizationId, phone]) }`.
- `001_init.sql`: `CREATE TABLE call_attempts (... provider_call_id TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ)` e `CREATE TABLE dnc_list (phone TEXT PRIMARY KEY, reason TEXT NOT NULL, created_at ...)`.

## Alteração necessária
Decidir a fonte de verdade e alinhar o schema Prisma às tabelas do discador (ou planejar migração dos dados do discador para os models existentes):
1. `CallAttempt`: adicionar `providerCallId`, `startedAt`, `endedAt` com `@map` snake_case e `@@map("call_attempts")`, ou criar model dedicado do discador.
2. `DncList`: definir escopo multi-tenant do DNC do discador (o SQL legado é global, sem `organizationId`) e incluir `reason`.
3. Representar (ou documentar como SQL manual) o índice parcial `uq_call_attempts_active_agent_dn`.

Após o alinhamento, 17 pode trocar os `$queryRaw` por Client CRUD tipado.

## Teste esperado
- `prisma validate` / `prisma migrate diff` sem drift contra as tabelas do discador.
- `tests/unit/features/cadence/dialer/PgDialerRepositories.test.ts` continua verde após 17 migrar para Client CRUD.
- Concorrência: inserir duas tentativas não terminais com o mesmo `agent_dn` continua resultando em `AgentDnConflictError`.
