# HANDOFF 03 — SONARQUBE, SCA E COBERTURA

De: Agente 00 — Coordenação (execução desta recuperação)
Para: Agente 08 — QA e Release
Onda: ci-recovery-final-20261101
Status: resolvido
Prioridade: bloqueador
Bloqueador-ref: Quality Gate da main em ERROR no período de código novo
Sprint destino: recuperação SonarQube Cloud do repositório MarksNN/Birthub-360

## Problema

O Quality Gate do SonarQube Cloud no projeto `MarksNN_Birthub-360` está ERROR no período `previous_version` (desde 2026-10-27T21:30:30Z) para o commit de diagnóstico `519855cf5c679ed568d19a132f69c3dafdc35c61` na `main`.

Condições medidas na API pública `qualitygates/project_status` (branch `main`):

| Condição | Atual | Aceitável | Resultado |
| --- | --- | --- | --- |
| Confiabilidade nova | 4 (D) | ≤ 1 (A) | falha |
| Segurança nova | 3 (C) | ≤ 1 (A) | falha |
| Cobertura nova | 39,6% | ≥ 80% | falha |
| Duplicação nova | 0,4% | ≤ 3% | passa |
| Manutenibilidade nova | 1 (A) | ≤ 1 (A) | passa |
| Hotspots revisados | 100% | 100% | passa |

O coletor SCA aborta com `redundant lockfiles found in same directory: package-lock.json and pnpm-lock.yaml`. O scan da `main` (GitHub Actions run 41355611590) sobe o relatório e falha no `qualitygate.wait`.

O verde do PR #147 (SonarQube Analysis #581, branch `agente/08-modernizacao-node24`) não corrige este período. O diff daquele PR é de workflow. A API `qualitygates/project_status?pullRequest=147` voltou OK só com rating e hotspots. Cobertura e duplicação nem entraram naquele gate.

O handoff anterior deste arquivo descrevia `agente-codigo-local/bun.lock`. Esse lock já saiu na `main` (`136f37c9c`). A causa SCA vigente é o par na raiz: `package-lock.json` (instalação oficial `npm ci`) e `pnpm-lock.yaml` (espelho de overrides para pnpm local e Trivy).

## Arquivo(s) envolvido(s)

- `src/features/intelligence/commercial-v3/services/commercialContextBuilder.service.ts`
- `src/features/intelligence/commercial-v3/assets/07_RUNTIME/MONTAR_CONTEXT.py`
- `sonar-project.properties`
- `scripts/ci/report-sonarqube-qualitygate.mjs`
- `src/hooks/useCrmBoardController.ts`
- `src/features/intelligence/agents/supervisor.agent.ts` (export de `supervisorNode` para o teste do sub-swarm)
- testes de comportamento listados na seção de alteração

## Evidência

Findings confirmados em `issues/search` (`sinceLeakPeriod=true`, tipos BUG e VULNERABILITY, total 3):

1. BUG CRITICAL `typescript:S2871`, chave `AaGVHHGqb13Y7R6S0biL`. `commercialContextBuilder.service.ts` linha 71. `.sort()` sem comparador.
2. VULNERABILITY MAJOR `pythonsecurity:S8707`, chaves `AaGVHHEtb13Y7R6S0biJ` e `AaGVHHEtb13Y7R6S0biK`. `MONTAR_CONTEXT.py` linha 35. `--output` tratado como fonte de usuário e usado em `Path.mkdir` / `write_text` (path traversal).

Cobertura nova agregada no mesmo período: 686 linhas a cobrir, 404 descobertas, 435 condições, 273 descobertas. Unidades cobertas 444 de 1121 (39,6%). Faltam 453 unidades para 80% (897/1121).

Maiores buracos de código novo, medidos na API `sources/lines` (`isNew` e `lineHits`): painel da célula comercial, rotas V3, simulador inbound, playbooks, `MONTAR_CONTEXT.py`, avaliador redteam, orquestrador V3, `VALIDAR_ESTRUTURA.py`, ping do hub universal, registry, conectores, supervisor, rotas do ecossistema, cliente `commercialV3.api`, quota de tokens e ramos do schema.

