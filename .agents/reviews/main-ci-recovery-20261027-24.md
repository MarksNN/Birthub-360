# Parecer independente 24 — recuperação dos gates da main

Missão / onda: `main-ci-recovery-20261027`.
Autores: 08 (workflows e configuração Sonar), 14 (harness visual), 00 (coordenação e matriz).
Auditor: Agente 24, separado dos autores.
Base: `6a00acd1094ea0d7185a096c24eb474aad5a008d`.
Branch auditada: `agente/24-main-ci-review-20261027`, worktree isolado `Birthub-360-review`.
Conteúdo recebido do checkout coordenador: `agente/08-main-ci-reliable-gates-20261027`.
Revisão exata: quinze arquivos não commitados, identificados por SHA-256 abaixo; todos comparados byte a byte com o checkout coordenador ao emitir este parecer.

## Decisões e limites

**APROVADO exclusivamente para publicar estes arquivos em uma branch de trabalho e abrir um draft PR destinado à execução do CI e obtenção de evidências.** Este escopo termina antes de qualquer merge, deploy, alteração administrativa ou declaração de correção integral. A execução de testes no GitHub é necessária para obter as evidências de infraestrutura que faltam localmente; não é dispensada.

**BLOQUEADO para homologação CI, conclusão da missão, integração e configuração administrativa definitiva.** Não há aprovação de release nem aprovação humana de um PR. Os bloqueios abaixo continuam impedindo tais conclusões.

Aprovação de publicação controlada não significa aprovação parcial de uma release. Todos os critérios aplicáveis à segurança do diff para esse destino foram verificados; os critérios da missão geral continuam não satisfeitos. Qualquer alteração no conteúdo auditado invalida esta revisão e exige nova conferência.

## Plano executado e constatações

1. Li `AGENTS.md`, o prompt do 24, `tests/AGENTS.md`, os dois handoffs e os dois registros do coordenador; conferi propriedade atribuída e os quinze arquivos da entrega.
2. Li os diffs e os arquivos novos completos. Executei os testes em worktree isolado usando o mesmo lockfile e Node 22.23.4. O `node_modules` é um symlink local e não integra o diff.
3. Conferi gatilhos e dependências: PRs para main continuam cobertos; não foram adicionados filtros de caminhos; o agregador exige sucesso real dos quatro needs em PR, mas preserva o skip legítimo do Dependency Review em push. Manual de baselines e Trivy semanal não se tornaram requisitos de PR.
4. Confirmei propagação de falha do Dependency Review e das assertions visuais. O Sonar agora falha sem credencial/configuração e aguarda o quality gate; não existe o antigo caminho de scanner skipped com job verde. Isso ainda depende de integração real com o serviço.
5. CodeQL exige arquivo SARIF não vazio antes da avaliação dos achados; JSON inválido continua reprovando no script. Política error-level, queries e waivers não foram alterados. A publicação SARIF tolerante existente é distinta da execução do scan/gate.
6. Conferi os 88 casos e a inexistência de baselines versionadas da suíte dedicada. Configuração normal não cria snapshots ausentes, nomes distinguem plataforma e o upload manual usa o glob correspondente. Data fixa usa a API setFixedTime, preservando timers; as fontes são aguardadas no documento navegado. O tema atlas_theme coincide com o ThemeContext da aplicação.
7. Verifiquei ausência de mudanças em package/lock, waivers e configuração de queries. Nenhum fluxo de tenancy, RBAC ou LGPD de produto foi modificado. A varredura limitada de padrões de segredo nos quinze arquivos não encontrou ocorrências; isso não substitui o Gitleaks remoto.

## Comandos e resultados independentes

