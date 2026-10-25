# Revisão independente — PR #96 @ 66ef605a — Agente 24

- **Veredito: BLOQUEADO @ `66ef605a23d6929d01fe957981182bed820ebcc1`**
  - O conteúdo está correto e nenhum achado é bloqueante.
  - Falta evidência de Architecture e Build: os dois steps não rodaram.
- Data: 2026-10-25 (BRT).
- **Missão:** remover os 5 services stub de integração (calendly, zoom, googleSheets, hubspot, notion), que acessam delegates Prisma inexistentes, e tirar 11 erros do tsc. Implementa a decisão do #91 (APROVADO @ `a84d0853`, parecer `8b3889d4`).
- **Autor:** Agente 06. Os commits são de MarksNN.
  - O handoff atribui a escolha de "apagar" a Marks. Isso é afirmação de agente: não tratei como aprovação do usuário.
  - Apagar está, de todo modo, entre as opções do #91.
- **Branch:** `agente/06-typecheck-integration-stubs`. PR não-draft, MERGEABLE.
- **Base:** `791b932d`. A main atual é `735b1962`, que adiciona só o #86 (teste Sidebar) e o #88 (schema), nada em `src/features/integrations`.
  - O merge-tree com `735b1962` é limpo: tree `edbb0c4b`.
  - Esse tree é igual ao do `pull/96/merge` `0832e4e6` (pais `735b1962` e `66ef605a`) que o CI testou.
- **Commit:** um só, `66ef605a` (16:18 BRT).
- **Handoff:** `.agents/handoffs/onda-52/06-para-24-typecheck-integration-stubs.md`.
- O veredito vale só para este SHA. Qualquer commit novo o invalida.

## Critérios
1. O diff é só a deleção dos 5 services, mais docs ou testes associados. Toda mudança que não seja deleção é marcada.
2. Nenhum importador, rota, registro dinâmico, worker ou fila fica quebrado. `HubSpotProvider` e `integrationsPing.routes.ts` ficam intactos.
3. tsc: −11 em relação à main, com 0 erros novos (99 → 88).
4. O fix do #72 em `calendly.service.ts` cai junto com o arquivo, sem dependentes.
5. Architecture (depcruise, cruise-coverage, hotspots) passa no CI. Se não rodou, é preciso uma diag.
6. Testes, snapshots, thresholds e baselines que referenciam os arquivos estão ajustados.
7. Os demais gates passam: trivy, lint, format, CodeQL e Sonar.

