- De: 06 (Integrações e Bitrix)
- Para: 01 (Plataforma, Segurança e Dados)
- Onda: 16
- Status: resolvido (schema entregue por 01 e consumido por 06)
- Prioridade: bloqueador (núcleo CRM externo + HubSpot E2E)
- Revisor: 24

## Problema
O núcleo de CRMs externos (`ExternalCrmConnection`, `ExternalCrmSyncRule`, `ExternalCrmSyncLog` —
migration `20260923170000_add_external_crm_and_workspace_layouts`) não permite sync real:
1. Não existe vínculo estável entidade interna ↔ ID externo. Hoje o outbound
   (`ExternalCrmService.pushLeadToAllConnections`) descobre o ID externo varrendo `ExternalCrmSyncLog`
   (log ≠ fonte de verdade; sem unique → corrida gera duplicatas no CRM externo).
2. Não há mapeamento etapa externa (ex.: HubSpot `dealstage`) ↔ `LeadStatus` interno, então
   `NormalizedLead.stageLabel` não pode ser gravado.
3. Status/expiração do token vivem só dentro de `config` (texto cifrado) — impossível consultar
   "conexões expirando" sem decifrar todas, e a UI não consegue mostrar "reconectar".
4. Sem de/para de campos (`fieldMapping`) por conexão.

## Exceção registrada
HubSpot ponta a ponta é **exceção explícita solicitada pelo Marcelo (dono do produto)** nesta onda.
Escopo limitado ao núcleo genérico + HubSpot; nenhum outro provider/extra entra neste handoff.

## Decisões fechadas (Coordenador 00)
1. ALTER em `ExternalCrmSyncLog`: incluir `entityType String?`, `payloadHash String?` + `@@index([connectionId, externalEntityId])` (obrigatório nesta migration).
2. Comportamento do importador (após schema): sem match → criar Lead (+Company/Contact se vierem) na mesma transação (não fila de revisão).

## Arquivo(s) envolvido(s)
- `prisma/schema.prisma` (models ExternalCrm*, ~linhas 4923-5010)
- `prisma/migrations/<nova>/migration.sql`
- Consumidores (06, após resolução): `src/features/integrations/shared/ExternalCrmService.ts`,
  `src/features/integrations/hubspot/**`

## Alteração necessária
Migration sugerida: `20261013120000_external_crm_entity_links_stage_mapping`

### 1. `ExternalCrmConnection` (ALTER, colunas novas, todas com default/nullable — sem quebra)
| campo | tipo | nota |
|---|---|---|
| `status` | `String @default("active")` | `active` \| `expired` \| `error` \| `disconnected` |
| `tokenExpiresAt` | `DateTime?` | espelho NÃO sensível de `config.expiresAt` |
| `lastRefreshAt` | `DateTime?` | |
| `lastErrorAt` | `DateTime?` | |
| `lastError` | `String? @db.Text` | já sanitizado (sem token) pelo 06 |
| `externalAccountId` | `String?` | ex.: HubSpot `hub_id` (portal) |
| `fieldMapping` | `Json @default("{}")` | `{ "lead": { "<campoInterno>": "<propExterna>" }, "company": {...}, "contact": {...} }` |
| `outboundEnabled` | `Boolean @default(false)` | outbound só para conexões opt-in |
| `lastSyncAt` | `DateTime?` | |

- `@@unique([organizationId, provider, externalAccountId])` (Postgres aceita múltiplos NULL; conexões antigas não quebram)
- `@@index([status, tokenExpiresAt])` (job de refresh)
- `config` permanece cifrado (piiFields); tokens NUNCA migram para colunas.

### 2. `ExternalEntityLink` (NOVO)
```prisma
model ExternalEntityLink {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  connectionId   String
  connection     ExternalCrmConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  entityType     String   // "lead" | "company" | "contact"
  internalId     String   // Lead.id | Company.id | Contact.id (sem FK polimórfica)
  externalType   String   // ex.: "deal" | "company" | "contact" (objeto no CRM externo)
  externalId     String
  externalUpdatedAt DateTime?  // last-write-wins / anti-loop
  lastSyncedAt   DateTime?
  lastDirection  String?  // "inbound" | "outbound"
  lastPayloadHash String? // anti-eco: não reprocessar o que nós mesmos enviamos
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([connectionId, externalType, externalId])
  @@unique([connectionId, entityType, internalId])
  @@index([organizationId])
  @@index([organizationId, entityType, internalId])
}
```

### 3. `ExternalCrmStageMapping` (NOVO)
```prisma
model ExternalCrmStageMapping {
  id                 String       @id @default(cuid())
  organizationId     String
  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  connectionId       String
  connection         ExternalCrmConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  externalPipelineId String
  externalStageId    String
  externalStageLabel String?
  internalStatus     LeadStatus   // enum existente
  outboundDefault    Boolean @default(false) // etapa usada ao empurrar esse LeadStatus
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([connectionId, externalPipelineId, externalStageId])
  @@index([organizationId])
  @@index([connectionId, internalStatus])
}
```

### 4. `ExternalCrmSyncLog` (ALTER obrigatório)
- `entityType String?`, `payloadHash String?` + `@@index([connectionId, externalEntityId])`.

### RLS
- `ExternalEntityLink` e `ExternalCrmStageMapping`: `ENABLE` + `FORCE ROW LEVEL SECURITY` e policy
  `tenant_isolation` simétrica (`USING`/`WITH CHECK` `"organizationId" = current_setting('app.current_tenant_id', true)`),
  mesmo padrão de `20261012000000_lead_touchpoint_rls`. Sem bypass.
- Adicionar as duas tabelas ao `tests/integration/rls-coverage.test.ts` / `tests/unit/db/rls-coverage.test.ts`.
- Índices de FK (`connectionId`) presentes (segue `add_missing_rls_and_fk_indexes`).

## Teste esperado / critérios de aceite
- `npx prisma migrate deploy` limpo em banco com dados existentes; `npm run verify:migration-drift` = 0.
- Conexões existentes recebem `status='active'`, `fieldMapping='{}'`, `outboundEnabled=false`.
- Inserir dois `ExternalEntityLink` com mesmo `(connectionId, externalType, externalId)` falha (P2002).
- Testes de isolamento: org A não lê/escreve links/mapeamentos da org B (RLS direto em Postgres).
- `rls-coverage` verde com as novas tabelas.
- Nenhum token em coluna nova; `config` continua cifrado.

## Contexto adicional
- Sucede `.agents/handoffs/onda-14/06-para-01-schema-novos-crms.md` (resolvido).
- Bitrix NÃO é migrado para `ExternalEntityLink` nesta onda (continua com `bitrixLeadId`/`bitrixDealId`).
- Consumidor: plano núcleo (B) e HubSpot E2E (C) do 06. Implementação do 06 só após status `resolvido`.

## Resolução (Agente 06 — 2026-10-11)
- Migration `20261013120000_external_crm_entity_links_stage_mapping` entregue pelo Agente 01 em `main`.
- `ExternalCrmService.pushLeadToAllConnections` refatorado para:
  1. Filtrar conexões com `status = 'active'` E `outboundEnabled = true`.
  2. Consultar vínculo prévio em `prisma.externalEntityLink` em vez de `ExternalCrmSyncLog`.
  3. Fazer `upsert` em `ExternalEntityLink` após sync externo com `lastDirection = 'outbound'`.
  4. Manter `ExternalCrmSyncLog` como trilha de auditoria e atualizar `lastSyncAt`.
- Teste unitário adicionado e passando: `tests/unit/features/integrations/shared/ExternalCrmService.outbound.test.ts`.

