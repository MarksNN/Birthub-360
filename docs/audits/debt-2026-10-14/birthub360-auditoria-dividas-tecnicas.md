# BIRTHUB360° — Auditoria forense incremental de dívidas técnicas

Autor00,fontes01/02/06;QA08,independente24. Base:9373fb224a8aba30a39f7d10d1a2be639c35af78;branchmain;ref localorigin/main0/0,semfetch. Alterações locais anteriores preservadas:?? .agents/handoffs/onda-lancamento-20261014/; ?? .agents/reviews/lancamento-20261014-24.md; ?? .agents/runs/lancamento-20261014-conclusao-00.md; ?? .agents/runs/lancamento-20261014-missao-00.md; ?? docs/audits/launch-2026-10-14/.

## Método e descoberta

Governança raiz e locais,roster26,prompts e fontes existentes consultados. 5.214 caminhostracked inventariados com hashes;306 metadados históricos de handoffs/runs/reviews. JSON recognition contém scripts reais,inventário e metadados,sem corpos históricos ou segredos. Stack observada:React19/Vite6/TypeScript6/Tailwind4/Biome2;Express5/BetterAuth/Prisma7/pgvector;BullMQ/Redis;Meilisearch/MinIO;gatewayAI/Ollama/LiteLLM;CapacitorAndroid/iOS e extensãoChrome;Node>=20,ambiente22.23.2. Versões declaradas nos manifestos,dependências instaladas ausentes.

Subsistemas,aplicações,feature directories,worker entries,manifestos,schemas,migrations,workflows e infra arquivada são indexados em recognition.json. Presença de config não prova serviço ativo. Arquitetura operacional publicada é single-node local-first;não consultamos cloud ou recursos em execução. Prompts21/22/23 não têm arquivos separados,regidos peloAGENTS+domínios. Agentes19/20 reservados e não acionados.

Snapshots .tmp/forensic01/02/06 por git archive do mesmoSHA,semGitmutations;três especialistas disjuntos+00. TarWindows falhou para symlinks de skills;fontes normais hashadas,especialistas consultaram skills no checkout raiz. Leituras iniciais de caminhos obsoletos,um assert de âncora do gerador e tentativa npm audit falharam;hipóteses ajustadas por inventário/âncora exata,sem interpretar falha de ferramenta como defeito.

ResultadoConforme indica **somente a propriedade estática descrita**,nunca execução end-to-end ou certificadoWCAG/tenancy. Não conformidades têm contexto e vínculos canônicos;parciais não viraram automaticamente dívida. Não verificado registra dependência ausente. Os12 itens doHTML anterior foram explicitamente retirados da investigação;recognition/JSON preservam IDs e referência somente. Não se somam5.505 ocorrências textuais do plano20260929 ao inventário confirmado.

## Contagens

{
  "checks": 200,
  "categories": 40,
  "completed": 154,
  "confirmedFindings": 24,
  "unverified": 46,
  "resultCounts": {
    "Conforme": 125,
    "Não conforme": 25,
    "Não verificado": 46,
    "Parcialmente conforme": 4
  },
  "priorities": {
    "P0": 0,
    "P1": 7,
    "P2": 14,
    "P3": 3
  },
  "byAgent": {
    "10": 2,
    "12": 1,
    "14": 1,
    "16": 2,
    "08": 2,
    "00": 2,
    "01": 4,
    "09": 3,
    "04": 3,
    "07": 2,
    "06": 1,
    "02": 1
  },
  "byModule": {
    "testes": 1,
    "build": 1,
    "container": 1,
    "recuperação": 1,
    "governança": 1,
    "CI/documentação": 1,
    "auth": 2,
    "usage": 1,
    "billing": 1,
    "onboarding": 1,
    "PWA / autenticação": 1,
    "Empresas / busca": 1,
    "Analytics": 1,
    "Analytics / calendário": 1,
    "Android / navegação": 1,
    "PWA / assets": 1,
    "Base de conhecimento / busca": 1,
    "Bitrix": 1,
    "IA streaming": 1,
    "Runtime": 1,
    "Runtime HTTP": 1,
    "Observabilidade IA": 1,
    "Notificações": 1
  },
  "byCategory": {
    "DT-08": 1,
    "DT-17": 1,
    "DT-07": 1,
    "DT-22": 1,
    "DT-11": 1,
    "DT-13": 1,
    "DT-06": 1,
    "DT-01": 1,
    "DT-04": 1,
    "DT-28": 1,
    "DT-29": 1,
    "DT-34": 3,
    "DT-36": 2,
    "DT-31": 1,
    "DT-32": 1,
    "DT-09": 1,
    "DT-10": 1,
    "DT-19": 1,
    "DT-21": 1,
    "DT-27": 1,
    "DT-35": 1
  },
  "verifiableConformancePercent": 81.2,
  "conformanceFormula": "Conforme/(Conforme+Não conforme+Parcialmente conforme); somente propriedades estáticas ou isoladas demonstradas",
  "corrected": 0,
  "correctionHistory": null
}

## Comandos e limites

|Comando|Exit code|Resultado|
|---|---|---|
|npm run typecheck|1|Ferramenta local ausente; não prova falha do código|
|npm run lint|1|Ferramenta local ausente; não prova falha do código|
|npm run test:architecture|1|Ferramenta local ausente; não prova falha do código|
|npm run test:unit|1|Ferramenta local ausente; não prova falha do código|
|npm run build|1|Ferramenta local ausente; não prova falha do código|
|npm audit --json --ignore-scripts --fetch-retries=0 --fetch-timeout=15000|1|{"exitCode":1,"vulnerabilities":null,"errorCode":null,"packages":[]}|
|npm run test:integration|NÃO EXECUTADO|Pré-requisitos isolados não comprovados; pode provisionar/migrar dados ou acessar serviços reais|
|npm run test:e2e|NÃO EXECUTADO|Pré-requisitos isolados não comprovados; pode provisionar/migrar dados ou acessar serviços reais|
|npm run verify:integrations|NÃO EXECUTADO|Pré-requisitos isolados não comprovados; pode provisionar/migrar dados ou acessar serviços reais|
|npm run verify:ai|NÃO EXECUTADO|Pré-requisitos isolados não comprovados; pode provisionar/migrar dados ou acessar serviços reais|
|npm run backup:drill|NÃO EXECUTADO|Pré-requisitos isolados não comprovados; pode provisionar/migrar dados ou acessar serviços reais|
|npm run verify:migration-drift|NÃO EXECUTADO|Pré-requisitos isolados não comprovados; pode provisionar/migrar dados ou acessar serviços reais|
|node .tmp/audit-00.cjs|0|50 checks registrados,62 exclusões unitárias e predicado de drill reproduzidos isoladamente|
|Get-Content AGENTS.md e .agents/prompts/01-plataforma-dados.md; Get-Content regras locais prisma/shared/auth; Get-Content skill database-integrity|0|Governança e ownership lidos; missão somente leitura prevalece sobre instruções remediação.|
|rg --files; Get-Content package.json; rg -n por contratos e migrações; leitura dirigida dos arquivos citados|0|Fontes e manifests inspeccionados. Algumas sondagens a diretórios inexistentes produziram erro 2 e foram corrigidas por inventário.|
|rg -n canStartNewSession src|0|Definição e chamadas somente em billingService.test.ts; nenhum consumidor produtivo.|
|node --input-type=module (função computePeriodEnd extraída por regex, remoção somente de anotações de tipo)|0|2026-01-31 mensal 2026-03-03; 2026-03-31 mensal 2026-05-01; 2024-02-29 anual 2025-03-01. Não importou app nem conectou rede.|
|python: construção JSON, verificação arquivos/âncoras e contagem categoria|0|50 checks; 10 categorias com cinco cada; evidências resolvidas em snapshot.|
|npm lint/typecheck/build/unit; prisma validate/generate/migrate/diff; integração/e2e|NÃO EXECUTADO|NÃO EXECUTADO: snapshot sem node_modules. Prisma/integração/e2e precisam infraestrutura de teste autorizada. Nenhuma instalação ou env real usado.|
|rg -n '/api/voice-hub/session/billing' src/bootstrap/routes.ts e leitura das rotas/services/repositories legacy|0|Identificado unavailableLegacyModule em bootstrap; revisada classificação billing e removidos dois candidatos de achados confirmados.|
|node verify-onboarding.mjs|0|Final mandatory/optional-b; optional-a perdido. Corpo original mutate, repositório sintético em memória/barrier, nenhum serviço real.|
|node verify-billing.mjs|0|Arquivo de reprodução preservado e reexecutado; confirma rollover legado com três datas.|
|Get-Content AGENTS.md e prompts 02/03/04/05/09; governança local layout/dashboard/onboarding/settings/analytics/android|0|Lidos. Primeiro caminho03-design-acessibilidade ausente; recuperado03-design-a11y.|
|rg --files; Get-Content package.json src/App.tsx vite.config.ts capacitor.config.ts index.html AndroidManifest.xml|0|Inventário estático; consultas exploratórias inexistentes identificadas.|
|Get-Content skills accessibility/performance/functional-completeness e relatórios históricos agent02/03/relatorio.html|0|Histórico tipagem PillarIcons hoje resolvido; doze achados launch excluídos por steering00.|
|rg -n dirigido em auth, analytics, search, knowledge, public, calendar, DI e navegação; Get-Content fontes relacionadas|0|Leitura contextual. Algumas consultas deram erro de caminho/Windows glob: src/lib/auth*, src/features/landing*, AuthContext primeiro caminho, Header, teste PrismaCompanyRepository; caminhos reais recuperados. Não tomados como evidência de ausência.|
|python --version; Test-Path node_modules|0|Python3.14.7; node_modules=False.|
|Python stdin compara sets VALID_TABS/TAB_ROUTE_SET e existência dos quatro assets PWA|0|nativeOnly sdr-diagnostic-joao; webOnly20 destinos (inclui3 legados bloqueados, não contados como dívida); faltam192/512/favicon/apple-touch. Aviso de launcher Python impresso, script concluiu.|
|Node stdin extrai getOverview e findAllWithFilters atuais; remove somente type annotations/casts; injeta repository/Meili/Prisma sintéticos sem importar dependências|1|Primeira tentativa: Unexpected identifier as; causa cast TypeScript não removido; nenhum dado/arquivo modificado.|
|Node stdin reprodução corrigida com remoção de casts TypeScript dos mesmos corpos de função|0|getOverview rejeiçãoDB => status200 success:true totalCompanies0. findAllWithFilters45hits limite20 => page1 20, page2 0, total20 (esperado45). Sem DB/provider/network.|
|node verify-02.cjs .|0|6casos isolados:4controles positivos,2defeitos reproduzidos; hashesSHA256 dasfontes emitidos. SemHTTP/DB/rede.|
|Get-Content AGENTS.md e prompts06,06A,07,12,13,16,17;rg --files;inspeções numeradas|0|Governança/fontes inspecionadas;algumas tentativas nomes13/17 incorretos corrigidas por inventário.|
|rg arquivos inexistentes pricing.ts/providers.ts/threecx.webhook.ts e glob Windows|2|Busca inicial falhou por caminho inexistente/glob;inventário posterior localizou fontes corretas. Sem inferência de falha de produto.|
|node --version|0|v22.23.2|
|node stdin: extração guard e asserts estruturais shutdown/quotas/labels|0|ECONNRESET nãoRedis classificado true;streamQuota false/chatQuota true;deadlineHTTP false.|
|node stdin: stripTypeScriptTypes shutdown e NotificationService fake deps|0|SSE false/shutdown pending;B unread0 após A ler broadcast;sem conexão externa.|
|node verify-06.cjs|0|Guard positivo/negativo;shutdown pending+controle sucesso;broadcast unread1→0;quota parity estática;Bitrix body stall+controle body completo;50IDs únicos,10categorias×5,arquivos/ranges existentes. Runtime somente fake deps.|

Ensaios source-extraction/mocks em evidence identificam condição positiva/negativa e fonte exata;nenhum serviço real,persistência real ou exploração foi exercitado. Typecheck equivale compiladorlocal da script,sem download npx. npm audit pode enviar árvore de dependências ao registry,sem instalar;tentativa não retornouadvisories utilizáveis. Scripts integração/E2E preparariam bancos e migrations;propositadamente não executados. Não foram lidos valores deenvreal.

## Inventário das40 categorias

