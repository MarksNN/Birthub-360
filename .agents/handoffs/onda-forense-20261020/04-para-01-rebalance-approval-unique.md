De:04
Para:01
Onda:forense20261020
Status: resolvido (Implementado no Prisma via PR #37 / Onda 0 - @@unique([organizationId, recommendationId]) no model RebalanceApproval; parecer APROVADO do Agente 24)
Prioridade: medio
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
  note             String?
  decidedBy        String
  decidedAt        DateTime     @default(now())

  @@unique([organizationId, recommendationId])
  @@index([organizationId, leadId])
}
```

Com o model, o 04 troca só a implementação de `RebalanceApprovalStore` (tratando P2002 como
replay/409); a rota e o contrato para o 02 não mudam. O AuditLog continua como trilha.

## Teste esperado
Duas requisições concorrentes com o mesmo recommendationId → 1 linha; tenant cruzado sem colisão.