| Verificação | Resultado |
| --- | --- |
| Vitest: ci-main-protection-workflows, visual-regression-state, security-codeql-sarif, security/trivy-pr-gate e gateway | **PASS: 5 arquivos, 52 testes, exit 0**; log `reviewer-unit.log` |
| `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit` | **PASS, exit 0**; log `reviewer-typecheck.log` |
| `node_modules/.bin/biome lint src` | **PASS, exit 0**; 655 warnings e 10 infos preexistentes; log `reviewer-lint.log` |
| `node node_modules/vite/bin/vite.js build` → esbuild do servidor → `node --import tsx scripts/pwa/verify-precache.ts` | **PASS, exit 0** para a cadeia equivalente; precache de 177 entradas; log `reviewer-build.log` |
| `npm run build` original, executado pelo 00 e log inspecionado | **FAIL ambiental** em `tsx`, `listen EPERM` no socket Unix; não classificado como PASS do comando original |
| `git diff --check` | **PASS, exit 0** |
| Probe TCP para 127.0.0.1:5434, :6379, :7700 | **ECONNREFUSED** nos três serviços |
| `command -v docker`, `dockerd`, `psql` | Não encontrados no ambiente |
| Comparação dos quinze arquivos entre revisão e coordenador | **PASS**, igualdade byte a byte |
| Busca limitada de padrões de tokens/chave privada nos quinze arquivos | Zero arquivos positivos; não houve impressão de possíveis valores |

Os logs locais citados ficam em `/workspace/scratch/6f87e0e4d4cf/` e não devem ser adicionados automaticamente ao repositório. Não executei o scanner Sonar, a análise CodeQL real, geração de baselines ou comparação dos 88 screenshots neste ambiente. Os testes de workflows exercitam os scripts Bash reais e os guards, não simulam aprovação de serviços externos.

## Achados e bloqueios remanescentes

| Prioridade | Achado / responsável | Correção e evidência exigida |
| --- | --- | --- |
| P0 | Nenhum confirmado no diff revisado | Não equivale a certificação de toda a plataforma |
| P1 | Todas as 88 baselines da suíte visual estão ausentes / 14 + 08 | Gerar no CI Linux no SHA exato, revisar as imagens para rejeitar erro/redirect/skeleton e executar as 88 comparações sem update-snapshots |
| P1 | Credencial e organização Sonar não configuradas/verificadas / dono do serviço + 08 | Configurar dados legítimos e comprovar scanner executado e quality gate real, sem reduzir limiar |
| P1 | PRs de Dependabot/forks não recebem automaticamente secrets / 08 + dono | Definir estratégia segura autorizada de análise; não executar código não confiável com secrets via pull_request_target. Sem isso, o check Sonar obrigatório ficará bloqueado nesses PRs |
| P1 | SonarCloud aponta 29,4% de duplicação na main, limite 3% / domínio da fonte + 08 | Obter detalhamento por arquivo e corrigir a fonte; o 403 externo não autoriza refatoração às cegas ou supressão |
| P1 | Estratégia Automatic Analysis versus scanner CI ainda precisa verificação / dono do Sonar | Não habilitar os dois simultaneamente; transição deve ser verificada e autorizada; nenhuma análise foi desligada nesta entrega |
| P1 | Revisor humano com write ausente para PRs do proprietário / usuário | Aprovação independente de agente não substitui aprovação humana no GitHub. Não remover exigência humana nem conceder acesso automaticamente |
| P1 | Integração/E2E/visual real e checks no novo SHA remoto não executados / 08 + 14 | Prover Postgres com pgvector, Redis e Meili no CI e conferir logs, artefatos e outcomes no SHA publicado |
| P2 | Proteção administrativa ainda é somente proposta / 00 + usuário | Apresentar antes/depois, obter autorização explícita e reler valores persistidos; este parecer não autoriza salvar |
| P3 | Warnings preexistentes e documentação histórica desatualizada | Não anunciar redução de débito ou issue encerrada sem revalidação |

Não encontrei defeito bloqueador introduzido pelo diff que torne insegura a publicação de um draft sem deploy. As falhas agora expostas de scanner e snapshots são bloqueios reais e devem continuar visíveis. Nenhum handoff foi encerrado pelo auditor.

## Escopo das evidências remotas

A matriz do 00 distingue SHAs históricos dos HEADs atuais, checks derivados, skips legítimos e scanners ignorados. Este parecer conferiu essa distinção documental e o código que passa a impedir os falsos verdes; não reconsultou independentemente todos os endpoints administrativos e todos os PRs. Portanto não certifica que estados remotos permanecem atuais depois da coleta nem que a proteção já foi salva.

