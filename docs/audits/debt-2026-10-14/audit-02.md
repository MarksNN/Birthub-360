# Agente 02 — auditoria forense de produto e frontend

Agente/Onda/Branch:02 / auditoria-forense2026-10-14 / main (snapshot isolado).
Base:9373fb224a8aba30a39f7d10d1a2be639c35af78.

## Suposições e escopo

Critério de êxito individual:50 checks reais, cinco por cada uma das10 categorias atribuídas, evidência atual e achados deduplicados. Análise estática contextual; conforme indica somente propriedade descrita, nunca prova de UI/persistência. Usuário proibiu correções e excluiu achados launch já conhecidos. Não reintroduzidos.

Governança lida:AGENTS.md, prompts02/03/04/05/09, governança local relevante. Skills accessibility/performance/functional-completeness aplicadas para distinguir gesto, persistência e custo medido de presença no código.

## Plano executado

Inventário→stack e ownership reais→fontes preservadas. História→relatorios02/03 e launch→achado histórico PillarIcons agora usa SVGProps e spread sem any; sem dívida nova. Leitura dirigida→contratos/UI/mobile/busca/analytics/arquivos→50 checks. Comparação automática→catálogos nativos e filesystem→divergência nativa e assets ausentes. Consolidação individual→7 causas distintas→remediação e aceitação descritas, sem implementar.

## Resultados

{"Conforme": 30, "Não verificado": 12, "Não conforme": 7, "Parcialmente conforme": 1}

7 achados:2P1,5P2; nenhumP0 demonstrado. DT03,18,23,31,32,33,34,36,37,39 têm5 verificações cada.

### DEBT-UX-001 — Cache PWA de CRM não é particionado por identidade autenticada (P1)

Configuração StaleWhileRevalidate guarda respostas CRM por origem/URL no mesmo cache; logout não remove o conteúdo.

Impacto:Em navegador compartilhado, resposta antiga pode ser servida antes da resposta da nova sessão; risco de confidencialidade e de mostrar informação obsoleta.

- `vite.config.ts:61-66` — Cache fixo para GET CRM, por URL, sem identidade do usuário.
- `src/contexts/AuthContext.tsx:118-128` — Logout encerra sessão e redireciona; não limpa CacheStorage.

Causa:Cache de respostas autenticadas tratado como cache público de assets.
Remediação:Evitar cache SW de dados autenticados ou particionar e invalidar explicitamente por sessão/tenant.
Aceite:Usuário B não recebe dados de A ao trocar sessão online/offline; estado stale é explícito.
Limite:Configuração e ausência de limpeza no caminho de logout confirmadas; acesso cruzado real NÃO DEMONSTRADO, requer build e navegador isolado.
Dono:09; onda proposta:01; estado:aberto.

### DEBT-UX-002 — Paginação full-text de empresas restringe resultados ao primeiro lote (P2)

Com ENABLE_SEARCH=true, o repositório pede os mesmos primeiros limit IDs em todas as páginas e só depois aplica skip no banco. Também conta só os IDs recuperados.

Impacto:Resultados além do primeiro lote tornam-se inalcançáveis; página 2 fica vazia quando Meili retorna no máximo limit IDs.

- `src/features/companies/infra/PrismaCompanyRepository.ts:44-50` — Busca só limit IDs, sem page/offset.
- `src/features/companies/infra/PrismaCompanyRepository.ts:66-81` — Aplica offset do PostgreSQL ao mesmo conjunto limitado; total também fica limitado.
- `src/lib/search/index.ts:85-90` — Meili recebe limit sem offset.

Causa:Paginação aplicada duas vezes em contratos incompatíveis; total de busca perdido.
Remediação:Propagar paginação/total ao motor e preservar ordenação de relevância ou obter conjunto adequado sem aplicar segundo offset.
Aceite:Busca com 45 resultados e limite20 retorna páginas20/20/5, total45, sem duplicatas.
Limite:Reprodução HTTP/browser não executada; confirmação estática do fluxo.
Dono:04; onda proposta:03; estado:aberto.

### DEBT-UX-003 — Analytics devolve sucesso e zeros após erro de agregação (P1)

Endpoints metrics/overview/dashboard capturam qualquer exceção e devolvem dados vazios ou zerados com success:true.

Impacto:Usuário e monitoramento interpretam indisponibilidade como métricas reais zeradas; erro não observável nesses handlers.

- `src/features/analytics/presentation/AnalyticsController.ts:24-54` — Catch substitui falha por success:true/HTTP200.
- `src/features/analytics/presentation/AnalyticsController.ts:56-96` — Catch gera zeros e nulls sem propagar/logar erro.
- `src/features/analytics/presentation/AnalyticsController.ts:87-147` — Catch gera isEmpty:true em caso de indisponibilidade.

