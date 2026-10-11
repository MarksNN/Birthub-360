- De: 08
- Para: 03
- Onda: aws-release-2026-10-09
- Status: aberto
- Prioridade: alto

## Problema
Job SonarQube do PR #692 falha no step **Run Tests with Coverage** (não no scan Sonar — `SONAR_TOKEN` ausente/skip). Causa: 1 teste unitário.

`tests/unit/components/ui/Drawer.test.tsx` → `chama onClose ao clicar no backdrop e ao clicar no X`:
- `document.querySelector('.fixed.inset-0.bg-black\\/…')` retorna `null`
- `expect(backdrop).toBeInTheDocument()` falha

Resumo Vitest: **1 failed | 478 passed** (3950 testes ok). Escopo UI/a11y do #692 — Agente 03.

## Arquivo(s) envolvido(s)
- `tests/unit/components/ui/Drawer.test.tsx` (linha ~117)
- componente Drawer correspondente (markup/classes do overlay/backdrop)

## Alteração necessária
Atualizar o seletor do teste para o markup atual do backdrop (Radix/Dialog) **ou** restaurar classe estável/`data-testid` no overlay sem regressão a11y. Preferir `getByRole` / `data-testid` em vez de classes Tailwind frágeis.

## Teste esperado
- `npm run test:unit -- tests/unit/components/ui/Drawer.test.tsx` verde
- Job SonarQube do #692 passa o step de coverage (scan Sonar ainda depende de `SONAR_TOKEN`)

## Contexto adicional
- Job: https://github.com/MaarkssN/Birthub-360/actions/runs/38102357078/job/114360725278?pr=692
- PR #692 tip ainda `91268d8` (parecer 24 válido nesse SHA; novo commit invalida)
- Visual Regression do mesmo PR foi **cancelled** mid-run (`test:visual` ~13min) — não é falha de baseline; rearmar o workflow.
- #689 já merged por humano (fora do fluxo 08); handoff ChannelDonut anterior resolvido pelo 03.

## Resolução
(preenchido pelo agente destino ao resolver)
