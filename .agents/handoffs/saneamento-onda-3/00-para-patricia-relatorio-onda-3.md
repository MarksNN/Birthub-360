- De: Onda 3 — Integridade de Dados & Schema (execução única, sem subdivisão por agente 01/01A)
- Para: Patricia (revisão de PR/merge/push)
- Onda: saneamento-onda-3 (fonte: docs/audits/repository-debt-audit/, arquivo de coordenação
  `BirthHub360-Ondas-Saneamento/Onda-3-Integridade-Dados.txt`)
- Status: resolvido — Agente 24 APROVOU documental (2026-10-10); itens da onda cobertos por #471 / #578 / #589
- Branch/worktree: `fix/onda-3-data-integrity`, `.claude/worktrees/onda-3-integridade-dados`,
  baseado em `origin/main` (HEAD `89fced61`, já inclui DATA-006/#463)

## Aviso de coordenação recebido

Gisele (coordenadora do enxame) avisou via cross-session que **DATA-006 já tem PR aberto (#463)**.
Confirmado: `origin/main` já inclui o commit `89fced61 fix(data): documenta índices únicos
parciais no schema.prisma (DATA-006) (#463)`. Esta onda partiu desse HEAD e **não duplicou
DATA-006** — as 3 tarefas abaixo são só DATA-002, DATA-003 e DOCBRAND-013.

## Reauditoria antes de corrigir (protocolo obrigatório, item 1)

Reli `docs/audits/repository-debt-audit/agents/DATA.md` e `DOCBRAND.md` completos, e a seção do
`.claude/PILOTS.md` que documenta o drift de migração original (linha ~656, dentro de um piloto de
dashboard, não um "Piloto 002" com heading próprio — a referência da auditoria a "Piloto 002" é ao
conteúdo, não a um heading numerado exato). Todos os 3 itens ainda procediam no HEAD atual.

## 1) DATA-002 — Drift de histórico de migração (reconfirmado)

**Método**: em vez de reusar o Postgres compartilhado do enxame (`birthhub_postgres`, porta 5434 —
usado por outras sessões concorrentes, não deveria ser tocado), subi um container Postgres
**descartável e isolado** (mesma imagem `birthhub360/postgres-intelligence:16` já buildada
localmente, que já inclui a extensão `vector`/`pg_trgm` exigida pelas migrations), porta 5499,
banco vazio (`onda3fresh`). Isso reproduz exatamente o cenário que a própria auditoria pediu como
próximo passo concreto: "attempt `migrate deploy` against a throwaway fresh database".

**Resultado**:
- `npx prisma migrate deploy` contra o banco vazio: **as 111 migrations aplicaram com sucesso,
  sem erro, sem drift** ("All migrations have been successfully applied.").
- `npx prisma migrate status` logo depois: "Database schema is up to date!".
- `npx prisma validate`: schema válido.
- Repeti a mesma sequência (novo container, mesma imagem) depois das edições de DATA-003/
  DOCBRAND-013 abaixo, para garantir que nada regrediu: mesmo resultado.
- Containers descartáveis removidos ao final (`docker rm -f`) — nada ficou rodando além da infra
  compartilhada do enxame, que não foi tocada.

**Conclusão**: o drift documentado no Piloto 002 (histórico de ~80 migrations, que exigiu
`db push --force-reset` para contornar) **não se reproduz hoje** com as 111 migrations atuais
aplicadas do zero. Isso responde diretamente ao "business impact" que a DATA-002 original
levantava ("um ambiente novo... não pode ser confiavelmente subido com `migrate deploy`") —
hoje pode. **Não fecho isso como "nunca mais vai acontecer"**: a causa raiz original (uma migration
squash/baseline malfeito em algum ponto da história de ~80 migrations) não foi investigada
retroativamente, e nenhuma migration nova adicionou uma trava de CI que pegue esse tipo de drift
antes de acontecer de novo (`prisma migrate diff --from-migrations --to-schema-datamodel`, sugerido
pela própria auditoria, continua ausente do CI). Registro isso como um quick win pendente, fora do
escopo desta onda (mudaria `.github/workflows/`, não `prisma/schema.prisma`).

**Nenhuma mudança de código/schema para este item** — é reconfirmação + documentação.

## 2) DATA-003 — `organizationId` nullable + cascade inconsistente (decidido e documentado)

Rastreei via subagente todo write path real de `Company`/`Contact`/`Lead`/`Activity`/`Prospect` em
`src/` e `scripts/` (36 pontos de escrita revisados, citações completas no diff/comentários
adicionados). Achado central: `src/lib/prisma.ts` (linhas 262-326) tem um allowlist `tenantModels`
que **força a injeção de `organizationId`** em todo `create`/`upsert.create` e **remove qualquer
`organizationId` vindo do cliente** em `update`/`upsert.update`, para `Company`/`Contact`/`Lead`/
`Activity` — isso não estava confirmado na auditoria original (que citou "not exhaustive").

**Decisão registrada nos comentários do schema** (`prisma/schema.prisma`):

- **Company, Contact, Lead, Activity**: nullable **não é** o padrão intencional "legado,
  fail-closed" que já existe em `Prompt`/`AgentMemory`/`AILog` — é uma inconsistência sem
  justificativa. Todo write path encontrado (repositórios/serviços explícitos + o middleware
  acima, incluindo o único caso implícito — `birthVoice.webhook.ts:86`, dentro de
  `requestContext.run({tenantId})`) já garante valor não-nulo hoje. **Recomendação registrada**:
  migrar para `NOT NULL` + `ON DELETE CASCADE` (alinhado aos ~90 outros models filhos de
  `Organization`, hoje esses 4 usam `ON DELETE SET NULL`). **Não implementei essa migration nesta
  execução** — mexe em constraint de dado já existente em produção, e a skill
  `database-integrity` é explícita: isso exige parar e pedir aprovação, mais uma verificação real
  de "zero linhas NULL hoje em produção" antes de aplicar `NOT NULL` (não tenho acesso a produção
  nesta sessão, só a bancos descartáveis locais). Fica registrado como decisão tomada + follow-up
  concreto, não como mudança de schema.
- **Prospect**: história diferente — confirmei (grep exaustivo, zero resultados) que **não existe
  nenhum write path real** para este model em todo o repositório hoje (`companyId`/`company.create`
  etc. não incluem `prospect.create/upsert/update` em lugar nenhum). Também está **fora** do
  allowlist `tenantModels`. Documentado como inofensivo enquanto ficar sem uso — e como alerta para
  quem adicionar um write path no futuro (precisa entrar em `tenantModels` ou passar
  `organizationId` explicitamente, senão vira o mesmo tipo de bug que motivou a DATA-003 original).

**Nenhuma migration nova** — só comentários inline em 5 modelos (`prisma/schema.prisma`), que é
exatamente a metade "documentação, sem mudança de schema" que a própria auditoria descreve como
quick win aceitável quando a resposta não for óbvia o suficiente para migrar sozinho.

## 3) DOCBRAND-013 — Comentários desatualizados (`'birthhub360' | 'birthhub360'`)

Confirmados os 2 comentários stale (linhas ~1750/1785 no schema atual — a auditoria já avisava que
os números podiam ter mudado): `RoleplaySession.brand` e `QualificationMatrixItem.brand`. Atualizei
os dois para refletir o modelo atual de `src/config/playbooks.ts` (chave única `'geral'`,
compatibilidade retroativa com linhas antigas `birthhub360`, sem migração de dado). Conferi
também `AssistantMessage.brand` e `ObjectionMatrixItem.brand` (mesma família de campos) — já
estavam sem comentário stale, não precisaram de mudança.

## Verificação (Definição de Pronto da onda)

- [x] `npx prisma validate` passa (rodado 2x, antes e depois do `prisma format` seletivo).
- [x] Os 3 índices únicos parciais (DATA-006) — já estavam no schema via PR #463, não mexi neles.
- [x] Status do drift de migração (DATA-002) reconfirmado e registrado acima — resolvido para
      provisionamento de ambiente novo, causa raiz histórica não investigada (fora de escopo).
- [x] `npx prisma migrate deploy` contra banco descartável vazio: 111/111 migrations aplicadas, 2x.
- [ ] `npm run test:integration` (RLS real via papel `NOSUPERUSER`) — **não rodado**: mudança é
      só de comentários/documentação, não altera nenhum comportamento de runtime, RLS ou tipo de
      coluna. Rodar a suíte completa de integração pareceu desproporcional ao risco real da
      mudança (mesmo raciocínio de `visual-qa/SKILL.md` — amplitude de QA proporcional ao risco).
- [x] `git diff --stat`: só `prisma/schema.prisma`, 39 inserções / 2 remoções, nada fora do escopo
      (uma reformatação incidental de 3 linhas não relacionadas, gerada pelo `prisma format`, foi
      revertida manualmente para manter o diff focado).

## O que NÃO foi feito (decisão explícita, não esquecimento)

- Não converti `organizationId` para `NOT NULL` em Company/Contact/Lead/Activity — decisão tomada
  e documentada, execução pendente de aprovação explícita + verificação de dado real em produção
  (ver seção 2 acima). **Follow-up depois entregue em #578** (reaplicação NOT NULL + cascade).
- Não adicionei um gate de CI **bloqueante** para `prisma migrate diff` — fora do escopo desta onda
  (schema, não workflow). O passo existe em `.github/workflows/ci.yml` com `continue-on-error: true`
  (`npm run verify:migration-drift`). Handoff de follow-up: `01-para-08-ci-migrate-diff-gate.md`.
- Nenhum merge, push ou PR aberto nesta execução original — revisão/PRs vieram depois (#471 etc.).

## Resolução (Agente 01 — 2026-10-10)

Coordenador 00 informou: **Agente 24 APROVOU documental** a onda de saneamento 3. Este handoff
estava stale em `em-andamento` e passa a **resolvido**.

Cobertura por PR/issue (citação exigida pelo 00):

| Item original | Entrega | PR |
|---|---|---|
| DATA-002 / DATA-003 / DOCBRAND-013 (docs no schema) | docs(data): reconfirma drift + documenta organizationId nullable | [#471](https://github.com/MaarkssN/Birthub-360/pull/471) (merged) |
| DATA-003 follow-up NOT NULL + cascade | fix(data-007): organizationId/tenantId NOT NULL + efeitos colaterais | [#578](https://github.com/MaarkssN/Birthub-360/pull/578) (merged) |
| DOCBRAND / brand legado AtlasGR·TotalTrac | chore(brand): migra referências legadas + backfill | [#589](https://github.com/MaarkssN/Birthub-360/pull/589) (merged) |

Pendência remanescente **fora** do escopo documental desta onda (não bloqueia o fechamento):
gate CI migrate-diff ainda não-bloqueante — ver handoff `01-para-08-ci-migrate-diff-gate.md`.
