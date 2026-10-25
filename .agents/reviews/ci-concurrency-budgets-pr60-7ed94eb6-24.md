# Parecer Agente 24 — PR #60 `fix(ci): prevent cancellation of budget workflows on main branch`

- **Veredito:** **REPROVADO** @ `7ed94eb6ddaa4af9b7b484bf926331b579ea4311`
- **Missão:** Jules — Missão 10 (Workflows GitHub Actions e Governança CI)
- **Autor:** Jules (`google-labs-jules[bot]`, co-autor MarksNN); PR aberto pela conta MarksNN
- **Dono dos arquivos:** Agente 08/GHA (workflows)
- **Auditor:** Agente 24 — Revisão Independente
- **Data:** 2026-10-25 (UTC-3, Brasília)
- **Base declarada do PR:** `jules/ci-10-workflow-governance-20261024` @ `03fa29a6fb6b1ccf8668bb5b13a9a41e673bba9a` (**não é `main`**)
- **main no momento da auditoria:** `02d1a46e75571655854e58d4b1ceced9a7e53ced` (base do PR está 1 commit atrás, só `src/lib/ai/gateway/dynamic-routing.ts`)
- **Head auditado:** `7ed94eb6ddaa4af9b7b484bf926331b579ea4311` (1 commit). Qualquer novo commit invalida este parecer.

## Escopo (diff real)
| Arquivo | +/- |
|---|---|
| `.github/workflows/endpoint-latency-budget.yml` | `cancel-in-progress: true` → `${{ github.event_name == 'pull_request' }}` |
| `.github/workflows/frontend-bundle-budget.yml` | idem |
| `.github/workflows/public-assets-budget.yml` | idem + `group` passa de `github.ref` para `github.event.pull_request.number \|\| github.ref` |
| `.agents/reviews/jules-onda-10-workflows.md` | novo, 42 linhas (relatório do autor) |

Nada além do declarado no diff (escopo OK, salvo o arquivo em `.agents/reviews/`, ver P2-2).

## Critérios
1. Coerência com a regra canônica de `ci.yml` (main): PR cancela o run anterior da mesma PR; push em main enfileira **por SHA** sem cancelar (`group` inclui `github.sha`, `cancel-in-progress` falso fora de PR).
2. Expressões, triggers (push/pull_request/schedule/workflow_dispatch), colisão de grupos, sintaxe.
3. Arquivo em `.agents/reviews/` vs AGENTS.md §40 e tabela de propriedade.
4. CI no head.
5. Escopo.

## Comandos executados
```
gh pr view 60 --json headRefOid,baseRefName,files,commits,statusCheckRollup,...
gh pr diff 60
gh api repos/MarksNN/Birthub-360/compare/main...7ed94eb6   # diverged, ahead 1 / behind 1, merge-base 03fa29a6
gh api repos/.../compare/main...jules/ci-10-workflow-governance-20261024   # behind 1
gh api repos/.../contents/.github/workflows/*?ref=7ed94eb6   # todos os 20 workflows baixados
actionlint 1.7.7 (-shellcheck= -pyflakes=) nos 3 workflows   # exit 0
grep concurrency em todos os workflows                       # colisões
gh run list --commit 7ed94eb6 ; gh api commits/7ed94eb6/check-runs
```
Sem `npm ci` (limite do box); análise estática + CI.

## Evidências
- `ci.yml` (main): `group: ${{ github.event_name == 'pull_request' && format('central-birthhub360-release-pr-{0}', github.event.pull_request.number) || format('central-birthhub360-release-push-{0}', github.sha) }}` + `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- Os 3 workflows no head: `group: <wf>-${{ github.event.pull_request.number || github.ref }}` (**sem SHA**) + `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- Triggers: endpoint-latency = `pull_request`(main, paths) + `schedule` (06:00 UTC) + `workflow_dispatch`; frontend-bundle e public-assets = `push`(main, paths) + `pull_request`(main, paths) + `workflow_dispatch`.
- Colisões: outros grupos são `pages`, `cd-homolog`, `docker-publish`, `production-publish`, `central-birthhub360-release-*`. Prefixos distintos — **sem colisão**.
- actionlint 1.7.7: exit 0 nos 3 arquivos (sintaxe e expressões válidas).
- CI no head: apenas **SonarQube Analysis** (run 40199233188, `in_progress` na auditoria). Nenhum gate do Release (`ci.yml`) nem os próprios budget workflows rodaram, porque todos filtram `pull_request: branches: [main]` e este PR mira `jules/ci-10-...`.

## Achados

