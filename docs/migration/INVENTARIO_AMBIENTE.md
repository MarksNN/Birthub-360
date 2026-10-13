# Inventário Completo do Ambiente — Birth Hub 360

**Data de Referência:** 2026-10-12  
**Responsável:** Agente 00 (Coordenador) / Agente 10 (Infraestrutura e SRE) / Agente 14 (Ambiente e Test Harness)  
**Repositório Oficial:** `https://github.com/MaarkssN/Birthub-360.git`

---

## 1. Sistema Operacional e Hardware (Máquina de Origem)

| Componente | Valor Observado na Máquina Antiga | Requisito para a Nova Máquina | Classificação |
| :--- | :--- | :--- | :--- |
| **Sistema Operacional** | Microsoft Windows 11 Home Single Language (`10.0.26100`, Build `26100`) | Windows 11 (22H2+) c/ PowerShell 7+ **ou** Ubuntu 22.04/24.04 LTS (nativo/WSL2) | **Obrigatório** |
| **Arquitetura** | 64 bits (`AMD64` / `x64`) | `x64` (ou `ARM64` com suporte a binários `debian-openssl-3.0.x` no Docker) | **Obrigatório** |
| **Processador (CPU)** | AMD Ryzen 5 5625U (6 núcleos físicos / 12 threads) | Mínimo 6 núcleos / 12 threads (recomendado 8+ núcleos para `tsc` + suíte Vitest + Docker) | **Obrigatório** |
| **Memória RAM** | **23,40 GB** (typecheck exige `--max-old-space-size=8192`) | **Mínimo 16 GB** (Recomendado **24 GB a 32 GB** para rodar Docker Local-First + TypeScript) | **Obrigatório** |
| **Armazenamento (`C:`)** | 237,48 GB Total (153,87 GB em uso; 83,62 GB livres) | Mínimo **60 GB livres** (para `node_modules`, imagens Docker, modelos de embedding/Ollama e worktrees) | **Obrigatório** |
| **WSL 2** | `WSLService` em execução (Versão padrão: 2), sem distribuição Linux instalada na origem | **Recomendado** no Windows (necessário para backend WSL2 do Docker Desktop) | **Recomendado** |

---

## 2. Runtimes, Gerenciadores de Pacotes e Ferramentas CLI

| Ferramenta | Versão na Origem | Caminho Observado na Origem | Exigência do Projeto | Classificação |
| :--- | :--- | :--- | :--- | :--- |
| **Git** | `2.55.0.windows.3` | `C:\Program Files\Git\cmd\git.exe` | `>= 2.40.0` (suporte completo a `git worktree` e `git bundle`) | **Obrigatório** |
| **GitHub CLI (`gh`)** | `2.101.0` | `C:\Program Files\GitHub CLI\gh.exe` | `>= 2.50.0` (operações de PR, auditoria de checks e releases) | **Obrigatório** |
| **Node.js** | `v22.23.2` (global) / `v20.20.2` (via `fnm`) | WinGet (`OpenJS.NodeJS.22`) | `>= 20.0.0` (`package.json#engines`), **recomendado `v22.x LTS`** (alinhado ao `Dockerfile` `node:22-slim`) | **Obrigatório** |
| **npm** | `10.9.8` | Embutido no Node.js `v22.23.2` | `>= 10.0.0` (**gerenciador oficial** do projeto e do CI via `npm ci`) | **Obrigatório** |
| **pnpm** | `12.8.1` | Embutido no diretório do Node.js | Opcional para dev diário, porém `pnpm-lock.yaml` é mantido sincronizado para o gate Trivy no CI | **Recomendado** |
| **yarn** | *Não instalado* | — | Não utilizado pelo projeto | **Desnecessário** |
| **fnm** | `1.39.0` | `c:\Github\Birthub-360\fnm\fnm.exe` | Binário Windows versionado no repositório; opcional se Node 22 estiver instalado no sistema | **Específico da Máquina Antiga** |
| **Python** | `3.14.7` (`py` / `python`) | `C:\Users\marce\AppData\Local\Programs\Python\Python314\python.exe` | `>= 3.11` (usado para scripts auxiliares e `.venv-opensource` com `schemathesis>=4.0,<5.0`) | **Recomendado** |
| **Docker & Compose** | *Ausente na máquina antiga* | — | Docker Desktop (Windows) ou Docker Engine + Compose v2 (`docker compose`) — **necessário para stack Local-First, testes de integração e E2E** | **Obrigatório para Stack Completa** |
| **AWS CLI** | `2.37.4` | `C:\Program Files\Amazon\AWSCLIV2\aws.exe` | `>= 2.15.0` (apenas para operações autorizadas do Agente 08A/10) | **Opcional (Deploy)** |
| **PostgreSQL CLI (`psql` / `pg_dump`)** | *Ausente no host (executado via container `birthhub_postgres`)* | — | Executado via `docker exec birthhub_postgres` nos scripts `backup-local.ps1`, `restore-local.ps1` e `run-backup-restore-drill.ts` | **Opcional no Host (se Docker ativo)** |
| **Ollama** | *Binário local ausente (definido via Docker `birthhub_ollama`)* | — | Opcional localmente na porta `11434` (pode rodar via container `ollama/ollama:latest` ou host) | **Opcional** |
| **VS Code (`code`)** | `1.141.0` (x64) | `C:\Users\marce\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd` | Editor padrão com suporte a MCP (`.vscode/mcp.json`) | **Recomendado** |
| **Java JDK / Android SDK** | *Ausente na máquina antiga* | — | Necessário **somente** para compilar APK/AAB nativo via Capacitor (`@capacitor/android@^8.5.1`) | **Opcional (Mobile)** |

