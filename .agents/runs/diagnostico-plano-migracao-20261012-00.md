# Diagnóstico Forense e Plano de Execução — Migração Segura de Máquina (Birth Hub 360)

**Agente Responsável:** 00 — Coordenador Geral  
**Data:** 2026-10-12  
**Base Original:** `main` (`a53446507`, sincronizada com `origin/main`)  
**Branch Isolada da Missão:** `integracao/onda-migracao-maquina-20261012`  
**Repositório Oficial:** `https://github.com/MaarkssN/Birthub-360.git` (`id: 1303264698`, sem forks ativos; redirecionamento transparente do antigo namespace `Marks-Mah/Birthub-360`)

---

## 1. Diagnóstico Forense Consolidado (Fases 1 a 4 e 7)

### 1.1 Estado do Git, Branches, Stashes e Worktrees
- **HEAD inicial:** `a53446507` (`main`, `ahead=0, behind=0` em relação a `origin/main`).
- **Branches Locais (64 antes da missão, 72 após ancoragem de stashes):**
  - **100% das 64 branches locais** já possuem todos os seus commits integrados como ancestrais de `origin/main` (`inOriginMain = True`, `0` commits órfãos fora de `origin`).
  - `agente/02-landing-prospeccao-embed` está 1 commit à frente de `origin/agente/02-landing-prospeccao-embed` (`729c8c33b`), porém esse commit já foi integrado em `origin/main`.
- **Stashes (`stash@{0}` a `stash@{11}` — 12 stashes):**
  - `stash@{5}` a `stash@{11}` já possuíam branches `backup-stash/20261009-*` integradas em `origin/main`.
  - **Achado Crítico de Preservação:** `stash@{0}` a `stash@{4}` (criados em `2026-10-11`) **não estavam referenciados em nenhuma branch local ou remota**, incluindo commits de arquivos untracked (`^3`) em `stash@{0}` (`identidade-visual/MANUAL-DE-IDENTIDADE-VISUAL.md`) e `stash@{1}` (`identidade-visual/MANUAL-DE-IDENTIDADE-VISUAL.html`).
  - **Mitigação imediata aplicada:** Criadas as branches locais `backup-stash/20261012-0-wip-fonts`, `backup-stash/20261012-0-wip-fonts-untracked`, `backup-stash/20261012-1-untracked-manual`, `backup-stash/20261012-1-untracked-manual-untracked`, `backup-stash/20261012-2-identidade-visual-tokens`, `backup-stash/20261012-3-single-page-dashboard` e `backup-stash/20261012-4-pg-repositories` sem remover `refs/stash`.
- **Worktrees (22 ativos):**
  - 19 worktrees em `C:/Github/*` e 3 worktrees em `C:/Users/marce/.codex/worktrees/*/Birthub-360`.
  - Todos os 22 worktrees estão com `git status` limpo para arquivos rastreados.
  - Artefatos ignorados importantes em worktrees:
    - Raiz (`C:/Github/Birthub-360`): `.env` (146 chaves), `.env.test` (13 chaves), `.vscode/mcp.json` (1 servidor MCP `modulify` com token Bearer), `.devin/config.local.json`, `backups/*.sql` (2 dumps de drill de `2026-10-03`), `.tmp/antigravity-sync/*`, `audit-screenshots/`, `visual-audit-authenticated/`, `deploy-ec2-*.log`.
    - Worktree 8 (`C:/Github/birthub-turbo-08`): `.env.test` local.
    - Worktree 22 (`C:/Users/marce/.codex/worktrees/aws-release-architecture/Birthub-360`): diretório `.tmp/` com scripts `aws-deploy-safe.py`, `test_aws_deploy_safe.py`, `pr-body.md`, `release-audit.json` e 2 tarballs de release (~268 MB).
- **Repositório Irmão Relacionado:** `C:\Github\Landpage` (`https://github.com/MaarkssN/Landpage.git`, branch `main`) contém artefatos da Landing Page do Birth Hub 360.

### 1.2 Ambiente, Runtimes e Infraestrutura Local
- **SO / Hardware:** Windows 11 Home Single Language Build `26100` (x64), AMD Ryzen 5 5625U, 23,40 GB RAM.
- **WSL / Docker / Postgres Nativo:** `WSLService` ativo mas sem distro Linux instalada; **Docker Desktop não instalado** nesta máquina; `psql`/`pg_dump`/`ollama` binários locais não instalados; JDK/Android SDK não instalados.
- **Runtimes Instalados:** Git `2.55.0.windows.3`, GitHub CLI `2.101.0`, Node.js `v22.23.2` (mais `fnm 1.39.0` em `fnm/fnm.exe` com Node `v20.20.2`), npm `10.9.8`, pnpm `12.8.1`, Python `3.14.7`, AWS CLI `2.37.4`, VS Code `1.141.0` (15 extensões).
- **Lockfiles:** `package-lock.json` (raiz), `pnpm-lock.yaml` (raiz, usado pelo gate Trivy), `landing/package-lock.json`, `agente-codigo-local/package-lock.json`, `skills-lock.json`.
- **Prisma:** `7.10.0`, `prisma/schema.prisma` (5.542 linhas, 144 models, 57 enums), 139 migrations, extensões `vector`, `pg_trgm`, `postgis`.

