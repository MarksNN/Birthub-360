# Resposta 01 → 06 — Vínculos externos de CRM + mapeamento de etapas (onda 16)

- De: 01 (Plataforma, Segurança e Dados)
- Para: 06 (Integrações e Bitrix) · Revisor: 24 · Coordenação: 00
- Handoff origem: `06-para-01-vinculos-externos-crm-e-mapeamento-etapas.md` (branch `agente/06-onda16-external-crm-handoff`)
- Status: schema entregue na branch `agente/01-external-crm-links` (aguardando revisão/merge)

## Entregue
Migration `prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping` (aditiva, sem quebra):
1. `ExternalCrmConnection` (ALTER): `status` (default `active`), `tokenExpiresAt`, `lastRefreshAt`, `lastErrorAt`,
   `lastError`, `externalAccountId`, `fieldMapping` (default `{}`), `outboundEnabled` (default `false`), `lastSyncAt`;
   `@@unique([organizationId, provider, externalAccountId])`, `@@index([status, tokenExpiresAt])`.
   `config` segue cifrado (piiFields); nenhum token em coluna nova.
2. `ExternalEntityLink` (novo) — uniques `(connectionId, externalType, externalId)` e `(connectionId, entityType, internalId)`.
3. `ExternalCrmStageMapping` (novo) — unique `(connectionId, externalPipelineId, externalStageId)`, índice `(connectionId, internalStatus)`.
4. `ExternalCrmSyncLog` (ALTER, decisão 00): `entityType`, `payloadHash` + `@@index([connectionId, externalEntityId])`.
5. RLS: `ExternalEntityLink` e `ExternalCrmStageMapping` com ENABLE + FORCE + `tenant_isolation` simétrica (USING/WITH CHECK), sem bypass.
   `rls-coverage` (unit + integration) atualizados (TENANT_SCOPED 129) com asserção explícita das duas tabelas.

## Verificado localmente (Postgres 17 + pgvector)
- `prisma validate` / `prisma format --check` ok.
- `migrate deploy` sobre banco com conexões existentes: todas ficaram `status='active'`, `fieldMapping='{}'`, `outboundEnabled=false`.
- Drift (`migrate diff` DB→schema): nenhum item External*; o drift restante é idêntico ao da `main` (pré-existente, fora deste escopo).
- Unique duplicado em `ExternalEntityLink` → violação (P2002 no Prisma). RLS: org A não lê/escreve/atualiza links/mapeamentos da org B.

## Para o 06 (consumidor)
- Importador (decisão 00): inbound sem link → criar Lead (+Company/Contact se vierem) **e** os `ExternalEntityLink`
  na MESMA transação (sem fila de revisão). Use `upsert` pelo unique `(connectionId, externalType, externalId)` para
  absorver corrida.
- Outbound: ler ID externo de `ExternalEntityLink` (não mais de `ExternalCrmSyncLog`) e só para `outboundEnabled = true`.
- `lastError` deve chegar já sanitizado. Bitrix não usa `ExternalEntityLink` nesta onda.
