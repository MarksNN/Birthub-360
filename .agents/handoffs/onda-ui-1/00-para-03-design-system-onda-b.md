De: 00
Para: 03
Onda: ui-1 (modernizacao visual, Onda A)
Status: aberto
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