|Categoria|Verificação|Resultado|Dono|Achado|Aceite|Evidência|
|---|---|---|---|---|---|---|
|DT-07 Infraestrutura e DevOps|DT-07-01 Imagem executa processo com usuário não root|Conforme|08|—|Inspeção da imagem comprova UID1001 e ausência de privilégios.|Dockerfile:105–109|
|DT-07 Infraestrutura e DevOps|DT-07-02 Migração bloqueia boot de imagem em caso de erro|Conforme|08|—|Em container descartável migration com erro impede processo HTTP.|Dockerfile:132–132|
|DT-07 Infraestrutura e DevOps|DT-07-03 Config Prisma copiada para imagem runner|Conforme|08|—|Container inspecionado contém config e migration CLI resolvida sem download.|Dockerfile:90–94|
|DT-07 Infraestrutura e DevOps|DT-07-04 Contexto Docker exclui cópias .worktrees e .tmp|Não conforme|08|DEBT-20261014-OPS-003|Contexto em fixture com .worktrees/.tmp não transporta esses caminhos.|.dockerignore:1–5|
|DT-07 Infraestrutura e DevOps|DT-07-05 Readiness Helm distinta de liveness|Conforme|10|—|Render Helm e simulação indisponibilidade DB tornam readiness false; escopo legado.|charts/birthhub-360/templates/deployment.yaml:58–62|
|DT-08 Testes e QA|DT-08-01 Suíte unitária descobre testes co-localizados fora de __tests__|Não conforme|14|DEBT-20261014-OPS-001|Inventário de descoberta inclui todos62 ou documenta exclusão explícita por suite.|vitest.unit.config.ts:35–39|
|DT-08 Testes e QA|DT-08-02 Integração declara setup e execução serial|Conforme|14|—|Banco descartável executa fixture limpa e isolamento sem dependência da ordem.|vitest.integration.config.ts:22–26|
|DT-08 Testes e QA|DT-08-03 Cobertura inclui fontes não importadas e separa relatórios|Conforme|08|—|Arquivo de produto sem import aparece no denominador e ambos relatórios coexistem.|vitest.unit.config.ts:64–68|
|DT-08 Testes e QA|DT-08-04 Testes E2E usam servidor API real|Conforme|14|—|Login,CRUD,reload e autorização testados no banco descartável.|playwright.config.ts:58–62|
|DT-08 Testes e QA|DT-08-05 Resultado atual typecheck lint arquitetura unit e build|Não verificado|08|—|Executar todos comandos locais após provisionamento autorizado sem alteração de fontes.|package.json:91–95|
|DT-11 Documentação|DT-11-01 Arquivo de ondas referido pelo coordenador existe|Não conforme|00|DEBT-20261014-GOV-001|Todas referências obrigatórias do prompt resolvem para documentos versionados.|.agents/prompts/00-coordenador.md:13–17|
|DT-11 Documentação|DT-11-02 Documentação identifica infraestrutura legada|Conforme|18|—|Índices identificam o mesmo estado de ativação por ambiente.|k8s/README.md:1–5|
|DT-11 Documentação|DT-11-03 Promessa de suspensão cloud coincide com publicação de imagem|Não conforme|00|DEBT-20261014-GOV-002|Decisão de produto explicita se publicação de imagem permitida e gatilho corresponde.|docs/development/LOCAL_FIRST.md:3–7|
|DT-11 Documentação|DT-11-04 Documento de dependências define gestão de vulnerabilidades|Conforme|15|—|Produzir SBOM por SHA e validar waiver expirado/sem dono bloqueante.|docs/security/DEPENDENCY_POLICY.md:1–5|
|DT-11 Documentação|DT-11-05 Histórico de milhares de alertas possui confirmação contextual|Não verificado|00|—|Revalidar candidato por contexto,causa raiz e deduplicação antes de classificar.|TECH_DEBT_REMEDIATION_PLAN.md:6–10|
|DT-12 Conhecimento técnico|DT-12-01 Topologia oficial possui entrada única documentada|Conforme|18|—|Onboarding operacional identifica cada serviço sem presumir cloud ativo.|docs/operations/PRODUCTION_ARCHITECTURE.md:5–9|
|DT-12 Conhecimento técnico|DT-12-02 Regras arquiteturais possuem racional vinculado|Conforme|18|—|Regra e exceção têm justificativa,dono e teste de violação.|docs/architecture/DEPENDENCY_RULES.md:6–10|
|DT-12 Conhecimento técnico|DT-12-03 Exceções de tamanho têm fonte rastreável|Conforme|00|—|Exceção vencida ou limite ultrapassado retorna erro sem atualizar baseline.|scripts/architecture/check-hotspots.ts:26–30|
|DT-12 Conhecimento técnico|DT-12-04 Conhecimento de incidentes está presente em handoffs|Conforme|00|—|Handoff novo documenta reprodução,proprietário,evidência e critério.|.agents/README.md:33–37|
|DT-12 Conhecimento técnico|DT-12-05 Runbook permite outro operador executar contingência|Não verificado|10|—|Operador executa cenário de incidente em ambiente descartável e registra tempos/resultado.|docs/operations/RUNBOOKS.md:6–10|
|DT-13 Governança|DT-13-01 Proprietários exclusivos declarados na governança|Conforme|00|—|Matriz da missão respeita donos e nenhuma mudança fora escopo.|AGENTS.md:398–402|
|DT-13 Governança|DT-13-02 Slots exclusivos e capacidade real respeitados|Conforme|00|—|Verificar paths e nenhum escritor concorrente sobre conteúdo de produto.|AGENTS.md:388–392|
|DT-13 Governança|DT-13-03 Decisões de prompt permanecem humanas|Conforme|00|—|Comparar hashes e diff antes/depois em todos prompts.|AGENTS.md:433–437|
|DT-13 Governança|DT-13-04 Fonte de checklist não confunde revisão pessoal com aprovação|Conforme|00|—|Painel da nova auditoria somente filtra/exporta; nenhum setter de estado oficial.|.agents/README.md:48–51|
|DT-13 Governança|DT-13-05 Auditor independente revisa esta exata entrega|Não verificado|24|—|Parecer24 APROVADO para pacote final,sem conteúdo modificado após hashes.|AGENTS.md:903–907|
|DT-14 Git e versionamento|DT-14-01 Base branch SHA e relação com ref remota rastreados|Conforme|08A|—|Manifest registra SHA completo,branch e distinção ref local de estado remoto vivo.|package.json:2–6|
|DT-14 Git e versionamento|DT-14-02 Alterações locais anteriores preservadas|Conforme|00|—|Comparação final dos hashes dos5214 caminhos e histórico local sem descarte.|AGENTS.md:458–462|
|DT-14 Git e versionamento|DT-14-03 Worktrees efêmeros excluídos do Git|Conforme|08A|—|git check-ignore comprova fixture .worktrees e nenhum gitlink sem gitmodules.|.gitignore:81–85|
|DT-14 Git e versionamento|DT-14-04 Backups e arquivos env reais não fazem parte snapshot|Conforme|15|—|Scanner de segredo no histórico e artefatos,com redaction,antes release.|.gitignore:9–13|
|DT-14 Git e versionamento|DT-14-05 Proteção main e revisões remotas em vigor|Não verificado|08A|—|API read-only comprova checks required,reviewers e proibição force push.|AGENTS.md:558–562|
|DT-15 Revisão de código|DT-15-01 Auditoria24 é obrigatória inclusive documentação|Conforme|24|—|Parecer separado contém autor/auditor/revisão exata e decisão.|AGENTS.md:907–911|
|DT-15 Revisão de código|DT-15-02 Aprovação histórica identifica hashes exatos|Conforme|24|—|Mudar um arquivo invalida parecer anterior e exige nova revisão.|.agents/prompts/24-revisao-independente.md:26–26|
|DT-15 Revisão de código|DT-15-03 CI aplica dependency-review em pull requests|Conforme|15|—|PR de fixture high sem waiver falha; exceção vigente rastreada.|.github/workflows/ci.yml:40–44|
|DT-15 Revisão de código|DT-15-04 Revisões e status históricos possuem evidência funcional atual|Não verificado|24|—|Revisar cada handoff selecionado lendo resolução e teste atual,sem aceitar status apenas.|.agents/prompts/24-revisao-independente.md:18–22|
|DT-15 Revisão de código|DT-15-05 GitHub aplica owners automaticamente|Não verificado|00|—|Consultar políticas e estabelecer revisão de domínio verificável quando requerida.|.agents/README.md:4–8|
|DT-17 Build|DT-17-01 Build utiliza npm ci no estágio de instalação|Conforme|08|—|Build limpo em ambiente isolado repete árvore do lockfile.|Dockerfile:23–27|
|DT-17 Build|DT-17-02 CLI Prisma em runner segue versão exata lockfile|Não conforme|08|DEBT-20261014-OPS-002|CLI runner coincide com versão exata lockfile; build não re-resolve dependências fora lock.|Dockerfile:43–47|
|DT-17 Build|DT-17-03 Budgets de bundles e arquivos públicos existem|Conforme|23|—|Fixture excedendo limite em cada eixo falha e limites possuem baseline aprovado.|package.json:59–63|
|DT-17 Build|DT-17-04 Build contempla saída HTTP e worker|Conforme|08|—|Imagem executa ambas entradas sem tsx de desenvolvimento.|Dockerfile:28–32|
|DT-17 Build|DT-17-05 Build atual é reproduzível no ambiente auditado|Não verificado|14|—|Duas builds autorizadas limpas do mesmoSHA produzem manifest de artefatos consistente.|package.json:29–33|
|DT-22 Recuperação|DT-22-01 Restore drill bloqueia schema desatualizado e RTO acima meta|Não conforme|10|DEBT-20261014-OPS-004|Migration erro ou restore901s faz passfalse/exit1; RPO depende timestamp backup real.|scripts/backup/run-backup-restore-drill.ts:298–302|
|DT-22 Recuperação|DT-22-02 Backup remoto automático tem ativação comprovada|Não verificado|10|—|Evidenciar scheduler local/cópia offsite autorizada,último sucesso e alerta falha.|.github/workflows/backup-production.yml:12–16|
|DT-22 Recuperação|DT-22-03 Dump externo requer criptografia antes upload|Conforme|15|—|Fixture sem criptografia não é enviada; restore criptografado validado isoladamente.|.github/workflows/backup-production.yml:68–72|
|DT-22 Recuperação|DT-22-04 Backup arquivos MinIO tem restauração mensurada|Não verificado|10|—|Restaurar objeto e ACL em storage isolado com hash e tenant correto.|docs/operations/PRODUCTION_ARCHITECTURE.md:33–37|
|DT-22 Recuperação|DT-22-05 RLS após restauração é testada entre tenants|Não verificado|01A|—|App-role restringe select/insert/update/delete deA/B no DB restaurado.|scripts/backup/run-backup-restore-drill.ts:32–36|
|DT-40 Continuidade operacional|DT-40-01 Topologia single-node possui contingência validada|Não verificado|10|—|Restaurar host alternativo autorizado em RTO/RPO e comprovar dados/serviços.|docs/operations/PRODUCTION_ARCHITECTURE.md:5–9|
|DT-40 Continuidade operacional|DT-40-02 Runbook distribui responsabilidades de incidentes|Conforme|10|—|Exercício registra responsáveis de plantão e sequência de escalonamento.|docs/operations/RUNBOOKS.md:4–8|
|DT-40 Continuidade operacional|DT-40-03 Rollback operacional tem execução independente comprovada|Não verificado|08A|—|Drill em ambiente descartável volta versão e contratoDB sem perda de dados.|docs/operations/RUNBOOKS.md:6–10|
|DT-40 Continuidade operacional|DT-40-04 Congelamento cloud evita publicação automática após CI|Não conforme|00|DEBT-20261014-GOV-002|Decisão humana valida publicação e gatilhos seguem a política explicitada.|.github/workflows/docker-publish.yml:11–15|
|DT-40 Continuidade operacional|DT-40-05 Retenção e exclusão de backups operam conforme política|Não verificado|21|—|Teste fixture confirma idade,tipos,backup recente preservado e cópia de recuperação íntegra.|scripts/backup/run-backup-restore-drill.ts:89–93|
|DT-01 Código-fonte|DT-01-01 Isolar responsabilidades da extensão Prisma (tenancy, cifra, auditoria, soft-delete e indexação)|Parcialmente conforme|01|—|Decomposição futura preserva RLS/cifra/auditoria sob testes; hotspot estático não comprova regressão|src/lib/prisma.ts:135–140|
|DT-01 Código-fonte|DT-01-02 Rejeitar tipos implícitos no TypeScript configurado|Conforme|01|—|Manter strict/noImplicitAny e executar typecheck offline em ambiente provisionado|tsconfig.json:23–28|
|DT-01 Código-fonte|DT-01-03 Remover consulta de contagem cujo resultado não altera papel de fundador|Não conforme|01|DEBT-20261014-CODE-001|Signup mantém ADMIN fundador sem consulta global redundante|src/lib/auth.ts:345–350|
|DT-01 Código-fonte|DT-01-04 Restringir captura any em fronteiras de erro de autenticação|Parcialmente conforme|01|—|Capturar unknown e discriminar erro com tipos; typecheck garante consumidores|src/lib/auth.ts:124–129|
|DT-01 Código-fonte|DT-01-05 Verificar imports/variáveis mortos com ferramentas configuradas|Não verificado|01|—|Rodar análise de código morto/unused e classificar cada ocorrência contextual|tsconfig.json:30–35|
|DT-02 Arquitetura|DT-02-01 Verificar fonte única de hierarquia RBAC importada por middleware|Conforme|01|—|Hierarquia permanece canônica e teste matriz positiva/negativa passa|src/lib/auth/authorization.ts:29–34|
|DT-02 Arquitetura|DT-02-02 Impedir dependências circulares por regra formal de arquitetura|Conforme|01|—|Regra presente; executar grafo completo sem novos ciclos antes saneamento|.dependency-cruiser.cjs:23–28|
|DT-02 Arquitetura|DT-02-03 Medir violações arquiteturais aceitas por baseline sem confundi-las com gate verde|Não verificado|01|—|Reexecutar depcruise e deduplicar arestas atuais contra baseline|.dependency-cruiser-known-violations.json:6–11|
|DT-02 Arquitetura|DT-02-04 Separar regras billing de persistência em repositório próprio|Conforme|01|—|Regras continuam no service e transação no repository, validar runtime separado|src/lib/voice-hub/services/billingService.ts:11–16|
|DT-02 Arquitetura|DT-02-05 Resolver contratos de DI sem criar infraestrutura nova|Conforme|01|—|Container central presente; verificar wiringConsistency no ambiente de teste|src/shared/di/container.ts:1–6|
|DT-04 Backend e APIs|DT-04-01 Validar payloads por schema parseAsync e encaminhar erro|Conforme|01|—|Testar payload válido/inválido e erro de validação no handler|src/shared/middlewares/validateRequest.ts:25–30|
|DT-04 Backend e APIs|DT-04-02 Limitar paginação CRM a inteiro positivo com cap central|Conforme|01|—|limites negativos/ausentes/excessivos produzem 50/50/200 em teste|src/shared/http/queryLimit.ts:11–16|
|DT-04 Backend e APIs|DT-04-03 Padronizar códigos estáveis e indicação de retry nas respostas de erro|Conforme|01|—|Erros conhecidos mantêm code/requestId/retryable em contrato HTTP|src/shared/middlewares/errorHandler.ts:17–22|
|DT-04 Backend e APIs|DT-04-04 Evitar carga integral de AILog para totalizar consumo histórico|Não conforme|01|DEBT-20261014-PERF-001|Agregação diária SQL ou paginação bounded mantém resultados sem crescimento memória linear|src/features/billing/infra/PrismaUsageRepository.ts:11–16|
|DT-04 Backend e APIs|DT-04-05 Verificar sucesso/falha HTTP de usage sem chamar provedores reais|Não verificado|01|—|Executar contrato HTTP autenticado em app isolado com repositório stub|src/features/billing/routes/usage.routes.ts:7–11|
|DT-05 Banco de dados|DT-05-01 Garantir FK de LeadTouchpoint para Lead no SQL versionado|Conforme|01|—|DDL presente; consultar pg_constraint no banco isolado para aplicação real|prisma/migrations/20261012000000_add_missing_rls_and_fk_indexes/migration.sql:27–32|
|DT-05 Banco de dados|DT-05-02 Garantir índice temporal por tenant em Wallet|Conforme|01|—|Verificar índice organizationId/createdAt presente schema e banco após migrate|prisma/schema.prisma:5399–5404|
|DT-05 Banco de dados|DT-05-03 Garantir unicidade de carteira por organização|Conforme|01|—|Schema e migration exigem uma Wallet por tenant; testar concorrência|prisma/schema.prisma:5401–5406|
|DT-05 Banco de dados|DT-05-04 Detectar órfãos reais e duplicidade nos registros comerciais|Não verificado|01|—|SQL LEFT JOIN/count executado em banco de teste sanitizado sem órfãos inesperados|prisma/schema.prisma:460–465|
|DT-05 Banco de dados|DT-05-05 Verificar que RLS é executada em conexão não superusuária|Não verificado|01|—|Teste direto de leitura/escrita cruzada executado com NOSUPERUSER e FORCE RLS|tests/integration/rls-postgres-direct-enforcement.test.ts:2–7|
|DT-06 Segurança e privacidade|DT-06-01 Evitar URLs de reset/verificação e PII em mensagens de log|Não conforme|01|DEBT-20261014-SEC-001|SMTP ausente não emite URL/token nem e-mail, inclusive msg serializada|src/lib/auth.ts:127–132|
|DT-06 Segurança e privacidade|DT-06-02 Rejeitar segredo Better Auth ausente/fraco em produção|Conforme|01|—|Boot controlado aborta sem segredo/placeholder; não usar credencial real|src/config/env.ts:437–442|
|DT-06 Segurança e privacidade|DT-06-03 Cifrar credenciais por AES-GCM com IV aleatório e authTag|Conforme|01|—|Testes de roundtrip/tamper comprovam não retorno de segredo em erro|src/lib/crypto/secretFields.ts:55–60|
|DT-06 Segurança e privacidade|DT-06-04 Fixar destino externo validado contra DNS rebinding no guard compartilhado|Conforme|01|—|IPs privados/loopback e redirects revalidados em testes offline|src/shared/security/urlGuard.ts:73–78|
|DT-06 Segurança e privacidade|DT-06-05 Verificar cookie/sessão/CSRF e cross-tenant com teste negativo real|Não verificado|01|—|Suíte isolada demonstra sessão expirada, Origin hostil e recurso cruzado negados|src/shared/security/csrfGuard.ts:59–64|
|DT-24 Cache|DT-24-01 Definir TTL configurável e positivo do cache de fornecedores|Conforme|01|—|Valores inválidos usam 1h e expiração observada em clock falso|src/features/prospecting/services/providerCache.ts:30–35|
|DT-24 Cache|DT-24-02 Limitar crescimento do fallback de cache de fornecedores em memória|Conforme|01|—|501 entradas expulsam mais antiga e cache expirado não é retornado|src/features/prospecting/services/providerCache.ts:61–66|
|DT-24 Cache|DT-24-03 Vincular cache do orçamento de IA ao tenant e mês|Conforme|01|—|Dois tenants e meses distintos nunca compartilham custo cacheado|src/lib/ai/budget.ts:178–183|
|DT-24 Cache|DT-24-04 Propagar falha Redis como miss com fallback em memória explícito|Conforme|01|—|Teste Redis indisponível preserva fetcher e observabilidade sem lançar segredo|src/features/prospecting/services/providerCache.ts:130–135|
|DT-24 Cache|DT-24-05 Validar consistência de invalidação entre múltiplos processos|Não verificado|01|—|Teste dois processos com Redis demonstra TTL/miss/invalidação consistente|src/features/prospecting/services/providerCache.ts:66–71|
|DT-28 Billing|DT-28-01 Verificar enforcement financeiro de voz em fluxo atual, distinguindo legado desativado|Não verificado|01|—|Identificar produto/rota atual autorizada para cobrança e testar limite real antes de afirmar gap financeiro ativo.|src/lib/voice-hub/services/billingService.ts:263–268; src/bootstrap/routes.ts:200–204|
|DT-28 Billing|DT-28-02 Aplicar transação atômica de saldo e lançamento com incremento|Conforme|01|—|Teste DB rollback/concor­rência comprova saldo e lançamentos consistentes|src/lib/voice-hub/repositories/billingRepository.ts:102–107|
|DT-28 Billing|DT-28-03 Retornar erro explícito para proração não suportada no serviço legado|Conforme|01|—|next_cycle segue erro explícito enquanto módulo legado indisponível; promessa financeira ativa exige nova validação.|src/lib/voice-hub/services/billingService.ts:196–201; src/bootstrap/routes.ts:200–204|
|DT-28 Billing|DT-28-04 Manter fim de período dentro do próximo mês no dia válido mais próximo|Não conforme|12|DEBT-20261014-BILL-003|31 janeiro mensal resulta fim fevereiro; leap-day anual segue regra publicada|src/lib/voice-hub/services/billingService.ts:149–154|
|DT-28 Billing|DT-28-05 Verificar deduplicação concorrente de lançamento monetário por idempotencyKey|Não verificado|01|—|Mesmo tenant/chave retorna lançamento original sem crédito duplo; diferente payload detectado|src/lib/voice-hub/repositories/billingRepository.ts:67–72|
|DT-29 Onboarding|DT-29-01 Exigir ADMIN nas mutações de módulos/onboarding por organização|Conforme|01|—|ADMIN autorizado e VISUALIZADOR/SDR negados em teste HTTP isolado|src/features/organization-modules/routes/organizationModules.routes.ts:41–46|
|DT-29 Onboarding|DT-29-02 Rejeitar chave de módulo desconhecida e preservar módulos obrigatórios|Conforme|01|—|Chave inválida 400 e desativação obrigatório 409, teste service|src/features/organization-modules/services/organizationModules.service.ts:21–26|
|DT-29 Onboarding|DT-29-03 Preservar duas alterações simultâneas de seleção de módulos|Não conforme|01|DEBT-20261014-ONB-001|Teste simultâneo de enable(A)/enable(B) preserva ambas via CAS/lock/transação|src/features/organization-modules/services/organizationModules.service.ts:69–74|
|DT-29 Onboarding|DT-29-04 Persistir conclusão de onboarding com timestamp idempotente|Conforme|01|—|Repetir conclusão preserva timestamp original e reload lê banco|src/features/organization-modules/services/organizationModules.service.ts:120–125|
|DT-29 Onboarding|DT-29-05 Comprovar rollback de provisionamento Organization se User falhar no signup|Não verificado|01|—|Teste falha de User após Organization não deixa tenant órfão ou documenta cleanup|src/lib/auth.ts:340–345|
|DT-30 Identidade e permissões|DT-30-01 Extrair tenant exclusivamente da sessão e rejeitar usuário sem organização|Conforme|01|—|Payload/header de tenant manipulado não altera tenant da sessão em teste negativo|src/shared/middlewares/authenticateToken.ts:55–60|
|DT-30 Identidade e permissões|DT-30-02 Impedir atribuição de role/organizationId pelo payload público de signup|Conforme|01|—|Signup com role ADMIN/tenant alheio ignorado/rejeitado salvo fundador próprio|src/lib/auth.ts:279–284|
|DT-30 Identidade e permissões|DT-30-03 Negar papel desconhecido por nível zero canônico|Conforme|01|—|Papel inválido nunca satisfaz nenhum allowedRole real|src/lib/auth/authorization.ts:53–58|
|DT-30 Identidade e permissões|DT-30-04 Bloquear login depois de cinco falhas e evitar reextensão indefinida|Conforme|01|—|Clock falso prova 15min, sucesso limpa contador, tentativa bloqueada não reconta|src/lib/auth.ts:19–24|
|DT-30 Identidade e permissões|DT-30-05 Revogar sessões após reset de senha confirmado|Conforme|01|—|Teste offline do fornecedor comprova sessão anterior inválida após reset|src/lib/auth.ts:104–109|
|DT-38 Migrações|DT-38-01 Manter SQL novo aditivo/default em alterações ExternalCrmConnection|Conforme|01|—|Dados existentes migrados preservam payload e outbound false|prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql:20–25|
|DT-38 Migrações|DT-38-02 Forçar política tenant simétrica na criação ExternalEntityLink|Conforme|01|—|Banco isolado aplica FORCE e USING/WITH CHECK impede tenant cruzado|prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql:108–113|
|DT-38 Migrações|DT-38-03 Revalidar inventário histórico de DROP sem editar migrations aplicadas|Conforme|01|—|Inventário/runbook existem; restore prático só considerado validado com drill autorizado|docs/security/runbooks/DESTRUCTIVE_MIGRATIONS_INVENTORY.md:5–10|
|DT-38 Migrações|DT-38-04 Comprovar schema/migration drift inexistente em banco isolado|Não verificado|01|—|prisma migrate diff exit0 após histórico aplicado no banco de teste|package.json:83–88|
|DT-38 Migrações|DT-38-05 Usar conexão CLI estável via DIRECT_URL/session pooler|Conforme|01|—|DIRECT_URL preferida e endpoint transaction-mode convertido apenas para CLI|prisma.config.ts:18–23|
|DT-03 Frontend e UX|DT-03-01 Rotas de negócio são carregadas via lazy e Suspense|Conforme|02|—|Todas rotas principais evitam import inicial eager de feature.|src/App.tsx:46–46|
|DT-03 Frontend e UX|DT-03-02 Layout principal possui landmark main|Conforme|03|—|Conteúdo principal exposto como landmark único do layout.|src/components/layout/MainLayout.tsx:56–56|
|DT-03 Frontend e UX|DT-03-03 Modal compartilhado usa primitivas e nome de fechamento|Conforme|03|—|Contrato semântico de modal e nome de fechamento presentes; gesto verificado separadamente.|src/components/ui/Dialog.tsx:64–64|
|DT-03 Frontend e UX|DT-03-04 Foco visual global existe no CSS|Conforme|03|—|Elementos focáveis possuem indicador de foco em estilos base.|src/styles/globals.css:1106–1106|
|DT-03 Frontend e UX|DT-03-05 Jornada de teclado e contraste em telas principais|Não verificado|03|—|Tab/ShiftTab/Escape/restauração de foco e contraste WCAG2.2AA medidos.|src/components/ui/Dialog.tsx:48–48|
|DT-18 Compatibilidade|DT-18-01 Runtimes suportados declarados no manifesto|Conforme|08|—|Manifest declara runtime; compatibilidade efetiva verificada por CI separadamente.|package.json:7–7|
|DT-18 Compatibilidade|DT-18-02 Config PWA nega fallback HTML para API/webhook|Conforme|09|—|Navegação de API/webhook não recebe fallback HTML do SW.|vite.config.ts:77–77|
|DT-18 Compatibilidade|DT-18-03 OCR apresenta fallback quando câmera não é permitida|Conforme|05|—|Falha camera gera instrução acionável e entrada de arquivo disponível.|src/features/prospecting/components/prospecting-hub/OcrCapturePanel.tsx:116–116|
|DT-18 Compatibilidade|DT-18-04 Build Android e APIs WebView suportadas em dispositivo|Não verificado|09|—|Artefato Android inicia/login/camera e fluxo CRM real em dispositivo.|android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:47–47|
|DT-18 Compatibilidade|DT-18-05 Nomes do diagnóstico coincidem entre web e deep link|Não conforme|09|DEBT-20261014-UX-005|Catálogo nativo e rota web possuem destino canônico idêntico.|android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:61–61|
|DT-23 Desempenho|DT-23-01 Paginação de empresas limita linhas renderizadas|Conforme|04|—|Lista usa limite/paginação explícito; sem certificar custo das relações incluídas.|src/features/companies/components/CompanyList.tsx:76–76|
|DT-23 Desempenho|DT-23-02 Paginação de contatos limita linhas renderizadas|Conforme|04|—|Listagem não requisita todos contatos sem limite.|src/features/contacts/components/ContactList.tsx:57–57|
|DT-23 Desempenho|DT-23-03 Vendor ECharts possui chunk dedicado|Conforme|23|—|Pacote pesado de charts é separado no bundler; tamanho real exige build.|vite.config.ts:159–159|
|DT-23 Desempenho|DT-23-04 Tour não inicia import 3D para usuário que já o viu|Conforme|02|—|Tour ausente não dispara import do respectivo componente.|src/App.tsx:344–344|
|DT-23 Desempenho|DT-23-05 Latência e memória com carga isolada de CRM|Não verificado|23|—|P95/CPU/memória e query plan medidos com volume representativo autorizado.|src/features/companies/infra/PrismaCompanyRepository.ts:73–73|
|DT-31 Analytics|DT-31-01 Agregações excluem soft-delete e filtram tenant|Conforme|04|—|Contratos lidos usam organização e soft-delete; teste cruzado separado.|src/features/analytics/infra/PrismaAnalyticsRepository.ts:13–13|
|DT-31 Analytics|DT-31-02 Falhas de agregação devem ser observáveis|Não conforme|04|DEBT-20261014-UX-003|Falha retorna estado error observável; vazio apenas após consulta válida.|src/features/analytics/presentation/AnalyticsController.ts:56–56|
|DT-31 Analytics|DT-31-03 CSV de cohort usa mesmas linhas da agregação|Conforme|04|—|Export preserva valores da mesma agregação; teste HTTP separado.|src/features/analytics/application/AnalyticsUseCases.ts:50–50|
|DT-31 Analytics|DT-31-04 SSE comercial restringe evento à organização|Conforme|04|—|Eventos fora do tenant não são escritos pelo listener.|src/features/analytics/routes/events.routes.ts:25–25|
|DT-31 Analytics|DT-31-05 Consentimento/base legal e minimização da telemetria de produto|Não verificado|21|—|Mapear base legal, payload real, retenção e mecanismo de preferência.|src/lib/analytics/posthog-client.ts:5–5|
|DT-32 Internacionalização|DT-32-01 Documento raiz define idioma pt-BR|Conforme|02|—|Leitor e browser recebem lang da página.|index.html:2–2|
|DT-32 Internacionalização|DT-32-02 Moeda comercial possui formato pt-BR e BRL por padrão|Conforme|04|—|Valores reais formatam BRL e null retorna Não disponível.|src/features/commercial-intelligence/presentation/formatMetrics.ts:1–1|
|DT-32 Internacionalização|DT-32-03 Mês financeiro da API respeita Brasília|Não conforme|04|DEBT-20261014-UX-004|API/export/métricas agrupam mesmo instante pelo mês comercial.|src/features/analytics/application/AnalyticsUseCases.ts:23–23|
|DT-32 Internacionalização|DT-32-04 Tabela temporal canônica define calendário comercial|Conforme|18|—|Contrato declara timezone e intervalo start/end; uso efetivo avaliado à parte.|src/shared/time/brazilCalendar.ts:2–2|
|DT-32 Internacionalização|DT-32-05 Calendário renderiza datas em fusos de browser diferentes|Não verificado|04|—|Mesmo agendamento conserva data/hora comercial UTC e SãoPaulo.|src/features/calendar/components/Calendar.tsx:299–299|
|DT-33 SEO|DT-33-01 Página pública principal fornece title e description estáticos|Conforme|11|—|HTML inicial público tem metadados básicos legíveis sem JS.|index.html:14–14|
|DT-33 SEO|DT-33-02 Landing independente fornece idioma e description|Conforme|11|—|Documento de landing tem title/description/idioma.|landing/index.html:8–8|
|DT-33 SEO|DT-33-03 Conteúdo público é indexável após renderização e sem vazamento autenticado|Não verificado|11|—|Crawler recebe conteúdo público e não recebe PII de rotas protegidas.|src/App.tsx:595–595|
|DT-33 SEO|DT-33-04 URLs canônicas/sitemap/robots atendem domínio real|Não verificado|11|—|Validar sitemap/robots/canonical no host autorizado e domínio canônico.|index.html:4–4|
|DT-33 SEO|DT-33-05 Metadados de compartilhamento refletem página pública|Não verificado|11|—|Fetch de crawler social retorna og:title/description/image válidos e sem conteúdo autenticado.|landing/index.html:3–3|
|DT-34 Mobile e PWA|DT-34-01 Manifest referencia ícones presentes no inventário|Não conforme|09|DEBT-20261014-UX-006|URLs192/512 e atalhos existem no artefato.|vite.config.ts:30–30|
|DT-34 Mobile e PWA|DT-34-02 Cache offline não atravessa identidade autenticada|Não conforme|09|DEBT-20261014-UX-001|Cache autenticado isolado por usuário/tenant e limpo na troca.|vite.config.ts:61–61|
|DT-34 Mobile e PWA|DT-34-03 Release Android evita cleartext na configuração manifest principal|Conforme|09|—|Release não habilita tráfego HTTP indiscriminado; manifest merged verificado no build à parte.|android/app/src/main/AndroidManifest.xml:10–10|
|DT-34 Mobile e PWA|DT-34-04 Interface modal limita altura dinâmica no mobile|Conforme|03|—|Superfície usa viewport dinâmica e scroll interno; screenshot separado.|src/components/ui/Dialog.tsx:23–23|
|DT-34 Mobile e PWA|DT-34-05 Responsividade real360/390/768/1440 e offline|Não verificado|09|—|Sem overflow/perda de ação em breakpoints; offline explícito em telas críticas.|tests/e2e/mobile-sweep.spec.ts:1–1|
|DT-36 Busca|DT-36-01 Meilisearch injeta filtro de tenant em empresas|Conforme|04|—|Consulta gerada contém organização fornecida pelo backend.|src/lib/search/index.ts:86–86|
|DT-36 Busca|DT-36-02 Falha Meili retorna sentinel distinto de zero resultados|Conforme|04|—|Falha usa Postgres e resposta vazia legítima não é sobrescrita.|src/lib/search/index.ts:94–94|
|DT-36 Busca|DT-36-03 Paginação e total são preservados no motor full-text|Não conforme|04|DEBT-20261014-UX-002|Páginas1..N cobrem todos hits ordenados com total correto.|src/features/companies/infra/PrismaCompanyRepository.ts:44–44|
|DT-36 Busca|DT-36-04 Busca textual indisponível não produz falso sem resultados|Não conforme|07|DEBT-20261014-UX-007|Erro distingue indisponibilidade total de ausência de documento.|src/features/knowledge/search.service.ts:178–178|
|DT-36 Busca|DT-36-05 Relevância e recuperação cross-tenant de busca híbrida|Não verificado|07|—|Golden dataset sintético mede relevância e garante nenhum hit de outro tenant.|src/features/knowledge/search.service.ts:43–43|
|DT-37 Arquivos|DT-37-01 Upload de conhecimento tem schema e papéis de escrita|Conforme|07|—|Título/nome/payload e papéis validados; autorização raiz sob responsabilidade01.|src/features/knowledge/knowledge.routes.ts:293–293|
|DT-37 Arquivos|DT-37-02 Extração PDF limita páginas e conteúdo resultante|Conforme|07|—|Parsing limita páginas/texto; carga/ZIP bomb exige teste separado.|src/features/knowledge/knowledge.routes.ts:63–63|
|DT-37 Arquivos|DT-37-03 Erro de formato de upload retorna400 e interrompe ingestão|Conforme|07|—|Formato não suportado/extrator inválido não é apresentado como sucesso.|src/features/knowledge/knowledge.routes.ts:305–305|
|DT-37 Arquivos|DT-37-04 Exclusão de documento usa organização e cascade esperado|Parcialmente conforme|07|—|Só tenant dono exclui documento e seus chunks desaparecem.|src/features/knowledge/ingestion.service.ts:324–324|
|DT-37 Arquivos|DT-37-05 URLs de objeto aplicam acesso e expiração no fluxo real|Não verificado|01|—|URL inacessível para tenant alheio, expira e respeita exclusão/retentiva.|src/lib/storage/index.ts:49–49|
|DT-39 Produto|DT-39-01 Rotas de configurações de pilar anunciam ausência de persistência|Conforme|02|—|Prévia não afirma que salvou; não contada como recurso entregue.|src/features/settings/components/PillarSettingsPlaceholder.tsx:792–792|
|DT-39 Produto|DT-39-02 Administração equipe exige papel na rota frontend|Conforme|02|—|URL direta encontra gate visual de papel; autorização backend testada separadamente.|src/App.tsx:478–478|
|DT-39 Produto|DT-39-03 Configuração inicial exige ADMIN na composição|Conforme|02|—|Sessão nãoADMIN recebe bloqueio; validação real separada.|src/App.tsx:636–636|
|DT-39 Produto|DT-39-04 Destino desconhecido gera fallback de navegação determinado|Conforme|02|—|Rota desconhecida termina em destino existente sem tela branca; experiência erro dedicada não exigida.|src/App.tsx:534–534|
|DT-39 Produto|DT-39-05 Salvar CRM persiste e sobrevive reload com erro/retry|Não verificado|22|—|Entrada sintética salva/recarrega; inválida não salva; falha gera erro; tenant alheio negado.|src/features/companies/infra/PrismaCompanyRepository.ts:93–93|
|DT-09 Integrações externas|DT-09-01 Timeout cobre também leitura de corpo Bitrix|Não conforme|06|DEBT-20261014-INT-001|Mock entrega headers e bloqueia corpo; operação deve abortar em15s.|src/features/integrations/bitrix/service/client.ts:159–216|
|DT-09 Integrações externas|DT-09-02 Retry diferencia429,5xx de401/403|Conforme|06|—|Testes client.test demonstram quatro tentativas transientes e nenhuma extra em401.|src/features/integrations/bitrix/service/client.ts:192–196|
|DT-09 Integrações externas|DT-09-03 Paginação automática segue cursor e registra limite|Conforme|06|—|Mock três páginas; alcançar terceira e sinalizar pagesExhausted false no limite.|src/features/integrations/bitrix/service/leads.ts:186–190|
|DT-09 Integrações externas|DT-09-04 OAuth renova token e delimita timeout|Conforme|06|—|Mock token expirado renova; provedor travado gera erro no timeout configurado.|src/features/integrations/google/google.service.ts:221–225|
|DT-09 Integrações externas|DT-09-05 Webhook voz exige assinatura e proteção replay|Conforme|12|—|Assinatura ausente/inválida e timestamp antigo negados; replay não duplica efeito.|src/features/integrations/birth-voice/birthVoice.webhook.ts:299–303|
|DT-10 Inteligência artificial|DT-10-01 Gateway fallback só por providers configurados|Conforme|07|—|Mocks provedor indisponível e alternativo válido; resposta somente do alternativo real.|src/lib/ai/gateway/chat-model.ts:78–82|
|DT-10 Inteligência artificial|DT-10-02 Streaming respeita quotas por tier como invoke|Não conforme|07|DEBT-20261014-AI-001|Quota excedida impede streaming premium antes fetch e usa mesma política do invoke.|src/lib/ai/gateway/streaming.ts:32–36|
|DT-10 Inteligência artificial|DT-10-03 Circuit breaker registra falhas de streaming|Conforme|07|—|Mock fetch e reader falhando; contador incrementa; circuito aberto impede chamada.|src/lib/ai/gateway/streaming.ts:68–72|
|DT-10 Inteligência artificial|DT-10-04 Saída IA tem checagem PII|Conforme|13|—|Saída com PII sintética dispara bloqueio e saída sem PII mantém comportamento.|src/lib/ai/gateway/chat-model.ts:166–170|
|DT-10 Inteligência artificial|DT-10-05 Avaliações reais de modelos no ambiente autorizado|Não verificado|07|—|Executar dataset versionado com sandbox LLM e registrar precisão,latência,custo e falhas.|package.json:84–88|
|DT-16 Configuração|DT-16-01 NODE_ENV obrigatório validado por enum|Conforme|01|—|Subprocesso sem NODE_ENV ou valor inválido sai nãozero.|src/config/env.ts:10–14|
|DT-16 Configuração|DT-16-02 Bypass de auth proibido em produção|Conforme|01|—|Subprocesso produção+flag true aborta;test/dev seguem contrato.|src/config/env.ts:355–359|
|DT-16 Configuração|DT-16-03 Janela de discagem validada start<end|Conforme|12|—|start18/end9 rejeitado;start9/end18 aceito.|src/config/env.ts:337–341|
|DT-16 Configuração|DT-16-04 Retenção extração tem limite configurado|Conforme|06|—|Zero/negativo rejeitado;positivo aceito e worker aplica prazo.|src/config/env.ts:275–279|
|DT-16 Configuração|DT-16-05 Consistência valores efetivos de env deploy|Não verificado|10|—|Comparar inventário sanitizado de nomes/defaults com ambiente autorizado sem revelar valores secretos.|src/config/env.ts:342–346|
|DT-19 Observabilidade|DT-19-01 Logs estruturados redigem chaves sensíveis|Conforme|15|—|Canário sintético password/token/headers não aparece em saída.|src/lib/logger.ts:35–39|
|DT-19 Observabilidade|DT-19-02 Classificação guard exige origem Redis|Não conforme|16|DEBT-20261014-OPS-006|Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error.|src/lib/process-guards.ts:48–52|
|DT-19 Observabilidade|DT-19-03 Alerta orçamento compara vetores compatíveis|Não conforme|10|DEBT-20261014-FIN-001|promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto.|infrastructure/observability/alert.rules.yml:260–264|
|DT-19 Observabilidade|DT-19-04 Instrumentação servidor precede bootstrap|Conforme|10|—|Iniciar sandbox e confirmar span HTTP com trace e duração;arquivo primeiro import verificado.|server.ts:1–5|
|DT-19 Observabilidade|DT-19-05 Alertas chegam operador|Não verificado|10|—|Em sandbox emitir alerta sintético e demonstrar entrega autorizada; não enviar nesta missão.|infrastructure/observability/alert.rules.yml:54–58|
|DT-20 Manutenção|DT-20-01 Atualizações dependências têm rotina semanal|Conforme|08|—|Configuração semanal presente e validar execução em histórico CI.|.github/dependabot.yml:6–6|
|DT-20 Manutenção|DT-20-02 Inventário detecta pré-release offline|Conforme|08|—|Rodar fixture lock com release/rc;rc identificado e release não marcado.|scripts/security/dependency-inventory.ts:9–13|
|DT-20 Manutenção|DT-20-03 Waivers de auditoria têm checker dedicado|Conforme|15|—|Checker deve falhar para waiver expirado e passar vigente.|package.json:47–51|
|DT-20 Manutenção|DT-20-04 SBOM com saída reproduzível declarado|Conforme|08|—|Executar SBOM offline com deps instaladas;comparar arquivos duas execuções.|package.json:48–52|
|DT-20 Manutenção|DT-20-05 Vulnerabilidades/deprecações atuais|Não verificado|15|—|npm audit no ambiente autorizado e inventário de deprecated com log install; sem rede/instalação nesta cópia.|package.json:205–209|
|DT-21 Disponibilidade|DT-21-01 Liveness separado de readiness|Conforme|10|—|DB offline liveness200/readiness503;com DB saudável readiness200.|src/bootstrap/healthchecks.ts:85–89|
|DT-21 Disponibilidade|DT-21-02 Readiness valida DB e Redis habilitado|Conforme|10|—|Mocks DB/Redis recusando retornam503;filas desabilitadas não tentam ping.|src/bootstrap/healthchecks.ts:31–35|
|DT-21 Disponibilidade|DT-21-03 Shutdown HTTP drena SSE sem deadlock|Não conforme|16|DEBT-20261014-OPS-007|SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes.|src/bootstrap/shutdown.ts:69–73|
|DT-21 Disponibilidade|DT-21-04 PDB expressa disponibilidade mínima|Conforme|10|—|helm template e teste minAvailable1 em web+worker;drain sandbox preserva réplica.|charts/birthhub-360/values.yaml:110–114|
|DT-21 Disponibilidade|DT-21-05 Worker tem deadline explícito no shutdown|Conforme|16|—|Worker fake preso sai dentro SHUTDOWN_TIMEOUT_MS,job preservado por retry.|src/bootstrap/workerServer.ts:189–193|
|DT-25 Filas e eventos|DT-25-01 Sync recorrente usa scheduler idempotente|Conforme|16|—|Chamar scheduler duas vezes cria uma agenda de15min no Redis sandbox.|src/lib/queue/bitrixSync.worker.ts:57–61|
|DT-25 Filas e eventos|DT-25-02 Falha final registra deadletter sanitizada|Conforme|16|—|Erro com segredo sintético não persiste segredo;chave reprocess estável para mesmo job.|src/lib/queue/deadLetter.ts:78–82|
|DT-25 Filas e eventos|DT-25-03 Métricas profundidade e falhas implementadas|Conforme|10|—|Job sandbox waiting/active/failed/completed reflete respectivos instrumentos.|src/lib/queue/metrics.ts:36–40|
|DT-25 Filas e eventos|DT-25-04 Tick Bitrix registra falhas por regra|Conforme|06|—|Mock regra falha e regra sucede;lastError/tentativa/métrica da falha persistem.|src/features/integrations/bitrix/service/syncRules.ts:241–245|
|DT-25 Filas e eventos|DT-25-05 Entrega única concorrente sob restart|Não verificado|16|—|Dois workers Redis isolado+restart não duplicam efeitos de mesma chave de negócio.|src/lib/queue/bitrixSync.worker.ts:28–32|
|DT-26 Custos cloud|DT-26-01 Requests e limits web/worker declarados|Conforme|10|—|Validar requests<=limits e helm template CPU/memória; não prova dimensionamento ativo.|charts/birthhub-360/values.yaml:68–72|
|DT-26 Custos cloud|DT-26-02 Autoscaling web delimita replicas|Conforme|10|—|Renderizar HPA min2/max10; carga sandbox somente com autorização.|charts/birthhub-360/values.yaml:79–83|
|DT-26 Custos cloud|DT-26-03 Recursos cloud ociosos medidos|Não verificado|10|—|Inventário cloud autorizado cruzado30dias utilização CPU/mem/storage para determinar ociosidade.|charts/birthhub-360/values.yaml:2–6|
|DT-26 Custos cloud|DT-26-04 Custos storage egress retenção calculados|Não verificado|10|—|Usar billing cloud e volume real de arquivos,retenção/egress e moeda; não inferir por código.|src/config/env.ts:287–291|
|DT-26 Custos cloud|DT-26-05 Dimensionamento worker validado por telemetria|Não verificado|23|—|Comparar p95 backlog/tempo processamento/memória com requests reais em sandbox autorizado.|charts/birthhub-360/values.yaml:115–119|
|DT-27 FinOps|DT-27-01 Custos IA atribuídos provider e tenant|Conforme|23|—|Mock duas organizações produz séries separadas; custos desconhecidos explicitamente marcados.|src/lib/ai/metrics.ts:19–23|
|DT-27 FinOps|DT-27-02 Teto mensal por org escopa consultas|Conforme|23|—|Mock A excedido bloqueia A sem afetarB;teste DB real posterior confirma RLS.|src/lib/ai/budget.ts:165–169|
|DT-27 FinOps|DT-27-03 Quota uso mensal escopada e cache por org/mês|Conforme|23|—|Virada mês recalc e A/B não compartilham cache.|src/lib/ai/finops/tokenQuota.service.ts:187–191|
|DT-27 FinOps|DT-27-04 Preço não cadastrado sinaliza fallback|Conforme|23|—|Modelo desconhecido incrementa contador e warn; preço conhecido mantém cálculo.|src/lib/ai/gateway/pricing.ts:35–39|
|DT-27 FinOps|DT-27-05 Reconciliação estimativa IA e fatura real|Não verificado|23|—|Comparar AILog agregado com billing sandbox autorizado e explicar divergência por modelo/moeda.|src/lib/ai/gateway/pricing.ts:11–15|
|DT-35 Notificações|DT-35-01 SMTP ausente retorna erro explícito|Conforme|05|—|Mock sem SMTP lança erro;SMTP configurado permite sendMail,nenhuma mensagem real nesta missão.|src/lib/email/mailer.ts:24–28|
|DT-35 Notificações|DT-35-02 Visibilidade notificação aplica tenant e destinatário|Conforme|01|—|A não lista organizaçãoB nem notificação pessoal de colega;broadcast visível no próprio tenant.|src/features/notifications/notification.service.ts:59–63|
|DT-35 Notificações|DT-35-03 Leitura broadcast individual por destinatário|Não conforme|02|DEBT-20261014-NOT-001|UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado.|src/features/notifications/notification.service.ts:94–98|
|DT-35 Notificações|DT-35-04 Exclusão broadcast restrita gerência|Conforme|01|—|Usuário sem gestão não exclui broadcast;ADMIN autorizado exclui;tenant estranho negado.|src/features/notifications/notification.service.ts:131–135|
|DT-35 Notificações|DT-35-05 Inbound email adaptado provedor real|Parcialmente conforme|06|—|Sandbox fornecedor valida assinatura/mapping tenant,replay e reply encerra cadência.|src/features/integrations/email/emailReply.webhook.ts:24–28|