---

## 3. Lockfiles e Subprojetos Versionados

> **Regra de Migração:** Nunca executar `npm update` ou regenerar lockfiles sem necessidade durante a migração. Sempre utilizar `npm ci` para reproduzir exatamente a árvore de dependências homologada.

| Subprojeto / Escopo | Manifesto | Lockfile | Comando de Instalação Reprodutível |
| :--- | :--- | :--- | :--- |
| **Plataforma Principal (Raiz)** | `package.json` | `package-lock.json` (`1,25 MB`) + `pnpm-lock.yaml` (`818 KB`) | `npm ci` (dispara `postinstall`: `npx prisma generate`) |
| **Landing Page** | `landing/package.json` | `landing/package-lock.json` (`88 KB`) | `npm --prefix landing ci` |
| **Agente Código Local** | `agente-codigo-local/package.json` | `agente-codigo-local/package-lock.json` (`207 KB`) | `npm --prefix agente-codigo-local ci` |
| **Extensão Chrome (MV3)** | `chrome-extension/manifest.json` | *Sem dependências npm (JS puro)* | Carregar pasta `chrome-extension/` em `chrome://extensions` |
| ** Ambiente Python (Contrato OpenAPI)** | `requirements-dev.txt` | Fixado em `schemathesis>=4.0,<5.0` | `python -m venv .venv-opensource && .venv-opensource/Scripts/pip install -r requirements-dev.txt` |

---

## 4. Banco de Dados, Prisma e Infraestrutura Local-First (Docker)

### 4.1 Prisma ORM e Migrations
- **Versão:** `prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/config@7.10.0`, `@prisma/adapter-pg@7.10.0`.
- **Configuração:** `prisma.config.ts` e `prisma/schema.prisma` (**5.542 linhas**, **144 models**, **57 enums**).
- **Histórico de Migrations:** **139 migrations** em `prisma/migrations/` (de `20260716232635_init` até `20261013120000_external_crm_entity_links_stage_mapping`).
- **Extensões PostgreSQL Obrigatórias:**
  - `vector` (`pgvector`) — busca semântica e RAG;
  - `pg_trgm` — índices de busca textual em `Company` e `Contact`;
  - `postgis` — habilitada no bootstrap (`scripts/db/02-enable-extensions.sql`).
- **Requisito de Segurança Multi-Tenant (RLS):**
  - A aplicação deve conectar com role **`NOSUPERUSER`** (`prospector_app`), criada por `scripts/db/create-app-role.sql`, garantindo que as políticas de Row-Level Security (`app.current_organization_id`) sejam efetivamente aplicadas.

### 4.2 Topologia de Containers Local-First
1. **`docker-compose.postgres-local.yml`:**
   - `birthhub_postgres` (`pgvector/pgvector:pg16`, porta **`5434:5432`**, volume `birthhub_pgdata`).
