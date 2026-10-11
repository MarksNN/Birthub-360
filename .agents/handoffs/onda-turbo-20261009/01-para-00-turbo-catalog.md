De: 01 — Plataforma, Segurança e Dados
Para: 00 — Coordenador
Onda: turbo-20261009
Status: resolvido — DI CompanyCatalogSearch na main via #682 (merged 2026-10-09); 24 APROVOU
Prioridade: normal
Bloqueador-ref: nenhum para o escopo 01 (registro DI). Gates agregados/smoke com banco real permanecem com 00 se ainda quiser validar fluxo ponta a ponta.
Sprint destino: onda atual

## Problema

O consumidor de prospecção do Agente 05 resolve CompanyCatalogSearch, mas a raiz de composição ainda não registrava a função existente do catálogo.

## Arquivo(s) envolvido(s)

- Implementado: src/shared/di/setup.ts, somente import e container.register.
- Lido: src/features/market-intelligence/server/marketIntelligenceCompany.service.ts.
- Lido no worktree 05: src/features/prospecting/services/companyCatalogDiscovery.service.ts.

## Evidência (entrega original 01)

Agente / Onda / Branch: 01 / turbo-20261009 / agente/01-turbo-catalog-contract.
Base: e32bad52d. Worktree: C:/Github/birthub-turbo-01.
SHA256 do setup.ts auditável: CD8BCCDA763DE7A2024823AA715EE1A687F3386BAB5DCE7FB946421E8407849B.

Suposição explícita: a leitura do catálogo empresarial público existente pode ser reutilizada como função sem estado no container. Não reutilizar repositórios CRM tenant nem criar instância tenant global.

Plano executado: verificar ausência de registro e contrato existente; adicionar duas linhas; executar lint direcionado, typecheck e diff check; entregar para revisão 24.

Comandos executados:
- npx --no-install biome lint src/shared/di/setup.ts: TESTADO, exit 0, um arquivo, nenhuma correção.
- npx --no-install tsc --noEmit: TESTADO, exit 0, nenhuma mensagem de diagnóstico.
- git diff --check: TESTADO, exit 0.
- git diff --stat: dois acréscimos em setup.ts.
- Inspeção de CompanyCatalogSearch: um único registro em setup.ts, mesmo nome resolvido pelo consumidor 05.

Inspeção estática: a função lê dataset CNPJ_COMPANIES com publicationSlot CNPJ_ACTIVE e status READY; consultas findMany/count usam datasetId selecionado. LIST_SELECT contém dados empresariais/proveniência, sem campos de contato ou sócios. Não grava em CRM. Consumidor 05 filtra dataOrigin OBSERVED. Não há mudança em schema, autenticação, API ou políticas. A exceção de no-shared-to-features para setup.ts já existe em .dependency-cruiser.cjs.

## Alteração necessária (original)

Consumir revisão independente 24 para o hash acima e integrar o arquivo autorizado com o consumidor 05. O autor não aprova a própria entrega.

## Teste esperado (original)

00 executar gates agregados sequencialmente e validar fluxo real do consumidor ao catálogo: dataset READY disponível e indisponível, erro de consulta e filtros solicitados. Build e lint global: NÃO EXECUTADOS nesta missão mínima para evitar validações amplas simultâneas, conforme coordenação 00. Smoke com banco real: NÃO EXECUTADO; não há alegação de persistência ou funcionamento ponta a ponta.

## Contexto adicional (original)

Nenhum commit, push, merge, instalação ou geração Prisma realizado na entrega local inicial. Baseline .agents/runs/baseline.md não existe neste worktree (PRÉ-EXISTENTE); nenhuma documentação de outro proprietário foi criada. Fora do escopo: mudanças no serviço de catálogo, contrato do consumidor, schema e política. Handoff aberto somente para revisão/integração. Risco residual: container usa contrato estrutural resolvido pelo consumidor, cuja integração final e gates pertencem ao 00/05/24. Aprendizado reutilizável: setup.ts é a exceção existente para composição entre features; não é necessário duplicar serviço nem criar fachada compartilhada.

## Resolução (Agente 01 — 2026-10-10)

Releitura sob missão Coordenador 00: este handoff estava **stale em `aberto`**. Escopo do Agente 01 (registro DI) já está **concluído e na main**.

| Etapa | Evidência |
|---|---|
| Entrega 01 | Branch `agente/01-turbo-catalog-contract` commit `7afaeb8452b4dadc315a1e51990700dbcd941df2` — `feat(01): setup DI catalog contract for turbo prospecting` |
| Parecer 24 | `.agents/reviews/turbo-catalog-01-2026-10-09-24.md` — **APROVADO** para integração técnica em `integracao/onda-turbo-20261009` (deploy permanecia bloqueado na época) |
| Integração 00 | PR [#682](https://github.com/MaarkssN/Birthub-360/pull/682) — **merged** em 2026-10-09 ~17:37 BRT (`integracao/onda-turbo-20261009` → `main`) |
| Estado atual main | `src/shared/di/setup.ts` contém `import { listMarketIntelligenceCompanies } ...` e `container.register('CompanyCatalogSearch', listMarketIntelligenceCompanies)` (blob SHA `60b22bf45e2e775921b27ee6c3a2ec915c7962c7`) |

**Não reimplementei** o registro DI: já está em `main`. Esta branch (`agente/01-turbo-catalog`) só fecha o handoff documental stale.

Pendência fora do escopo 01 (não bloqueia fechamento do handoff): gates agregados / smoke com banco real citados na seção de teste — ownership 00.
