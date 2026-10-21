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
- Hoje o AuditLog guarda só `noteLength`, `noteHash` (HMAC-SHA256 do texto redigido, chave `PII_BLIND_INDEX_KEY`, domínio `rebalance-approval-note:v1`) e `noteRef: null`;
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

## Expurgo das notas legadas em texto claro no AuditLog (parecer 24 @041d134c P3-1, adicionado 2026-10-20)
Antes do #23, o POST do #15 gravava `note` (até 1000 chars, **sem redação**) em texto claro em
`AuditLog.details` (JSON string) das linhas `action = 'REBALANCE_DECISION'`, `entity = 'RebalanceApproval'`
(ver `REBALANCE_APPROVAL_*` em `src/shared/contracts/predictiveRevenueOraclePorts.contract.ts`).
O #23 já impede a reexposição (o `parseApprovalRecord` monta o registro por allowlist e descarta `note`),
mas o texto continua no banco.

- **Dono da execução:** Agente 01, como migration de dados ou script idempotente versionado, **só com aprovação
  do Agente 21** (ver `04-para-21-rebalance-note-legada.md`). O 04 não executou nenhuma limpeza em banco.
- **Escopo:** `WHERE action = 'REBALANCE_DECISION' AND entity = 'RebalanceApproval' AND details::jsonb ? 'note'`
  (todas as orgs). Contar antes/depois por `tenantId` e registrar só as contagens.
- **Transformação sugerida:** substituir `note` por `noteLength` (tamanho do texto redigido),
  `noteHash` (HMAC conforme acima, ou `null` se o 21 preferir não derivar nada do legado) e `noteRef: null`,
  removendo a chave `note`. Exemplo (conferir antes; não executado):
  `UPDATE "AuditLog" SET details = ((details::jsonb - 'note') || jsonb_build_object('noteLength', NULL, 'noteHash', NULL, 'noteRef', NULL))::text WHERE ...;`
- **Atenção:** se o AuditLog tiver trigger/política de imutabilidade, a migration precisa da exceção registrada pelo 21.
- **Teste esperado:** depois do expurgo, nenhuma linha do escopo contém a chave `note`; as demais chaves ficam iguais.
