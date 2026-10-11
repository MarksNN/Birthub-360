# Guia de Governança de Banco de Dados e Concorrência — Birthub 360

## 1. Contexto e Objetivos

Em arquiteturas SaaS Multi-Tenant corporativas com agentes de IA e alto volume de eventos
(chat, CRM, observabilidade, logs de execução), o banco de dados relacional (PostgreSQL)
é o ponto mais sensível para contenção de concorrência, latência e esgotamento do pool de conexões.

Este guia define as **4 Regras de Ouro de Banco de Dados** aplicadas no repositório BirthHub 360,
e documenta a ferramenta de auditoria contínua `scripts/db/audit-database-governance.ts`.

---

## 2. As 4 Regras de Ouro para PostgreSQL + Prisma

### Regra 1: Isolamento de Tenant Obrigatório no Índice Líder
Todo modelo que contenha `organizationId` deve possuir um índice em que `organizationId` seja a
**primeira coluna** (`@@index([organizationId, ...])`).
* **Por que:** Todas as queries em produção são filtradas por tenant (`WHERE organizationId = ?`).
  Se `organizationId` não for a coluna líder do índice, o PostgreSQL não pode utilizar o B-Tree
  eficientemente, forçando *Bitmap Index Scan* ou *Sequential Scan* da tabela inteira.

### Regra 2: Índices Compostos Temporais em Tabelas de Alto Volume
Tabelas com alta taxa de inserção e consultas ordenadas por tempo (`Lead`, `Activity`,
`AssistantMessage`, `AuditLog`, `Note`) devem utilizar índice composto `@@index([organizationId, createdAt])`.
* **Por que:** Evita a etapa cara de ordenação em memória (`Sort` / `Top-N heapsort`) após o filtro
  de tenant, permitindo paginação rápida por cursor (`take` / `skip` / `cursor`).

### Regra 3: Índices em Foreign Keys para Prevenção de Locks
Toda chave estrangeira (`@relation(fields: [xxxId], references: [id])`) deve estar coberta por um índice
dedicado ou composto onde apareça nas primeiras posições.
* **Por que:** No PostgreSQL, operações de `DELETE` ou `UPDATE` de chaves primárias na tabela referenciada
  verificam a tabela dependente. Se a foreign key não tiver índice, o PostgreSQL pode adquirir um lock de
  compartilhamento de linha ou até lock exclusivo na tabela inteira, bloqueando inserts simultâneos.

### Regra 4: Defesa contra Starvation de Pool em Transações Interativas
Ao utilizar transações interativas `prisma.$transaction(async (tx) => { ... })`:
* É **obrigatório** declarar opções explícitas de timeout:
  ```typescript
  await prisma.$transaction(async (tx) => {
    // operações de escrita atômica
  }, {
    maxWait: 5000, // tempo máximo de espera por uma conexão do pool (5s)
    timeout: 10000, // tempo máximo de execução da transação (10s)
  });
  ```
* **Anti-Pattern Proibido:** NUNCA execute chamadas de rede externas (APIs de IA, webhooks Bitrix/Slack,
  requisições HTTP lentas) dentro do callback de `$transaction`. Obtenha as respostas antes e use
  a transação estritamente para as mutações de banco de dados.

---

## 3. Ferramenta de Auditoria Automatizada

O script `scripts/db/audit-database-governance.ts` foi adicionado para auditar de forma autônoma:
1. `prisma/schema.prisma`: Análise de modelos, `organizationId`, índices e chaves estrangeiras.
2. `src/**`: Varredura estática de `$transaction(async` para alertar transações sem `timeout` / `maxWait`.

### Execução Manual:
```bash
npx tsx scripts/db/audit-database-governance.ts
```

### Testes Automatizados:
```bash
npx vitest run tests/unit/db/databaseGovernance.test.ts
```
