# Parecer 24: PR #68 (concurrency dos workflows de budget/latência)

- **PR:** #68, autor Agente GHA, branch `agente/gha-budget-concurrency`
- **Head auditado:** `19ac411cf1223a9df70d83a3bef2e091bf1f5926`
- **Base:** main @ `7871e6f01b3037f3ecb99453c5fc0525b8216e46` (ahead 1 / behind 0)
- **Substitui:** #60 (parecer `agente/24-review-pr60-7ed94eb6`, commit 6e9c61cd)
- **Data:** 25/10/2026 ~11:36 BRT
- **Método:** análise estática, actionlint 1.7.7 e check-runs do head.

## Veredito: **APROVADO**

Vale só para o SHA `19ac411c`. Qualquer commit novo invalida.

## 1. Escopo
- São 3 arquivos: `endpoint-latency`, `frontend-bundle` e `public-assets`.
- Em cada um, só o bloco `concurrency` mudou (6 linhas de diff).
- Nenhum arquivo do Jules e nenhum outro workflow foi tocado.

## 2. Grupos e triggers
- **Grupo:** `${{ github.event_name == 'pull_request' && format('<wf>-pr-{0}', github.event.pull_request.number) || format('<wf>-{0}-{1}', github.event_name, github.sha) }}`
- **Cancelamento:** `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`
- **Triggers cobertos:**
  - endpoint-latency: pull_request (main, paths), schedule `0 6 * * *`, workflow_dispatch.
  - frontend-bundle: push main, pull_request, workflow_dispatch.
  - public-assets: push main, pull_request, workflow_dispatch.
- **Push e schedule no mesmo SHA** caem em grupos distintos, porque o `event_name` faz parte da chave. Isso corrige o problema do #60.
- **PR:** cancela só runs do mesmo PR.
- **push/schedule/dispatch:** não cancelam runs em andamento.
- **Colisões:** nenhuma com os outros grupos do repo (`cd-homolog`, `pages`, `docker-publish`, `central-birthhub360-release-*`). Cada grupo carrega o prefixo do próprio workflow.
- **actionlint:** exit 0 nos 3 arquivos e em todos os 21 workflows do head.

## 3. CI no head (11:34 BRT)
| Check | Estado | Natureza |
|---|---|---|
| Frontend bundle budget | success | **alvo do PR** |
| budget (public-assets) | success | **alvo do PR** |
| Critical endpoint latency (k6) | success | **alvo do PR** |
| Visual Regression, CodeQL (js/python), secret scan, dependency review | success | n/a |
| trivy scan, Trivy — gate de PR, build | failure | herdado (os mesmos 3 alertas HIGH da main; corrigidos pelo #67) |
| application gate | skipped | herdado (depende do trivy). O PR não toca no ci.yml |
| SonarQube | in_progress | não relacionado |

## 4. Observações (P3, não bloqueiam)
- Dois `workflow_dispatch` no mesmo SHA compartilham o grupo: um terceiro disparo cancela o pendente. Aceitável.
- O corpo do PR afirma "08 aprovou a abordagem", mas isso não foi verificado por registro no repo. Recomendo que o 08 confirme, já que `.github/workflows/**` é dele.

## 5. #60
Pode ser fechado como **superseded** pelo #68, depois que o #68 for mergeado.
