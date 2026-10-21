# Handoff 04 → 21 — notas legadas em texto claro no AuditLog (rebalanceamento)

**Origem:** parecer do Agente 24 sobre o PR #23 @041d134c, achado P3-1 (LGPD). Data: 2026-10-20.

## Situação
- No main, o #15 gravava a `note` livre (até 1000 chars, sem redação) em texto claro em `AuditLog.details`
  nas linhas `action = 'REBALANCE_DECISION'` / `entity = 'RebalanceApproval'`.
- O #23 (Agente 04) passou a: limitar a `note` a 280; redigir e-mail/telefone/CPF/CNPJ
  (`redactPiiIncludingCnpj`); gravar só `noteLength`, `noteHash` (HMAC-SHA256 de `organizationId\0nota redigida`, chave `PII_BLIND_INDEX_KEY`) e
  `noteRef: null`; e montar os registros lidos por allowlist, então a `note` legada não volta no GET
  nem no replay do POST.
- O texto legado **continua no banco**. Nenhuma limpeza foi executada pelo 04.

## SQL de expurgo (revisão 2 — ajustes do 21 @4473646b)
SQL para o **Agente 01 executar somente após o OK do Agente 21**. O 04 não executou nada em banco.
- Variável de tenant real: `app.current_tenant_id` (política do AuditLog em
  `prisma/migrations/20260825120000_scope_rls_bypass_to_bootstrap_allowlist/migration.sql:473`, sem bypass).
- Sem recálculo de hash: o legado fica com `noteLength`/`noteHash`/`noteRef` = null e `notePurgedAt`.

```sql
-- ⚠️ SQL PARA O AGENTE 01 EXECUTAR SOMENTE APÓS O OK EXPLÍCITO DO AGENTE 21.
-- O Agente 04 NÃO executou isto em nenhum banco. Requer PostgreSQL 16+ (pg_input_is_valid).
-- RLS: "AuditLog" tem FORCE ROW LEVEL SECURITY e a política vigente
-- (prisma/migrations/20260825120000_scope_rls_bypass_to_bootstrap_allowlist/migration.sql:470-477)
-- só enxerga linhas com current_setting('app.current_tenant_id', TRUE) = "tenantId", SEM bypass.
-- Um UPDATE global afetaria 0 linhas, então o expurgo roda POR TENANT.
--
-- Entrada: lista de organizationIds em :'tenant_ids' (psql, CSV). "Organization" também tem
-- FORCE RLS (20260722020322_enable_rls/migration.sql:23-33), então a lista NÃO sai de um SELECT
-- comum. O 01 fornece a lista a partir do inventário operacional de orgs. Se for preciso um
-- SELECT privilegiado só de ids, ele exige aprovação do 21 e não faz parte deste script.
--
-- Modo: :'mode' = 'dry-run' (padrão: conta e faz ROLLBACK) | 'apply' (conta, expurga, reconta, COMMIT).
-- psql -v tenant_ids='org1,org2' -v mode=dry-run -f expurgo-note-legada.sql

\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('expurgo.tenant_ids', :'tenant_ids', true),
       set_config('expurgo.mode', coalesce(nullif(:'mode', ''), 'dry-run'), true);

DO $$
DECLARE
  org            text;
  v_mode         text := current_setting('expurgo.mode');
  n_scope        bigint;
  n_invalid      bigint;
  n_with_note    bigint;
  n_updated      bigint;
  n_after        bigint;
  purged_at      text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  IF v_mode NOT IN ('dry-run', 'apply') THEN
    RAISE EXCEPTION 'mode inválido: % (use dry-run|apply)', v_mode;
  END IF;

  FOREACH org IN ARRAY string_to_array(current_setting('expurgo.tenant_ids'), ',') LOOP
    org := btrim(org);
    CONTINUE WHEN org = '';
    -- escopo de RLS só desta org, local à transação (is_local = true)
    PERFORM set_config('app.current_tenant_id', org, true);

    SELECT count(*) INTO n_scope FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval';

    -- (b) details é TEXT: inválidos são contados à parte e NUNCA convertidos
    SELECT count(*) INTO n_invalid FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND (details IS NULL OR NOT pg_input_is_valid(details, 'jsonb'));

    SELECT count(*) INTO n_with_note FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND details IS NOT NULL AND pg_input_is_valid(details, 'jsonb')
       AND jsonb_typeof(details::jsonb) = 'object' AND (details::jsonb ? 'note');

    n_updated := 0;
    IF v_mode = 'apply' THEN
      -- (c) sem recálculo: remove 'note'; noteLength/noteHash/noteRef = null; notePurgedAt = agora (ISO UTC)
      UPDATE "AuditLog"
         SET details = ((details::jsonb - 'note') || jsonb_build_object(
               'noteLength', NULL, 'noteHash', NULL, 'noteRef', NULL, 'notePurgedAt', purged_at))::text
       WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
         AND details IS NOT NULL AND pg_input_is_valid(details, 'jsonb')
         AND jsonb_typeof(details::jsonb) = 'object' AND (details::jsonb ? 'note');
      GET DIAGNOSTICS n_updated = ROW_COUNT;
    END IF;

    SELECT count(*) INTO n_after FROM "AuditLog"
     WHERE "tenantId" = org AND action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval'
       AND details IS NOT NULL AND pg_input_is_valid(details, 'jsonb')
       AND jsonb_typeof(details::jsonb) = 'object' AND (details::jsonb ? 'note');

    -- (d) contagens por tenant, antes e depois (só números, sem conteúdo)
    RAISE NOTICE 'tenant=% mode=% escopo=% invalidos_json=% com_note_antes=% atualizadas=% com_note_depois=%',
      org, v_mode, n_scope, n_invalid, n_with_note, n_updated, n_after;

    IF v_mode = 'apply' AND n_after > 0 THEN
      RAISE EXCEPTION 'tenant %: ainda há % linha(s) com details ? note — ROLLBACK total', org, n_after;
    END IF;
  END LOOP;
END $$;

-- dry-run nunca grava; em apply, o COMMIT só é alcançado se nenhum RAISE EXCEPTION disparou
SELECT CASE current_setting('expurgo.mode') WHEN 'apply' THEN 'COMMIT' ELSE 'ROLLBACK' END AS fim \gset
:fim;
```

