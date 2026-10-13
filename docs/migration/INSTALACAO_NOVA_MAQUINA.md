# Roteiro de Instalação na Nova Máquina (Do Zero) — Birth Hub 360

**Data de Referência:** 2026-10-12  
**Responsável:** Agente 00 / Agente 10 / Agente 14  
**Sistemas Suportados:** Windows 11 (PowerShell 7+) e Ubuntu 22.04/24.04 LTS (Nativo ou WSL2)

---

## 1. Instalação das Ferramentas Base

### Opção A — Windows 11 (PowerShell como Administrador)
```powershell
# 1. Instalar Git, GitHub CLI, Node.js 22 LTS, Python 3.12+ e VS Code via WinGet
winget install --id Git.Git -e --source winget
winget install --id GitHub.cli -e --source winget
winget install --id OpenJS.NodeJS.22 -e --source winget
winget install --id Python.Python.3.12 -e --source winget
winget install --id Microsoft.VisualStudioCode -e --source winget

# 2. Habilitar WSL2 e instalar Docker Desktop (para stack Local-First e testes de integração)
wsl --install --no-distribution
winget install --id Docker.DockerDesktop -e --source winget

# 3. Opcional: AWS CLI (para operações autorizadas de infra/release)
winget install --id Amazon.AWSCLI -e --source winget
```

### Opção B — Ubuntu 22.04 / 24.04 LTS (Bash)
```bash
# 1. Pacotes essenciais e GitHub CLI
sudo apt-get update && sudo apt-get install -y curl git build-essential python3 python3-venv python3-pip ca-certificates gnupg
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt-get update && sudo apt-get install -y gh

# 2. Node.js 22 LTS (via NodeSource ou fnm)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable && corepack prepare pnpm@12.8.1 --activate

# 3. Docker Engine + Docker Compose v2
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
```

---

## 2. Autenticação de Contas e Transferência Manual Segura

Antes de clonar ou operar o repositório na máquina nova:

1. **Git & GitHub CLI:**
   ```bash
   git config --global user.name "Seu Nome"
   git config --global user.email "seu-email@dominio.com"
   gh auth login
   ```
2. **Transferir o Cofre Privado de Migração (`Birthub-360-Migration-Backup-20261012`):**
   - Copie a pasta `Birthub-360-Migration-Backup-20261012` por mídia criptografada (pendrive BitLocker/LUKS ou transferência direta local) para `C:\Github\Birthub-360-Migration-Backup-20261012` (Windows) ou `~/Github/Birthub-360-Migration-Backup-20261012` (Linux).
   - **Nunca faça upload do cofre para repositórios públicos**, pois `untracked-and-ignored/` contém `.env`, `.env.test` e `.vscode/mcp.json`.

---

## 3. Clonagem ou Restauração do Repositório

### No Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path "C:\Github" | Out-Null
# Clonar do GitHub oficial:
git clone https://github.com/MaarkssN/Birthub-360.git C:\Github\Birthub-360
cd C:\Github\Birthub-360