Causa:Confusão entre banco vazio e falha de banco/consulta.
Remediação:Propagar erro ao middleware e manter vazio apenas quando consulta bem-sucedida devolve vazio.
Aceite:Falha do repository retorna erro observável; banco vazio continua 200 com estado empty verdadeiro.
Limite:Reprodução HTTP/browser não executada; confirmação estática do fluxo.
Dono:04; onda proposta:03; estado:aberto.

### DEBT-UX-004 — Analytics ativo usa calendário UTC apesar do contrato comercial Brasília (P2)

Rotas analytics usam Controller/UseCases via DI; UseCases calcula monthStart/monthKey em UTC enquanto serviço legado usa helper canônico Brasília.

Impacto:Receita/contagem/cohort no início do mês divergem por três horas e pelo mês durante a virada; indicadores deixam de ser comparáveis.

- `src/features/analytics/application/AnalyticsUseCases.ts:22-30` — Mês inicia em UTC00:00.
- `src/features/analytics/analytics.service.ts:86-98` — Serviço paralelo usa calendário Brasil.
- `src/shared/di/setup.ts:178-178` — DI instancia implementação UTC.
- `src/shared/time/brazilCalendar.ts:1-1` — Contrato de calendário America/Sao_Paulo.

Causa:Migração para camada hexagonal não preservou calendário comercial.
Remediação:Reutilizar calendário canônico na implementação realmente registrada e eliminar divergência contratual.
Aceite:Instante2026-10-01T01:00Z pertence a setembro comercial em todos os endpoints.
Limite:Reprodução HTTP/browser não executada; confirmação estática do fluxo.
Dono:04; onda proposta:03; estado:aberto.

### DEBT-UX-005 — Deep links nativos Android divergem do catálogo de rotas web (P2)

Comparação executada de listas: nativeOnly sdr-diagnostic-joao; webOnly inclui sdr-diagnostic, forecast, metas, signals-risks e outros destinos existentes.

Impacto:Link válido do diagnóstico é rejeitado nativamente; link com nome antigo é aceito mas rota web redireciona ao dashboard. Outros destinos web ativos não abrem via esquema custom.

- `android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:55-65` — Lista manual nativa inclui sdr-diagnostic-joao e omite destinos web.
- `src/App.tsx:460-460` — Rota real é sdr-diagnostic.
- `src/lib/navigationBus.ts:67-67` — Contrato web usa sdr-diagnostic.

Causa:Espelho manual desatualizado sem gate de paridade.
Remediação:Sincronizar catálogo nativo com os destinos suportados e criar verificação automática de paridade, explicitando módulos desabilitados.
Aceite:Deep link diagnóstico válido abre tela; inválido mostra erro; catálogo de destinos ativos coincide.
Limite:Reprodução HTTP/browser não executada; confirmação estática do fluxo.
Dono:09; onda proposta:04; estado:aberto.

### DEBT-UX-006 — Ícones declarados no manifest PWA não existem em public (P2)

Inventário executado: public/icons/icon-192.png e icon-512.png ausentes; também favicon.ico/apple-touch-icon.png incluídos em includeAssets ausentes. Há ícone SVG de marca, mas não os PNG referenciados no manifest.

Impacto:Manifest fornece URLs sem artefato correspondente; identidade/instalabilidade do PWA fica comprometida em clientes que exigem esses ícones.

- `vite.config.ts:30-40` — Ícones192/512 e atalhos apontam a arquivos ausentes.

Causa:Manifest não acompanhado por assets versionados ou etapa explícita de geração no script build.
Remediação:Gerar/reutilizar os ícones oficiais nos caminhos manifest e verificar existência/tamanho no gate de PWA.
Aceite:Todas URLs do manifest e atalhos resolvem arquivo real com dimensão declarada.
Limite:Ausência na árvore fonte confirmada; build e resposta HTTP não executados, geração externa não foi presumida.
Dono:09; onda proposta:04; estado:aberto.

### DEBT-UX-007 — Busca textual da base retorna lista vazia quando banco falha (P2)

Se FTS falha, tenta ILIKE; se fallback falha, retorna []. Quando busca semântica também indisponível, hybridSearch retorna hits[] indistinguíveis de nenhum documento encontrado.

Impacto:Falha de banco é apresentada como ausência de conhecimento; usuário pode concluir que documento não existe.

- `src/features/knowledge/search.service.ts:178-180` — Falha FTS e ILIKE é logada, mas resposta vira [] em vez de erro.
- `src/features/knowledge/search.service.ts:54-64` — Status relata disponibilidade semântica, não falha keyword.

