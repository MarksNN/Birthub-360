# Handoff 16 → 01 — REMED-05: tabelas da outbox transacional e da idempotência durável

Bloqueador: a implementação Prisma de `OutboxRepository`/`ConsumptionStore`
(`src/lib/queue/outbox/outbox.ports.ts`) depende destas tabelas. O 16 não altera `schema.prisma` nem migrações.

## Enum `DomainEventOutboxStatus`
`PENDING | PROCESSING | DISPATCHED | FAILED | DEAD_LETTER`

## Tabela `DomainEventOutbox`
| coluna | tipo Postgres | nulo | default |
|---|---|---|---|
| id | text (uuid) PK | não | gen_random_uuid() |
| organizationId | text FK → Organization(id) ON DELETE CASCADE | não | |
| eventId | text | não | |
| eventType | text | não | |
| eventVersion | text | não | '1.0.0' |
| aggregateId | text | não | |
| correlationId | text | não | |
| causationId | text | sim | |
| producer | text | não | |
| idempotencyKey | text | sim | |
| envelope | jsonb (envelope completo, inclui payload) | não | |
| status | DomainEventOutboxStatus | não | 'PENDING' |
| retryCount | integer | não | 0 |
| maxAttempts | integer | não | 8 |
| nextAttemptAt | timestamptz(3) | não | now() |
| lockedBy | text | sim | |
| lockedUntil | timestamptz(3) | sim | |
| lastError | text (truncado em 2000 chars pela aplicação) | sim | |
| createdAt | timestamptz(3) | não | now() |
| dispatchedAt | timestamptz(3) | sim | |

Índices / uniques:
- `UNIQUE (eventId)`
- `UNIQUE (organizationId, idempotencyKey)` — parcial `WHERE "idempotencyKey" IS NOT NULL`
- `INDEX (status, nextAttemptAt)` — parcial `WHERE status IN ('PENDING','FAILED')` (varredura do relay)
- `INDEX (status, lockedUntil)` — parcial `WHERE status = 'PROCESSING'` (recuperação de lease)
- `INDEX (organizationId, createdAt)`
- RLS por `organizationId` conforme padrão do 01A; o relay roda com papel de sistema.

Claim esperado (o 16 implementa no adaptador): `UPDATE ... SET status='PROCESSING', lockedBy=$w, lockedUntil=now()+lease
WHERE id IN (SELECT id ... WHERE (status IN ('PENDING','FAILED') AND nextAttemptAt<=now()) OR (status='PROCESSING' AND lockedUntil<=now())
ORDER BY createdAt LIMIT $n FOR UPDATE SKIP LOCKED) RETURNING *`.

## Tabela `DomainEventConsumption` (revisada após parecer 24 do PR #32 — reserva atômica)
| coluna | tipo | nulo | default |
|---|---|---|---|
| id | text (uuid) PK | não | gen_random_uuid() |
| organizationId | text FK → Organization(id) ON DELETE CASCADE | não | |
| eventId | text | não | |
| consumer | text | não | |
| reservedBy | text | não | |
| reservedUntil | timestamptz(3) | não | |
| completedAt | timestamptz(3) | sim | |
| createdAt | timestamptz(3) | não | now() |

- `UNIQUE (organizationId, eventId, consumer)`.
- reserva: `INSERT ... ON CONFLICT (organizationId, eventId, consumer) DO UPDATE SET reservedBy=EXCLUDED.reservedBy,
  reservedUntil=EXCLUDED.reservedUntil WHERE "DomainEventConsumption"."completedAt" IS NULL AND "DomainEventConsumption"."reservedUntil" < now() RETURNING id`
  (sem linha retornada = já concluído ou reservado por outro).
- `complete`: `UPDATE SET completedAt=now() WHERE (org,event,consumer) AND reservedBy=$owner`.
- `release`: `DELETE WHERE (org,event,consumer) AND reservedBy=$owner AND completedAt IS NULL`.
- `INDEX (completedAt)` para retenção.

## Retenção / DLQ (adicionado)
- `purge`: `DELETE FROM "DomainEventOutbox" WHERE status IN ('DISPATCHED','DEAD_LETTER') AND COALESCE(dispatchedAt, createdAt) < $olderThan`
  → pede `INDEX (status, dispatchedAt)`. Prazo default 30 dias no código; prazo final a definir com o 01A (LGPD, envelope contém payload).
