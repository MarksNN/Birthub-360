# Run 00 — Recálculo preditivo sem falso sucesso (2026-10-10)

Agente / Onda / Branch: 00 — Coordenador / correção avulsa pós-onda / `agente/00-nba-refresh-falso-sucesso`
Base: `main@33edc320f0e60394ac56994bc6f47e1eb48bdd3d`
Bloqueador-ref: B-06 (dados/estados não confiáveis apresentados como reais) e §32 ("não existe fallback enganoso").

## Problema
`PredictiveScoringNbaCard.handleRefresh` chamava `loadInsights()` — que captura qualquer erro e só grava `error` no estado — e em seguida exibia
`toast.success('Pontuação e Next Best Action recalculados com sucesso!')` incondicionalmente. Com o backend preditivo fora do ar, o operador
via ao mesmo tempo o card de erro e um toast de sucesso.

## Triagem (por que esta tarefa)
- Voz/telefonia (B-06 #684): já integrado na main (merges de `agente/12-telephony-honest-state-20261009` e `agente/12-voice-registry-honest-state-20261009`); Voice Studio coberto pelos PRs #686/#688. Não duplicado.
- PR #689 toca MacDock, KpiCard, ChannelDonut, threecx, CI/deploy; sem sobreposição.
- B-14: `.gitignore` já cobre `backups/*.dump|*.sql`; nenhum dump versionado encontrado.
- Varredura `await load|fetch|refresh*(); toast.success`: demais ocorrências (`useBitrixIntegration`, `useCrmBoardController`, `CompanyDetail`) anunciam sucesso de uma ação já confirmada antes do refetch — corretas. Só este card anunciava sucesso de uma operação que falhou.

## Alteração
- `loadInsights` passa a retornar `boolean` (true somente quando score e NBA foram carregados).
- `handleRefresh` exibe sucesso apenas se `true`; caso contrário `toast.error`. Estado de erro existente continua visível.
- Teste de regressão: falha no recálculo não chama `toast.success`; teste de refresh feliz agora verifica o toast de sucesso.

## Propriedade
Arquivo pertence ao Agente 07 (`src/features/intelligence/AGENTS.md`). Alteração cirúrgica (10+/4-) feita pelo 00 por decisão de coordenação; o 07 deve ser informado e o 24 deve revisar antes do merge.

## Comandos executados (checkout local na base acima)
- `npm ci --ignore-scripts` → exit 0; `npx prisma generate` → exit 0
- `npx vitest run -c vitest.unit.config.ts tests/unit/features/intelligence/components/PredictiveScoringNbaCard.test.tsx` → 4/4, exit 0
- Mesmo teste com o componente da main (sem a correção) → 1 falha (novo caso), exit 1 — reprodução confirmada
- `npx vitest run -c vitest.unit.config.ts tests/unit/features/intelligence` → 21 arquivos / 145 testes, exit 0
- `npm run typecheck` (`tsc --noEmit`) → exit 0
- `npm run lint` → exit 0 (340 warnings + 1 info, idênticos à main — PRÉ-EXISTENTE)
- `npm run format:check` → exit 0

## NÃO EXECUTADO
`npm run test:unit` completo, `test:integration`, `test:e2e`, `build`, inspeção visual. Parecer do Agente 24 pendente.
