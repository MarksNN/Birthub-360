# Checklist de Migração de Máquina (Saída e Chegada) — Birth Hub 360

**Data de Referência:** 2026-10-12  
**Responsável:** Agente 00 — Coordenador Geral  

---

## Parte 1 — Checklist de Saída (Máquina Antiga — Antes de Desligar/Formatar)

- [x] **1.1. Árvore de trabalho principal e 22 worktrees inspecionados:**
  - Confirmado que nenhum dos 22 worktrees possui alterações rastreadas pendentes (`git status` limpo em todos).
- [x] **1.2. Branches locais e remotas reconciliadas:**
  - Confirmado que todas as 64 branches locais originais já são ancestrais de `origin/main` (`a53446507`).
- [x] **1.3. Stashes locais (`stash@{0}` a `stash@{11}`) preservados:**
  - `stash@{0}` a `stash@{4}` (que não estavam em nenhuma branch) foram ancorados em `backup-stash/20261012-0..4` (incluindo seus commits `^3` de arquivos untracked) e exportados como patches em `stashes-patches/`.
- [x] **1.4. Git Bundles criados e validados com `git bundle verify`:**
  - `birthub-360-all-20261012.bundle` (`418.120.169` bytes, SHA-256 `2CF1463D4FF287B0667A62AC42BD838B6E3049EE754A84C93778B39F141063A5`, 409 refs).
  - `landpage-all-20261012.bundle` (`1.149.318` bytes, SHA-256 `5120CC9E4FB80C6F649C94F15F972A5A925A18C536D8B146251581369CD2AB76`, 4 refs — preserva o commit local `7e482213` de `C:\Github\Landpage`).
- [x] **1.5. Arquivos ignorados e configurações sensíveis copiados para o cofre externo:**
  - `.env` (146 chaves) e `.env.test` (13 chaves) copiados para `untracked-and-ignored/root-env/`.
  - `.vscode/mcp.json` e lista `vscode-extensions.txt` copiados para `untracked-and-ignored/vscode/`.
  - `.devin/config.local.json` copiado para `untracked-and-ignored/devin/`.
  - Dumps SQL `backups/*.sql` copiados para `untracked-and-ignored/backups/`.
  - Artefatos `.tmp/` da raiz e do worktree 22 (`aws-deploy-safe.py`, `test_aws_deploy_safe.py`) copiados para `untracked-and-ignored/`.
  - Configurações globais `.codex/` copiadas para `untracked-and-ignored/codex-global/`.
- [ ] **1.6. Transferência física/segura do cofre para fora da máquina antiga (Ação Humana):**
  - Copiar `C:\Github\Birthub-360-Migration-Backup-20261012\` para unidade externa criptografada (BitLocker/LUKS) ou armazenamento seguro privado.
  - Verificar o `MANIFEST-SHA256.json` na mídia de destino antes de desligar a máquina antiga.

---

## Parte 2 — Checklist de Chegada (Máquina Nova — Instalação e Validação)

- [ ] **2.1. Validar integridade do cofre transferido:**
  - Executar o script de verificação de hashes `MANIFEST-SHA256.json` descrito em `docs/migration/BACKUP_E_RECUPERACAO.md`.
- [ ] **2.2. Instalar ferramentas base e autenticar CLIs:**
  - Instalar Git (`>=2.40`), GitHub CLI (`gh`), Node.js (`v22.x LTS`), npm (`>=10`), pnpm (`12.8.x`), Python (`>=3.11`), Docker Desktop / Docker Engine e VS Code.
  - Autenticar `gh auth login`.
- [ ] **2.3. Clonar/restaurar o repositório e importar refs do bundle:**
  - Clonar `https://github.com/MaarkssN/Birthub-360.git` (ou clonar direto do `birthub-360-all-20261012.bundle`).
  - Importar `refs/heads/backup-stash/*` e `refs/heads/integracao/*` a partir do bundle.
- [ ] **2.4. Restaurar arquivos `.env`, `.env.test`, `.vscode/mcp.json` e `backups/*.sql`:**
  - Executar `.\scripts\migration\bootstrap-new-machine.ps1 -VaultPath <CAMINHO_DO_COFRE> -InstallDeps` (ou equivalente `.sh` no Linux/WSL).
  - Confirmar que `CREDENTIALS_ENCRYPTION_KEY` e `PII_BLIND_INDEX_KEY` são idênticos aos da máquina antiga.
- [ ] **2.5. Subir Docker Local-First e restaurar/migrar banco PostgreSQL:**
  - Executar `docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml up -d`.
  - Executar `npx prisma migrate deploy` (e opcionalmente restaurar o dump SQL com `restore-local.ps1`).
  - Executar `npm run local:doctor` (deve retornar `[OK] Configuração principal está local-first`).
- [ ] **2.6. Executar o verificador automatizado de prontidão e os gates de qualidade:**
  - `node scripts/migration/verify-migration-readiness.mjs` → `PASS`
  - `npm run typecheck` → `exit 0`
  - `npm run lint` → `exit 0`
  - `npm run test:architecture` → `exit 0`
  - `npm run test:unit` → `exit 0`
  - `npm run build` → `exit 0`
  - Com Docker ativo: `npm run test:integration`, `npm run test:e2e` e `npm run backup:drill` → `exit 0`.
- [ ] **2.7. Verificar o ecossistema Multiagente:**
  - Confirmar leitura de `/AGENTS.md`, `.agents/prompts/` (23 prompts) e `.agents/skills/` (48 skills) no Antigravity / VS Code / Claude Code.
