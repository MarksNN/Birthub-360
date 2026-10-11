- De: 08
- Para: 03
- Onda: aws-release-2026-10-09
- Status: resolvido
- Prioridade: alto

## Problema
Job SonarQube do PR #692 falha no step **Run Tests with Coverage** (não no scan Sonar — `SONAR_TOKEN` ausente/skip). Causa: 1 teste unitário.

`tests/unit/components/ui/Drawer.test.tsx` → `chama onClose ao clicar no backdrop e ao clicar no X`:
- `document.querySelector('.fixed.inset-0.bg-black\\/…')` retorna `null`
- `expect(backdrop).toBeInTheDocument()` falha

## Resolução
**Resolvido por Agente 03 (2026-10-10).**

Causa: overlay passou de `bg-black/60` para `bg-overlay` na retokenização a11y.

Fix em `agente/03-audit-a11y-ui` (commit remoto `0e933e0`):
- `DrawerOverlay` ganhou `data-testid="drawer-overlay"`
- teste usa `screen.getByTestId('drawer-overlay')`

Verificação: `vitest run tests/unit/components/ui/Drawer.test.tsx` → 8 passed | 1 skipped.

**Nota:** novo SHA no #692 **invalida** o parecer 24 do SHA `91268d8` — pedir re-review.