## Achados canônicos

## DEBT-20261014-OPS-001 — 62 testes co-localizados ficam fora da descoberta unitária

Categoria: DT-08 — Testes e QA; relacionadas: DT-15. Módulo: testes. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P1; P1: Regressões nesses arquivos não são exercitadas pelo gate test:unit atual. Escopo comprovado estático; ocorrência de produção não medida.

Três globs incluem tests/unit e src/**/__tests__/**/*.test.ts;62 arquivos src de teste co-localizados fora __tests__ não correspondem.

Causa raiz: Três globs incluem tests/unit e src/**/__tests__/**/*.test.ts;62 arquivos src de teste co-localizados fora __tests__ não correspondem.

Impacto: Regressões nesses arquivos não são exercitadas pelo gate test:unit atual.

Evidências:

- vitest.unit.config.ts:35–39 — Três globs incluem tests/unit e src/**/__tests__/**/*.test.ts;62 arquivos src de teste co-localizados fora __tests__ não correspondem. (SHA-256 fad33cccd22911b590ebe6712f5bf8a75bcd07f5d804f9ae0e19a9736687a1ef)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta para contrato estático. Estado: aberto; correção não iniciada.

Dono: 14; participantes: 00; esforço relativo: M (1–3 dias de engenharia com ambiente disponível); regressão: moderado.

