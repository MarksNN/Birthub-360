De: Agente 00 — Coordenador
Para: Agente 02 — Produto e UX & Agente 03 — Design e Acessibilidade
Onda: Onda 01 — Governança e Inventário Forense
Status: aberto
Prioridade: alto
Bloqueador-ref: B-E2E-A11Y-01 / Issue #45
Sprint destino: Onda 02

## Problema
A suíte E2E do Playwright (`npm run test:e2e`) apresenta falhas intermitentes e violações de contraste WCAG AA identificadas no run 39674935507 e nos PRs #25, #43 e #44:
1. Contraste de cores no tema claro:
   - 12 violações de contraste sérias na Landing Page (`Landing360.tsx` / `Landing360.css`) com textos neon/amarelo sobre fundo claro.
   - 9 violações de contraste sérias no Dashboard em cards com texto atenuado sobre fundo claro.
2. Seletor duplicado no Workspace:
   - `tests/e2e/workspace.spec.ts` falha ao buscar botão/link `Pipeline` que possui múltiplos elementos coincidentes na navegação.
3. Race condition em `page.reload()` de `tests/e2e/helpers.ts` nos testes de integração Stripe/Omie.
4. Onboarding: elemento de grid intercepta clique em determinadas resoluções durante fluxo inicial.

## Arquivo(s) envolvido(s)
- `src/features/landing/pages/Landing360.css`
- `src/features/landing/pages/Landing360.tsx`
- `src/components/brand/tokens/birthhub360.css`
- `tests/e2e/workspace.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/crm-kanban.spec.ts`

## Evidência
- Run 39674935507: violações do axe-core para contraste (WCAG 2.2 AA) na landing clara e dashboard.
- PR #44 (`fix/a11y-landing-light-contrast-20261021`): implementa overrides em `Landing360.css` que corrigem as violações de contraste da antessala/landing clara.
- PR #43 (`fix/ci-format-e2e-20261021`): ajusta o seletor `Pipeline` duplicado em `workspace.spec.ts`.

## Alteração necessária
1. Agente 03:
   - Aplicar a correção de contraste do PR #44 em `Landing360.css` preservando a identidade visual Birth Hub 360 e sem diminuir o rigor das asserções do axe-core.
   - Validar contraste dos textos secundários no Dashboard em modo claro.
2. Agente 02:
   - Integrar a desambiguação de seletores em `tests/e2e/workspace.spec.ts`.
   - Tratar a estabilidade do helper de navegação/reload em `tests/e2e/helpers.ts`.

## Teste esperado
- `npx playwright test tests/e2e/workspace.spec.ts` -> PASS
- `npx playwright test tests/e2e/landing-a11y.spec.ts` -> PASS (0 axe violations)
- `npm run check:bundle-budget` -> PASS (sem regressão de bundle)

## Contexto adicional
Não remover axe-core, não rebaixar a criticidade das regras de acessibilidade e não ignorar contrastes em tema claro.