### 1.3 Integrações, Variáveis e Arquitetura Multiagente
- **Gaps em `.env.example`:** 18 variáveis do `envSchema` (`src/config/env.ts`) e variáveis de analytics/gateway (`GEMINI_API_KEY`, `THREECX_WEBHOOK_SECRET`, `MEILI_HOST`, `MEILI_MASTER_KEY`, `AI_MONTHLY_BUDGET_USD`, `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS`, `EXPOSE_API_DOCS`, `POSTHOG_KEY`, `POSTHOG_HOST`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `OPENROUTER_API_KEY`, `OLLAMA_HOST`, `QDRANT_URL`, etc.) estavam ausentes do `.env.example`.
- **Caminhos Absolutos Legados:** 4 scripts utilitários (`scripts/update_dashboard.py`, `scripts/update_dock.py`, `scripts/update_dock_quick_actions.py`, `scripts/update_prospecting.py`) continham `r"c:\GitHub\PROSPECTOR-BIRTH HUB 360\..."` hardcoded, e `.env.example` continha comentário com caminho de usuário local.
- **Governança Multiagente:**
  - 23 prompts em `.agents/prompts/`, 48 skills em `.agents/skills/`, 36 skills em `.claude/skills/`, 216 handoffs, 46 pareceres em `.agents/reviews/`, 58 relatórios em `.agents/runs/`.
  - Customizações globais em `C:\Users\marce\.codex` (`config.toml`, `AGENTS.md`) e `C:\Users\marce\.gemini\antigravity` mapeadas para migração.

---

## 2. Plano de Execução e Matriz de Propriedade

| Etapa | Descrição | Proprietário | Critério de Verificação |
| :--- | :--- | :--- | :--- |
| **1. Cofre de Backup e Git Bundles (Fase 2)** | Gerar `birthub-360-all-20261012.bundle` (incluindo `stash@{0..4}` via `backup-stash/20261012-*`), `landpage-all-20261012.bundle`, patches de todos os 12 stashes e backup separado de ignorados/untracked em `C:\Github\Birthub-360-Migration-Backup-20261012\` com manifesto `SHA-256`. | 00 / 08A / 10 | `git bundle verify` exit 0 + `MANIFEST-SHA256.json` validado. |
| **2. Saneamento de `.env.example` e Portabilidade de Caminhos (Fases 4 e 7)** | Atualizar `.env.example` com todas as variáveis ausentes sem valores reais; parametrizar os 4 scripts `scripts/update_*.py` para caminhos relativos ao repo; documentar prompts 21–23 em `.agents/README.md`. | 01 / 14 / 15 | Diff sem segredos + scripts Python usando `Path(__file__).resolve().parents[1]`. |
| **3. Documentação de Portabilidade (Fase 5)** | Criar os 6 documentos obrigatórios em `docs/migration/`: `INVENTARIO_AMBIENTE.md`, `CHECKLIST_MIGRACAO.md`, `INSTALACAO_NOVA_MAQUINA.md`, `BACKUP_E_RECUPERACAO.md`, `INTEGRACOES_E_VARIAVEIS.md` e `RELATORIO_PRE_MIGRACAO.md`. | 00 / 10 / 14 / 18 | 6 arquivos completos, verificados e sem segredos. |
| **4. Scripts Idempotentes de Instalação e Validação (Fase 6)** | Criar `scripts/migration/verify-migration-readiness.mjs`, `scripts/migration/bootstrap-new-machine.ps1` e `scripts/migration/bootstrap-new-machine.sh`. | 14 / 08 | Execução real de `node scripts/migration/verify-migration-readiness.mjs` com código de saída 0. |
| **5. Teste de Restauração e Gates Locais (Fase 8)** | Simular restauração limpa a partir do `birthub-360-all-20261012.bundle` em diretório isolado; executar `npx tsc --noEmit`, `npm run lint`, `npm run test:architecture`, `npm run build` e testes unitários. | 08 / 14 | Clone do bundle íntegro + gates locais verdes (`exit 0`). |
| **6. Auditoria Independente Obrigatória (Fase 9 / §40)** | Acionar o **Agente 24** para auditar todos os arquivos criados/alterados, hashes SHA-256, ausência de segredos e evidências de teste, emitindo parecer em `.agents/reviews/24-parecer-migracao-segura-maquina-20261012.md`. | 24 | Parecer `APROVADO` gravado em `.agents/reviews/`. |
