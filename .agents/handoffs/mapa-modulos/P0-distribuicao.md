# Handoff pack — P0 do mapa de módulos (#693)

De: Cartógrafo + Agente 02 (inventário)
Para: Marks Orquestrador (distribuição) → donos por linha
Onda: mapa-modulos
Status: aberto
Prioridade: bloqueador (honestidade de produto / nav)
Sprint destino: pós-merge #693

## Problema

O inventário em `docs/product/MAPA-MODULOS.md` marca módulos **mock/quebrados** ainda alcançáveis (Sidebar/URL). O PR #693 só documenta; a correção de produto fica nestes handoffs.

## Matriz

Ver seção **P0 — backlog distribuível** em `docs/product/MAPA-MODULOS.md`.

## Evidência

- Runs: `.agents/runs/02-mapa-modulos-20261010.md`, `.agents/runs/cartografo-mapa-modulos-20261010.md`
- PR: https://github.com/MaarkssN/Birthub-360/pull/693

## Alteração necessária (por dono)

1. **02** — settings_* falso-save; previsibilidade hardcoded; sales-orchestration seed
2. **05** — outbound 503/nav; prospect/inteligente + MI hub mocks
3. **12** — dialer alias + voice-hub 503/nav
4. **07** — copiloto_ia vs feature copiloto-ia
5. **01/16** — `/api/organization-modules` + `/setup`

## Teste esperado

- Item não aparece como “pronto” na nav se backend 503/mock
- Sem toast “salvo” sem persistência
- Setup não chama API inexistente silenciosamente

## Contexto adicional

Freeze: feature nova só via handoff. Não editar App/Sidebar neste pack sem coordenação 02↔03.