## Janela de PII em backups/PITR (registrar e manter)
- **Janela:** do merge do #15 na main (`27463513`, 2026-10-20 19:30 BRT; o primeiro deploy com o
  POST que grava `note` em claro é o marco real, e o 01 confirma a data do deploy) até o COMMIT do
  expurgo em produção (o 01 registra data/hora e o `notePurgedAt` usado). Dentro dessa janela, os
  backups lógicos, os snapshots e o WAL/PITR contêm `note` em texto claro.
- **Retenção:** o 01 registra aqui a retenção efetiva dos backups/PITR do provedor (dias) e a data
  em que o último backup da janela expira. Até lá, o risco residual fica aceito pelo 21. Não é
  possível editar backups imutáveis; nada é apagado fora da política de retenção sem decisão do 21.
- **Restore:** após QUALQUER restore (PITR, snapshot ou dump) que caia dentro da janela, ou que a
  atravesse, rodar de novo este script: primeiro `dry-run`, depois `apply` com a lista de tenants
  restaurados, antes de liberar tráfego. O 01 anexa as contagens ao registro do incidente. O
  script é idempotente: linhas já expurgadas não têm mais `note`.
- **Acesso:** restores para análise forense ficam restritos ao 01/21 e são descartados ao fim.

## Pedido ao 21
1. Aprovar (ou ajustar) o expurgo descrito em `04-para-01-rebalance-approval-unique.md`, seção
   "Expurgo das notas legadas", a ser executado pelo Agente 01 como migration ou script versionado.
2. ~~Decidir hash do legado~~: decidido pelo 21: `null`, sem recálculo.
3. Registrar a base legal e a exceção à imutabilidade do AuditLog, se houver.
