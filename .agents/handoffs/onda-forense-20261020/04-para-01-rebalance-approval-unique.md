De:04
Para:01
Onda:forense20261020
Status:aberto
Prioridade:medio
Bloqueador-ref:REMED-04 (auditoria forense @281cfcd3)
Sprint destino:a definir pelo00

## Problema
REMED-04 persiste a decisão de rebalanceamento de carteira (POST
`/api/commercial-intelligence/predictive/rebalance/approvals`) no `AuditLog` existente — sem migration,
dentro da regra de propriedade do 01. A idempotência é por (tenantId, entity='RebalanceApproval',
entityId=recommendationId) via `findFirst` + `create`: funciona para replay sequencial, mas sem
UNIQUE no banco duas requisições SIMULTÂNEAS podem gravar 2 linhas.

## Arquivo(s) envolvido(s)
src/features/commercial-intelligence/infra/PrismaRebalanceApprovalStore.ts
src/features/commercial-intelligence/services/rebalanceApproval.service.ts (interface `RebalanceApprovalStore`)

## Alteração necessária (implementada pelo Agente 01 no PR #37)
Model dedicado **sem nenhum texto livre** (decisão LGPD com o Agente 21):

```prisma
model RebalanceApproval {
  id               String       @id @default(cuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  recommendationId String
  leadId           String
  fromOwner        String?
  toOwner          String
  decision         String       // APPROVED | REJECTED
  noteLength       Int?         // 0..280 (CHECK no banco), tamanho da nota JÁ REDIGIDA
  noteHash         String?      @db.Char(64) // HMAC-SHA256 hex de `${organizationId}\u0000${notaRedigida}`
  noteRef          String?      // reservado; sempre null (não existe texto armazenado)
  decidedBy        String
  decidedAt        DateTime     @default(now())
  appliedToCrm     Boolean      @default(false)
  updatedAt        DateTime?    @updatedAt // opcional

  @@unique([organizationId, recommendationId])
  @@index([organizationId, leadId])
}
```

- **Nenhuma coluna `note`:** o texto da nota (mesmo redigido) não é armazenado em lugar nenhum; só
  `noteLength`/`noteHash`. `noteRef` fica reservado e sempre null.
- RLS por `organizationId` (mesma política `app.current_tenant_id` dos demais models de tenant).
- Retenção: a mesma da decisão. Purge do titular, anonimização e purge da organização **zeram
  `noteLength` e `noteHash`** (null).
