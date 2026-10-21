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

## Alteração necessária (sugestão — decisão do 01)
Model dedicado, p.ex.:

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
  note             String?      @db.VarChar(280) // texto JÁ REDIGIDO (CPF/CNPJ/e-mail/telefone)
  decidedBy        String
  decidedAt        DateTime     @default(now())

  @@unique([organizationId, recommendationId])
  @@index([organizationId, leadId])
}
```

Com o model, o 04 troca só a implementação de `RebalanceApprovalStore` (tratando P2002 como
replay/409); a rota e o contrato para o 02 não mudam. O AuditLog continua como trilha.

## Requisito LGPD da `note` (Agente 21, adicionado 2026-10-20)
- Hoje o AuditLog guarda só `noteLength`, `noteHash` (sha256 do texto redigido) e `noteRef: null`;
  o texto redigido é descartado porque não existe entidade por tenant para ele.
- Coluna `note`: texto redigido por `src/shared/security/piiRedaction.ts`, máx. 280 caracteres.
- RLS por `organizationId` (mesma política dos demais models de tenant).
- Retenção: a mesma do AuditLog/decisão; apagar/anonimizar `note` no purge do titular (LGPD art. 18)
  e no purge da organização.
- Com o model, o 04 passa a gravar `note` e preencher `noteRef` = `RebalanceApproval.id`.

## Teste esperado
Duas requisições concorrentes com o mesmo recommendationId → 1 linha; tenant cruzado sem colisão.
Purge do titular remove/anonimiza `note`; leitura de outro tenant bloqueada pela RLS.
Obs.: decisões expiram em 30 dias (REBALANCE_DECISION_TTL_DAYS) e podem ser re-decididas — a unique
precisa acomodar isso (ex.: `@@unique([organizationId, recommendationId, decidedAt])` + índice, ou
marcar a anterior como expirada).