## Comandos executados
Nada de npm ci nem de checkout do código auditado.
- `git diff --name-status origin/main...pr96`, `git merge-tree --write-tree origin/main pr96`, `git log -1 --format='%P %T' pull/96/merge`.
- `git grep` no head (`pr96`) pelos 14 exports, pelos 5 delegates, por `*.service` e pelos paths `integrations/(calendly|googleSheets|notion|zoom)`, em todo o repositório (incluindo json, baselines e configs).
- `git show pr96:` nos arquivos `tsconfig.json`, `tsconfig.tsbuildinfo`, `knip.json`, `sonar-project.properties`, `vitest.unit.config.ts`, `scripts/architecture/*` e `biome-plugins/no-prisma-tx-escape.baseline.json`, mais `.dependency-cruiser-known-violations.json`.
- `git show ef40a9e62` (o #72) em `calendly.service.ts`.
- `gh api .../actions/jobs/<id>` e `.../logs` para:
  - o application gate do head (`121266094391`) e da main `735b1962` (`121265600826`);
  - o SonarQube do head (`121265678923`) e da main (`121265323048`).
- Comparação com `comm` das listas de erros TS (arquivo, linha e coluna, mais mensagem).

## Evidências

### 1. Diff
Sete arquivos, +57/−373:

| Status | Arquivo | Observação |
|---|---|---|
| D | `src/features/integrations/calendly/calendly.service.ts` | −208 |
| D | `src/features/integrations/zoom/zoom.service.ts` | −76 |
| D | `src/features/integrations/hubspot/hubspot.service.ts` | −37 |
| D | `src/features/integrations/notion/notion.service.ts` | −31 |
| D | `src/features/integrations/googleSheets/googleSheets.service.ts` | −20 |
| **A** (não é deleção) | `.agents/handoffs/onda-52/06-para-24-typecheck-integration-stubs.md` | Handoff, só docs |
| **M** (não é deleção) | `docs/migration/INTEGRACOES_E_VARIAVEIS.md` | Uma linha: troca a referência de `hubspot.service.ts` por `HubspotProvider.ts`. Correto. |

Não há nenhuma mudança fora de docs que não seja deleção.

### 2. Referências no head
- **Exports e delegates:** os 14 exports e os 5 delegates (`calendlyConnection` etc.) têm 0 ocorrências em código, testes, scripts e configs.
- **Diretórios:** em `src/features/integrations/{calendly,googleSheets,hubspot,notion,zoom}/` resta só `hubspot/HubspotProvider.ts`.
- **HubSpotProvider e rota de ping:** os dois não mudaram.
  - `integrationsPing.routes.ts` importa `../hubspot/HubspotProvider.js` (side-effect de registro) e `getCrmProvider`, nunca os services.
  - `tests/unit/features/integrations/integrationsPing.routes.test.ts` e `ExternalCrmProviders.test.ts` passaram no Sonar do head: 0 falhas fora das 3 herdadas.
- **Registros dinâmicos:** não há `import()` com string que alcance esses paths. O registro de providers (`getCrmProvider`) só conhece Hubspot, Pipedrive, RdStation e Monday.
- **Workers e filas:** nenhum referencia os services.
- **Calendly e Zoom no produto:** seguem via `organizationSetting` (`integration.calendly`) em `universalConnectors.service.ts` e `universalMeetingsTool.ts`, que não mudaram.
- **Referências que sobram:** só em `.agents/**` (histórico de handoffs e auditorias), em `docs/` (já corrigido) e em `tsconfig.tsbuildinfo`.
  - O `tsconfig.tsbuildinfo` é um artefato velho de 2026-10-09, que nem lista o calendly (posterior a ele).
  - O `tsconfig.json` não usa `incremental` nem `composite`, então esse arquivo é irrelevante.

### 3. tsc no CI
O CI rodou no merge ref `0832e4e6`.

| Ref | Job | Erros |
|---|---|---|
| main `735b1962` | `121265600826` | 99 (lista idêntica à da main `58f1895b`, job `121247466311`) |
| head do #96 | `121266094391` | **88** |

- Os 11 erros que saem são exatamente os 6 de calendly (TS2339), 1 de googleSheets (TS2339), 1 de hubspot (TS2339), 1 de notion (TS2551) e 2 de zoom (TS2551).
- **0 erros novos.** As 88 linhas restantes são idênticas às da main, inclusive linha e coluna.

### 4. Fix do #72
- O #72 (`ef40a9e6`) mudou em `calendly.service.ts` só os campos de log `connectionId` → `params.connectionId`, dentro do próprio arquivo.
- Ninguém importava o arquivo, então nada dependia desse fix. Ele cai junto com o arquivo sem efeito colateral.
- O outro fix do #72 na área de IA (`src/lib/ai/gateway/chat-model.ts`, logger) **não é tocado** por este PR e continua na main.

### 5. Architecture
- No application gate do head, Install, Audit, Prisma generate, Lint, Prettier e clean-tree passaram. **Run Type Check falhou** com os 88 erros herdados.
- Por isso **Architecture tests, OpenAPI drift, Unit, AI Resilience, Migrations, Integration, Build, Smoke e E2E foram pulados.**
- Não existe branch `agente/gha-diag-pr96-*` no remoto.
- Análise estática:
  - Nem `.dependency-cruiser-known-violations.json` nem `docs/architecture/HOTSPOT_EXCEPTIONS.md`/`check-hotspots.ts` mencionam os arquivos.
  - `verify-cruise-coverage.ts` compara proporcionalmente os módulos cruzados com os arquivos-fonte, sem contagem fixa.
  - Apagar módulos folha não deveria quebrar nada disso, mas é inferência, não evidência.

### 6. Testes, thresholds e baselines
- Nunca existiram testes para esses 5 services, nem na main nem em `tests/` ou `__tests__`. Não havia nada a remover.
- Nenhum snapshot, nem `no-prisma-tx-escape.baseline.json`, `knip.json`, `sonar-project.properties` ou baseline de hotspots referencia os arquivos.
- Coverage no Sonar subiu de 41.52/34.65/35.85/42.12 (main) para **41.55/34.66/35.89/42.16** (head), em statements, branches, functions e lines.
  - Esperado, porque saíram arquivos sem cobertura.
  - Os thresholds do `vitest.unit.config.ts` ficam muito abaixo disso.

### 7. Outros gates no head
- **Verdes:** trivy scan, gate de PR do Trivy, secret scan, Dependency Review (os dois), CodeQL js e python, Frontend bundle budget, Visual Regression.
- **Lint e Prettier:** verdes no application gate.
- **SonarQube** (job `121265678923`): falhou em "Run Tests with Coverage", com Tests 3 failed / 5111 passed / 1 skipped e Test Files 2 failed / 654 passed.
  - As falhas são o import de `AgentExecutor.test.ts` e 3 testes em `src/lib/ai/__tests__/gateway.test.ts`.
  - **É idêntico à main `735b1962`** (job `121265323048`): mesmos nomes, mesmas contagens.
  - Não há falhas novas, mas o Scan do Sonar não rodou.
- **`build`** (consolidação do veredito) falhou porque herda a falha do application gate.

## Achados
1. **Sem achado bloqueante de conteúdo.** São deleções puras, com 0 referências quebradas, tsc 99 → 88 com 0 novos, e Unit (via Sonar) igual à main.
2. **Evidência faltando (é o que bloqueia):** Architecture (depcruise, cruise-coverage, hotspots) e Build não rodaram, porque a CI para no Type Check herdado. Não existe diag do #96.
3. **Baixo:** o `tsconfig.tsbuildinfo` versionado está obsoleto e ainda cita `hubspot.service.ts`. É inofensivo, mas é débito; sugiro removê-lo do versionamento num PR à parte.
4. **Observação de processo:** a frase "Marks decidiu apagar" vem do handoff. Não a usei como aprovação do usuário. O veredito se apoia na decisão técnica do #91.

## Condições para virar APROVADO
O GHA deve produzir uma diag no estilo v4e: branch `agente/gha-diag-pr96-66ef605a`, cujo tree seja `edbb0c4b` (main `735b1962` + #96) mais apenas o ci.yml com `continue-on-error` no Type Check, com patch-id igual ao do v4e. Essa diag precisa mostrar, no head equivalente:
- **Run Type Check** com exatamente os 88 erros (lista igual à do job `121266094391`).
- **Architecture tests** (`npm run test:architecture`: depcruise com `--ignore-known`, `verify:architecture-coverage` e `check:hotspots`) verdes.
- **OpenAPI drift** verde.
- **Run Unit Tests** sem falhas além das 3 herdadas de `gateway.test.ts` e da falha de carga de `AgentExecutor.test.ts`, e com coverage acima dos thresholds.
- **Run Build** ok.

O autor não precisa mudar nada no código.