# Importar também as branches de backup-stash e a branch de migração a partir do bundle:
git fetch C:\Github\Birthub-360-Migration-Backup-20261012\birthub-360-all-20261012.bundle "refs/heads/backup-stash/*:refs/heads/backup-stash/*" "refs/heads/integracao/*:refs/heads/integracao/*"
```

### No Linux / WSL (Bash):
```bash
mkdir -p ~/Github
git clone https://github.com/MaarkssN/Birthub-360.git ~/Github/Birthub-360
cd ~/Github/Birthub-360
git fetch ~/Github/Birthub-360-Migration-Backup-20261012/birthub-360-all-20261012.bundle "refs/heads/backup-stash/*:refs/heads/backup-stash/*" "refs/heads/integracao/*:refs/heads/integracao/*"
```

---

## 4. Restauração de Configurações Locais e Instalação de Dependências

### Opção Automatizada (Recomendada — Fase 6):
- **Windows (PowerShell):**
  ```powershell
  .\scripts\migration\bootstrap-new-machine.ps1 -VaultPath "C:\Github\Birthub-360-Migration-Backup-20261012" -InstallDeps -RunGates
  ```
- **Ubuntu / WSL (Bash):**
  ```bash
  bash ./scripts/migration/bootstrap-new-machine.sh --vault "$HOME/Github/Birthub-360-Migration-Backup-20261012" --install-deps --run-gates
  ```

### Opção Passo a Passo Manual:
```bash
# 1. Copiar .env, .env.test e .vscode/mcp.json do cofre (ou criar a partir de .env.example)
cp ../Birthub-360-Migration-Backup-20261012/untracked-and-ignored/root-env/.env ./.env
cp ../Birthub-360-Migration-Backup-20261012/untracked-and-ignored/root-env/.env.test ./.env.test
mkdir -p .vscode backups
cp ../Birthub-360-Migration-Backup-20261012/untracked-and-ignored/vscode/mcp.json ./.vscode/mcp.json
cp ../Birthub-360-Migration-Backup-20261012/untracked-and-ignored/backups/*.sql ./backups/

# 2. Instalar dependências respeitando estritamente os lockfiles (executa prisma generate no postinstall)
npm ci
npm --prefix landing ci
npm --prefix agente-codigo-local ci

# 3. Opcional: Ambiente virtual Python para validação OpenAPI (schemathesis)
python -m venv .venv-opensource
# Windows: .\.venv-opensource\Scripts\pip install -r requirements-dev.txt
# Linux:   ./.venv-opensource/bin/pip install -r requirements-dev.txt
```

---

## 5. Subida do Banco de Dados e Serviços Local-First (Docker)

```bash
# 1. Subir PostgreSQL 16 (pgvector, porta 5434), Redis (6379), Meilisearch (7700), MinIO (9000), LiteLLM (4000) e Ollama (11434)
docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml up -d

# 2. Aplicar todas as 139 migrations do Prisma no banco local
npx prisma migrate deploy

# 3. Opcional: Restaurar o dump de desenvolvimento preservado
# No PowerShell:
# .\scripts\local-first\restore-local.ps1 -BackupFile .\backups\drill_backup_2026-10-03T17-47-49-679Z.sql -Clean
# npx prisma migrate deploy

# 4. Executar diagnóstico Local-First e verificador de prontidão de migração
npm run local:doctor
node scripts/migration/verify-migration-readiness.mjs
```

---

## 6. Validação de Qualidade e Inicialização da Plataforma

```bash
# 1. Gates locais obrigatórios (AGENTS.md §28)
npm run typecheck
npm run lint
npm run test:architecture
npm run test:unit
npm run build

# 2. Com Docker ativo, validar também integração, E2E e drill de backup
npm run test:integration
npm run test:e2e
npm run backup:drill

# 3. Iniciar a aplicação em modo desenvolvimento
npm run dev
# Em outro terminal (quando usar filas BullMQ):
npm run dev:worker
```

---

## 7. Restauração do Ambiente Multiagente (Fase 7)

1. **Governança e Skills do Repositório (Já Versionadas):**
   - `/AGENTS.md`, `.agents/prompts/` (23 prompts), `.agents/skills/` (48 skills), `.agents/handoffs/` (216 handoffs), `.agents/reviews/` (46 pareceres), `.agents/runs/` (58 relatórios) e `.claude/` já acompanham automaticamente o clone do repositório.
2. **VS Code + MCP (`modulify`):**
   - Instale as extensões listadas em `untracked-and-ignored/vscode/vscode-extensions.txt`.
   - O arquivo `.vscode/mcp.json` restaurado do cofre reconecta automaticamente o servidor MCP `modulify`.
3. **OpenAI Codex (se utilizado na nova máquina):**
   - Copie `untracked-and-ignored/codex-global/AGENTS.md` para `%USERPROFILE%\.codex\AGENTS.md`.
   - Revise `untracked-and-ignored/codex-global/config.toml` ajustando o caminho de usuário caso o nome do usuário do Windows mude na nova máquina.
4. **Google Antigravity IDE:**
   - Ao abrir `C:\Github\Birthub-360` no Antigravity na nova máquina, o IDE descobre automaticamente `/AGENTS.md` e todas as 48 skills em `.agents/skills/`.