- `requeueDeadLetters`: `UPDATE SET status='PENDING', retryCount=0, nextAttemptAt=now() WHERE status='DEAD_LETTER' [AND organizationId=$org] [AND id = ANY($ids)]`.
- `lastError` já chega mascarado (e-mail/números) e truncado em 2000 chars.

## Produtores atuais e migração para `publishInTransaction`
Nenhum produtor atual usa `prisma.$transaction` hoje, então não há migração "óbvia" possível sem um
`PrismaOutboxUnitOfWork` (que depende destas tabelas). Além disso, os arquivos pertencem a outros agentes.
Candidatos (escrevem no banco e publicam em seguida — dual-write), por dono a confirmar:
- `src/features/integrations/bitrix/bitrix.webhook.ts` (06/06A)
- `src/features/integrations/whatsapp/whatsappMessage.service.ts` (06)
- `src/features/knowledge/services/accountKnowledgeGraph.service.ts` (07)
- `src/features/proposals/services/proposalAutomation.service.ts` (17/04)
- `src/features/market-intelligence/server/marketSensing.service.ts` (07)
- `src/lib/security/services/continuousSecurityAudit.service.ts` (15)
Os demais 16 produtores não escrevem no banco no mesmo fluxo e podem continuar em `publish()` (inline com lock + relay).