## Adendo revisto — origem da configuração Sonar

Após a revisão inicial, o 00 acrescentou aos dois registros um achado da interface autenticada: não há Repository secret chamado `SONAR_TOKEN`; há uma variável de repositório com esse nome, além de `SONAR_HOST_URL`, sem `SONAR_ORGANIZATION`. Isso explica a condição falsa do scanner que consultava `secrets.SONAR_TOKEN`. O auditor leu apenas o adendo sanitizado; não leu, copiou ou testou o valor de uma credencial, e não certifica sua validade.

Os dois adendos são coerentes com o código revisado e não introduzem credencial no diff. A decisão restrita de publicação permanece **APROVADA** e a homologação/configuração definitiva permanece **BLOQUEADA**. O código continua sem fallback para `vars.SONAR_TOKEN`. Migrar uma credencial legítima para Secrets, remover armazenamento em variável e avaliar rotação requerem a aprovação administrativa específica e participação segura do usuário; este parecer não autoriza essas ações.

Reavaliei somente esses adendos e atualizei seus dois hashes. Os outros treze hashes, incluindo implementação e testes que passaram 52/52, permanecem idênticos; não houve razão para repetir testes de código após uma alteração apenas documental.

## Arquivos e hashes exatos

| Arquivo | SHA-256 |
| --- | --- |
| `.agents/handoffs/main-ci-recovery-20261027/08-para-00-workflow-gates.md` | `1e89b1a83df8ea62880182a72d9d73bd0cb67847c23e975ce23604910cee6010` |
| `.agents/handoffs/main-ci-recovery-20261027/14-para-00-visual.md` | `34598ac24078abbfd795a345c895d4021357154cc44f6ef8e74c71e5c6d9904b` |
| `.agents/runs/main-ci-audit-matrix-20261027.md` | `4aec88fac522bb7dfbaa49a9884ba2ea358c20f3132db78fe5659921341ccdb9` |
| `.agents/runs/main-ci-recovery-20261027.md` | `4242818f22c375e84abfabf253707e9ea8c055c2f1f65c64cf3dea0c655bd1d5` |
| `.github/workflows/ci.yml` | `4f36cc45159afe2ff9ee6fec4ce595d63d2090888619285c08df237f5be8ebe6` |
| `.github/workflows/codeql.yml` | `50f7b5c573add8df7c359e3dfc0cd3ab1e4c6285d344d1d32c300acb0fd96f13` |
| `.github/workflows/dependency-review.yml` | `d1d832cc6a0fd3ace4c44e07a31d51cf4a00066484f74137cda7586c37abf411` |
| `.github/workflows/sonarqube.yml` | `b6bc07591a053fdf99103670730bda7d08c642641b15e2fe90f6d568b994bb4a` |
| `.github/workflows/visual-regression.yml` | `5e5fa89ab97c841438c5ae959c5304fc474e3dc8ac1d8b32f2ca63bc097d3ca2` |
| `playwright.visual.config.ts` | `2bec9b2f346788082c1fc79b53ca6506b5bfe4ad9d1aa81ebb57fe567114612b` |
| `sonar-project.properties` | `5688a19c993244fa0ebcba0b3e3aac0ae0bf8272e6e920150f546d9d1be845f9` |
| `tests/unit/ci-main-protection-workflows.test.ts` | `7a327c805147cfb1fc59df053675a58fe6dd0d47f7e93a13551c429166f57df6` |
| `tests/unit/visual-regression-state.test.ts` | `5e8eb7ce7d37923513135903023aa018d622b3dd67cc3671e8a0e49efc80f234` |
| `visual-regression/deterministic-state.ts` | `c4ce6f1c957d26a353be22b5b13764e395b26cbe1a0793fdc6db26c0ac0525c4` |
| `visual-regression/visual.spec.ts` | `b57a89eb499bf045ab6f34d19f9fdea707923d52f7e43fc408a4497c8db82d6b` |

O próprio parecer não faz parte do conteúdo aprovado pelos hashes acima. Nenhum código auditado foi alterado pelo 24; somente este parecer foi criado. Não houve commit, push, merge, deploy, concessão de acesso, salvamento de proteção ou review de PR pela API.
