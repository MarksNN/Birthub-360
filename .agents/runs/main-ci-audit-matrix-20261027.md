# Auditoria da proteção e do CI — 27/10/2026

Estado: AUDITADO; correções locais em revisão; configuração administrativa NÃO SALVA; homologação CI BLOQUEADA.

## Proteção atual e proposta

Inspeção autenticada da regra clássica `85401643` e rulesets `25935887`/`25935888`.

| Requisito | Atual | Proposta para autorização posterior |
| --- | --- | --- |
| PR + aprovação humana | 1 aprovação | Manter |
| Invalidar aprovação após novo commit | Desabilitado | Habilitar |
| Conversas resolvidas | Habilitado na regra clássica | Manter e alinhar main-2 |
| Branch atualizada com base | Desabilitado | Habilitar strict |
| Force push / exclusão | Bloqueados na proteção clássica | Preservar; main-1 permanece ativo |
| Bypass clássico | Desabilitado inclusive admins | Manter |
| Bypass main-2 | Repository admin / Always allow | Remover exceção; não altera acesso de colaboradores |
| Colaboradores | Zero | Nenhuma concessão de acesso realizada; revisor humano necessário para PRs do proprietário |

O bypass de main-2 não elimina a regra clássica: são camadas cumulativas. Remover a exceção evita inconsistência entre camadas, sem inventar uma brecha comprovada no estado atual.

## Contextos exatos, origem e decisão

Os prefixos de workflow da interface não compõem necessariamente o contexto. Contextos Actions abaixo usam app 15368 (GitHub Actions); SonarCloud usa app 12526.

| Contexto | Workflow / origem | Decisão |
| --- | --- | --- |
| Central Birth Hub 360 / application gate | ci.yml | Manter obrigatório |
| SonarQube | sonarqube.yml | Manter obrigatório; corrigir scanner/quality gate antes de homologar |
| Central Birth Hub 360 / trivy scan | ci.yml | Manter obrigatório |
| build | ci.yml, agregador derivado dos 4 needs | Adicionar; evita aceitação de aplicação skipped após dependência falha |
| CodeQL / javascript-typescript | codeql.yml | Adicionar; confirmar SARIF real no SHA |
| CodeQL / python | codeql.yml | Adicionar; confirmar SARIF real no SHA |
| Central Birth Hub 360 / secret scan | ci.yml | Coberto pelo build bloqueante; não duplicar seleção |
| Central Birth Hub 360 / dependency review | ci.yml | Coberto pelo build após retirar tolerância a erro/skipped; hoje seleção isolada não corrigiria falha mascarada |
| Dependency Review | dependency-review.yml | Redundante; mesmo limiar e waivers; corrigir propagação, sem selecionar contexto duplicado |
| Trivy — gate de PR (fs/dependências, HIGH/CRITICAL, bloqueante) | security-trivy.yml | Redundante com Trivy central: mesmos parâmetros/ignore; preservado executando |
| SonarCloud Code Analysis | SonarCloud app, emissão independente dos Actions | Sinal separado; emissão não comprovada em todos os PRs antigos. Não tornar obrigatório sem regularizar análise. SonarQube com scanner e qualitygate.wait deve assegurar resultado real |
| Visual Regression | visual-regression.yml | Essencial: só adicionar após geração e revisão das 88 baselines e execução bloqueante real |
| Gerar baselines visuais Linux (manual) | ci.yml / workflow_dispatch | Não obrigatório |
| Trivy — scan semanal de filesystem/dependências (HIGH/CRITICAL, não bloqueante) | security-trivy.yml / schedule+manual | Não obrigatório |

ci.yml, codeql.yml, dependency-review.yml, security-trivy.yml e visual-regression.yml possuem pull_request para main/master sem filtro paths no workflow. SonarQube roda em opened/synchronize/reopened sem filtro de base (inclui main). PRs conflitantes podem não emitir Actions pull_request: isso é bloqueio real de integração, não contexto fictício. Aplicação depende de secrets/Trivy; build always() evita skip aceitável como veredito final.