Dependências:

- Autorização específica para remediação
- Ambiente descartável do14
- Revisão independente24

Remediação: Inventariar suites e incluir testes de produto no runner adequado,sem mascarar falhas novas.

Aceite: Descoberta lista todos testes previstos; sentinela em co-localizado falha runner; happy path passa.

Testes necessários:

- Descoberta lista todos testes previstos; sentinela em co-localizado falha runner; happy path passa.

Limitações:

- Produto e infraestrutura não executados
- Nenhuma correção aplicada

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-14-debt-20261014-ops-001.md

## DEBT-20261014-OPS-002 — Reinstalação Prisma na imagem permite resolver versão fora lock

Categoria: DT-17 — Build; relacionadas: DT-07, DT-20. Módulo: build. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; P2: Imagem pode variar entre builds do mesmo commit e divergir CLI/client. Escopo comprovado estático; ocorrência de produção não medida.

npm prune remove CLI e npm install --no-save utiliza range do manifesto(^7.10.0),sem versão exata do lock.

Causa raiz: npm prune remove CLI e npm install --no-save utiliza range do manifesto(^7.10.0),sem versão exata do lock.

Impacto: Imagem pode variar entre builds do mesmo commit e divergir CLI/client.

Evidências:

- Dockerfile:43–47 — npm prune remove CLI e npm install --no-save utiliza range do manifesto(^7.10.0),sem versão exata do lock. (SHA-256 01742c5c8766532880f64e45918e6140256c1be3e390822b32cba2a15d4102a9)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta para contrato estático. Estado: aberto; correção não iniciada.