### P1-1 — PR não mira `main`; zero evidência de CI
A base é `jules/ci-10-workflow-governance-20261024` (03fa29a6), não `main`. Mergear o PR não altera `main`, e nenhum workflow com filtro `branches: [main]` rodou: nem o gate de aplicação (`build`), nem os 3 budget workflows alterados (que se autodisparariam pelo path `.github/workflows/<arquivo>.yml`). O único check é SonarQube. Ausência de evidência ≠ aprovação.

### P1-2 — Correção incompleta: o grupo não inclui SHA, então runs de main ainda são cancelados
Com `group` = `<wf>-refs/heads/main` e `cancel-in-progress: false`, o GitHub mantém só **1 run em execução + 1 pendente** por grupo; quando chega um terceiro, o **pendente é cancelado**. Com ≥3 merges próximos em main (exatamente o cenário citado pelo autor), o run do merge do meio ainda é cancelado e fica sem status. É precisamente por isso que `ci.yml` usa `github.sha` no grupo de push. A afirmação do PR ("exatamente a mesma condição… semânticas idênticas") é falsa: só o `cancel-in-progress` foi copiado, o `group` não.
Vale para `push` (frontend-bundle, public-assets) e também para `schedule`/`workflow_dispatch` em main (endpoint-latency), que dividem o mesmo grupo `refs/heads/main`.

**Correção esperada** (por workflow, trocando o prefixo):
```yaml
concurrency:
  group: ${{ github.event_name == 'pull_request' && format('frontend-bundle-budget-pr-{0}', github.event.pull_request.number) || format('frontend-bundle-budget-{0}-{1}', github.event_name, github.sha) }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

### P2-1 — Arquivo do autor dentro da pasta de pareceres
`.agents/reviews/jules-onda-10-workflows.md` é o relatório de entrega do autor (problema, justificativa, testes, "Riscos residuais: Baixos. Comportamento restabelecido perfeitamente…"). Ele não se declara APROVADO e até cita a revisão do 24, mas:
- AGENTS.md (tabela de propriedade): `.agents/reviews/** → Agente 24 ou 00`. Jules não tem propriedade ali.
- AGENTS.md §40: arquivos em `.agents/reviews/` são pareceres (auditor, decisão). Um auto-relatório ali pode ser lido como parecer independente, ou seja, autoaprovação. O autor nunca aprova a própria entrega.
- A convenção correta é handoff: `.agents/handoffs/onda-<n>/<de>-para-<para>-<slug>.md` (AGENTS.md §18).
**Condição:** remover o arquivo do PR (o conteúdo já está no corpo do PR) ou movê-lo para `.agents/handoffs/onda-10/jules-para-24-ci-concurrency-budgets.md` no formato do §18.

### P3-1 — SHAs inconsistentes
O corpo do PR diz "SHA dos commits propostos: `0afa763c…`", o arquivo diz "`0583c87a…`", e o head real é `7ed94eb6…`. A rastreabilidade quebra. É preciso corrigir para o SHA real (ou omitir) depois do novo commit.

### P3-2 — Testes declarados sem artefato
O autor diz ter rodado `check-public-budget.mjs`, build Vite e actionlint, mas não juntou log ou run de CI. Só o actionlint foi reproduzido aqui (exit 0). Os scripts não foram alterados, então o impacto é baixo; a evidência precisa vir do CI depois do retarget.

### P4-1 — Mudança do grupo do public-assets é benigna
Antes era `github.ref` (`refs/pull/N/merge` em PR); agora é `pull_request.number || github.ref`. Para PR o resultado é equivalente, e a mudança só padroniza. OK.

## Pontos positivos
- A direção está correta: `cancel-in-progress` condicionado a `pull_request` elimina o cancelamento *em execução* em main.
- A sintaxe é válida (actionlint 0) e não há colisão com outros grupos. Triggers, permissões, jobs e waivers continuam intactos.

## Condições para reavaliação (novo head)
1. Retarget do PR para `main` (ou rebase de `jules/ci-10-…` em `main` 02d1a46e e PR contra `main`).
2. Corrigir o `group` dos 3 workflows para incluir `github.sha` fora de PR (P1-2), espelhando `ci.yml`.
3. Remover `.agents/reviews/jules-onda-10-workflows.md` ou movê-lo para `.agents/handoffs/onda-10/` (P2-1).
4. Corrigir os SHAs no corpo do PR e no handoff (P3-1).
5. Rodar no head novo: gate Release (`build`) verde e os runs de `frontend-bundle-budget` e `public-assets-budget` disparados por `pull_request` (path do próprio workflow) verdes. `endpoint-latency-budget` verde ou dispensado com justificativa.
6. Ciência do Agente 08 (dono dos workflows).

Sem merge até um novo parecer APROVADO para o SHA exato.