## Status após PR #34 (2c7ccb28) — adaptador do 16 implementado (`src/lib/queue/outbox/prismaOutbox.repository.ts`)
- Claim com CTE `WITH due AS (... ORDER BY "createdAt" LIMIT n FOR UPDATE SKIP LOCKED) UPDATE ... FROM due` (regra do 01).
- RLS: toda query roda com `app.current_tenant_id`; o relay itera por tenant (descoberta via `Organization`, já na allowlist de bypass). Sem BYPASSRLS.
- Timestamps: só `now()` do Postgres (append, claim, lease, nextAttemptAt, dispatchedAt, requeue, purge).
- **Pendência para o 01 (não bloqueia o merge do #34, mas limita a garantia):** `DomainEventConsumption` do #34 não tem
  `reservedBy`, `reservedUntil`, `completedAt`. Sem elas, o adaptador usa `ON CONFLICT DO NOTHING` + DELETE em falha;
  um crash entre reserva e conclusão deixa a linha e aquele consumidor não reexecuta (at-most-once nesse caso).
  Pedido: adicionar `reservedBy text NOT NULL DEFAULT ''`, `reservedUntil timestamptz(3) NULL`, `completedAt timestamptz(3) NULL`
  e `INDEX (status, dispatchedAt)` na outbox para o purge (`DELETE ... COALESCE("dispatchedAt","createdAt") < now() - retenção`).

## Ajustes ao #34 @671d8d31 (handoff 01-para-16-remed-05-outbox-schema-relay.md)
- eventId único por (organizationId, eventId): append com `ON CONFLICT DO NOTHING` (cobre os dois únicos) e lookup do existente sempre filtrado pelo tenant.
- Claim: `ORDER BY "nextAttemptAt"` (casa com o índice parcial `(organizationId, status, nextAttemptAt)`).
- Purge: `relay.purgeExpired()` chama `SELECT * FROM domain_event_outbox_purge($org, 30, 90, 30)` por tenant (prazos provisórios).
- CHECK `retryCount <= maxAttempts`: o relay limita `retryCount` a `maxAttempts` ao ir para DEAD_LETTER.
- **Ainda pendente no 01:** `DomainEventConsumption` continua sem `reservedBy`/`reservedUntil`/`completedAt` em 671d8d31,
  então o adaptador mantém `ON CONFLICT DO NOTHING` + DELETE em falha (crash entre reserva e conclusão = consumidor não reexecuta).

## #34 @eaf0d4e7 — lease de consumo adotado
`PrismaConsumptionStore` usa reservedBy/reservedUntil/completedAt: reserva com `ON CONFLICT DO UPDATE ... WHERE completedAt IS NULL AND reservedUntil < now()`,
complete grava `completedAt=now()` (só o dono), falha apaga a linha não concluída do dono, "processado" = `completedAt IS NOT NULL`.
A limitação at-most-once em crash foi resolvida: após expirar o lease, outro worker retoma. Pendência do 01 sobre consumo: nenhuma.

## Parecer 24 @1377da4 — fail-closed, registro síncrono e guia dos produtores

### Fail-closed (P1)
`resolveDomainEventOutboxMode()` (`src/lib/queue/outbox/outboxMode.ts`): com `NODE_ENV=production`, o boot do app
(`setupDI` → `registerDomainEventOutbox`) e do worker (`worker.ts start()`) lança `DomainEventOutboxConfigError` se
`DOMAIN_EVENT_OUTBOX` não for `prisma`. Em dev/test, o padrão continua `memory`. Valor desconhecido → erro.

**Impacto em CI/deploy (verificado):**
- CI (`ci.yml`, `playwright-ci.yml`, `visual-regression.yml`, `sonarqube.yml`, `endpoint-latency-budget.yml`, `onda-2.5-validation.yml`) roda com `NODE_ENV=test`,
  inclusive o smoke test do build (`node dist/server.cjs` com `NODE_ENV: test`) → não quebra.
- **Quebra se não configurado:** `Dockerfile` (`ENV NODE_ENV=production`), `fly.toml` (`NODE_ENV = "production"`) e
  `docker-compose.services.yml` (serviço com `NODE_ENV: production`). Esses deploys precisam de `DOMAIN_EVENT_OUTBOX=prisma`
  **e** da migração do #34 aplicada antes de subir a versão com o #32. Handoff para o 08/10 (donos desses arquivos): adicionar a variável.

### Registro síncrono (P3)
`configureDomainEventOutboxFromEnv` agora é síncrona (sem `import()` dinâmico); `setupDI()` chama `registerDomainEventOutbox()`
na primeira linha, e `DomainEventOutboxUnitOfWork` existe no container antes de `setupDI` retornar.

### Guia de migração dos 6 produtores (padrão `publishInTransaction`)
Padrão: `await domainEventMesh.withTransaction(uow, async ({ tx, publish }) => { await tx.<model>.<write>(...); await publish({...}); })`,
com `uow = container.resolve('DomainEventOutboxUnitOfWork')`. A gravação e o evento são confirmados ou desfeitos juntos.

**Bloqueio comum (16):** a UoW atual usa a transação BASE (`withRlsContext`), que não passa pela extensão do `prisma`
(criptografia de PII de Contact/Lead, injeção de tenant). Antes de migrar quem grava `Lead`/`Contact`, a UoW precisa expor uma
transação do cliente estendido (ou cifrar explicitamente). Até lá, migrar causaria gravação de PII em claro.

| Produtor (dono) | Escrita no banco antes do publish | Guia |
|---|---|---|
| `integrations/bitrix/bitrix.webhook.ts` (06) | `prisma.lead.update` (+ `contact.update`, `bitrixSyncLog`) e 2 publishes (`BITRIX_WEBHOOK_RECEIVED`, `ENGAGEMENT_SIGNAL_RECEIVED`) | colocar `lead.update` e os 2 `publish` na mesma UoW; manter `contact.update`/log fora. Bloqueado pela UoW estendida (Lead tem PII cifrada). Hoje o `.catch` engole a falha do publish; na UoW, a falha da outbox desfaz o update (comportamento desejado). |
| `integrations/whatsapp/whatsappMessage.service.ts` (06) | `whatsAppMessage.create` (início), `lead.update` (opt-out), `timelineEvent.create`; publish no fim, só se inbound e com lead | o publish depende do lead encontrado depois do create; migrar exige reordenar para `create` + `publish` na mesma UoW, o que é mudança de fluxo e precisa de decisão do 06. Mesmo bloqueio de PII se envolver Lead. |
| `knowledge/services/accountKnowledgeGraph.service.ts` (07) | **nenhuma** (`Map` em memória) | sem dual-write com banco: manter `publish()`. Migrar quando o grafo for persistido. |
| `proposals/services/proposalAutomation.service.ts` (17/04) | **nenhuma** (`Map` em memória) | idem. |
| `market-intelligence/server/marketSensing.service.ts` (07) | **nenhuma** (`Map` em memória) | idem. |
| `lib/security/services/continuousSecurityAudit.service.ts` (15) | **nenhuma** (`latestReport` em memória) | idem. **Risco:** publica com `organizationId: 'global-security-governance'`, que não é uma Organization real; em modo `prisma`, o insert na outbox viola a FK/RLS e o `publish()` lança. O 15 precisa usar uma org real ou outro canal antes de ligar `DOMAIN_EVENT_OUTBOX=prisma`. |

## Guarda de tenant da UoW (retorno do 01 + decisão do Marks)
`createPrismaOutboxAdapters().unitOfWork` é fail-closed (`src/lib/queue/outbox/tenantGuard.ts`): sem `tenantId` no requestContext → erro;
com `bypassRls` → erro, salvo job de sistema com opt-in nomeado em `OUTBOX_SYSTEM_JOBS` (allowlist vazia por padrão, revisão do 24).
Em todos os casos a transação é aberta com contexto recriado `{ tenantId, bypassRls: false }`, sem herdar `app.bypass_rls=on`.

## Parecer 15 (UoW) — itens do 16
- **U3:** UoW fail-closed sem tenant e sem herdar bypass (ver seção anterior).
- **U4:** nenhum caminho do relay/UoW usa o client estendido dentro do tx: o adaptador usa só SQL cru no `tx` recebido;
  claim, entrega e marcação rodam em transações curtas e separadas (nenhuma aninhada). O relay é não reentrante
  (`tick()` concorrente devolve 0) e percorre os tenants em série. Teste de integração com **pool de 1 conexão**:
  publish inline + consumo + relay concluem sem deadlock.
- **U7:** o código do 16 não usa advisory lock nem `hashtext` (o achado é do #33, do 15).
- **Regra (porta `OutboxUnitOfWork`):** dentro da UoW, só o `tx`; proibido `prisma.*`/AuditService/logInbound/withRlsContext.
  O contexto da UoW carrega `outboxUnitOfWorkActive: true`, para o 01/15 poderem checar em runtime no `src/lib/prisma.ts`.
  Garantia hoje: teste estático `tests/unit/queue/outbox.remed05-no-extended-client.test.ts`, que varre `src/`.
- **U1/U2 (01, decisão do Marks):** UoW sobre o client estendido via AsyncLocalStorage. **Follow-up do 16:** depois do PR do 01,
  trocar a compensação manual do bitrix.webhook (AuditLog/soft-delete/reindex) pelo client estendido dentro da UoW.

## G1 — BLOQUEANTE para ligar `DOMAIN_EVENT_OUTBOX=prisma` (responsável: 01/15)

O modo `prisma` **não pode ser ligado** em nenhum ambiente antes de o 01 entregar a barreira de runtime em
`src/lib/prisma.ts`: no `$allOperations` do client estendido, lançar erro se `requestContext.getStore()?.outboxUnitOfWorkActive === true`
(a UoW já liga essa flag). Hoje a única proteção é o teste estático `tests/unit/queue/outbox.remed05-no-extended-client.test.ts`
(G2: `prisma.*`, `this.prisma`/`deps.prisma`, aliases e imports renomeados, `basePrisma`, helpers e `uow.run` direto fora do mesh),
que não segue chamadas indiretas para outros módulos.

- G3: a UoW faz merge do contexto atual (preserva userId, requestId, role…), trocando só `tenantId`/`bypassRls` (=false) e ligando `outboxUnitOfWorkActive`.
- G4: `OUTBOX_SYSTEM_JOBS` é `Object.freeze([])`; para incluir um job de sistema é preciso PR com revisão, sem mutação em runtime.

### Follow-up após o merge do PR #40 (runInTransaction, do 01)
- `prismaRuntime.ts`: `new PrismaOutboxUnitOfWork((fn) => requestContext.run(ctx, () => runInTransaction(fn)))` no lugar de `withRlsContext`.
- `appendSql` continua usando raw SQL no executor recebido (nunca no `prisma` global): compatível.
- bitrix: remover `inboundTxCompensations.ts` (AuditLog manual, filtro `deletedAt`, reindex pós-commit) e voltar ao client estendido dentro da tx.
