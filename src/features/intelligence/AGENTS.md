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

## Copiloto IA vs Elite Agent (P0 #693 / Marks+02)

- `/app/intelligence/elite-agent` → `EliteCommercialAgentWorkspace` (NBA) — domínio intelligence (07).
- `/app/copiloto_ia` → `CopilotoIaHub` (conversas/captura) — feature `src/features/copiloto-ia` (07), rota/nav propriedade 02.
- Decisão atual (Marks Orquestrador + Agente 02): **módulo completo na nav** — não confundir as duas superfícies. Branch 02: `agente/02-p0-falso-salvo-setup-copiloto`.
- Handoff supersedido: `.agents/handoffs/mapa-modulos-20261010/07-para-02-copiloto-alias-elite.md` (status resolvido — 02 montou CopilotoIaHub).
