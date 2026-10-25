# Parecer Agente 24 — PR #79 (exceção temporária de hotspot: IntelligenceHub / SwarmDashboard)

- **Missão:** registrar exceção temporária em `docs/architecture/HOTSPOT_EXCEPTIONS.md` para os dois arquivos que cruzaram 1000 linhas no `main` e derrubam `check:hotspots`.
- **Autor:** Agente GHA (branch `agente/gha-hotspot-exception`)
- **Auditor:** Agente 24 — Revisão Independente
- **Data:** 2026-10-25 (America/Sao_Paulo)
- **Head auditado:** `6cfdc15cc093427da6a00accba953b2958b49a1c`
- **Base / merge-base:** `main` @ `333af2abb5eadea5cdc5da6a98edddd015ea864e` (1 commit à frente, 0 atrás)
- **Blob auditado:** `docs/architecture/HOTSPOT_EXCEPTIONS.md` = `4922a8fb451267b77806b8dfabaa3906c949a82e`
- **Decisão:** **BLOQUEADO @ 6cfdc15c** — sem defeito encontrado; falta só a evidência de CI do teste obrigatório (`test:architecture`/`check:hotspots`), porque o application gate foi *skipped* pela falha herdada do Trivy.

## Escopo
Docs-only: 1 arquivo (`docs/architecture/HOTSPOT_EXCEPTIONS.md`, +17 −2). Nenhum código, script ou workflow alterado.

## Critérios e resultados

| # | Critério | Resultado |
|---|---|---|
| 1 | Diff docs-only, base atual, merge limpo | ✅ só o `.md`; base = `main` atual; `git merge-tree` limpo (tree `0ee72f59`); GitHub `MERGEABLE` |
| 2 | Formato compatível com `parseExceptions` | ✅ dois blocos `### \`path\`` dentro de "## Exceções ativas", com `**Limite excepcional:**`, `**Dono:**`, `**Reavaliar até:**`; parser lê 20 exceções (antes 18), inclusive com CRLF |
| 2a | Contagem de linhas | `wc -l` = 1333 / 1017; checker (`content.split('\n').length`, arquivos terminam em `\n`) = **1334 / 1018**. Os tetos 1334/1018 batem com a métrica do checker |
| 2b | Semântica do teto | falha só se `lines > limitLines` → teto **inclusivo** (`<=`); margem de crescimento = **0** |
| 3 | `check:hotspots` local | `main` 333af2ab: **exit 1** (2 falhas: IntelligenceHub 1334, SwarmDashboard 1018, sem exceção). PR 6cfdc15c: **exit 0** ("1817 arquivo(s) verificado(s)", 20 cobertos por exceção, 43 avisos pré-existentes) |
| 3a | Mutação +1 linha | IntelligenceHub +1 → exit 1 ("1335 linhas excede o limite excepcional registrado (1334)"); SwarmDashboard +1 → exit 1 ("1019 … (1018)"). Revertido, árvore limpa |
| 3b | Prazo | `evaluateFile` com o doc do PR: 2026-11-07 20:59 BRT → ok-exception; 2026-11-07 21:01 BRT → **fail**; 2026-11-08 12:00 BRT → fail. Prazo é imposto pelo checker |
| 3c | Testes unitários do checker | `vitest run tests/unit/architecture/check-hotspots.test.ts` → 13/13 |
| 4 | Sem perda de informação no débito | ✅ linha "SwarmDashboard.tsx (770 linhas)" saiu da lista de débito, com nota de saída (1018) e histórico citado no Motivo do novo bloco |
| 5 | Exceção vs. redução imediata | ✅ exceção é o caminho adequado: regressão herdada do `main` (commits `a96bb68d`/`0774cd67`, 2026-10-24), dono nomeado (07, com 03 na UI), prazo curto (2 semanas), teto = tamanho atual. Reduzir 334 + 18 linhas de UI agora seria trabalho de feature fora do escopo de um desbloqueio de gate |
| 6 | CI do head | ver abaixo — application gate **skipped** |

