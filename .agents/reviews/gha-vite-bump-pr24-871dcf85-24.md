# Parecer — PR #24 (GHA) — fix(security): atualizar vite para 6.4.4

- Revisor: Agente 24 — Revisão Independente
- Data: 2026-10-20 (America/Sao_Paulo)
- Head auditado: `871dcf851c0e788998abd53bec740e4cab66c320` (confirmado: vite 6.4.4)
- Merge-base: `e06834775b8acef0c411c7c9ff4e5b8018bc12c4`; main atual `985d8586` (#27 já mergeado, PR 1 commit atrás, sem conflito: #27 não toca package.json/lock do vite)

## Veredito: APROVADO COM CONDIÇÕES (diff) — exceção de merge #24→#30: ACEITÁVEL SOB CONDIÇÕES, evidência local parcial

## Diff
Só `package.json` (`vite ^6.2.3 -> ^6.4.4`) e `package-lock.json` (raiz + `node_modules/vite` 6.4.3 -> 6.4.4). 3 linhas. Nenhuma mudança em vite.config, plugins ou código. Patch bump (6.4.x), não major.

## Advisories (`gh api /advisories/<id>`)
| GHSA | severidade | faixa vulnerável 6.x | corrigido |
|---|---|---|---|
| GHSA-698v-4r3x-3vcv | medium | <= 6.4.3 | 6.4.4 |
| GHSA-r825-w8mm-5pxw | medium | <= 6.4.3 | 6.4.4 |
| GHSA-587h-7wmj-h5pm | high | <= 6.4.3 | 6.4.4 |
6.4.4 está fora das três faixas.

## Evidência local (clones novos, node_modules próprios, `npm ci` exit 0 em ambos)
| Gate | main e0683477 | PR 871dcf85 |
|---|---|---|
| `npm ls vite` | — | exit 0; todos dedupe 6.4.4 (plugin-react 5.2.0, @tailwindcss/vite, vite-plugin-pwa 1.3.0, vitest 4.1.11, @vitest/mocker) |
| `npm audit --audit-level=high` | — | exit 0 (restam 3 moderate) |
| `check-audit-waivers.ts` | exit 1 (vite high, 3 GHSA) | exit 0 "nenhum achado HIGH/CRITICAL" |
| prisma generate | 0 | 0 |
| typecheck | 0 | 0 |
| biome format:check | 0 | 0 |
| lint:ci | 0 | 0 |
| check:hotspots | 0 | 0 |
| vite build | 0, 148 assets, 22.9s | 0, 148 assets, 22.9s; lista de tamanhos idêntica à main (diff 0 linhas) — bundle budget inalterado; CI "Frontend bundle budget" pass |
| test:architecture local | não executável (node 20.19 local; depcruise exige ^22) | idem |
| test:unit completa | NÃO CONCLUÍDA (box ficou indisponível durante a execução) | NÃO CONCLUÍDA |
| integração Postgres 17 (b24_*) | NÃO EXECUTADA | NÃO EXECUTADA |
| E2E / preview | NÃO EXECUTADO | NÃO EXECUTADO |

## CI do PR (run 39511171924 e associados)
- application gate: FAIL no step 13 "Architecture tests" — `lint:architecture` (depcruise): 2 erros `no-circular`:
  - `commercial-intelligence/infra/PrismaRebalanceApprovalStore.ts <-> services/rebalanceApproval.service.ts`
  - `commercial-intelligence/infra/PrismaOracleHistoryReader.ts <-> services/predictiveRevenueOracle.service.ts`
  (78 known violations ignoradas). Steps 7 Audit (waiver-aware) PASS, Lint PASS, Prettier/format PASS, working tree limpa PASS, Type Check PASS. Steps 14–25 (OpenAPI drift, unit, AI resilience, migrations, golden, integração, build, smoke, E2E) SKIPPED.
- build (consolidação): FAIL por herdar application-gate=failure.
- PASS: dependency review (x2), secret scan, trivy scan, Trivy PR gate, CodeQL js/ts e python, Frontend bundle budget.
- Pendentes: Visual Regression, SonarQube.

## Origem do vermelho
Herdado da main, não causado pelo PR. Os arquivos dos 2 ciclos vieram do #15 (já na main) e o #24 não toca nenhum .ts. Na main o gate nunca chegou ao step de arquitetura porque morria antes no audit; o #24 apenas destrava o audit e expõe o próximo vermelho. A confirmação com depcruise sob node 22 na main (mesma contagem) foi tentada mas não concluída localmente — a conclusão se apoia no diff (só package.json/lock) e no log do CI.

## Achados
- P1: nenhum. P2: nenhum no diff.
- P3: gate de arquitetura vermelho herdado (2 ciclos do #15) bloqueia unit/integração/build/E2E no CI — corrigido pelo #30.
- P3: unit completa, integração e E2E no tip não foram comprovados por este revisor (ambiente caiu). A evidência do GHA (unit 4938, build ok) não foi reproduzida aqui.
- P4: 3 moderate restantes no npm audit; waivers/AUDIT_WAIVERS sem pendência para vite.
- P4: branch 1 commit atrás da main (#27); sem conflito.

## Exceção proposta (#24 com audit/lint/typecheck verdes → #30 roda gate completo → revert do #24 se quebrar)
ACEITÁVEL, porque: o diff é um patch bump de devDependency (build-time), lock com uma única versão alterada, build local idêntico byte a byte em tamanhos à main, typecheck/lint/format/hotspots verdes local e no CI, e o bloqueio é um deadlock real (#30 precisa do #24 para passar do audit). Condições:
1. Merge manual (squash), não auto-merge, com o run do CI do #24 mostrando Audit, Lint, Format, Type Check, bundle budget e scans verdes e o único FAIL sendo o step 13 com exatamente os 2 ciclos acima.
2. Anexar ao PR a evidência local do GHA (unit completa 4938 testes + build) com SHA 871dcf85; idealmente reproduzir unit e integração (Postgres 17) antes do merge — este revisor não conseguiu concluir.
3. #30 rebaseado sobre a main com #24 imediatamente depois, e mergeado só com application gate 100% verde (unit, integração, build, smoke, E2E).
4. Se o gate do #30 falhar por algo atribuível ao vite 6.4.4, abrir PR de revert do #24 na hora; nenhum outro PR de código (#18, #20, #22, #23) entra entre #24 e #30.
5. Ativar branch protection com checks obrigatórios na main.

## Comandos
`git fetch origin pull/24/head`, `git merge-base`, `git diff origin/main...pr24`, `gh pr checks 24`, `gh api repos/.../actions/jobs/118933056153/logs`, `gh api /advisories/<id>`, `npm ci`, `npm ls vite`, `npm audit --audit-level=high`, `npx tsx scripts/security/check-audit-waivers.ts`, `npx prisma generate`, `npm run typecheck|format:check|lint:ci|check:hotspots|test:architecture`, `npx vite build`, `npm run test:unit` (não concluído).

## SHA-256
Não calculado: o ambiente de execução ficou indisponível antes da gravação. Referência: head 871dcf851c0e788998abd53bec740e4cab66c320.