Dono: 08; participantes: 00; esforço relativo: M (1–3 dias de engenharia com ambiente disponível); regressão: moderado.

Dependências:

- Autorização específica para remediação
- Ambiente descartável do14
- Revisão independente24

Remediação: Preservar CLI necessária ou instalar versão exata e árvore determinada pelo lock.

Aceite: Build isolado sem resolução semver adicional; CLI/client iguais ao lock; migrate falha bloqueia boot.

Testes necessários:

- Build isolado sem resolução semver adicional; CLI/client iguais ao lock; migrate falha bloqueia boot.

Limitações:

- Produto e infraestrutura não executados
- Nenhuma correção aplicada

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-08-debt-20261014-ops-002.md

## DEBT-20261014-OPS-003 — Contexto Docker não exclui cópias e artefatos temporários locais

Categoria: DT-07 — Infraestrutura e DevOps; relacionadas: DT-17, DT-23. Módulo: container. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; P2: Build pode transferir cópias de repo e artefatos não necessários,aumentando contexto e prejudicando reprodutibilidade. Segredos nesses diretórios não foram examinados nem alegados. Escopo comprovado estático; ocorrência de produção não medida.

Exclusões não cobrem .worktrees/ e .tmp/ e builder usa COPY . .; checkout local possui esses diretórios.

Causa raiz: Exclusões não cobrem .worktrees/ e .tmp/ e builder usa COPY . .; checkout local possui esses diretórios.

Impacto: Build pode transferir cópias de repo e artefatos não necessários,aumentando contexto e prejudicando reprodutibilidade. Segredos nesses diretórios não foram examinados nem alegados.

Evidências:

- .dockerignore:1–5 — Exclusões não cobrem .worktrees/ e .tmp/ e builder usa COPY . .; checkout local possui esses diretórios. (SHA-256 a83080517695a0514cc23f9a498d3e8ab3547e050ae53e17efea0a2372d0af59)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta para contrato estático. Estado: aberto; correção não iniciada.

Dono: 08; participantes: 00; esforço relativo: M (1–3 dias de engenharia com ambiente disponível); regressão: moderado.

Dependências:

- Autorização específica para remediação
- Ambiente descartável do14
- Revisão independente24

Remediação: Excluir diretórios efêmeros do contexto e verificar manifest de arquivos de build.

Aceite: Fixture .tmp/.worktrees desaparece do contexto enquanto migrations e fontes necessárias permanecem.

Testes necessários:

- Fixture .tmp/.worktrees desaparece do contexto enquanto migrations e fontes necessárias permanecem.

Limitações:

- Produto e infraestrutura não executados
- Nenhuma correção aplicada

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-08-debt-20261014-ops-003.md

## DEBT-20261014-OPS-004 — Aceite do restore drill ignora status Prisma e limite RTO

Categoria: DT-22 — Recuperação; relacionadas: DT-08, DT-19, DT-38. Módulo: recuperação. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P1; P1: Ferramenta pode reportar PASS apesar de migration status em erro ou restauração acima SLA; não foi executado restore real. Escopo comprovado estático; ocorrência de produção não medida.

Predicate pass omite status de migration e limiteRTO900;RPO é string fixa e contagem de tabelas pode omitir falhas por catch.

Causa raiz: Predicate pass omite status de migration e limiteRTO900;RPO é string fixa e contagem de tabelas pode omitir falhas por catch.

Impacto: Ferramenta pode reportar PASS apesar de migration status em erro ou restauração acima SLA; não foi executado restore real.

Evidências:

- scripts/backup/run-backup-restore-drill.ts:298–302 — Predicate pass omite status de migration e limiteRTO900;RPO é string fixa e contagem de tabelas pode omitir falhas por catch. (SHA-256 1bd54812e9dece3f63bdf8771520a3f78a92519b8a19ff49e114e8e0ee313c29)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta para contrato estático. Estado: aberto; correção não iniciada.

Dono: 10; participantes: 00; esforço relativo: M (1–3 dias de engenharia com ambiente disponível); regressão: moderado.

Dependências:

- Autorização específica para remediação
- Ambiente descartável do14
- Revisão independente24

Remediação: Bloquear erro de schema/tabelas e extrapolaçãoRTO; medirRPO por backup real; separar referencial de provaRLS.

Aceite: Mocks migrationFAIL/restore901s/tabela ausente=>FAIL;cenário completo900s=>PASS; banco descartável prova RLS A/B.

Testes necessários:

- Mocks migrationFAIL/restore901s/tabela ausente=>FAIL;cenário completo900s=>PASS; banco descartável prova RLS A/B.

Limitações:

- Produto e infraestrutura não executados
- Nenhuma correção aplicada

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-10-debt-20261014-ops-004.md

## DEBT-20261014-GOV-001 — Leitura obrigatória referencia plano de ondas ausente

Categoria: DT-11 — Documentação; relacionadas: DT-12, DT-13. Módulo: governança. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P3; P3: Novo coordenador não consegue cumprir a sequência de reconhecimento obrigatória através da referência atual. Escopo comprovado estático; ocorrência de produção não medida.

Prompt00 e README apontam EXECUCAO-ONDAS.md inexistente no snapshot/checkout; decisões de prompt são humanas.

