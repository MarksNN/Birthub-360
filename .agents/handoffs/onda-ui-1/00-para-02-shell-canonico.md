De: 00
Para: 02
Onda: ui-1 (modernizacao visual, Onda A)
Status: aberto
Prioridade: normal
Bloqueador-ref: n/a
Sprint destino: Onda B

## Problema
Coexistem Sidebar, FuturisticSidebar, MacDock, FloatingDock e dois layouts. Definir shell canonico e pagina-piloto (sugerida: Integracoes) antes de modernizar navegacao.

## Arquivo(s) envolvido(s)
src/components/layout/**, src/App.tsx

## Evidencia
docs/design/MODERNIZACAO-UI-ONDA-A.md (secao 1, achados criticos).

## Alteracao necessaria
Decisao registrada + plano de breadcrumbs e sidebar recolhivel persistida, sem alterar guards RBAC.

## Teste esperado
Testes de rota/guard existentes passam; navegacao por teclado; 390/768/1366.

## Contexto adicional
Nenhum codigo foi alterado na Onda A. Ver matriz de ferramentas e plano de ondas no documento acima.
