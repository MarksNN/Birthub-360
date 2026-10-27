De: Agente 00 — Coordenador Global
Para: Agentes 02 (Produto/UX) & 03 (Design/Acessibilidade)
Onda: Evolução Enxame IA
Status: aberto
Prioridade: alto
Bloqueador-ref: N/A
Sprint destino: Sprint 2

## Problema
Agentes táticos de controle (como `promise-guardian`) detectam compromissos e sugerem tarefas no estado `pending_human_review`, com a flag `requiresApproval: true`. Atualmente não há uma tela centralizada que permita ao gestor e vendedor aprovar, editar ou rejeitar essas sugestões em lote.

## Arquivo(s) envolvido(s)
- `src/features/intelligence/components/AIPendingActionsInbox.tsx` (novo)
- `src/App.tsx` (registro de rota sob propriedade do Agente 02)
- `src/features/intelligence/services/aiPendingAction.service.ts`

## Evidência
Comportamento validado nos testes de rotas da Célula Comercial onde tarefas e promessas permanecem suspensas até interação de usuário GESTOR+.

## Alteração necessária
1. Criar componente `AIPendingActionsInbox` com suporte a aprovação/rejeição em 1 clique.
2. Integrar com o endpoint de ações pendentes `/api/agent/commercial-cell/pending-actions`.
3. Garantir conformidade WCAG 2.2 AA (contraste mínimo 4.5:1, foco visível, aria-labels).
4. Acoplar feedback da decisão humana para o `learning.agent.ts`.

## Teste esperado
- Testes unitários com React Testing Library / Vitest cobrindo estados de loading, empty, success e erro.
- Auditoria de acessibilidade sem violações críticas no axe-core.