Causa raiz: Prompt00 e README apontam EXECUCAO-ONDAS.md inexistente no snapshot/checkout; decisões de prompt são humanas.

Impacto: Novo coordenador não consegue cumprir a sequência de reconhecimento obrigatória através da referência atual.

Evidências:

- .agents/prompts/00-coordenador.md:13–17 — Prompt00 e README apontam EXECUCAO-ONDAS.md inexistente no snapshot/checkout; decisões de prompt são humanas. (SHA-256 174af07325553a891c4a9fa2e039568b4f375162991701952012434bdd5e0b7e)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta para contrato estático. Estado: aberto; correção não iniciada.

Dono: 00; participantes: 00; esforço relativo: M (1–3 dias de engenharia com ambiente disponível); regressão: moderado.

Dependências:

- Autorização específica para remediação
- Ambiente descartável do14
- Revisão independente24

Remediação: Preparar decisão humana de governança para referência canônica;não editar prompt sem autorização.

Aceite: Verificador de links obrigatórios resolve fonte versionada e revisão humana aprovada.

Testes necessários:

- Verificador de links obrigatórios resolve fonte versionada e revisão humana aprovada.

Limitações:

- Produto e infraestrutura não executados
- Nenhuma correção aplicada

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-00-debt-20261014-gov-001.md

## DEBT-20261014-GOV-002 — Política local-first conflita com publicação automática GHCR

Categoria: DT-13 — Governança; relacionadas: DT-11, DT-40. Módulo: CI/documentação. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; P2: Operação externa de publicação pode ocorrer quando documentação afirma pipelines suspensos; política de distribuição torna-se ambígua. Escopo comprovado estático; ocorrência de produção não medida.

GuiaLOCAL_FIRST afirma suspensão dos pipelines cloud; workflow de publicação tem gatilho workflow_run main ativo apósCI. Publicação de imagem não prova deploy.

Causa raiz: GuiaLOCAL_FIRST afirma suspensão dos pipelines cloud; workflow de publicação tem gatilho workflow_run main ativo apósCI. Publicação de imagem não prova deploy.

Impacto: Operação externa de publicação pode ocorrer quando documentação afirma pipelines suspensos; política de distribuição torna-se ambígua.

Evidências:

- .github/workflows/docker-publish.yml:11–15 — GuiaLOCAL_FIRST afirma suspensão dos pipelines cloud; workflow de publicação tem gatilho workflow_run main ativo apósCI. Publicação de imagem não prova deploy. (SHA-256 4401fab071bc3f9c423736e55f6c2bc262c56a9f64f7ec50ed7847bd2bc1b142)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta para contrato estático. Estado: aberto; correção não iniciada.

Dono: 00; participantes: 00; esforço relativo: M (1–3 dias de engenharia com ambiente disponível); regressão: moderado.

Dependências:

- Autorização específica para remediação
- Ambiente descartável do14
- Revisão independente24

Remediação: Decidir explicitamente se publicaçãoGHCR é permitida durante freeze e alinhar política/gatilho via08.

Aceite: Fixture eventoCI main comprova publish habilitado/desabilitado conforme decisão;nenhum deploy real necessário.

Testes necessários:

- Fixture eventoCI main comprova publish habilitado/desabilitado conforme decisão;nenhum deploy real necessário.

Limitações:

- Produto e infraestrutura não executados
- Nenhuma correção aplicada

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-00-debt-20261014-gov-002.md

## DEBT-20261014-SEC-001 — URLs de autenticação sensíveis são escritas em logs no fallback sem SMTP

Categoria: DT-06 — Segurança e privacidade; relacionadas: DT-19, DT-30. Módulo: auth. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Vulnerabilidade de segurança. Prioridade: P1; P1 por credencial transitória de autenticação em sink de logs sob falha SMTP; não P0 pois exposição/log access efetivos não medidos.

Fallback MailerNotConfiguredError registra objeto email/url e interpola URL em msg; redaction do logger não cobre esses campos nem texto da mensagem.

Causa raiz: Logs recebem credencial transitória e PII; não há sanitização de msg/url/email no sink.

Impacto: Leitor de logs com URL válida pode recuperar/verificar conta; condição SMTP ausente demonstrada por ramo estático, exposição efetiva de produção não verificada.

Evidências:

- src/lib/auth.ts:127–132 — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta. (SHA-256 afef6f8e12264675260d2e41f9a3f85dbf99ad155a8e757f498f0aa1d2fd876b)
- src/lib/logger.ts:36–41 — Lista de redaction omite url/email/msg e não modifica URL interpolada em texto. (SHA-256 e2c2ecf23800749d2fb34179414ed7fc7f409f16d30f06e3ca30a73d2d6201d1)
- src/lib/auth.ts:179–184 — Mesmo padrão no ramo SMTP ausente da verificação. (SHA-256 afef6f8e12264675260d2e41f9a3f85dbf99ad155a8e757f498f0aa1d2fd876b)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: Alta. Estado: aberto; correção não iniciada.

Dono: 01; participantes: 01, 15, 21; esforço relativo: Baixo; regressão: Médio.

Dependências:

- 15
- 21
- 12

Remediação: Remover URL e e-mail dos logs, emitir apenas userId/código de configuração ausente, falhar de modo observável.

Aceite: SMTP ausente não emite URL/token nem e-mail, inclusive msg serializada

Testes necessários:

- SMTP ausente para reset e verificação não escreve token/URL/email; capturar objeto e msg
- SMTP disponível mantém envio válido

Limitações:

- Não medidos dados/configuração real de produção nem serviços externos; conclusão limitada à evidência citada.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-sec-001.md

## DEBT-20261014-CODE-001 — Signup executa user.count redundante para decidir ADMIN idêntico nos dois ramos

Categoria: DT-01 — Código-fonte; relacionadas: DT-23. Módulo: auth. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P3; P3 por custo localizado sem mudança funcional.

userCount é usado só por isFirstUser e ternário ADMIN/ADMIN.

Causa raiz: Lógica de primeiro usuário permaneceu após regra fundador sempre ADMIN.

Impacto: Uma consulta ao banco dispensável em cada cadastro; aumenta manutenção e duração de seção bootstrap.

Evidências:

- src/lib/auth.ts:345–350 — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta. (SHA-256 afef6f8e12264675260d2e41f9a3f85dbf99ad155a8e757f498f0aa1d2fd876b)
- src/lib/auth.ts:361–366 — Ambos os ramos geram ADMIN; contagem é observacionalmente redundante. (SHA-256 afef6f8e12264675260d2e41f9a3f85dbf99ad155a8e757f498f0aa1d2fd876b)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: Alta. Estado: aberto; correção não iniciada.

Dono: 01; participantes: 01; esforço relativo: Baixo; regressão: Baixo.

Dependências:

- 01

Remediação: Eliminar contagem e ternário redundante preservando regra aprovada de fundador.

Aceite: Signup mantém ADMIN fundador sem consulta global redundante

Testes necessários:

- Cadastro primeiro/segundo fundador gera mesmo papel e org própria sem user.count

Limitações:

- Não medidos dados/configuração real de produção nem serviços externos; conclusão limitada à evidência citada.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-code-001.md

## DEBT-20261014-PERF-001 — Resumo de consumo carrega todas as linhas AILog do período

Categoria: DT-04 — Backend e APIs; relacionadas: DT-23, DT-27. Módulo: usage. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; P2 por falha/custo recorrente de domínio sem comprovação de perda de dados, cobrança real ou violação multi-tenant.

findLogsSince usa findMany sem take e UsageUseCases.summary soma/agrupa logs em JavaScript.

Causa raiz: Agregação diária realizada em app em vez de SQL; consulta sem limite por período.

Impacto: Memória e transferência O(n) por consulta conforme chamadas de IA crescem; latência absoluta e volume real não medidos.

Evidências:

- src/features/billing/infra/PrismaUsageRepository.ts:11–16 — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta. (SHA-256 3abab283ecef443c21d4a09c1c2f80c8aef58029346537718e190b0ee866cac7)
- src/features/billing/application/UsageUseCases.ts:50–55 — Acumula toda lista obtida por findMany em memória. (SHA-256 f48ecbe53338844a21051a5f95d858e475bb4070436c7253e90af828fb8bc647)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: Alta. Estado: aberto; correção não iniciada.

Dono: 01; participantes: 01; esforço relativo: Médio; regressão: Médio.

Dependências:

- 23
- 07

Remediação: Agregação groupBy de dia com SQL ou paginação bounded preservando totais por modelo/prompt.

Aceite: Agregação diária SQL ou paginação bounded mantém resultados sem crescimento memória linear

Testes necessários:

- Comparar totals/daily contra fixtures de dias e fusos
- Orçamento memória/latência com dataset sintético volumoso

Limitações:

- Não medidos dados/configuração real de produção nem serviços externos; conclusão limitada à evidência citada.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-perf-001.md

## DEBT-20261014-BILL-003 — Função legada de renovação normaliza mês inválido e salta mês previsto

Categoria: DT-28 — Billing; relacionadas: DT-39. Módulo: billing. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P3; P3 por função defeituosa localizada em módulo legado desativado; sem exposição financeira atual comprovada.

Execução da função pura computePeriodEnd extraída do fonte: 2026-01-31 mensal =>2026-03-03; 2026-03-31 mensal =>2026-05-01; 2024-02-29 anual =>2025-03-01.

Causa raiz: Date.setMonth/setFullYear normaliza dias inválidos para mês seguinte sem clamp.

Impacto: Reutilizar serviço legado para faturamento carregaria cálculo incorreto de currentPeriodEnd. Bootstrap atual marca voice-hub indisponível; não há prova de efeito financeiro corrente.

Evidências:

- src/lib/voice-hub/services/billingService.ts:149–154 — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta. (SHA-256 17e52046a07998a72a68768290ecaa6148bbd4f9416af154463db16a01b697cf)
- src/bootstrap/routes.ts:200–204 — Bootstrap expõe módulo legado como indisponível; serviços de billing voce-hub não possuem caminho HTTP ativo demonstrado. (SHA-256 b8488dcc00a85752f042b282d7f10a4edca8346b95866ca79f76f6eb7ac5b6a2)

Exposição: Código legado desativado no bootstrap. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: Alta. Estado: aberto; correção não iniciada.

Dono: 12; participantes: 01; esforço relativo: Baixo; regressão: Baixo.

Dependências:

- 12
- 18

Remediação: Antes de reativar/reutilizar billing legado, fixar política de calendário e clamp de dia; não ampliar escopo nem reativar produto nesta auditoria.

Aceite: 31 janeiro mensal resulta fim fevereiro; leap-day anual segue regra publicada

Testes necessários:

- 31jan mensal encerra fevereiro
- 31mar mensal encerra abril
- 29fev anual segue regra explícita
- Dias normais preservam dia e hora

Limitações:

- Função pura reproduzida; módulo indisponível em rota atual. Nenhum pagamento ou sessão real executado.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-12-debt-20261014-bill-003.md

## DEBT-20261014-ONB-001 — Mutações concorrentes de módulos podem sobrescrever seleção anterior

Categoria: DT-29 — Onboarding; relacionadas: DT-04, DT-39. Módulo: onboarding. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P2; P2 por falha/custo recorrente de domínio sem comprovação de perda de dados, cobrança real ou violação multi-tenant.

mutate faz load->fn->save->get; repository.save usa upsertSetting integral sem versão/CAS no contrato. Reprodução isolada do corpo mutate original com repository in-memory e barrier: enable(optional-a)/enable(optional-b) ambos completam, resultado guarda optional-b e perde optional-a.

Causa raiz: Read-modify-write separado sem controle de versão ou trava por organização.

Impacto: enable(A) e enable(B) simultâneos podem ambos ler S e última gravação perder A ou B; somente mesmo tenant, sem prova de acesso cruzado.

Evidências:

- src/features/organization-modules/services/organizationModules.service.ts:69–74 — Inspeção estática do contrato indicado; não comprova configuração aplicada nem execução ponta a ponta. (SHA-256 95934b911dfdb756ab8d29226a2603eeee9df11dcfa2beda64229dce4411d213)
- src/features/organization-modules/infra/SettingOrganizationModulesRepository.ts:33–37 — save substitui JSON completo, sem versão no contrato do repositório. (SHA-256 ae2a71d765863dd26999459be1ef43c5c47cb8bf1531686ddc204c429c724b6a)
- src/lib/voice-hub/repositories/settingRepository.ts:19–23 — Atualização substitui JSON inteiro sem compare-and-swap. Repositório importado pelo onboarding atual apesar de pasta legacy. (SHA-256 44256f767570b3505456fd9b286daf4e5637b8e7deefe37c70062f265a59cae6)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: Alta. Estado: aberto; correção não iniciada.

Dono: 01; participantes: 01; esforço relativo: Médio; regressão: Médio.

Dependências:

- 02
- 01
- 18

Remediação: Executar transformação dentro de transação com lock por Setting ou CAS com retry limitado.

Aceite: Teste simultâneo de enable(A)/enable(B) preserva ambas via CAS/lock/transação

Testes necessários:

- Barrier test dois enables independentes preserva ambos
- Enable concorrente com completeOnboarding preserva timestamp e seleção

Limitações:

- Reprodução usa corpo original extraído e repositório em memória; banco/HTTP reais não executados. Teste prova algoritmo read-modify-write, não quantifica ocorrência em produção.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-onb-001.md

## DEBT-20261014-UX-001 — Cache PWA de CRM não é particionado por identidade autenticada

Categoria: DT-34 — Mobile e PWA; relacionadas: DT-24, DT-06, DT-30. Módulo: PWA / autenticação. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Risco operacional. Prioridade: P1; Em navegador compartilhado, resposta antiga pode ser servida antes da resposta da nova sessão; risco de confidencialidade e de mostrar informação obsoleta. Evidência do caminho atual, sem inferir exploração em produção.

