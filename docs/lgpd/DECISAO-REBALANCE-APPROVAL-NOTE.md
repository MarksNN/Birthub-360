# Decisão Arquitetural e Diretriz LGPD — Campo note em RebalanceApproval

- **Agente Responsável:** 21 — Privacidade e LGPD
- **Data:** 22 de outubro de 2026
- **Status:** APROVADO
- **Referência:** PR #37 (Agente 01/01A) e PR #23/#33 (Agente 04/21)
- **Assinatura Digital:** `AGENTE-21-PRIVACIDADE-LGPD:DECISAO-REBALANCE-NOTE-HASH-APPROVED`

---

## 1. Contexto e Avaliação de Risco à Privacidade (LGPD Arts. 6º e 16)
O endpoint de aprovação de rebalanceamento preditivo de carteiras comerciais (`POST /api/commercial-intelligence/predictive/rebalance/approvals`) recebe justificativas textuais de gestores comerciais.

A análise técnica constatou que justificativas de gestores comerciais frequentemente contêm dados pessoais de titulares (nomes de contatos, telefones celulares e dados comportamentais não minimizados). O armazenamento perpétuo de texto livre (`VARCHAR(1000)` ou similar) viola o princípio da **minimização de dados** (Art. 6º, III, LGPD) e dificulta a resposta eficaz a solicitações de exclusão e anonimização de titulares (Art. 16, LGPD).

---

## 2. Decisão Arquitetural Aprovada

Fica determinado que a tabela `RebalanceApproval` no schema relacional PostgreSQL:
1. **NÃO armazenará texto livre de notas:** Fica expressamente vedada a persistência da coluna de texto `note`.
2. **Armazenamento de Metadados Criptográficos:**
   - `noteLength INT`: Tamanho em caracteres da nota (restrito a `0..280` via constraint `CHECK` no PostgreSQL).
   - `noteHash CHAR(64)`: Hash HMAC-SHA256 determinístico calculado sobre o salt de organização e o texto normalizado (`${organizationId}\u0000${notaRedigida}`).
   - `noteRef VARCHAR`: Campo de referência reservado, mantido como `NULL`.
3. **Anonimização e Expurgo:**
   - Em caso de solicitação de expurgo ou anonimização de titular (`rebalance_approval_purge` / `rebalance_approval_anonymize_lead_notes`), os campos `noteLength` e `noteHash` são imediatamente zerados (`NULL`).
4. **Isolamento de Tenant:**
   - A tabela deve aplicar obrigatoriamente `FORCE ROW LEVEL SECURITY` com a política `tenant_isolation` amarrada a `current_setting('app.current_tenant_id', true) = organizationId`.

---

## 3. Diretriz para o Agente 01 / 01A no PR #37
O modelo Prisma canônico aprovado é:

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
  noteLength       Int?         // 0..280 (CHECK no banco)
  noteHash         String?      @db.Char(64) // HMAC-SHA256 hex
  noteRef          String?      // reservado (sempre null)
  decidedBy        String
  decidedAt        DateTime     @default(now()) @db.Timestamptz(3)
  appliedToCrm     Boolean      @default(false)
  updatedAt        DateTime?    @updatedAt @db.Timestamptz(3)

  @@unique([organizationId, recommendationId])
  @@index([organizationId, leadId])
}
```

---

## 4. Conclusão e Parecer
A diretriz foi homologada pelo Agente 21, satisfazendo integralmente os requisitos de minimização, segurança e rastreabilidade da LGPD.

**Status:** APROVADO
