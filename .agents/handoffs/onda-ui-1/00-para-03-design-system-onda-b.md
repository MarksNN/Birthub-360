De: 00
Para: 03
Onda: ui-1 (modernizacao visual, Onda A)
Status: resolvido (implementado nas Ondas B, D, E e F da integracao/onda-ui-1 e integrado em main @ 36d097a17; parecer APROVADO do Agente 24)
Prioridade: alto
Bloqueador-ref: n/a
Sprint destino: Onda B

## Problema
Consolidar tokens e primitivos antes de adotar shadcn: declarar @radix-ui/react-dialog, plano para P0-02 (elegance.css), stories dos primitivos (4/71) e adocao seletiva de Tabs/Tooltip/Dropdown sem biblioteca paralela.

## Arquivo(s) envolvido(s)
src/components/ui/**, src/styles/**; package.json exige aprovacao do 00 (uma dependencia por PR)

## Evidencia
docs/design/MODERNIZACAO-UI-ONDA-A.md (secao 1, achados criticos).

## Alteracao necessaria
PR pequeno por componente consumindo tokens (sem hex fixo).

## Teste esperado
tsc, lint, vitest de components/ui, Storybook, axe light+dark, check:bundle-budget.

## Contexto adicional
Nenhum codigo foi alterado na Onda A. Ver matriz de ferramentas e plano de ondas no documento acima.

## Resolução (Agente 03 — 2026-10-11)

Concluído com sucesso nas Ondas B, D, E e F da Modernização UI:
1. **Design System & Primitivos (Onda B):** Tokens consolidados em `tokens.ts` e `globals.css`. Primitivo `TabNavCards` harmonizado eliminando hexadecimais escuros estáticos. Criadas suítes de testes unitários para `TabNavCards`, `Table` e `EmptyState` com 100% de aprovação no Vitest.
2. **Harmonização de Interfaces (Ondas D, E, F):** Abas de conectores em `Integrations.tsx`, modal de autenticação em `NewLoginScreen.tsx` (com `role="dialog"`, `role="alert"`) e componentes operacionais (`SinglePageDashboard`, `CrmBoard`, `KanbanCard`, `ProspectingHub`) atualizados com anéis de foco WCAG AA e remoção de cores fixas.
3. **Auditoria Independente:** Integrado na branch `integracao/onda-ui-1` e auditado com parecer **APROVADO** pelo Agente 24 (`.agents/reviews/24-aprovacao-onda-ui-g-qa-release.md`), subsequentemente mergeado na branch `main` no commit `36d097a17`. Handoff formalmente encerrado.