Configuração StaleWhileRevalidate guarda respostas CRM por origem/URL no mesmo cache; logout não remove o conteúdo.

Causa raiz: Cache de respostas autenticadas tratado como cache público de assets.

Impacto: Em navegador compartilhado, resposta antiga pode ser servida antes da resposta da nova sessão; risco de confidencialidade e de mostrar informação obsoleta.

Evidências:

- vite.config.ts:61–66 — Cache fixo para GET CRM, por URL, sem identidade do usuário. (SHA-256 ee75f5fd85a49e033f9dfcb988c2c48d5a86e1990b89d8f35b81ace55ffeef51)
- src/contexts/AuthContext.tsx:118–128 — Logout encerra sessão e redireciona; não limpa CacheStorage. (SHA-256 62fad2d9e9afd732c621b3ab10b70ed42a822d01c2e6f0e226746ddd78c3dab9)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta (código); comportamento operacional não medido. Estado: aberto; correção não iniciada.

Dono: 09; participantes: 02, 09; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Evitar cache SW de dados autenticados ou particionar e invalidar explicitamente por sessão/tenant.

Aceite: Usuário B não recebe dados de A ao trocar sessão online/offline; estado stale é explícito.

Testes necessários:

- Duas contas e organizações sintéticas; mesma URL; logout/login; offline; verificar CacheStorage e corpo retornado.

Limitações:

- Configuração e ausência de limpeza no caminho de logout confirmadas; acesso cruzado real NÃO DEMONSTRADO, requer build e navegador isolado.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-001.md

## DEBT-20261014-UX-002 — Paginação full-text de empresas restringe resultados ao primeiro lote

Categoria: DT-36 — Busca; relacionadas: DT-04, DT-39. Módulo: Empresas / busca. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P2; Resultados além do primeiro lote tornam-se inalcançáveis; página 2 fica vazia quando Meili retorna no máximo limit IDs. Evidência do caminho atual, sem inferir exploração em produção.

Com ENABLE_SEARCH=true, o repositório pede os mesmos primeiros limit IDs em todas as páginas e só depois aplica skip no banco. Também conta só os IDs recuperados.

Causa raiz: Paginação aplicada duas vezes em contratos incompatíveis; total de busca perdido.

Impacto: Resultados além do primeiro lote tornam-se inalcançáveis; página 2 fica vazia quando Meili retorna no máximo limit IDs.

Evidências:

- src/features/companies/infra/PrismaCompanyRepository.ts:44–50 — Busca só limit IDs, sem page/offset. (SHA-256 e3ecdee11921bc6632d349dd6686702646323a5eb2df46b83097e60711d8c225)
- src/features/companies/infra/PrismaCompanyRepository.ts:66–81 — Aplica offset do PostgreSQL ao mesmo conjunto limitado; total também fica limitado. (SHA-256 e3ecdee11921bc6632d349dd6686702646323a5eb2df46b83097e60711d8c225)
- src/lib/search/index.ts:85–90 — Meili recebe limit sem offset. (SHA-256 7153e485e1cf600ce373d33854df3a3bd8e870ce123218354ad7795c57062681)
- src/features/companies/infra/PrismaCompanyRepository.ts:44–50 — Reprodução Node isolada exit0: 45hits, limite20:page1=20,page2=0,total=20 esperado45. (SHA-256 e3ecdee11921bc6632d349dd6686702646323a5eb2df46b83097e60711d8c225)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta; reprodução isolada com corpos atuais de função e dependências sintéticas. Estado: aberto; correção não iniciada.

Dono: 04; participantes: 02, 04; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Propagar paginação/total ao motor e preservar ordenação de relevância ou obter conjunto adequado sem aplicar segundo offset.

Aceite: Busca com 45 resultados e limite20 retorna páginas20/20/5, total45, sem duplicatas.

Testes necessários:

- Meili mock45 hits; páginas1,2,3; fallback indisponível; zero resultados; tenant distinto.

Limitações:

- Corpo atual executado após remover somente tipos TypeScript; mocks de serviços. HTTP,DB real e navegador NÃO EXECUTADOS.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-002.md

## DEBT-20261014-UX-003 — Analytics devolve sucesso e zeros após erro de agregação

Categoria: DT-31 — Analytics; relacionadas: DT-04, DT-19, DT-39. Módulo: Analytics. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P1; Usuário e monitoramento interpretam indisponibilidade como métricas reais zeradas; erro não observável nesses handlers. Evidência do caminho atual, sem inferir exploração em produção.

Endpoints metrics/overview/dashboard capturam qualquer exceção e devolvem dados vazios ou zerados com success:true.

Causa raiz: Confusão entre banco vazio e falha de banco/consulta.

Impacto: Usuário e monitoramento interpretam indisponibilidade como métricas reais zeradas; erro não observável nesses handlers.

Evidências:

- src/features/analytics/presentation/AnalyticsController.ts:24–54 — Catch substitui falha por success:true/HTTP200. (SHA-256 e32f26f6c51e2abccc9a4613c461e9fe0ebe319ab95aec98f2de95efa5f7cc74)
- src/features/analytics/presentation/AnalyticsController.ts:56–96 — Catch gera zeros e nulls sem propagar/logar erro. (SHA-256 e32f26f6c51e2abccc9a4613c461e9fe0ebe319ab95aec98f2de95efa5f7cc74)
- src/features/analytics/presentation/AnalyticsController.ts:87–147 — Catch gera isEmpty:true em caso de indisponibilidade. (SHA-256 e32f26f6c51e2abccc9a4613c461e9fe0ebe319ab95aec98f2de95efa5f7cc74)
- src/features/analytics/presentation/AnalyticsController.ts:24–54 — Reprodução Node isolada exit0: Repository.overview rejeita:status=200,success=true,totalCompanies=0. (SHA-256 e32f26f6c51e2abccc9a4613c461e9fe0ebe319ab95aec98f2de95efa5f7cc74)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta; reprodução isolada com corpos atuais de função e dependências sintéticas. Estado: aberto; correção não iniciada.

Dono: 04; participantes: 02, 04; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Propagar erro ao middleware e manter vazio apenas quando consulta bem-sucedida devolve vazio.

Aceite: Falha do repository retorna erro observável; banco vazio continua 200 com estado empty verdadeiro.

Testes necessários:

- Repository rejeita overview/dashboard/getMetrics; confirmar status não2xx/log e UI error/retry; repository vazio não gera erro.

Limitações:

- Corpo atual executado após remover somente tipos TypeScript; mocks de serviços. HTTP,DB real e navegador NÃO EXECUTADOS.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-003.md

## DEBT-20261014-UX-004 — Analytics ativo usa calendário UTC apesar do contrato comercial Brasília

Categoria: DT-32 — Internacionalização; relacionadas: DT-31, DT-02. Módulo: Analytics / calendário. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P2; Receita/contagem/cohort no início do mês divergem por três horas e pelo mês durante a virada; indicadores deixam de ser comparáveis. Evidência do caminho atual, sem inferir exploração em produção.

Rotas analytics usam Controller/UseCases via DI; UseCases calcula monthStart/monthKey em UTC enquanto serviço legado usa helper canônico Brasília.

Causa raiz: Migração para camada hexagonal não preservou calendário comercial.

Impacto: Receita/contagem/cohort no início do mês divergem por três horas e pelo mês durante a virada; indicadores deixam de ser comparáveis.

Evidências:

- src/features/analytics/application/AnalyticsUseCases.ts:22–30 — Mês inicia em UTC00:00. (SHA-256 6f1dc435482f2f237e723fe9036ab8347e5e6c64c2c20d3f82ca9b9aec90dcac)
- src/features/analytics/analytics.service.ts:86–98 — Serviço paralelo usa calendário Brasil. (SHA-256 a6dff5ce80e24d11b45f88cb0a5dadbd0a53468bfce428b9cc958893d1f0984b)
- src/shared/di/setup.ts:178–178 — DI instancia implementação UTC. (SHA-256 cd8bccda763de7a2024823aa715ee1a687f3386bab5dce7fb946421e8407849b)
- src/shared/time/brazilCalendar.ts:1–1 — Contrato de calendário America/Sao_Paulo. (SHA-256 24f48a0759118ac376d1828024182ef578cc19b94ff2552dad7003290032b42f)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta (código); comportamento operacional não medido. Estado: aberto; correção não iniciada.

Dono: 04; participantes: 02, 04; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Reutilizar calendário canônico na implementação realmente registrada e eliminar divergência contratual.

Aceite: Instante2026-10-01T01:00Z pertence a setembro comercial em todos os endpoints.

Testes necessários:

- Virada mensal00:00Z/03:00Z; dezembro/janeiro; host TZ UTC e SãoPaulo; API e export CSV coincidem.

Limitações:

- Reprodução HTTP/browser não executada; confirmação estática do fluxo.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-004.md

## DEBT-20261014-UX-005 — Deep links nativos Android divergem do catálogo de rotas web

Categoria: DT-34 — Mobile e PWA; relacionadas: DT-18, DT-39. Módulo: Android / navegação. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P2; Link válido do diagnóstico é rejeitado nativamente; link com nome antigo é aceito mas rota web redireciona ao dashboard. Outros destinos web ativos não abrem via esquema custom. Evidência do caminho atual, sem inferir exploração em produção.

Comparação executada de listas: nativeOnly sdr-diagnostic-joao; webOnly inclui sdr-diagnostic, forecast, metas, signals-risks e outros destinos existentes.

Causa raiz: Espelho manual desatualizado sem gate de paridade.

Impacto: Link válido do diagnóstico é rejeitado nativamente; link com nome antigo é aceito mas rota web redireciona ao dashboard. Outros destinos web ativos não abrem via esquema custom.

Evidências:

- android/app/src/main/java/br/com/birthhub360/prospector/MainActivity.java:55–65 — Lista manual nativa inclui sdr-diagnostic-joao e omite destinos web. (SHA-256 36706bc720d967da88e2da6b37d6302cebe0c5aacaef34ac9971bf50374fbc8d)
- src/App.tsx:460–460 — Rota real é sdr-diagnostic. (SHA-256 7f606694d3c1739d981a01d5e9a4fd86db0ba27688b14b86ad7ee8a0fc0c6632)
- src/lib/navigationBus.ts:67–67 — Contrato web usa sdr-diagnostic. (SHA-256 d4146d6bdaedb2b2a627f2270c6d48e3de5a8457f74f0e14d53bec03784d03ef)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta (código); comportamento operacional não medido. Estado: aberto; correção não iniciada.

Dono: 09; participantes: 02, 09; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Sincronizar catálogo nativo com os destinos suportados e criar verificação automática de paridade, explicitando módulos desabilitados.

Aceite: Deep link diagnóstico válido abre tela; inválido mostra erro; catálogo de destinos ativos coincide.

Testes necessários:

- Comparação de sets; dispositivo/emulador para diagnóstico/forecast; destino inválido e usuário sem permissão.

Limitações:

- Reprodução HTTP/browser não executada; confirmação estática do fluxo.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-005.md

## DEBT-20261014-UX-006 — Ícones declarados no manifest PWA não existem em public

Categoria: DT-34 — Mobile e PWA; relacionadas: DT-16, DT-17. Módulo: PWA / assets. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; Manifest fornece URLs sem artefato correspondente; identidade/instalabilidade do PWA fica comprometida em clientes que exigem esses ícones. Evidência do caminho atual, sem inferir exploração em produção.

Inventário executado: public/icons/icon-192.png e icon-512.png ausentes; também favicon.ico/apple-touch-icon.png incluídos em includeAssets ausentes. Há ícone SVG de marca, mas não os PNG referenciados no manifest.

Causa raiz: Manifest não acompanhado por assets versionados ou etapa explícita de geração no script build.

Impacto: Manifest fornece URLs sem artefato correspondente; identidade/instalabilidade do PWA fica comprometida em clientes que exigem esses ícones.

Evidências:

- vite.config.ts:30–40 — Ícones192/512 e atalhos apontam a arquivos ausentes. (SHA-256 ee75f5fd85a49e033f9dfcb988c2c48d5a86e1990b89d8f35b81ace55ffeef51)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta (código); comportamento operacional não medido. Estado: aberto; correção não iniciada.

Dono: 09; participantes: 02, 09; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Gerar/reutilizar os ícones oficiais nos caminhos manifest e verificar existência/tamanho no gate de PWA.

Aceite: Todas URLs do manifest e atalhos resolvem arquivo real com dimensão declarada.

Testes necessários:

- Existência de public e dist; dimensões192/512; instalação Chromium em origemHTTPS isolada.

Limitações:

- Ausência na árvore fonte confirmada; build e resposta HTTP não executados, geração externa não foi presumida.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-006.md

## DEBT-20261014-UX-007 — Busca textual da base retorna lista vazia quando banco falha

Categoria: DT-36 — Busca; relacionadas: DT-19, DT-39. Módulo: Base de conhecimento / busca. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P2; Falha de banco é apresentada como ausência de conhecimento; usuário pode concluir que documento não existe. Evidência do caminho atual, sem inferir exploração em produção.

Se FTS falha, tenta ILIKE; se fallback falha, retorna []. Quando busca semântica também indisponível, hybridSearch retorna hits[] indistinguíveis de nenhum documento encontrado.

Causa raiz: Contrato só distingue indisponibilidade semântica; não distingue erro da busca textual.

Impacto: Falha de banco é apresentada como ausência de conhecimento; usuário pode concluir que documento não existe.

Evidências:

- src/features/knowledge/search.service.ts:178–180 — Falha FTS e ILIKE é logada, mas resposta vira [] em vez de erro. (SHA-256 175f99b85760a4ec179cc19353fdbf452615ecef46ba3092176f03c60f1b2db5)
- src/features/knowledge/search.service.ts:54–64 — Status relata disponibilidade semântica, não falha keyword. (SHA-256 175f99b85760a4ec179cc19353fdbf452615ecef46ba3092176f03c60f1b2db5)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: condicional ao fluxo indicado. Frequência: por utilização do fluxo. Confiança: alta (código); comportamento operacional não medido. Estado: aberto; correção não iniciada.

