- De: 08
- Para: 03
- Onda: aws-release-2026-10-09
- Status: aberto
- Prioridade: bloqueador

## Problema
No CI do PR #689 (`feat/birthub360-atualizacoes`, head `59c0aa5e`), o job **Frontend bundle budget** falha no build Vite/postcss com:

`[postcss] src/styles/globals.css:2:53785: Missed semicolon`

Isso impede o gate de bundle e contribui para o PR permanecer `mergeable_state: blocked`. Escopo é CSS/UI — propriedade do Agente 03. Agente 08 **não altera** este arquivo para não colidir com a11y/redesign em curso (#690–#693).

## Arquivo(s) envolvido(s)
- `src/styles/globals.css`

## Alteração necessária
Corrigir o CSS inválido (semicolon ausente / sintaxe pós-processada quebrada) de forma compatível com light+dark e sem regressão de a11y. Preferir patch mínimo no arquivo (ou na origem do CSS gerado, se aplicável).

## Teste esperado
- `npm run build` (ou o script Vite de produção usado no workflow de Frontend bundle budget) completa sem erro postcss.
- Job **Frontend bundle budget** no Actions do #689 (ou branch equivalente) passa após o fix.

## Contexto adicional
- Evidência CI: job `Frontend bundle budget` run `38093979014` / job id `114337823989` — falha em `vite-plugin-pwa:build` ao processar `src/styles/globals.css`.
- Separado do bloqueio Docker Hub: application gate falhava por secrets `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` ausentes (Marcelo já configurou; 08 rearmou failed jobs do run `38093979019`).
- PR: https://github.com/MaarkssN/Birthub-360/pull/689
- Coordenador 00 pediu handoff 08→03 sem colidir com redesenho do 03.
- ECS permanece fechado; merge #689 só após parecer 24 + ok 00 + gates verdes.

## Resolução
(preenchido pelo agente destino ao resolver)
