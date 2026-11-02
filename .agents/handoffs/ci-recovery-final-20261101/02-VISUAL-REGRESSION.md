# HANDOFF 02 — VISUAL REGRESSION
## Relatório de Diagnóstico, Matriz de Superfícies e Procedimento Operacional

- **De:** Agente 00 — Supervisor Geral
- **Para:** Agente 03 — Design, UX e Acessibilidade
- **Apoio:** Agente 08 — QA e Test Harness
- **Prioridade:** P1
- **Status:** RESOLVIDO — 88 BASELINES LINUX VERSIONADAS
- **Arquivo de Teste:** `visual-regression/visual.spec.ts`
- **Configuração:** `playwright.visual.config.ts`
- **Workflows Envolvidos:** `.github/workflows/visual-regression.yml` e `.github/workflows/ci.yml` (job `visual-baselines`)

---

### 1. DIAGNÓSTICO DO PROBLEMA

A suíte de regressão visual do Playwright apresentou 88 falhas devido à ausência das imagens de referência oficiais para o ambiente Linux no diretório `visual-regression/baselines/`.

#### Causa Raiz:
- O Playwright utiliza um caminho parametrizado estrito:
  `snapshotPathTemplate: '{testDir}/baselines/{testFilePath}/{arg}-{projectName}-{platform}{ext}'`
- Como a execução ocorre em runners Linux (`ubuntu-latest`), a plataforma resolvida é `linux` (gerando arquivos como `login-light-desktop-linux.png`).
- Como esses arquivos não haviam sido gerados e versionados no repositório, o Playwright falhou imediatamente por "snapshot missing", pois a diretiva configurada é `updateSnapshots: 'none'`.

---

### 2. MATRIZ DE COBERTURA VISUAL (88 CENÁRIOS)

A matriz é composta por:
- **11 Superfícies da Aplicação:**
  1. `Login` (`/login`)
  2. `Dashboard` (`/app/dashboard`)
  3. `Workspace` (`/app/workspace`)
  4. `CRM` (`/app/crm`)
  5. `Prospecção` (`/app/prospect`)
  6. `Inteligência` (`/app/intelligence`)
  7. `Analytics` (`/app/analytics`)
  8. `Integrações` (`/app/integrations`)
  9. `Calendário` (`/app/calendar`)
  10. `Automações` (`/app/automations`)
  11. `Administração - Module Access` (`/app/module-access`)
- **2 Temas:** `light` e `dark`
- **4 Viewports / Projetos:**
  * `desktop`: 1440 × 900
  * `laptop`: 1366 × 768
  * `tablet`: 768 × 1024
  * `mobile`: 390 × 844
- **Total Exato:** $11 \times 2 \times 4 = 88$ referências visuais obrigatórias.

---

### 3. MECANISMO DE GERAÇÃO EM AMBIENTE CONTROLADO LINUX

Conforme a governança de engenharia e para evitar inconsistências de rendering de fontes entre sistemas operacionais (Windows vs. Linux), a geração das baselines deve ser realizada estritamente via o job oficial já implementado em `.github/workflows/ci.yml`:

```yaml
# Trecho de .github/workflows/ci.yml:
visual-baselines:
  name: 'Gerar baselines visuais Linux (manual)'
  if: github.event_name == 'workflow_dispatch'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: bash scripts/db/bootstrap-app-role.sh localhost 5434 prospector prospectordb_test
    - run: npx prisma generate
    - run: npx playwright install --with-deps chromium
    - run: npm run test:visual:update
    - uses: actions/upload-artifact@v4
      with:
        name: visual-snapshots-linux
        path: visual-regression/baselines/**/*.png
```

#### Procedimento de Aplicação:
1. Disparar o workflow via `workflow_dispatch` na branch de trabalho no GitHub Actions.
2. O job provisiona PostgreSQL 16 (pgvector), Redis 7 e Meilisearch v1.12 em contêineres Docker saudáveis.
3. Aplica migrações do banco e roda `npm run test:visual:update`.
4. Os 88 snapshots Linux são compilados no artefato `visual-snapshots-linux`.
5. O Agente 03 e o Agente 08 realizam a inspeção visual dos screenshots baixados (verificando alinhamento, ausência de falhas de carregamento de fontes e tema).
6. Commit e inclusão dos snapshots em `visual-regression/baselines/`.
7. Execução do workflow de verificação `.github/workflows/visual-regression.yml` para assegurar que 88/88 cenários estejam verdes.

---

### 4. RESTRIÇÕES OBSERVADAS
- Proibido gerar baselines falsos ou em branco.
- Proibido uso de `continue-on-error: true`.
- Proibido afrouxar os thresholds de pixel diff (`maxDiffPixels: 1300` mantido).
- Preservação estrita das 11 superfícies e dos 88 testes.

---

### 5. RESOLUÇÃO DA MISSÃO 7 (2026-11-01)

- **Workflow Dispatch:** Executado job oficial `visual-baselines` em runner Linux (`ubuntu-latest`) no GitHub Actions (Run ID `41355086810`).
- **Artefato Baixado e Validado:** `visual-snapshots-linux` contendo exatamente 88 imagens de referência `.png`.
- **Versionamento:** Inclusão e versionamento dos 88 snapshots em `visual-regression/baselines/visual.spec.ts/`.
- **Matriz Atendida:** 11 superfícies (`login`, `dashboard`, `workspace`, `crm`, `prospect`, `intelligence`, `analytics`, `integrations`, `calendar`, `automations`, `admin-module-access`) × 2 temas (`light`, `dark`) × 4 viewports (`desktop`, `laptop`, `tablet`, `mobile`).
- **Branch:** `agente/08-03-visual-baselines-linux`.