Dono: 07; participantes: 02, 07; esforço relativo: M; regressão: médio.

Dependências:

- 08: regressão isolada
- 00: autorização específica de saneamento

Remediação: Propagar falha da busca textual ou declarar disponibilidade de ambas estratégias e sinalizar erro quando nenhuma executou.

Aceite: Banco indisponível não gera falso empty; semântica indisponível com textual funcional mantém fallback claro.

Testes necessários:

- FTS falha/ILIKE sucesso; ambos falham; embeddings falham e keywords sucesso; ambas estratégias indisponíveis.

Limitações:

- Reprodução HTTP/browser não executada; confirmação estática do fluxo.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-07-debt-20261014-ux-007.md

## DEBT-20261014-INT-001 — Timeout Bitrix encerra antes leitura do corpo

Categoria: DT-09 — Integrações externas; relacionadas: DT-21. Módulo: Bitrix. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Risco operacional. Prioridade: P2; Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.

O timer é cancelado após headers antes response.json; corpo lento pode manter operação sem teto.

Causa raiz: Cancelamento antecipado do AbortController.

Impacto: Job/requisição pode aguardar corpo indefinidamente apesar contrato15s.

Evidências:

- src/features/integrations/bitrix/service/client.ts:159–216 — Timer removido na linha190 antes response.json214;reprodução exata com fake response e timeout encurtado5ms permanece pendente30ms. (SHA-256 fbaf0c9aa8fda7df3610c1c0126e931297c1045d916015379e6786d5e9b66f0f)
- src/features/integrations/bitrix/service/client.ts:92–96 — Evidência complementar da causa/contrato. (SHA-256 fbaf0c9aa8fda7df3610c1c0126e931297c1045d916015379e6786d5e9b66f0f)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta (fonte direta;runtime limitado aos mocks especificados). Estado: aberto; correção não iniciada.

Dono: 06; participantes: 06, 00; esforço relativo: P; regressão: Médio: fluxo de execução/falha.

Dependências:

- Ambiente isolado homologação
- Revisão24
- Autorização específica correção

Remediação: Preservar timer até consumir body em finally; aplicar também testWebhook.

Aceite: Mock entrega headers e bloqueia corpo; operação deve abortar em15s.

Testes necessários:

- Mock entrega headers e bloqueia corpo; operação deve abortar em15s.

Limitações:

- Função exata isolada com safeFetch fake;timer5ms;nenhum servidor/provedor real.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-06-debt-20261014-int-001.md

## DEBT-20261014-AI-001 — Streaming não aplica quota por tier

Categoria: DT-10 — Inteligência artificial; relacionadas: DT-27. Módulo: IA streaming. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.

streamChatCompletion chama orçamento monetário mas não enforceTokenQuota;invoke aplica o controle.

Causa raiz: Dois caminhos saída com controles distintos.

Impacto: Quota de tokens premium por tier não cobre streaming; teto monetário continua existindo.

Evidências:

- src/lib/ai/gateway/streaming.ts:32–36 — Fonte direta no snapshot auditado; escopo do controle limitado ao título. (SHA-256 7993e59e4cbb03632dfb82ea3db7eb81920668b5957ef3a970326bffd25ce52d)
- src/lib/ai/gateway/chat-model.ts:144–148 — Evidência complementar da causa/contrato. (SHA-256 42cb32af66dc12e000a8e397faada5d41a25476d12a75ea9b5035f58738483c9)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta (fonte direta;runtime limitado aos mocks especificados). Estado: aberto; correção não iniciada.

Dono: 07; participantes: 06, 00, 23; esforço relativo: P; regressão: Médio: fluxo de execução/falha.

Dependências:

- Ambiente isolado homologação
- Revisão24
- Autorização específica correção

Remediação: Aplicar decisão quota antes streaming e registrar consumo por mesma fonte.

Aceite: Quota excedida impede streaming premium antes fetch e usa mesma política do invoke.

Testes necessários:

- Quota excedida impede streaming premium antes fetch e usa mesma política do invoke.

Limitações:

- Não prova consumo real/exploração nem ausência de limites monetários.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-07-debt-20261014-ai-001.md

## DEBT-20261014-OPS-006 — Guard classifica falhas de qualquer origem como Redis

Categoria: DT-19 — Observabilidade; relacionadas: DT-21. Módulo: Runtime. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Risco operacional. Prioridade: P1; Afeta confiabilidade operacional de processo/encerramento por caminho demonstrado;sem prova de risco imediato para classificarP0.

matchesKnownPattern && (looksLikeIoredis || matchesKnownPattern) reduz a matchesKnownPattern; ECONNRESET de serviço não Redis segue processo.

Causa raiz: Predicado origem tornado tautológico por repetição do termo.

Impacto: Bugs não tratados de outros clientes seguem execução em estado possivelmente inconsistente;log continua existindo.

Evidências:

- src/lib/process-guards.ts:48–52 — Fonte direta no snapshot auditado; escopo do controle limitado ao título. (SHA-256 1b4075fb90852c716fdb6ba8ce35375c9cd56d56f0427f34ea80938ca2b6f838)
- src/lib/process-guards.ts:48–52 — Evidência complementar da causa/contrato. (SHA-256 1b4075fb90852c716fdb6ba8ce35375c9cd56d56f0427f34ea80938ca2b6f838)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta (fonte direta;runtime limitado aos mocks especificados). Estado: aberto; correção não iniciada.

Dono: 16; participantes: 06, 00; esforço relativo: P; regressão: Médio: fluxo de execução/falha.

Dependências:

- Ambiente isolado homologação
- Revisão24
- Autorização específica correção

Remediação: Exigir proveniência Redis com mensagem compatível;caso desconhecido fatal.

Aceite: Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error.

Testes necessários:

- Erro application ECONNRESET termina fatal;erro Redis conhecido segue log.error.

Limitações:

- Reprodução da função pura; não mede incidente ou ambiente real.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-16-debt-20261014-ops-006.md

## DEBT-20261014-OPS-007 — Shutdown HTTP espera fechar conexão SSE antes de encerrá-la

Categoria: DT-21 — Disponibilidade; relacionadas: DT-19. Módulo: Runtime HTTP. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Risco operacional. Prioridade: P1; Afeta confiabilidade operacional de processo/encerramento por caminho demonstrado;sem prova de risco imediato para classificarP0.

Await httpServer.close callback precede sseService.closeAll;SSE mantém callback pendente e código não tem deadline.

Causa raiz: Ordem de dreno com ciclo e falta de limite/best-effort prometido em comentário.

Impacto: Deploy pode exigir kill e perder encerramento ordenado;falha em closeAll/worker também impede cleanup posterior.

Evidências:

- src/bootstrap/shutdown.ts:69–73 — Fonte direta no snapshot auditado; escopo do controle limitado ao título. (SHA-256 96f1a8d65e117b72d5f9dfdc7143af04fea41e13f8a62a6384dd34996538064a)
- src/features/notifications/sse.service.ts:55–59 — Evidência complementar da causa/contrato. (SHA-256 99604fc0a1d02441bd51c190c853510dbbc92c872e711c5687c96e5080800a10)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta (fonte direta;runtime limitado aos mocks especificados). Estado: aberto; correção não iniciada.

Dono: 16; participantes: 06, 00; esforço relativo: P; regressão: Médio: fluxo de execução/falha.

Dependências:

- Ambiente isolado homologação
- Revisão24
- Autorização específica correção

Remediação: Iniciar fechamento HTTP,fechar SSE,drenar com deadline e cleanup best-effort.

Aceite: SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes.

Testes necessários:

- SIGTERM com SSE ativo fecha SSE e HTTP dentro deadline;uma etapa falha não impede restantes.

Limitações:

- Fake dependências reproduz espera; não usa socket real nem simula deployment.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-16-debt-20261014-ops-007.md

## DEBT-20261014-FIN-001 — Alerta orçamento IA usa vetores incompatíveis

Categoria: DT-27 — FinOps; relacionadas: DT-19. Módulo: Observabilidade IA. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Dívida técnica confirmada. Prioridade: P2; Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.

Counter labels provider,tenant;budget Gauge sem esses labels.Divisão padrão não encontra correspondência,dados numerador não chegam resultado.

Causa raiz: Expressão PromQL sem agregação/explicit matching;contador lifetime também difere orçamento mensal.

Impacto: AIBudgetOverrun pode permanecer vazio mesmo com custo emitido;não prova estado atual cloud.

Evidências:

- infrastructure/observability/alert.rules.yml:260–264 — Fonte direta no snapshot auditado; escopo do controle limitado ao título. (SHA-256 bce51ee6a82a869869a63bb7826d2f51d32d57478890e2366a3d0aacb0f2a07b)
- src/lib/ai/metrics.ts:19–23 — Evidência complementar da causa/contrato. (SHA-256 eee4bd3eeba575a68f308b8ac85de4091c49557680acddb77a1177afa71f363c)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta (fonte direta;runtime limitado aos mocks especificados). Estado: aberto; correção não iniciada.

Dono: 10; participantes: 06, 00, 07, 23; esforço relativo: P; regressão: Médio: fluxo de execução/falha.

Dependências:

- Ambiente isolado homologação
- Revisão24
- Autorização específica correção

Remediação: Construir métrica custo mensal alinhada budget global e expressão agregada;teste promtool positive/negative/mês.

Aceite: promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto.

Testes necessários:

- promtool rule test com custos provider/tenant e gauge global deve disparar quando soma mensal>teto.

Limitações:

- Regra inspecionada; promtool não instalado/executado.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-10-debt-20261014-fin-001.md

## DEBT-20261014-NOT-001 — Leitura broadcast silencia unread para colegas

Categoria: DT-35 — Notificações; relacionadas: DT-39. Módulo: Notificações. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78.

Tipo: Defeito funcional. Prioridade: P2; Degrada controle/feedback localizado;sem evidência de perda de dados ou incidente ativo.

Notification tem readAt único;markRead de broadcast altera mesmo registro para toda organização.

Causa raiz: Modelo mistura notificação e estado por destinatário.

Impacto: Colegas deixam de receber indicação não lida de alerta que não abriram.

Evidências:

- src/features/notifications/notification.service.ts:94–98 — Fonte direta no snapshot auditado; escopo do controle limitado ao título. (SHA-256 2c04cd58540a60a140ad8dd6f44f218bcefe1a7a3b3ee1cf1212a6ba41d54819)
- prisma/schema.prisma:2048–2052 — Evidência complementar da causa/contrato. (SHA-256 2e587b11b6e384a6bae428678e360a320e3b13a621b3963e1246baa8a9a39eda)

Exposição: Fonte atual; exposição operacional limitada ao contexto citado. Probabilidade: Condicional ao fluxo e à configuração descritos; taxa real não medida. Frequência: Não medida em produção. Confiança: alta (fonte direta;runtime limitado aos mocks especificados). Estado: aberto; correção não iniciada.

Dono: 02; participantes: 06, 00, 01, 18; esforço relativo: M; regressão: Médio: schema/contrato/UI.

Dependências:

- Agente01 schema leitura por usuário
- Agente18 contrato API

Remediação: Manter leitura por usuário com modelo01 e contrato18,sem alterar conteúdo broadcast.

Aceite: UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado.

Testes necessários:

- UsuárioA lê broadcast;B continua unread até lê-lo;estado não compartilhado.

Limitações:

- Função exata com mock persistência; não certifica DB/RLS real.

Handoff: .agents/handoffs/onda-dividas-20261014/00-para-02-debt-20261014-not-001.md


## Exclusões solicitadas

- FND-01: Exclusão LGPD podia concluir sem gravar supressão multicanal;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- FND-02: Worker era classificado como web e podia reenfileirar WhatsApp sem enviar;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- OPS-001: Gate local de lançamento emitia GO com typecheck/lint falhando e sem integração/E2E;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- OPS-002: Guia canônico mandava aplicação conectar com superusuário de bootstrap;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- PROD-01: Copiloto exibe receita, meta e forecast fabricados;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- PROD-02: Executar e adiar NBA afirmam ação sem execução ou persistência;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- PROD-03: Trace de missão e aprovação LGPD são fictícios;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- OPS-003: Instrução de iniciar stack omitira Postgres obrigatório para migrations;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- PROD-04: Falha inicial de API deixa Copiloto em carregamento infinito;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- PROD-05: API permite cadência sem conteúdo e dispatcher envia placeholder;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- FND-03: Memória de agentes ainda não pode ser localizada por titular para exclusão;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.
- OPS-004: Build mobile padrão embute backend Render documentado como desativado;fonte ../launch-2026-10-14/relatorio.html;não reinvestigado,não contabilizado,não declarado resolvido.

## Conclusão e limites

- 46 verificações não executadas no ambiente ou dependentes de dados/infra;recontar pelo campo metrics se revisão mudar
- node_modules ausente;gates tentados bloqueados por ferramentas ausentes,sem instalar dependências
- npm audit não retornou contagens/advisories utilizáveis;vulnerabilidades atuais não verificadas
- Nenhum DB/Redis/SMTP/LLM/cloud real consultado;sem migrations,contas,uploads,envreal ou chamadas faturadas
- 306 registros históricos indexados em metadados;resoluções individuais não equivalem validação funcional
- Snapshots git archive isolam fontes sem criar branches;symlinks de skills não extraídos pelo tar Windows,fontes de produto normais hashadas
- 12 achadosHTML anterior excluídos da investigação por instrução expressa;não contados como novos ou resolvidos
- HTML não produzido por solicitação posterior do usuário;verificações de dashboard/filtros/exportações não aplicáveis à entrega atual

Arquivos de produto/config/testes existentes não editados. Relatórios e handoffs gerados;geradores e cópias efêmeras em.tmp não são código de produto. Escopo não é certificação de ausência de dívida. 08 verifica critérios documentais e24 decide para revisão exata,em parecer separado. Nenhum handoff pode ser fechado com base somente neste diagnóstico.