2. **`docker-compose.yml` (Serviços de Apoio):**
   - `birthhub_redis` (`redis:7-alpine`, porta **`6379:6379`**);
   - `birthhub_meilisearch` (`getmeili/meilisearch:v1.6`, porta **`7700:7700`**);
   - `birthhub_minio` (`elestio/minio:latest`, portas **`9000:9000`** e **`9001:9001`**, bucket `prospector-assets`);
   - `birthhub_litellm` (`ghcr.io/berriai/litellm:main-stable`, porta **`4000:4000`**);
   - `birthhub_ollama` (`ollama/ollama:latest`, porta **`11434:11434`**).
3. **`docker-compose.opensource.yml` & `docker-compose.services.yml` (Opcionais — Observabilidade, LLMOps e Ferramentas):**
   - Langfuse (`3001`), Grafana (`3002`), Prometheus (`9090`), Loki (`3100`), Tempo, OTel Collector (`4317`/`4318`), Temporal (`7233`/`8233`), Qdrant (`6333`), Flowise (`3008`), OpenWebUI (`3009`), n8n (`5678`), Superset (`8089`), Chatwoot (`3005`), LiveKit (`7880`).

---

## 5. Frameworks e Tecnologias Core da Aplicação

- **Frontend:** React `19.3.0`, Vite `6.2.3`, TypeScript `6.0.3`, Tailwind CSS `4.1.14`, Framer Motion `13.1.1`, TanStack Query `5.103.1`, React Router `7.18.1`, ECharts `6.1.0` / Recharts `3.10.1`, Three.js `0.185.1`, XYFlow `12.12.0`, RxDB `17.5.0`.
- **Backend & Workers:** Node.js + Express `5.2.1`, Better Auth `1.7.4`, BullMQ `6.3.2` + `ioredis` `6.0.0`, Pino `10.3.1`, Zod `4.4.3`, OpenTelemetry SDK `0.222.0`.
- **Qualidade, Linting e Testes:** Biome `2.5.14`, ESLint `9.39.5`, Dependency Cruiser `18.5.0`, Vitest `4.1.11`, Playwright `1.63.0`, Storybook `10.6.0`, CycloneDX SBOM `6.0.1`.

---

## 6. VS Code, Extensões e Ferramentas de Agentes

### 6.1 Extensões Instaladas na Máquina de Origem (15 extensões)
Para instalar todas de uma vez na máquina nova:
```powershell
@(
  "diegosouzapw.omnicopilot@1.3.0",
  "eamodio.gitlens@19.3.0",
  "google.geminicodeassist@2.104.0",
  "hidenobunagai.nvidia-nim-provider@0.3.6",
  "ms-azuretools.vscode-containers@2.5.2",
  "ms-azuretools.vscode-docker@2.0.0",
  "ms-ceintl.vscode-language-pack-pt-br@1.131.2026090407",
  "ms-python.debugpy@2026.6.0",
  "ms-python.python@2026.8.0",
  "ms-python.vscode-python-envs@1.38.0",
  "ms-vscode-remote.remote-containers@0.469.0",
  "ms-vscode.cpptools@1.34.4",
  "ms-vscode.powershell@2025.4.0",
  "ollama.ollama@0.0.12",
  "twxs.cmake@0.0.17"
) | ForEach-Object { code --install-extension $_ }
```

### 6.2 Ferramentas de Desenvolvimento Assistido por IA e MCPs
- **Google Antigravity IDE / CLI:** Diretório de dados em `%USERPROFILE%\.gemini\antigravity`. Todas as 48 skills do projeto já estão versionadas dentro do repositório em `.agents/skills/`.
- **OpenAI Codex CLI / App:** Configurado em `%USERPROFILE%\.codex\config.toml` e `%USERPROFILE%\.codex\AGENTS.md` (copiados para o cofre de migração).
- **Claude Code:** Configurado via `.claude/CLAUDE.md`, `.claude/launch.json`, `.claude/settings.local.json`, `.claude/agents/` e `.claude/skills/` (todos versionados no repositório).
- **Servidor MCP Local (`.vscode/mcp.json`):** Servidor HTTP `modulify` (`https://api.modulify.ai/mcp`) — arquivo ignorado pelo Git por conter token Bearer; preservado no cofre seguro de migração.
