De: 05 — Prospecção
Para: 00 — Coordenação
Onda: turbo-20261009
Status: concluido-aguardando-24
Prioridade: alto
Bloqueador-ref: revisão independente 24 e gates da revisão integrada
Sprint destino: missão atual

## Problema
Motor Turbo enviava cargos de pessoas como keywords de organização Apollo, utilizava Organization Search legado, pré-buscava pessoas com senioridades fixas, convertia estrelas Google/defaults em fitScore, atribuía CNPJ pelo primeiro regex da busca web e ocultava erros Google/Nominatim como listas vazias. Promise.race retornava antes do enriquecimento terminar, deixando mutações e custos em segundo plano. Modo gratuito ainda incluía Google faturável.

## Arquivos envolvidos
Mudanças exclusivamente em src/features/prospecting/{domain,schemas,services,routes,utils}, incluindo testes __tests__ destes diretórios. Dependências IA07 foram copiadas para este worktree somente para validação; NÃO coletar esses arquivos como entrega05.
Base: e32bad52d. Branch: agente/05-turbo-backend. Worktree: C:/Github/birthub-turbo-05.

## Suposições decididas
Preservar /discover, campos legados e histórico existentes. Consentimento de custos nunca é implícito: autorizarPagos=true e configuração hybrid são necessários; economico bloqueia todas as fontes pagas. Cadastro público indexado já existente deve ser reutilizado pelo contrato DI CompanyCatalogSearch, sem import cross-feature e sem schema novo. Contatos não são considerados verificados porque têm formato válido. Contexto descritivo não equivale a filtros oficialmente suportados.

## Plano executado
1. Auditar motor e documentação Apollo → causas acima reproduzidas em testes e endpoint corrigido.
2. Validar filtros completos → nested segmentoDetalhes/personas/apolloFiltros/cnpj/modoPesquisa aceitos; intervalos invertidos/CNPJ inválido rejeitados; volume descartado; cargos separados de keywords empresariais.
3. Descoberta e enriquecimento real → Apollo/Google/Nominatim existentes; consulta direta BrasilAPI; catálogo público nome/CNAE principal/cidade/UF/page via DI existente; SIMULATED e demais origens não OBSERVED excluídas; erros parciais sanitizados.
4. Qualidade e custo → ICP explicável por critérios observados, icpPesos editável, métricas separadas, proveniência, confiança de identificação independente, custos explicitamente parciais; sem inferência automática de WhatsApp/CNPJ por nome; dedupe preserva homônimos com domínios diferentes.
5. Rotas → /interpret com RBAC/consent/tenant real e auditoria sem query; /providers e /providers/test testes gratuitos de autenticação/modelos; /enrich-cnpj valida entrada; /promote bloqueia Maps e autoEnrich não autorizado.
6. Verificar → testes focados e gates locais conforme resultados abaixo; 24 ainda obrigatório.

## Contratos de composição
01 precisa registrar no composition root src/shared/di/setup.ts:
container.register('CompanyCatalogSearch', listMarketIntelligenceCompanies).
O adapter05 resolve a FUNÇÃO, com DTO estrutural local, e fornece query conforme CompanyCatalogQuery. Não importa internals de outro módulo.
07 fornece src/lib/ai/turboSearch.ts conforme contrato acordado. /interpret devolve resultado07 mais criteria traduzido e validado.
02/03 consomem tipos novos em domain/prospectTypes.ts, warnings, partialFailures, costSummary, metrics e provenance.

## Comandos executados e resultados
- npx vitest run -c vitest.unit.config.ts (sete arquivos focados Turbo/Apollo/rotas) → PASS, 60 testes. Últimos ajustes de inclusão de personas no SearchIntent, avaliação CNAE e fonte BrasilAPI aconteceram depois deste run.
- npx vitest run -c vitest.unit.config.ts (turboDiscovery e companyCatalogDiscovery após últimos ajustes) → PASS, 7 testes.
- npx tsc --noEmit → PASS em snapshots durante implementação, incluindo catálogo/costSummary; última alteração posterior adicionou source BrasilAPI e precisa gate final integrado.
- npx biome lint (24 arquivos05 alterados/novos) → PASS, zero warnings antes últimos ajustes; npm run lint → exit0 com warnings pré-existentes do repositório.
- npm run build → PASS antes adição do adapter catálogo; exige gate final integrado.
- Gates concorrentes suspensos conforme coordenação por pressão de memória; nenhum processo externo foi encerrado.
- Testes integração/E2E/rede não executados por05. Root08 valida ambiente atualizado; não declarar indisponibilidade definitiva do Docker.

## APIs e documentação consultada
https://docs.apollo.io/reference/organization-search: endpoint POST /api/v1/mixed_companies/search, 1 crédito/página até100 resultados. Implementados domínio, exclusão de domínio, IDs, funcionários, receita, tecnologia inclusiva, financiamento total e última rodada. Fundação é pós-filtro existente. Removidos parâmetros não documentados capital aberto/exclusão tecnologia; pedidos destes filtros bloqueiam pesquisa com warning.
https://docs.apollo.io/reference/people-api-search: descoberta separada de enriquecimento; cargos/senioridades/localização utilizados; departamento não enviado como parâmetro não documentado. Cargos excluídos pós-filtrados. Contatos não ganham selo de verificação por presença.
BrasilAPI utiliza User-Agent transparente BirthHub360/1.0, rejeita JSON inválido ou CNPJ da resposta divergente. Não inclui raw/QSA na resposta /discover.

