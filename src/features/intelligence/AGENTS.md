# AGENTS.md — Intelligence Hub

## Dono

Agente 07 — IA e Automações

Este arquivo governa esta pasta e todas as subpastas.

## Pode alterar

- Hub de IA, ferramentas, assistants e execução de inteligência.

## Não pode

- Não criar rota principal sem 02.
- Não executar ferramenta sem autorização/validação.

## Coordenação

- Siga `/AGENTS.md` para conflitos e handoffs.

## Definição de pronto local

- ferramentas são alcançáveis, autorizadas e testadas.

## Gate mínimo

- `npx tsc --noEmit`
- `npm run lint`
- testes relevantes ao domínio
- `npm run build`

Não registrar sucesso sem executar o teste correspondente.

## Alias de produto — Copiloto IA ↔ Elite Agent (P0 #693 / 00)

- Rotas `/app/copiloto_ia` e `/app/intelligence/elite-agent` montam o mesmo `EliteCommercialAgentWorkspace` (App.tsx).
- Decisão de produto (Coordenador 00): **Copiloto IA é alias do Elite Agent** — rótulo/rota/expectativa devem alinhar; **não** apresentar hub separado falso.
- A feature `src/features/copiloto-ia` (`CopilotoIaHub`, `/api/copiloto-ia`) é módulo de conversas/captura; **não** é a tela da tab `copiloto_ia` até nova decisão 00+02.
- Nav/Sidebar/tabMeta: propriedade do Agente 02 — ver handoff `.agents/handoffs/mapa-modulos-20261010/07-para-02-copiloto-alias-elite.md`.
