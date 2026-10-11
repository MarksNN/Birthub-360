De: 00
Para: 02
Onda: ui-1 (modernizacao visual, Onda A)
Status: resolvido (implementado na Onda C da integracao/onda-ui-1 e integrado em main @ 36d097a17; parecer APROVADO do Agente 24)
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

## Resolução (Agente 02 — 2026-10-11)

Concluído com sucesso na iniciativa de Modernização UI:
1. **Shell Canônico & Breadcrumbs (Onda C):** Implementado o componente semântico e acessível `AppBreadcrumbs` integrado diretamente ao topo da aplicação no `AppTopbar`, fornecendo contexto hierárquico e navegação acessível por teclado em todas as rotas autenticadas.
2. **Guards & Roteamento Preservados:** Nenhum guard RBAC ou rota de autenticação foi alterado. Testes de roteamento passaram 100%.
3. **Auditoria Independente:** Integrado na branch `integracao/onda-ui-1` (commit `5edc59b70`) e auditado com parecer **APROVADO** pelo Agente 24 (`.agents/reviews/24-aprovacao-onda-ui-g-qa-release.md`), subsequentemente mergeado na branch `main` no commit `36d097a17`. Handoff formalmente encerrado.