## Evidências
Testes novos: domain/__tests__/turboQuality.test.ts, services/__tests__/turboDiscovery.test.ts, turboProviders.test.ts, companyCatalogDiscovery.test.ts; regressões ampliadas nas suítes Apollo e rotas. Prova consentimento econômico e configuração, tenant em consulta CRM, ausência de chamadas pagas, falha parcial preservando candidatos, validação CNPJ, interpretação RBAC/consent/tenant spoof e catálogo excluindo SIMULATED.
Nenhuma chamada paga real foi feita por05. Root possui evidências independentes de conectividade gratuita; não confundir mocks com rede real.

## Pendências e limitações explícitas
- Revisão24 e gates sequenciais da revisão exata integrada pendentes; este relatório NÃO é aprovação.
- Registro DI01 necessário para fonte catálogo funcionar em runtime; dados retornados dependem de snapshot READY/CNPJ_ACTIVE acessível.
- CNAEs secundários não são filtráveis pela listagem existente: bloqueio explícito, nenhum resultado falso.
- Nome/razão social são busca textual do catálogo e fontes reais; não há novo fuzzy/semantic embeddings nem ingestão DuckDB.
- Campos qualitativos de segmento/persona exigem interpretação e não são anunciados como filtros oficiais. Templates UI pertencem02/03.
- Cancelamento real, fila longa, limites monetários Google e custo exato de todos os enriquecimentos não implementados; costSummary é parcial, não orçamento completo.
- Histórico/persistência dependem banco e infraestrutura existente; validação real de tenant/RLS pertence gate08/01/22.
- Crawlee/SearXNG/pgvector/DuckDB não integrados ao pipeline; crawlee não habilitado sem SSRF/robots/termos seguros.
- Retenção/exportação Google: /promote bloqueia origem Google; UI02/03 bloqueará export e CRM Maps. Backend não promete direitos de reutilização.
- Modo completo não garante completude, contatos desconhecidos permanecem desconhecidos. Aguardar enriquecimento com concorrência3 pode aumentar latência; UI timeout deve contemplar isso.
- Ajuste testes legados em tests/unit pertence08: passaram a exigir autorização paga explícita para cenário hybrid e free não tenta Google.

## Aprendizados reutilizáveis
Saúde autenticação Apollo não comprova plano People API, créditos ou todos endpoints. Listas vazias nunca devem ocultar erro de fornecedor. Disponibilidade de telefone não comprova WhatsApp. O catálogo público já existente evita módulo paralelo e suporta identificação CNPJ/nome/CNAE principal por snapshot; composição ocorre por DI compartilhada, não imports cruzados. Pontos ICP só vêm de correspondência observada, sem bônus por estrelas ou contatos disponíveis.

## Riscos
Sem liberação de release, merge, commit, push ou deploy. Não há novos segredos, dependências ou migrations. Confiança numérica é indicador determinístico, não calibração estatística. Restrições de fornecedor/retention devem ser revisadas antes expansão de export ou novas fontes.

## Correção cirúrgica de contrato /interpret — revisão antes do parecer24

Consulta HTTP limitada a2000 caracteres, igual ao serviço07; entradas2001 caracteres agora400 antes chamar IA. Campo model opcional aceita exatamente regex /^[a-zA-Z0-9_./:-]{1,120}$/ e é repassado ao serviço. Modelo inválido400. Teste confirma transporte de model e tenant real.

Comandos: npx vitest run -c vitest.unit.config.ts src/features/prospecting/routes/__tests__/prospecting.routes.test.ts --no-file-parallelism → PASS14 testes; npx biome lint dos dois arquivos → PASS sem warnings. Full gates não repetidos conforme coordenação.

Hashes SHA256 desta revisão:
- src/features/prospecting/routes/prospecting.routes.ts: 5d7f05926249d2fef031725da38b4f889427f2bc2d236fda3c1bb6222ac43210
- src/features/prospecting/routes/__tests__/prospecting.routes.test.ts: 54acf2db3b08d42f766fd2919576ac993b354fb79041dd0eb1152e61fe4586e4

## Atualização 2026-10-10 (Agente 05)
- Branch `agente/05-turbo-backend` já mergeada em `main` (`0c63d3a`); tip da branch é ancestral de main.
- SHA256 de `prospecting.routes.ts` confere com a revisão do handoff.
- DI `CompanyCatalogSearch` registrado em `src/shared/di/setup.ts`.
- Gates focados reexecutados em worktree alinhado a main: 5 arquivos / 33 testes PASS
  (`turboQuality`, `turboDiscovery`, `turboProviders`, `companyCatalogDiscovery`, `prospecting.routes`).
- Sem novo código de motor nesta rodada. Pendência: parecer Agente 24 + gates integrados (08).
