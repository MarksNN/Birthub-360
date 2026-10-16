# Parecer de Auditoria Independente — Card Accessibility Warning

**Missão:** Auditoria independente estritamente do patch de acessibilidade do Card antes de push
**Onda:** não aplicável
**Autor do patch:** Assistente desta sessão, conforme informado na missão
**Auditor:** Agente 24 — Auditoria Independente
**Data:** 2026-10-15
**Base:** `origin/main` — `2bd7b461e3918c3d600df5e6a203cdc107446065`
**Branch:** `fix/card-accessibility-warning-2026-10`
**Revisão auditada:** alterações locais não commitadas; `HEAD` e `origin/main` estavam ambos em `2bd7b461e3918c3d600df5e6a203cdc107446065`. Os hashes abaixo identificam o conteúdo exato inspecionado.

## Escopo e arquivos auditados

1. `src/components/ui/Card.tsx` — SHA-256: `F168D63047EB35AF045C1B568B3881BEE0F291057D73DA8B4A1D69281CEA3BE6`
2. `tests/unit/components/ui/Card.test.tsx` — SHA-256: `84E296A2AF84539C652819F800159D7A53594A5764A01C4B62B3E99C7233BBF6`

No início da auditoria, o estado Git mostrava `Card.tsx` modificado e o teste novo não rastreado. O diff integral dos dois arquivos foi lido. Na verificação final, também apareceu `src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx` como modificado; é fora do escopo, não foi lido nem alterado e sua origem não foi determinada. Nenhum commit, push ou merge foi executado.

## Critérios auditados e resultados

| Critério | Evidência | Resultado |
|---|---|---|
| Card não interativo não deve receber landmark `region` por padrão | A raiz do componente não atribui `role="region"`; o teste renderiza um Card simples e confirma ausência de `region`. | **Conforme** |
| Card clicável deve ser alcançável por Tab e ativado por Enter/Space | Para `onClick`, a raiz recebe `role="button"` e `tabIndex={0}` (alcançabilidade por Tab verificada no código). `onKeyDown` trata Enter e Space, cancela o comportamento padrão e chama `currentTarget.click()`. Testes parametrizados confirmam uma chamada ao callback para cada tecla. | **Conforme** |
| Ativação por teclado não deve passar evento de tipo incorreto | O código remove o cast de `KeyboardEvent` para `MouseEvent`; a ativação usa o caminho DOM de `click()`, que entrega o evento de clique ao `onClick`. Typecheck e testes passaram. | **Conforme** |
| Callbacks de hover permanecem somente quando necessários | Os handlers de pointer/mouse são anexados condicionalmente quando `spotlight`, `soundHover` ou callbacks correspondentes foram informados; os wrappers continuam encaminhando `onPointerMove`, `onMouseEnter` e `onMouseLeave`. | **Conforme por inspeção estática** |
| Teste de regressão cobre landmark e ativação por teclado | A suíte contém o caso sem landmark e casos separados para Enter e Space. | **Conforme** |

**Observação sobre o landmark:** no diff desta revisão não há remoção de uma atribuição explícita `role="region"`; a versão-base já não declarava essa semântica por padrão. O teste novo registra essa expectativa para o Card renderizado sem `role` explícito. Como `CardProps` continua aceitando atributos HTML e `...props` os encaminha, o parecer não considera que a missão proíba um consumidor de solicitar explicitamente um `role`.

## Comandos executados

| Comando | Resultado |
|---|---|
| `npx vitest run -c vitest.unit.config.ts --no-file-parallelism tests/unit/components/ui/Card.test.tsx` | **Passou** — 1 arquivo, 3 testes |
| `npx biome lint src/components/ui/Card.tsx tests/unit/components/ui/Card.test.tsx` | **Passou** — sem correções |
| `npx biome lint src/components/ui/Card.tsx` | **Passou** — sem correções |
| `npm run typecheck -- --pretty false` | **Passou** — código de saída 0 |
| `npm run lint` | **Passou** — código de saída 0; há avisos preexistentes do lint global. A contagem de 374 avisos e a ausência de aviso para `Card.tsx` foram informadas pelo solicitante. |
| `npm run build` | **Passou** — código de saída 0 |
| `git diff --check` | **Passou** — código de saída 0 |
| `git status --short --branch`; `git rev-parse HEAD`; `git rev-parse origin/main`; `Get-FileHash -Algorithm SHA256 ...` | Confirmada a branch declarada, `HEAD` igual à base e os hashes registrados acima. |

Não foi feita inspeção visual em navegador: o patch não altera estilos ou composição visual. Também não foi executado axe/E2E; para este componente e escopo, a regressão unitária específica, lint, typecheck e build foram executados.

## Achados

**Achados bloqueadores: nenhum.**

O caminho de teclado usa um clique DOM real em vez de reinterpretar um evento de teclado como evento de mouse. O Card sem `onClick` não recebe papel interativo, e o Card clicável expõe papel e foco de teclado. Os handlers de hover ficam condicionais e preservam o encaminhamento dos callbacks fornecidos.

## Pendências e riscos

- **Fora do escopo desta aprovação:** o solicitante informou bloqueios independentes no CI recente: format check em `src/features/cadence/infra/dispatchers/CadenceDispatchers.ts` e `src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx`; falhas em `src/features/cadence/__tests__/cadence.test.ts` por conteúdo obrigatório ausente nos fixtures e em `tests/unit/features/analytics/AnalyticsController.metrics.test.ts` por expectativa antiga de status 200. Esses itens não foram reexecutados nesta auditoria e não foram incorporados à avaliação do patch do Card.
- A verificação final do worktree mostrou uma alteração local em `src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx`, ausente no primeiro status observado. A causa/proprietário não foram determinados; o arquivo não foi inspecionado nem modificado. Coordenar essa alteração fora desta revisão antes de operações subsequentes.
- Callbacks de hover são cobertos por inspeção do código, não por testes específicos nesta nova suíte.
- Esta decisão não aprova integração, merge, release ou deploy global e não executa operação Git.

## Handoffs

Nenhum handoff aberto: não foi identificado achado dentro do escopo que exija correção por outro proprietário.

## Veredito e escopo exato

**PARECER: APROVADO** para o conteúdo exato dos dois arquivos acima, identificado pelos hashes SHA-256, exclusivamente como patch local de acessibilidade do Card revisado antes do push.

Este parecer não aprova a integração/release global, não declara o CI global verde e não autoriza commit, push, merge ou deploy.