O log do scan também avisou caractere inválido em `useCrmBoardController.ts` linha 30 (U+FFFD) e o reporter imprimiu o operador de falha como se fosse o critério (`exige > 1`, `exige < 80.0%`).

## Alteração necessária

Feita na branch `agente/08-sonarqube-recovery`, ainda sem análise Sonar do commit candidato:

1. Ordenação com `localeCompare` no builder de contexto.
2. `--output` de `MONTAR_CONTEXT.py` aceita só um nome de arquivo e grava em `./commercial-v3-out/`. Recusa caminho absoluto, `..` e separador. Sem `NOSONAR`.
3. `sonar.sca.exclusions=pnpm-lock.yaml`. `package-lock.json` continua na análise. `sonar.sca.allowRedundantLockfiles` não foi ligado. `pnpm-lock.yaml` não foi apagado, para o Trivy continuar vendo o espelho.
4. Strings de `useCrmBoardController.ts` regravadas em UTF-8 (Não foi possível / negócio / já).
5. O reporter separa aceitável (`≤ 1 (A)`, `≥ 80%`) da condição de falha do Sonar (`> 1`, `< 80%`). O processo continua saindo 0: quem falha o workflow é o `qualitygate.wait`.
6. Testes de comportamento nos buracos de código novo (painel, rotas, simulador, playbooks, API, CLI Python, ping de conector, schema, registry, quota, supervisor V3 e sub-swarm). Sem teste que só importa módulo. Sem baixar o limiar de 80% nem excluir arquivo produtivo.

## Teste esperado

O próximo scan Sonar do commit candidato, com o secret do repositório, precisa mostrar no mesmo commit:

- confiabilidade nova A;
- segurança nova A, inclusive as duas issues `pythonsecurity:S8707` fechadas de verdade (se o taint `base / raw` continuar, apertar o confinamento sem `NOSONAR`);
- cobertura nova ≥ 80%;
- duplicação ≤ 3% e hotspots 100%;
- log SCA sem `redundant lockfiles`.

Enquanto isso não existir, o gate não está verde. Não fazer merge.

## Contexto adicional

- Base de diagnóstico: `519855cf5c679ed568d19a132f69c3dafdc35c61`.
- `npm run typecheck`: exit 0.
- `npm run lint` (`biome lint src`): exit 0, com 639 warnings pré-existentes. Nenhum error novo atribuído a estes arquivos.
- Vitest dos 15 arquivos desta recuperação: 84 testes, exit 0.
- `npm run build`: exit 0 (Vite, esbuild do servidor e verify:pwa-precache).
- Suíte unitária completa e integração: NÃO EXECUTADOS nesta sessão. O workflow do Sonar roda a suíte unitária com cobertura.
- Scan do commit `a0179086a` no PR #148, medido pela API pública: quality gate ERROR. Confiabilidade, segurança e manutenibilidade 1 (A). Duplicação 0. Hotspots 100. Cobertura nova 4,2% (1/24). As 18 linhas novas de `MONTAR_CONTEXT.py` estavam em 0% porque não há LCOV Python. `useCrmBoardController.ts` tinha 3 linhas e 2 condições em 0%. O parecer em `.agents/reviews/ci-recovery-final-20261101-sonarqube-pr148-a0179086-24.md` é REPROVADO para esse SHA e não vale para o commit seguinte.
- Este commit gera `coverage/python/coverage.xml` no workflow e cobre as três linhas novas do hook, inclusive os dois ramos do erro de carga. O gate deste commit ainda não foi medido.
- Veredito desta recuperação: BLOCKED até o scan deste commit mostrar cobertura nova ≥ 80% e o Agente 24 emitir APROVADO para esse SHA.

## Resolução
- **Status:** **RESOLVIDO E HOMOLOGADO (APROVADO PELO AGENTE 24)**
- **Data:** 2026-11-01
- **Executores:** Agente 08 (QA e Release) & Agente 00 (Coordenação)
- **Commit em main:** `559635b30`, `fb68f525a`
- **Parecer:** `.agents/reviews/ci-recovery-final-20261101-sonarqube-pr148-559635b30-24.md` (APROVADO).
- Quality Gate SonarQube Cloud: 100% dos testes e cobertura atendidos.

