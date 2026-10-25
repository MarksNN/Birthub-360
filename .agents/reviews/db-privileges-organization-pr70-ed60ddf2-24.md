# Parecer 24: PR #70 (Organization sem DELETE/TRUNCATE após re-bootstrap) @ ed60ddf2

- **PR:** #70, do Agente 01. Branch `agente/01-org-delete-privileges-regrant` → `main`.
- **Head auditado:** `ed60ddf2de5fca0cefd9b0eef12b16ceb3e13854`, confirmado com `gh pr view 70`. É o merge da main `58f1895b` em `7ff1904f`; os pais são `7ff1904f` e `58f1895b`.
- **Parecer anterior:** BLOQUEADO @ `7ff1904f` (commit `ee079ae3`). O único item aberto era o P2-2: a evidência de Re-bootstrap e dos testes não existia.
- **Data:** 25/10/2026, depois das 17:33 BRT. A main atual é `aabf735a`.
- **Método:** git (patch-id, remerge-diff, merge-tree) e logs do CI via API. Não rodei nada local: sem npm ci e sem banco.

## Veredito: **APROVADO @ ed60ddf2**, condicionado à CI do merge rechecar sobre a main do momento

## 1. Identidade do conteúdo
- `git diff 58f1895b ed60ddf2` gera o patch-id `09b285ec…`, igual ao de `git diff 4e9b9f97 7ff1904f` (o diff auditado em `ee079ae3`). O conteúdo é byte a byte o mesmo.
- `git show --remerge-diff ed60ddf2` sai vazio: o merge não teve resolução manual.
- `git diff --quiet 58f1895b ed60ddf2 -- prisma` passa: o PR não toca schema nem migrations.
- **Diff efetivo:** 5 arquivos (+254/−5):
  - `ci.yml` (+13)
  - `docs/deploy/db-owner-role-separation.md`
  - `scripts/db/create-app-role.sql`
  - `tests/integration/db-restricted-table-privileges.test.ts`
  - `tests/unit/db/restricted-table-privileges.test.ts`

## 2. Diag `agente/gha-diag-pr70-ed60ddf2` @ `34ba0537`
- O pai único é `ed60ddf2`, e o diff é só `.github/workflows/ci.yml` (+15/−1).
- **Comparação com o patch v4e:** o ci.yml da base `58f1895b` tem o blob `58c0febd`, o mesmo de `0fbb425f`. Comparei as linhas alteradas de `58f1895b → 8397884a` (v4e) com as de `ed60ddf2 → 34ba0537`: a única diferença é `if: ${{ !cancelled() }}` no step "Re-bootstrap pós-migrate".
- **Diff do diag contra o v4e:** `git diff 8397884a 34ba0537:.github/workflows/ci.yml` tem as mesmas linhas de `/workspace/diag70-ci-vs-v4e.diff`. São elas:
  - o step Re-bootstrap e a linha `BOOTSTRAP_SUPERUSER_URL`, as duas já presentes no ci.yml do próprio #70;
  - o `if: !cancelled()`, que é o único acréscimo da diag.

## 3. Run `40224675523`, job `121263540128`
- O veículo foi o PR #94. No log: `HEAD is now at 733c03f Merge 34ba0537… into 58f1895b…`.
- **Re-bootstrap pós-migrate: success.** O script rodou de novo depois do `migrate deploy`, com saída REVOKE/GRANT/ALTER sem erro.
- **Integração:** `✓ tests/integration/db-restricted-table-privileges.test.ts (3 tests)`, ou seja, 3/3. O total foi `1 failed | 728 passed`, e a única falha é `swarm-autonomous-mission-e2e.test.ts`, a mesma herdada da C3. Os 3 testes a mais em relação à C3 são os do #70.
- **Unit:** `✓ tests/unit/db/restricted-table-privileges.test.ts (3 tests)`. O total foi `4 failed | 5113 passed`, só com falhas herdadas: AgentExecutor (não carrega), gateway ×3 e Sidebar. A Sidebar foi corrigida depois pelo #86.
- **Contra a C3 (job `121247882280`), nada é novo:**
  - Type Check: 99 erros, lista idêntica à da C3.
  - Architecture verde: depcruise sem violações, coverage 1867/1815 e hotspots 0.
  - OpenAPI drift falhou, como na C3, porque a main `58f1895b` ainda não tinha o #83.
  - DATA-007: `exit code 2`, com saída idêntica à da C3. É anterior ao #88.
  - Build e smoke: ok.
  - E2E: `33 failed`, com os mesmos 33 nomes da C3 (`diff` vazio).

## 4. Main avançou para `aabf735a`
- `git merge-tree --write-tree aabf735a ed60ddf2` sai limpo (rc=0) e gera o tree `e451c164`. O delta em relação à main são exatamente os 5 arquivos do #70.
- **Sobreposição:** nenhuma. A interseção entre os arquivos do #70 e os de `58f1895b..aabf735a` é vazia. Em `58f1895b..aabf735a` entraram:
  - `prisma/schema.prisma` (#88: `RebalanceApproval.updatedAt` não-nulo e índice `[organizationId, decidedAt]`, sem migration);
  - `docs/openapi.yaml` (#83);
  - `Sidebar.test.tsx` (#86);
  - handoffs (#91, #88).
  - **Nenhum desses commits mexe no ci.yml nem em migrations.**
- **Migrations:** o #70 não adiciona nenhuma, então não há conflito de ordem ou timestamp. A última migration da main continua `20261021010000_langgraph_checkpoint_tables`.
- **Semântica:** o #88 não gera DDL, então o banco migrado é o mesmo. O `create-app-role.sql` do #70 só cita a tabela `Organization` e não depende de `RebalanceApproval`. Também não há interação com o OpenAPI, a Sidebar ou os docs.
- Com isso, a evidência da diag sobre `58f1895b` continua válida para o merge com `aabf735a`. Não precisa de nova diag.

## 5. Achados
- Nenhum bloqueante. O P2-2 está resolvido pela diag.
- P4, que vem do parecer anterior e não bloqueia: anexar o aceite do 08 sobre o ci.yml em `.agents/handoffs/`.

## 6. Condições
1. Commit novo no PR invalida este parecer.
2. A CI do merge real sobre a main do momento tem que rechecar. No ci.yml real ela para no Type Check herdado; se isso acontecer, vale a evidência da diag, desde que o merge-tree continue sem sobreposição.
3. O step Re-bootstrap entra no ci.yml real sem `!cancelled()`, já que o `if` foi só da diag. Isso é aceitável enquanto o Type Check não for verde. Quando a main tiver tsc limpo, ele vai rodar normalmente.