### Proveniência (conferida)
- `IntelligenceHub.tsx` (wc): 454 → 947 (`a96bb68d`) → 1333 (`0774cd67`).
- `SwarmDashboard.tsx` (wc): 981 → 1017 (`a96bb68d`); `0774cd67` não mexeu nele.

### Demais passos de `test:architecture`
`lint:architecture` / `verify:architecture-coverage` (dependency-cruiser) não rodam no box (Node 20.19.2; depcruise pede ^22, o CI usa 22). Não se aplicam ao escopo: depcruise não lê `.md`. O único consumidor do arquivo alterado é `check-hotspots.ts`, que foi executado.

## CI do head 6cfdc15c (consultado 2026-10-25 12:51 BRT)
- Central Birth Hub 360 Release `40208771466`: dependency review ✅, secret scan ✅, **trivy scan ❌**, **application gate skipped**, build (veredito consolidado) ❌ por `trivy-scan=failure`.
- Security - Trivy `40208771320`: ❌ (fs scan HIGH/CRITICAL das dependências; um `.md` não altera o resultado; é a mesma falha herdada que o #67 corrige).
- Dependency Review ✅; CodeQL / SonarQube / Visual Regression em andamento.
- Resultado: `test:architecture` (passo "Architecture tests (fronteiras de dependência e hotspots)" do application gate) **não executou no CI** → pela §40 não há aprovação.

## Achados
- **P3 — sem rastreio da redução.** O PR não abre/cita issue ou handoff para 07/03 reduzirem os arquivos até 2026-11-08. Sem isso, a exceção tende a ser renovada por inércia. Sugestão: handoff para 07 (cópia 03) com meta < 1000 linhas pelo checker.
- **P4 — prazo vence antes do que a data sugere.** `new Date('2026-11-08')` é meia-noite UTC: o gate volta a falhar em **2026-11-07 às 21:00 BRT**, não no fim do dia 08. Comportamento pré-existente do checker; vale para todas as exceções.
- **P4 — margem zero.** Teto = tamanho atual: qualquer +1 linha em IntelligenceHub/SwarmDashboard (inclusive trabalho de 07/03) quebra o gate. É intencional (congela o crescimento), mas precisa ser comunicado aos donos.
- **P4 — motivo impreciso.** O Motivo atribui o cruzamento dos 1000 aos dois commits; para SwarmDashboard só `a96bb68d` contribuiu (981→1017 wc), e o "770" da lista de débito já estava defasado antes disso. Não muda a decisão.
- **Observação de ordem de merge:** #67, #71 e #72 já contêm `0774cd67`. Quando o Trivy voltar a passar, o application gate deles vai bater em `test:architecture` vermelho enquanto o #79 não estiver no `main`. O #79 precisa entrar junto com, ou logo depois do, #67 (o tsc do `main` também segue vermelho; ver o parecer do #75).

## Pendências para APROVADO
1. Application gate executado (não skipped) com o passo `test:architecture` verde num head que contenha este conteúdo. Caminhos: depois do merge do #67 com rebase deste PR, ou num branch de integração `main` + #67 + #79.
2. Se o head mudar só por rebase e o blob de `HOTSPOT_EXCEPTIONS.md` continuar `4922a8fb…`, a revisão é só de CI. Qualquer mudança de conteúdo exige nova auditoria (§40).

## Comandos principais
```
git merge-tree --write-tree origin/main origin/pr79
npx tsx scripts/architecture/check-hotspots.ts   # main: exit 1 | PR: exit 0 | +1 linha: exit 1 (cada arquivo)
npx vitest run tests/unit/architecture/check-hotspots.test.ts   # 13/13
gh run list -R MarksNN/Birthub-360 --commit 6cfdc15cc093427da6a00accba953b2958b49a1c
gh run view 40208771466 --json jobs ; gh run view 40208771320 --json jobs
```