## Main atual

SHA: [6a00acd1094ea0d7185a096c24eb474aad5a008d](https://github.com/MarksNN/Birthub-360/commit/6a00acd1094ea0d7185a096c24eb474aad5a008d).

| Check | Estado | Evidência |
| --- | --- | --- |
| build | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485623/job/122018633941) |
| SonarCloud Code Analysis | failure | [abrir](https://sonarcloud.io/dashboard?id=MarksNN_Birthub-360&branch=main) |
| Central Birth Hub 360 / application gate | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485623/job/122008700528) |
| Central Birth Hub 360 / dependency review | skipped | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485623/job/122008592470) |
| Gerar baselines visuais Linux (manual) | skipped | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485623/job/122008592461) |
| CodeQL / python | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485720/job/122008591784) |
| CodeQL / javascript-typescript | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485720/job/122008591599) |
| Central Birth Hub 360 / trivy scan | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485623/job/122008591248) |
| Central Birth Hub 360 / secret scan | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485623/job/122008590815) |
| SonarQube | success | [abrir](https://github.com/MarksNN/Birthub-360/actions/runs/40449485608/job/122008590585) |

SonarCloud: 29,4% de duplicação no código novo; limite 3%. SonarQube Actions: step SonarQube Scan skipped; testes verdes não provam scanner executado. CodeQL produziu e verificou um SARIF por linguagem (logs dos jobs 122008591599/122008591784). Dependency Review skipped em push da main é esperado (job exclusivo de PR).

## PRs abertos — checks no HEAD exato

Nenhum dos 16 PRs tinha revisão aprovada ou qualquer review registrado na leitura. Os números são dos check-runs (não contagem de testes). Zero jobs pendentes/cancelados retornados nessa leitura; ausente não equivale a pendente nem a sucesso.

| PR | SHA HEAD | success/failure/skipped | Estado adicional |
| --- | --- | --- | --- |
| [#119](https://github.com/MarksNN/Birthub-360/pull/119) | `43142103002013f95fc5b66f2b8692175bad1949` | 14/0/2 | blocked |
| [#118](https://github.com/MarksNN/Birthub-360/pull/118) | `c39a53454fd96129036cee86530986c2cad1407c` | 13/1/2 | draft; blocked |
| [#114](https://github.com/MarksNN/Birthub-360/pull/114) | `b863714c4e9680cfcdf896763beb8b74a97ce77b` | 0/1/0 | dirty |
| [#110](https://github.com/MarksNN/Birthub-360/pull/110) | `7dcc5f6074f19a8a0b9f42b6e3043c3e43622104` | 12/3/2 | draft; blocked |
| [#109](https://github.com/MarksNN/Birthub-360/pull/109) | `5218cbe7048a229d46f486338f1b591969e3a934` | 10/3/2 | draft; blocked |
| [#108](https://github.com/MarksNN/Birthub-360/pull/108) | `79bd929048307f0602f268cc47061712c80136c9` | 10/3/2 | blocked |
| [#97](https://github.com/MarksNN/Birthub-360/pull/97) | `83e43fd0402fdbc6dbe4b18a0bab868bf18b72f2` | 0/0/0 | dirty |
| [#93](https://github.com/MarksNN/Birthub-360/pull/93) | `aebcec4d9e32b59553d2f4b682968d699c910a7f` | 1/0/0 | dirty |
| [#87](https://github.com/MarksNN/Birthub-360/pull/87) | `e4bfaf1c65d4cd6a32adfdaa519c237972d56407` | 10/3/2 | blocked |
| [#65](https://github.com/MarksNN/Birthub-360/pull/65) | `276ff6e550efe140558bea71450fc7502d9050ef` | 8/4/3 | blocked |
| [#64](https://github.com/MarksNN/Birthub-360/pull/64) | `6e9c61cd7206f3f3f3b5ec4edd0266b892826543` | 8/4/3 | blocked |
| [#57](https://github.com/MarksNN/Birthub-360/pull/57) | `4b52c389ac01ebbfe3fcaba616c20b8767ed0c6a` | 11/3/2 | blocked |
| [#56](https://github.com/MarksNN/Birthub-360/pull/56) | `255070d11720c59bf61984a93fa7d1c2def385c5` | 12/2/2 | dirty |
| [#55](https://github.com/MarksNN/Birthub-360/pull/55) | `4e0ab247b9f8b92954541b10ecabe4d974f417ab` | 12/2/2 | blocked |
| [#54](https://github.com/MarksNN/Birthub-360/pull/54) | `c43f2f7d605a278bd0e3f70b0e9626542da2e4a5` | 12/2/2 | blocked |
| [#53](https://github.com/MarksNN/Birthub-360/pull/53) | `9e50c8d36606a63b54edcda8e503f5860625b6f5` | 12/2/2 | blocked |

PR #119 @4314210: 14 success/2 skipped não é homologação: job Visual Regression 121932214461 contém **88 failed**, tolerados pelo workflow; SonarQube scanner skipped. PR #118 contém retirada da tolerância visual, mas as 88 referências continuam ausentes. PR #114 recebeu novo HEAD b863714c durante a autenticação; não usar falha do SHA anterior. HEAD atual tem SonarCloud failure por 10,1% duplicação (limite de 3%) e conflito; #93/#97/#56 também conflitantes.

## Causas-raiz e histórico

- PR #53: audit gate do HEAD reprova advisories de body-parser, multer e undici. Build apenas deriva a falha.
- PRs #54/#55/#56: Biome format, dois erros; falhas ainda pertencem aos HEADs antigos dos PRs, não à main atual.
- PRs #57/#87/#108: erros TypeScript em contratos dos agentes/ferramentas; SonarQube também falha nos testes do gateway. Main atual já passou typecheck e gateway isolado; não transportar código antigo apenas para reproduzir defeitos resolvidos.
- PRs #109/#110 (diagnóstico, draft): múltiplos passos realmente falhos — erros TypeScript e teste integration/swarm-autonomous-mission-e2e (expected 0 to be 1), além de três asserts Groq/LiteLLM no Sonar. O log pode ter continuation diagnóstico; não tratá-los como branches homologadas.
- PRs #64/#65 (branches de parecer): Trivy falhou; aplicação skipped por dependência de scan, build failure derivado. Sonar falha com logger não definido e texto de marca ausente. SARIF do PR #65 inspecionado: findings HIGH em body-parser e undici no lockfile legado; manter waivers intactos.
- [#43](https://github.com/MarksNN/Birthub-360/pull/43) e [#44](https://github.com/MarksNN/Birthub-360/pull/44): merged=true. HEADs históricos dd0a272dcf1158579e6bb03e3fff9c7e05044913 e 815b39dd080814887b6b004091e239ecabea914b: gate vermelho por quatro testes de catálogo (394 versus 391,15 versus 12 e três agentes sem capabilities/cargo). Não transferir esse vermelho à main atual.
- [#25](https://github.com/MarksNN/Birthub-360/pull/25) e [#29](https://github.com/MarksNN/Birthub-360/pull/29): closed, merged=false. HEADs 0a37a5ed45ba331912f5e68f699be2855388c1e9 e a5c3eb89983cf1b9b9db794b4e39e65139c1b7e2: integração94arquivos/660tests passou, depois E2E: 3 falhas incluindo seletor Pipeline duplicado.
- [Issue #45](https://github.com/MarksNN/Birthub-360/issues/45) continua aberta e contém fatos históricos de21/10. Seu checklist ainda diz PRs #43/#44 pendentes, mas ambos já foram mesclados. Não fechar issue nem anunciar correção integral baseada só nesse histórico.

## Correções locais em revisão

- Dependency Review passa a bloquear nos dois workflows; agregador recusa skipped/cancelled/failure/ausente em PR.
- SonarQube: preflight de token/org, projeto real, scanner obrigatório com espera do Quality Gate. Sem credencial, ficará vermelho explicitamente.
- CodeQL: SARIF não vazio obrigatório em CI e artifact ausente é erro; política de achados não foi alterada.
- Visual: assertions bloqueantes; mesmo Postgres16+pgvector/Redis/Meili entre geração e verificação; glob corrigido; data/localização/fontes estabilizadas; updateSnapshots:none na verificação. Limite1300px e todas as 88 asserções preservados.

## Evidências locais

Node 22.23.4 instalado fora do checkout. npm ci: 2.266 pacotes e Prisma 7.10 gerado. Baseline e typecheck do diff combinado passaram (exit code 0); lint também passou; lint: 655 warnings / 10 infos preexistentes. Gate de audit executado via node --import tsx: nenhum HIGH/CRITICAL. IA + SARIF: 19 testes passaram. Diff combinado:50 testes em 4 arquivos passaram; Trivy: 2 testes adicionais passaram. A invocação tsx CLI encontra EPERM no socket Unix; não generalizar para TCP. Build npm normal encontrou esse impedimento no verificadorPWA; Vite, esbuild e o verificador de precache passaram separadamente (exit code 0; 177 entradas de precache). O comando npm original não foi classificado como aprovado; a execução equivalente do build foi concluída sem modificar scripts do projeto.

Integração/visual real: BLOQUEADOS localmente por ausência de Docker/dockerd/psql/Postgres+pgvector/Redis/Meili, não classificados N/A. Foram descobertos 88 casos Playwright, mas não executados 88 screenshots. Nenhum baseline foi fabricado/aceito.

## Bloqueios e prioridades

- P0: nenhum confirmado no escopo desta auditoria; isso não certifica ausência em toda a plataforma.
- P1: 88 baselines ausentes; scanner Sonar sem token/organização; duplicação SonarCloud reprovada; reviewer humano write ausente para PRs do proprietário; PRs conflitantes/falhos sem aprovação. Homologação CI bloqueada.
- P2: strict desabilitado/approvals stale não descartadas; bypass inconsistente no main-2; script SARIF local aceita ausência mas workflow corrigido exigirá evidência; dívida de drift/golden permanece não bloqueante por política existente, sem alteração.
- P3: warnings de lint/build; issue #45 e documentação histórica precisam reconciliação com fatos atuais após validação.

## Limitações e continuação

SonarCloud API/UI respondeu403 do CloudFront. Não foi possível ler detalhe de arquivos duplicados nem organização. Não inventar organização/token ou refatorar código às cegas. Documentação oficial informa conflito entre Automatic Analysis e scanner no CI simultâneos; método deve ser verificado e transição validada pelo dono antes de habilitar scanner. Nenhuma análise externa foi desligada nesta missão.

Antes de salvar proteção: apresentar lista final aprovada de contextos/origens, regras e bloqueios; pedir autorização explícita. Depois de salvar: reabrir telas e ler valores persistidos; toast não é prova suficiente. As novas correções precisam revisão24 e checks no SHA publicado. Nenhum merge/deploy/aprovação automática de PR ocorreu nesta missão.


## Adendo de configuração Sonar — leitura autenticada

A interface de Actions confirmou: `SONAR_TOKEN` não existe em Repository secrets; existe uma variável de repositório com esse nome. `SONAR_HOST_URL` também está em Variables e aponta para SonarCloud. Não há `SONAR_ORGANIZATION` entre os dois nomes de variáveis listados. O valor do token não é reproduzido, salvo em arquivo ou incorporado ao código. Sua validade não foi verificada. Isso explica o scanner ignorado: o workflow lê `secrets.SONAR_TOKEN`, não `vars.SONAR_TOKEN`.

A correção permanece lendo somente o secret, sem fallback para credencial em variável. Cadastrar uma credencial válida em Secrets, retirar a variável que contém credencial e avaliar sua rotação exigem a aprovação administrativa e a participação segura do usuário. Nenhuma dessas alterações foi salva. Esse novo achado altera somente a evidência documental; código auditado permanece idêntico.