Causa:Contrato só distingue indisponibilidade semântica; não distingue erro da busca textual.
Remediação:Propagar falha da busca textual ou declarar disponibilidade de ambas estratégias e sinalizar erro quando nenhuma executou.
Aceite:Banco indisponível não gera falso empty; semântica indisponível com textual funcional mantém fallback claro.
Limite:Reprodução HTTP/browser não executada; confirmação estática do fluxo.
Dono:07; onda proposta:05; estado:aberto.

## Comandos e limitações

- Get-Content AGENTS.md e prompts 02/03/04/05/09; governança local layout/dashboard/onboarding/settings/analytics/android → exit0: Lidos. Primeiro caminho03-design-acessibilidade ausente; recuperado03-design-a11y.
- rg --files; Get-Content package.json src/App.tsx vite.config.ts capacitor.config.ts index.html AndroidManifest.xml → exit0: Inventário estático; consultas exploratórias inexistentes identificadas.
- Get-Content skills accessibility/performance/functional-completeness e relatórios históricos agent02/03/relatorio.html → exit0: Histórico tipagem PillarIcons hoje resolvido; doze achados launch excluídos por steering00.
- rg -n dirigido em auth, analytics, search, knowledge, public, calendar, DI e navegação; Get-Content fontes relacionadas → exit0: Leitura contextual. Algumas consultas deram erro de caminho/Windows glob: src/lib/auth*, src/features/landing*, AuthContext primeiro caminho, Header, teste PrismaCompanyRepository; caminhos reais recuperados. Não tomados como evidência de ausência.
- python --version; Test-Path node_modules → exit0: Python3.14.7; node_modules=False.
- Python stdin compara sets VALID_TABS/TAB_ROUTE_SET e existência dos quatro assets PWA → exit0: nativeOnly sdr-diagnostic-joao; webOnly20 destinos (inclui3 legados bloqueados, não contados como dívida); faltam192/512/favicon/apple-touch. Aviso de launcher Python impresso, script concluiu.

- Somente snapshot commit informado pelo00; não se utilizou Git ancestral.

- 50 verificações dirigidas em10 categorias; conformidade restrita ao critério estático explicitado.

- Sem node_modules no snapshot; lint/typecheck/build/unit/E2E/axe NÃO EXECUTADOS.

- Sem banco isolado, providers, navegador ou dispositivo; nenhuma PII/cobrança/envio externo.

- Doze achados históricos launch deliberadamente excluídos conforme steering do usuário transmitido pelo00.

- Sem correções nem código funcional alterado; somente audit-02.json/audit-02.md.

- Parecer24 e QA08 devem avaliar consolidação; este relatório não aprova release.

## Arquivos alterados, dependências e aprendizados

Somente audit-02.json e audit-02.md. Nenhuma alteração funcional. Handoffs necessários ao00 registrados aqui e noJSON:01/09 cache autenticado;04 paginação/analytics/calendário;09/02 deep links/assets;07 busca conhecimento. Sem arquivo handoff adicional para respeitar escopo de saída. EsforçoM para cada causa, com regressão média; ondas01/03/04/05 propostas e condicionadas a autorização.

Aprendizado reutilizável:DI define o comportamento ativo; analytics.service.ts já usa Brasília mas não garante que Controller/UseCases o façam. Motor fulltext limitado antes de skipSQL perde páginas e total. Manifest e catálogo Java podem divergir do códigoWeb mesmo com scripts de precache existentes.

Pendências:reprodução runtime nas áreas explicitamente não verificadas, QA08 e parecer24. Sem aprovação de produto/release.

## Reprodução isolada adicional

Executados em Node via stdin os corpos atuais getOverview e findAllWithFilters, removendo somente sintaxe de tipos TypeScript e injetando serviços sintéticos. Primeira tentativa exit1 por cast as AuthRequest; corrigida a transformação sem alterar fonte. Segunda tentativa exit0: rejeiçãoDB resultaHTTP200 success:true totalCompanies0;45hits Meili com limite20 resulta página1=20,página2=0,total20 em vez45. Nenhuma rede/DB/provider. Estes dois achados foram TESTADOS nesse escopo isolado; integraçõesHTTP/browser não foram testadas.

## Script de evidência persistido

Por solicitação adicional do00, verify-02.cjs foi criado somente na cópia isolada. Uso:node verify-02.cjs <raiz-fontes>, defaultcwd. Executado node verify-02.cjs . → exit0:6casos,4controles positivos e2defeitos reproduzidos. Saída identifica hashesSHA256 dasfontes. Mocks não validamSQL/HTTP/Meilisearch real, ordenação ou tenancy. PASS doscasos negativos comprova defeito atual, não aprovação de release. Arquivos deproduto permanecem inalterados.
