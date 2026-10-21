# Parecer Agente 24 — PR #23 (Agente 04) — reauditoria rebalance/recommendations + what-if V2

- **Veredito: APROVADO CONDICIONADO** (teto, porque o #25 ainda não entrou)
- **Missão:** REMED rebalance de carteira + what-if V2 (commercial-intelligence/predictive), Agente 04 (CRM e BI)
- **Autor:** Agente 04 — PR https://github.com/MarksNN/Birthub-360/pull/23
- **SHA auditado:** `041d134c09dbbbc60d551ccc8d5b5b586a8fcdb5` (tip confirmado via `gh pr view`; não-draft, MERGEABLE)
- **Base:** merge-base = `8dff1dde` = main atual (#30). 22 arquivos, +1669/−48.
- **Parecer anterior:** REPROVADO @ `22247ac5` (commit 551518e). Qualquer commit novo invalida este parecer.
- **Método:** análise estática + CI (sem `npm ci` local: box com pouca memória). Data 2026-10-20 (America/Sao_Paulo).

## Critérios
Tenancy e RBAC das rotas; robustez da comparação de hash; cobertura da redação (CPF/e-mail/telefone/CNPJ); CI com exatamente as 4 falhas herdadas e nenhum skip indevido; ausência de ciclo novo; fechamento de cada achado do parecer anterior.

## Comandos
`gh pr view 23 --json headRefOid,isDraft,mergeable,files,statusCheckRollup`; `gh run view 39527077645 --json jobs` (steps do application gate); `gh api actions/jobs/<id>/logs` + grep de FAIL/×/Test Files; clone blob-less + `git merge-base HEAD origin/main`; `git diff origin/main...HEAD`; leitura de `piiRedaction.ts`, `rebalanceApproval.service.ts`, `rebalanceRecommendation.service.ts`, `Prisma*` infra, `predictive.routes.ts`, `commercialIntelligence.routes.ts`, `predictiveRevenueOraclePorts.contract.ts`; teste ad hoc em node da `redactPiiIncludingCnpj` (cópia da função, sem instalar nada).

## Evidências — CI (Central Birth Hub 360, run 39527077645, SHA 041d134c)
- Verdes: audit, Prisma generate, lint, Prettier, working tree limpa, typecheck, **Architecture tests (0 violações)**, OpenAPI drift, **unit 631/631 files**, AI resilience, migrations, schema drift.
- **Integração: 2 files falhos / 92 ok (94), exatamente 4 testes:** `seed-multi-cargo` ("semeia os 12 cargos e os 12 agentes...") e 3 de `capability-engine` › reconciliação 379+12=391 (sobreposição de code, total 391, todo agente com grant). Todos herdados do main (agentes account-detective/promise-guardian/devils-advocate sem cargo), corrigidos pelo #25. Nenhum toca arquivo do diff.
- Skipped: Run Build, Smoke, Playwright, E2E (dependem da integração) e **Golden Dataset live regression** — este pula por `if: GROQ_API_KEY != '' || OPENAI_API_KEY != ''` (secret ausente, igual à main), não pela integração. Aceito como herdado, mas build/smoke/E2E **não foram executados** neste SHA.
- Demais checks (CodeQL, Trivy, Sonar, Dependency Review, Visual, bundle budget, secret scan) verdes; `build` vermelho só como agregador.

## Verificação dos achados anteriores
| Achado @22247ac5 | Status @041d134c | Evidência |
|---|---|---|
| P2-1 ciclos no-circular novos | **Resolvido** | Portas/constantes em `shared/contracts/predictiveRevenueOraclePorts.contract.ts` (só importa tipo do contrato). Infra importa contrato; `PrismaRebalanceApprovalStore` importa `parseApprovalRecord` de outra infra (sem ciclo). CI Architecture: 0 violações. Sem ciclo novo. |
| P3-1 fromOwner/recommendationId não validados | **Resolvido** | POST recalcula `rb_`+sha256(`org|lead|from|to`)[0:32] → 422 `RECOMMENDATION_MISMATCH`; `findLead` (org + funil Negócio) → 404; `lead.owner !== fromOwner` → 409 `STALE_OWNER`; `toOwner` precisa ser User do tenant → 422 `INVALID_OWNER`. Testes unit de 422/409. |
| P3-2 decisão grudada para sempre | **Resolvido** | `isDecisionActive` (TTL `REBALANCE_DECISION_TTL_DAYS`=30) aplicado na listagem e no POST (registro expirado não bloqueia nova decisão); listagem também exige `found.fromOwner === owner atual`. Teste de 31 dias na listagem. |
| P3-3 drift não cobre factories | Fora do escopo do PR | Continua com GHA/08 (#26). |
| P4-1 JSON.parse sem try | **Resolvido** | `parseApprovalRecord` com try/catch + validação mínima; registro corrompido é ignorado com `logger.warn`. Teste dedicado. |

## Verificações pedidas
- **Tenancy:** OK. `organizationId` só de `req.user` (`tenantOf` → 403). Todas as queries filtram por org/tenantId (Lead, User, AuditLog); o hash inclui organizationId, então id de outro tenant dá 422.
- **RBAC:** OK. `/predictive` herda `router.use(requireRole(COMMERCIAL_INTELLIGENCE_ROLES))` = ADMIN/GESTOR, incluindo as 2 rotas novas (GET recommendations, POST what-if).
- **Hash:** robusto para o fim (anti-forja/obsolescência, não segredo). Recalculado no servidor a partir dos campos do corpo; comparação exata de string (timing-safe dispensável: o id é derivável e não é credencial). 128 bits; separador `|` não aparece em cuid/uuid; `fromOwner` null → '' sem colisão porque o schema exige min(1). Ordem: valida hash antes de consultar o banco.
- **Redação:** CPF (com/sem máscara), e-mail, telefone fixo/celular com DDD e CNPJ redigidos (testes ad hoc). Brechas menores: `+55 (11) ...` deixa `+`; `11 9 8765 4321` deixa `11 9`. Celular de 11 dígitos sem máscara sai como `[CPF REDIGIDO]` (redigido, rótulo errado). Impacto baixo: o texto redigido é descartado; o AuditLog só guarda `noteLength`, `noteHash` (sha256 do redigido) e `noteRef: null`. O limite de 280 vale no schema Zod.
- **Ciclos:** nenhum novo (CI 0 violações; o service importa outro service e o contrato, a infra importa contrato/infra).

## Achados novos
- **P3-1 (LGPD) notas legadas em texto claro são reexpostas.** No main (#15) o POST gravava `note` (até 1000 chars) em texto puro no `AuditLog.details`. `parseApprovalRecord` faz `return v as RebalanceApprovalRecord` sem filtrar campos, então um registro legado dentro do TTL devolve `note` no GET (`decision`) e no replay do POST (`approval: existing`). Correção: montar o objeto com whitelist (descartar `note`) e registrar no handoff 04→21/01 o expurgo/redação das linhas legadas do AuditLog.
- **P4-1** o TTL no POST não tem teste próprio (o teste de 31 dias cobre só a listagem).
- **P4-2** `noteHash` é sha256 sem chave de texto curto; após a redação, risco residual baixo. Considere HMAC quando houver `noteRef`.
- **P4-3** lacunas de regex de telefone listadas acima. Sem impacto de persistência hoje.
- **Conhecido/declarado:** sem UNIQUE no banco para (tenant, recommendationId), então há corrida de dupla gravação (handoff 04→01).

## Condições do APROVADO CONDICIONADO
1. Merge **só depois do #25** em main e com sync do #23 depois disso.
2. Application gate **100% verde** após o sync, sem as 4 falhas e com Build/Smoke/E2E executados e verdes.
3. **Reconferência do Agente 24 no SHA final** (qualquer commit novo, inclusive o do sync, invalida este parecer).
4. Corrigir P3-1 (whitelist em `parseApprovalRecord`) antes do merge, ou o Marks registra o aceite explícito do risco com o handoff de expurgo do legado.
5. Merge manual com squash, por Marks/08. Sem comentários públicos.