- Com o #37 na main, o 04 troca só a implementação de `RebalanceApprovalStore` num PR separado
  (follow-up, fora do #23): P2002 tratado como replay/409 e atualização da linha quando a decisão
  estiver expirada (TTL `REBALANCE_DECISION_TTL_DAYS` = 30, já que a unique é por org+recommendationId).
  A rota e o contrato para o 02 não mudam. O AuditLog continua como trilha.

## Teste esperado
Duas requisições concorrentes com o mesmo recommendationId → 1 linha (a segunda vira replay/409);
tenant cruzado sem colisão; leitura de outro tenant bloqueada pela RLS. `noteLength` fora de 0..280
é rejeitado; purge do titular deixa `noteLength`/`noteHash` = null. Decisão expirada (> 30 dias) é
re-decidida atualizando a mesma linha.

## Expurgo das notas legadas em texto claro no AuditLog (parecer 24 @041d134c P3-1; SQL revisado pelo 21 @4473646b)
Antes do #23, o POST do #15 gravava `note` (até 1000 chars, **sem redação**) em texto claro em
`AuditLog.details` (TEXT com JSON) das linhas `action = 'REBALANCE_DECISION'`, `entity = 'RebalanceApproval'`.
O #23 já impede a reexposição (`parseApprovalRecord` por allowlist), mas o texto continua no banco.

**SQL revisado pelo 01; executor: Agente 08A, depois do deploy do #23, com OK do 21 e aprovação do Marcelo (pendente)** (o 04 não executou nada em banco real):
- Roda **por tenant**: o AuditLog tem FORCE RLS sem bypass, com
  `current_setting('app.current_tenant_id', TRUE) = "tenantId"` (`prisma/migrations/20260825120000_scope_rls_bypass_to_bootstrap_allowlist/migration.sql:473`).
  O loop percorre a lista de organizationIds e chama `set_config('app.current_tenant_id', org, true)` dentro da transação.
- `details` é TEXT: filtra por `pg_input_is_valid(details, 'jsonb')` (PG16+) antes do `::jsonb`; os inválidos são contados à parte.
- Sem recálculo: remove `note`; `noteLength`, `noteHash` e `noteRef` = null; `notePurgedAt` = now() em ISO UTC.
- Dry-run com contagens por tenant antes e depois; em `apply`, `RAISE EXCEPTION` (rollback total) se sobrar `details ? 'note'`.
- A janela de PII em backups/PITR e o procedimento de re-execução após restore estão registrados no handoff do 21.

### Regras do script (revisão 4 — aprovado pelo 01 com ajustes @6ee8427c; testado em PG17 local descartável)
1. **Dry-run é o padrão real:** sem `-v mode`, o psql define `mode=dry-run` (`\if :{?mode} … \else \set mode dry-run \endif`).
   `mode` precisa ser exatamente `dry-run` ou `apply`; qualquer outro valor (ex.: `Apply`) gera ERROR e nada é gravado.
2. **Tenant com escopo=0** (nenhuma linha `REBALANCE_DECISION`/`RebalanceApproval` visível; pode ser typo no id, org sem
   decisões ou RLS/variável errada): sai um `WARNING` com a lista. Em `apply`, aborta, a menos que se passe
   `-v allow_empty=1` (usar só quando o 08A confirmou que essas orgs de fato não têm decisões).
3. **`details` NULL:** contagem e `WARNING` separados por tenant, com **só os ids**, e **não bloqueia** o `apply` (NULL não tem `note`).
   **JSON inválido ou não-objeto:** `WARNING` por tenant com **só os ids**, nunca o conteúdo. Em `apply`, aborta (ROLLBACK
   do lote): parar e acionar o Agente 21. O passo 1 e o passo 2 usam a mesma forma
   `coalesce(CASE WHEN pg_input_is_valid(details,'jsonb') THEN … details::jsonb … END, false)`, então o `::jsonb` só é
   avaliado em texto válido, sem depender da ordem de avaliação do `AND`.
4. **Ordem das chaves:** a reescrita via `jsonb` normaliza `details` (ordem de chaves e espaços mudam; o conteúdo é o
   mesmo, menos `note`). Isso só importaria se algo assinasse ou hasheasse `details`. **Não é o caso no repo:**
   `grep` por hash/HMAC/assinatura sobre `AuditLog.details` em `src/` e no `model AuditLog` (prisma/schema.prisma)
   não achou nada. Não há hash chain nem coluna de assinatura; o único hash perto do AuditLog é `reprocessKey`
   em `src/lib/queue/deadLetter.ts`, calculado sobre a identidade do job, não sobre `details`.
5. **PG16+:** pré-checagem `SELECT current_setting('server_version_num')::int >= 160000` aborta antes de qualquer coisa
   (`pg_input_is_valid` só existe a partir do 16).
   **Lotes, locks e timeouts:** cada execução processa **um lote** de até `-v batch_size` tenants (padrão **50**), escolhido
   por `-v batch=N` (1-based, padrão 1), em **uma transação própria**. A lista é deduplicada e ordenada, então o
   fatiamento é o mesmo entre execuções. `SET LOCAL lock_timeout = '5s'` e `statement_timeout = '120s'` valem **por lote**,
   e os locks de linha duram só até o COMMIT/ROLLBACK daquele lote. Cada lote imprime contagens por tenant e um
   `TOTAL lote N/M` (tenants, escopo, details_null, com_note_antes, atualizadas, com_note_depois). Um lote abortado
   faz ROLLBACK só dele; os lotes já commitados continuam válidos, e rodar de novo é idempotente.
   Procedimento: (a) `dry-run` de todos os lotes; (b) se nenhum aviso bloqueante aparecer, `apply` lote a lote, ex.:
   `for n in $(seq 1 M); do psql "$URL" -v tenant_ids="$IDS" -v batch_size=50 -v batch=$n -v mode=apply -f expurgo.sql || break; done`.
   Rodar em janela de baixo tráfego. O `\gset` usa o prefixo `expurgo_` (sem variáveis `set_config`).
6. **Execução:** **Agente 08A**, só **depois do deploy do #23** (senão o POST antigo continua gravando `note`), com **OK do
   21** e **aprovação do Marcelo (pendente)**. A data do deploy do #15 (início da janela) e a retenção de PITR/backups
   vêm do 08A.
7. **Lista de tenants (`-v tenant_ids`):** "Organization" também tem FORCE RLS (`20260722020322_enable_rls/migration.sql:23-33`),
   então a lista não sai de um SELECT comum. O 08A fornece a lista pelo inventário operacional; qualquer leitura
   privilegiada só de ids precisa de aprovação do 21 e fica fora deste script.

```sql
-- ⚠️ SQL DE EXPURGO — NÃO EXECUTAR SEM: (1) OK do Agente 21, (2) deploy do #23 em produção,
--    (3) aprovação do Marcelo (PENDENTE). Executor: Agente 08A. O 04 não executou isto em banco real
--    (testado só em PG17 descartável local, com RLS FORCE e role não-superusuário).
-- RLS: AuditLog com FORCE RLS sem bypass; política em
--   prisma/migrations/20260825120000_scope_rls_bypass_to_bootstrap_allowlist/migration.sql:473
--   (current_setting('app.current_tenant_id', TRUE) = "tenantId") → o expurgo roda POR TENANT.
-- Uso:
--   psql -v tenant_ids='org1,org2' -f expurgo.sql                       # dry-run (padrão real)
--   psql -v tenant_ids='org1,org2' -v mode=apply -f expurgo.sql         # grava
--   psql ... -v mode=apply -v allow_empty=1                             # aceita tenants com escopo=0
--   psql ... -v batch_size=50 -v batch=N                                # lote N (1-based); uma transação por lote
\set ON_ERROR_STOP on
-- dry-run é o padrão real: sem -v mode, nada é gravado
\if :{?mode}
\else
  \set mode dry-run
\endif
\if :{?allow_empty}
\else
  \set allow_empty 0
\endif
\if :{?tenant_ids}
\else
  \set tenant_ids ''
\endif
-- lotes: cada execução processa UM lote (batch, 1-based) de até batch_size tenants, numa transação própria
\if :{?batch_size}
\else
  \set batch_size 50
\endif
\if :{?batch}
\else
  \set batch 1
\endif

-- pré-checagem PG16+ (pg_input_is_valid)
SELECT current_setting('server_version_num')::int >= 160000 AS pg16_ok \gset
\if :pg16_ok
\else
  DO $$ BEGIN RAISE EXCEPTION 'PostgreSQL 16+ obrigatório (server_version_num=%)', current_setting('server_version_num'); END $$;
\endif

BEGIN;
-- transação = 1 lote: locks e statement_timeout valem por lote
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SELECT set_config('expurgo.tenant_ids', :'tenant_ids', true) AS tenant_ids_cfg,
       set_config('expurgo.mode', :'mode', true) AS mode_cfg,
       set_config('expurgo.allow_empty', :'allow_empty', true) AS allow_empty_cfg,
       set_config('expurgo.batch_size', :'batch_size', true) AS batch_size_cfg,
       set_config('expurgo.batch', :'batch', true) AS batch_cfg \gset expurgo_

DO $$
DECLARE
  v_mode      text := current_setting('expurgo.mode');
  v_allow     boolean := current_setting('expurgo.allow_empty') = '1';
  v_bsize     int;
  v_batch     int;
  v_nbatches  int;
  all_t       text[];
  tenants     text[];
  org         text;
  n_scope     bigint;
  n_with_note bigint;
  n_updated   bigint;
  n_after     bigint;
  bad_ids     text;
  null_ids    text;
  empty_t     text[] := '{}';
  invalid_t   text[] := '{}';
  b_scope     bigint := 0;
  b_before    bigint := 0;
  b_updated   bigint := 0;
  b_after     bigint := 0;
  b_null      bigint := 0;
  purged_at   text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  IF v_mode IS DISTINCT FROM 'dry-run' AND v_mode IS DISTINCT FROM 'apply' THEN
    RAISE EXCEPTION 'mode inválido: "%" (use exatamente dry-run ou apply)', v_mode;
  END IF;
  IF current_setting('expurgo.batch_size') !~ '^[1-9][0-9]*$' OR current_setting('expurgo.batch') !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'batch_size e batch precisam ser inteiros >= 1';
  END IF;
  v_bsize := current_setting('expurgo.batch_size')::int;
  v_batch := current_setting('expurgo.batch')::int;

  -- lista ordenada e sem duplicatas → fatiamento determinístico entre execuções
  SELECT coalesce(array_agg(t ORDER BY t), '{}') INTO all_t
    FROM (SELECT DISTINCT btrim(x) AS t
            FROM unnest(string_to_array(current_setting('expurgo.tenant_ids'), ',')) x
           WHERE btrim(x) <> '') s;
  IF cardinality(all_t) = 0 THEN
    RAISE EXCEPTION 'tenant_ids vazio (use -v tenant_ids=org1,org2)';
  END IF;
  v_nbatches := ceil(cardinality(all_t)::numeric / v_bsize)::int;
  IF v_batch > v_nbatches THEN
    RAISE EXCEPTION 'batch % fora do intervalo (total de lotes: %)', v_batch, v_nbatches;
  END IF;
  tenants := all_t[(v_batch - 1) * v_bsize + 1 : v_batch * v_bsize];
  RAISE NOTICE 'lote %/% (batch_size=%): % tenant(s), mode=%', v_batch, v_nbatches, v_bsize, cardinality(tenants), v_mode;

  -- Passo 1 (sem escrita): escopo, details NULL e JSON inválido/não-objeto por tenant
  FOREACH org IN ARRAY tenants LOOP
    PERFORM set_config('app.current_tenant_id', org, true);
    SELECT count(*) INTO n_scope FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval';
    IF n_scope = 0 THEN empty_t := empty_t || org; END IF;
    -- details NULL: não tem note → só reporta (ids), não bloqueia o apply
    SELECT string_agg(id, ',' ORDER BY id), count(*) INTO null_ids, n_after FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND details IS NULL;
    IF null_ids IS NOT NULL THEN
      b_null := b_null + n_after;
      RAISE WARNING 'tenant=% registros com details NULL (ids, não bloqueia): %', org, null_ids;
    END IF;
    -- JSON inválido ou não-objeto: só ids, nunca o conteúdo; bloqueia o apply
    SELECT string_agg(id, ',' ORDER BY id) INTO bad_ids FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND details IS NOT NULL
       AND coalesce(CASE WHEN pg_input_is_valid(details, 'jsonb')
                         THEN jsonb_typeof(details::jsonb) = 'object' END, false) = false;
    IF bad_ids IS NOT NULL THEN
      invalid_t := invalid_t || org;
      RAISE WARNING 'tenant=% registros com details inválido/não-objeto (ids): %', org, bad_ids;
    END IF;
  END LOOP;

  IF cardinality(empty_t) > 0 THEN
    RAISE WARNING 'tenants com escopo=0: %', array_to_string(empty_t, ',');
    IF v_mode = 'apply' AND NOT v_allow THEN
      RAISE EXCEPTION 'apply abortado: % tenant(s) com escopo=0 (confira a lista ou use -v allow_empty=1)', cardinality(empty_t);
    END IF;
  END IF;
  IF v_mode = 'apply' AND cardinality(invalid_t) > 0 THEN
    RAISE EXCEPTION 'apply abortado: details inválido/não-objeto em % — acionar o Agente 21', array_to_string(invalid_t, ',');
  END IF;

  -- Passo 2: contagens antes/depois e expurgo. Mesma forma CASE do passo 1: o ::jsonb só é
  -- avaliado quando pg_input_is_valid é true (não depende da ordem de avaliação do AND).
  FOREACH org IN ARRAY tenants LOOP
    PERFORM set_config('app.current_tenant_id', org, true);
    SELECT count(*) INTO n_scope FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval';
    SELECT count(*) INTO n_with_note FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND coalesce(CASE WHEN pg_input_is_valid(details, 'jsonb')
                         THEN jsonb_typeof(details::jsonb) = 'object' AND details::jsonb ? 'note' END, false);
    n_updated := 0;
    IF v_mode = 'apply' THEN
      UPDATE "AuditLog"
         SET details = ((details::jsonb - 'note') || jsonb_build_object(
               'noteLength', NULL, 'noteHash', NULL, 'noteRef', NULL, 'notePurgedAt', purged_at))::text
       WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
         AND coalesce(CASE WHEN pg_input_is_valid(details, 'jsonb')
                           THEN jsonb_typeof(details::jsonb) = 'object' AND details::jsonb ? 'note' END, false);
      GET DIAGNOSTICS n_updated = ROW_COUNT;
    END IF;
    SELECT count(*) INTO n_after FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND coalesce(CASE WHEN pg_input_is_valid(details, 'jsonb')
                         THEN jsonb_typeof(details::jsonb) = 'object' AND details::jsonb ? 'note' END, false);
    RAISE NOTICE 'tenant=% mode=% escopo=% com_note_antes=% atualizadas=% com_note_depois=%',
      org, v_mode, n_scope, n_with_note, n_updated, n_after;
    b_scope := b_scope + n_scope; b_before := b_before + n_with_note;
    b_updated := b_updated + n_updated; b_after := b_after + n_after;
    IF v_mode = 'apply' AND n_after > 0 THEN
      RAISE EXCEPTION 'tenant %: ainda há % linha(s) com details ? note — ROLLBACK do lote', org, n_after;
    END IF;
  END LOOP;
  RAISE NOTICE 'TOTAL lote %/%: tenants=% escopo=% details_null=% com_note_antes=% atualizadas=% com_note_depois=%',
    v_batch, v_nbatches, cardinality(tenants), b_scope, b_null, b_before, b_updated, b_after;
END $$;

SELECT CASE :'mode' WHEN 'apply' THEN 'COMMIT' ELSE 'ROLLBACK' END AS fim \gset expurgo_
:expurgo_fim;
```

## Janela de PII em backups/PITR (registrar e manter)
- **Janela:** do merge do #15 na main (`27463513`, 2026-10-20 19:30 BRT; o primeiro deploy com o
  POST que grava `note` em claro é o marco real, e o **08A** informa a data do deploy) até o COMMIT do
  expurgo em produção (o 08A registra data/hora e o `notePurgedAt` usado). Dentro dessa janela, os
  backups lógicos, os snapshots e o WAL/PITR contêm `note` em texto claro.
- **Retenção:** o **08A** registra aqui a retenção efetiva dos backups/PITR do provedor (dias) e a data
  em que o último backup da janela expira. Até lá, o risco residual fica aceito pelo 21. Não é
  possível editar backups imutáveis; nada é apagado fora da política de retenção sem decisão do 21.
- **Restore:** após QUALQUER restore (PITR, snapshot ou dump) que caia dentro da janela, ou que a
  atravesse, rodar de novo este script: primeiro `dry-run`, depois `apply` com a lista de tenants
  restaurados, antes de liberar tráfego. O 08A anexa as contagens ao registro do incidente. O
  script é idempotente: linhas já expurgadas não têm mais `note`.
- **Acesso:** restores para análise forense ficam restritos ao 08A/21 e são descartados ao fim.
