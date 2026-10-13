# Plano e Procedimento de Backup e Recuperação — Birth Hub 360

**Data de Referência:** 2026-10-12  
**Responsável:** Agente 00 (Coordenador) / Agente 08A (Git) / Agente 10 (SRE & Backup)  
**Local do Cofre Gerado:** `C:\Github\Birthub-360-Migration-Backup-20261012\` *(fora da árvore do repositório para não violar B-14 nem poluir o Git)*

---

## 1. Arquitetura do Backup de Migração

Um `git clone` padrão do GitHub ou mesmo um `git bundle` isolado **não preserva** arquivos ignorados (`.env`, `.vscode/mcp.json`, dumps SQL), stashes antigos que só existem no reflog (`stash@{1..11}`) ou arquivos temporários de worktrees.

Por isso, a preservação foi dividida em **4 camadas verificáveis**:

1. **Ancoragem de Stashes em Branches Nomeadas (`backup-stash/20261012-*`):**
   - Os 5 stashes recentes de `2026-10-11` (`stash@{0}` a `stash@{4}`), que não estavam em nenhuma branch local ou remota, foram ancorados em branches locais dedicadas (incluindo commits `^3` de arquivos untracked) para que entrem integralmente no `git bundle --all`.
2. **Git Bundles Completos (`--all`) + Verificação `git bundle verify`:**
   - `birthub-360-all-20261012.bundle` (**418.120.169 bytes**, 409 refs: todas as branches locais, remotas, tags, snapshots Codex e stashes ancorados).
   - `landpage-all-20261012.bundle` (**1.149.318 bytes**, 4 refs do repositório irmão `C:\Github\Landpage`, incluindo o commit local `7e482213` ainda não enviado ao remoto).
3. **Exportação Direta de Patches dos 12 Stashes (`stashes-patches/`):**
   - Diffs binários completos (`tracked` e `untracked`) de `stash@{0}` até `stash@{11}` exportados individualmente em arquivos `.patch`, permitindo aplicação cirúrgica com `git apply` em qualquer máquina.
4. **Cofre de Arquivos Ignorados, Não Rastreados e Configurações Globais (`untracked-and-ignored/`):**
   - `.env` e `.env.test` da raiz e do worktree `birthub-turbo-08`;
   - `.vscode/mcp.json` (configuração MCP `modulify`) e `vscode-extensions.txt`;
   - `.devin/config.local.json`;
   - Dumps SQL de desenvolvimento (`backups/drill_backup_2026-10-03T17-47-23-541Z.sql` e `drill_backup_2026-10-03T17-47-49-679Z.sql`);
   - Artefatos `.tmp/antigravity-sync/` (`orphan-inventory.json`, `rehearse-db.py`);
   - Scripts exclusivos do worktree 22 (`aws-deploy-safe.py`, `test_aws_deploy_safe.py`, `pr-body.md`, `release-audit.json`);
   - Logs operacionais (`deploy-ec2-*.log` e `.agents/runs/turbo-20261009/*.log`);
   - Configurações globais do Codex (`config.toml` e `AGENTS.md`).

---

## 2. Manifesto de Integridade (`SHA-256`) dos Artefatos Principais

O manifesto completo com todos os **56 arquivos** está gravado em `C:\Github\Birthub-360-Migration-Backup-20261012\MANIFEST-SHA256.json`. Abaixo estão os hashes dos pacotes críticos:

| Artefato no Cofre | Tamanho (Bytes) | Hash `SHA-256` | Status `verify` |
| :--- | :--- | :--- | :--- |
| `birthub-360-all-20261012.bundle` | `418.120.169` | `2CF1463D4FF287B0667A62AC42BD838B6E3049EE754A84C93778B39F141063A5` | `is okay` (409 refs) |
| `landpage-all-20261012.bundle` | `1.149.318` | `5120CC9E4FB80C6F649C94F15F972A5A925A18C536D8B146251581369CD2AB76` | `is okay` (4 refs) |
| `stashes-patches/stash-0-tracked.patch` | `1.163` | `AF05342FE6E5B70F49223564D7F27D713BF7B0B2AF3867A88496390DEA734C21` | Íntegro |
| `stashes-patches/stash-0-untracked.patch` | `3.971` | `B1DF1E46EDA2C20D40E9A77AE0E611990EA61D9DC2722D6A9DB456797A50B9CD` | Íntegro |
| `stashes-patches/stash-1-untracked.patch` | `28.974` | `8E31365C48B294DC14A5099BBC920DD9A73CDD452BC5847E06AA77B3A0CA44CF` | Íntegro |
| `stashes-patches/stash-2-tracked.patch` | `11.153` | `534C533E821516D1676CE24CAEA5B1B9DACA600386DD745E8CA1F5F553EDD837` | Íntegro |
| `stashes-patches/stash-3-tracked.patch` | `8.230` | `63A3261ACBA305ABD43EFCC6351372C2E022BA6840C93A05E41BB5CE6CD3B892` | Íntegro |
| `stashes-patches/stash-4-tracked.patch` | `23.272` | `5E02922564F56BEECD5875B03BC40CCCCCC48F05AEB4FD531B51F7E73453ADE5` | Íntegro |

### Mapeamento das Branches de Stash Criadas (`stash@{0}` a `stash@{4}`)

| Stash Original | Branch Criada para Preservação | Commit SHA | Conteúdo Preservado |
| :--- | :--- | :--- | :--- |
| `stash@{0}` | `backup-stash/20261012-0-wip-fonts` | `86ae58225` | `index.html` (fontes Google Fonts Sora/Inter/IBM Plex Mono) |
| `stash@{0}^3` | `backup-stash/20261012-0-wip-fonts-untracked` | `093f204c8` | `identidade-visual/MANUAL-DE-IDENTIDADE-VISUAL.md` (+69 linhas inéditas) |
| `stash@{1}` | `backup-stash/20261012-1-untracked-manual` | `ee7565fac` | Commit pai do stash de manual |
| `stash@{1}^3` | `backup-stash/20261012-1-untracked-manual-untracked` | `c4d2f0518` | `identidade-visual/MANUAL-DE-IDENTIDADE-VISUAL.html` (+770 linhas) |
| `stash@{2}` | `backup-stash/20261012-2-identidade-visual-tokens` | `b3d883927` | `identidade-visual/birthhub360/tokens/birthhub360.{css,json,ts}` |
| `stash@{3}` | `backup-stash/20261012-3-single-page-dashboard` | `5b3acbda5` | `src/features/dashboard/components/SinglePageDashboard.tsx` |
| `stash@{4}` | `backup-stash/20261012-4-pg-repositories` | `2512d2b86` | `PgCampaignRepository.ts`, `PgLeadRepository.ts`, `PgDialerRepositories.test.ts` |

---

## 3. Procedimento de Verificação Antes de Desligar a Máquina Antiga

Execute no PowerShell para validar 100% dos hashes do cofre antes de copiá-lo para mídia externa/nuvem criptografada:

```powershell
$vault = "C:\Github\Birthub-360-Migration-Backup-20261012"
$manifest = Get-Content "$vault\MANIFEST-SHA256.json" | ConvertFrom-Json
$failures = 0
foreach ($item in $manifest) {
  $fullPath = Join-Path $vault ($item.relativePath -replace '/', '\')
  if (-not (Test-Path $fullPath)) {
    Write-Error "AUSENTE: $($item.relativePath)"
    $failures++
    continue
  }
  $actualHash = (Get-FileHash -Path $fullPath -Algorithm SHA256).Hash
  if ($actualHash -ne $item.sha256) {
    Write-Error "HASH DIVERGENTE: $($item.relativePath)"
    $failures++
  }
}
if ($failures -eq 0) {
  Write-Host "OK: Todos os $($manifest.Count) arquivos verificados com SHA-256 identico!" -ForegroundColor Green
}
```

---

## 4. Procedimento de Restauração na Nova Máquina

### Passo 1 — Restaurar o Repositório (Opção A: via GitHub + Bundle, ou Opção B: 100% Offline via Bundle)

**Opção A (Online via GitHub + Importação das Refs Locais do Bundle):**
```powershell
git clone https://github.com/MaarkssN/Birthub-360.git C:\Github\Birthub-360
cd C:\Github\Birthub-360
git bundle verify C:\Github\Birthub-360-Migration-Backup-20261012\birthub-360-all-20261012.bundle
# Importar as branches de backup-stash e a branch de migração:
git fetch C:\Github\Birthub-360-Migration-Backup-20261012\birthub-360-all-20261012.bundle "refs/heads/backup-stash/*:refs/heads/backup-stash/*" "refs/heads/integracao/*:refs/heads/integracao/*"
```

**Opção B (100% Offline a partir do Git Bundle):**
```powershell
git clone C:\Github\Birthub-360-Migration-Backup-20261012\birthub-360-all-20261012.bundle C:\Github\Birthub-360
cd C:\Github\Birthub-360
git remote set-url origin https://github.com/MaarkssN/Birthub-360.git
git checkout main
```

### Passo 2 — Restaurar Arquivos `.env`, MCP, Deps e Dumps Locais
```powershell
$vault = "C:\Github\Birthub-360-Migration-Backup-20261012\untracked-and-ignored"
Copy-Item "$vault\root-env\.env" "C:\Github\Birthub-360\.env" -Force
Copy-Item "$vault\root-env\.env.test" "C:\Github\Birthub-360\.env.test" -Force
New-Item -ItemType Directory -Force -Path "C:\Github\Birthub-360\.vscode" | Out-Null
Copy-Item "$vault\vscode\mcp.json" "C:\Github\Birthub-360\.vscode\mcp.json" -Force
New-Item -ItemType Directory -Force -Path "C:\Github\Birthub-360\backups" | Out-Null
Copy-Item "$vault\backups\*.sql" "C:\Github\Birthub-360\backups\" -Force
```

### Passo 3 — Restaurar o Banco de Dados PostgreSQL Local (quando o Docker estiver ativo)
```powershell
cd C:\Github\Birthub-360
docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml up -d
# Aplicar migrations ou restaurar o dump SQL preservado:
.\scripts\local-first\restore-local.ps1 -BackupFile .\backups\drill_backup_2026-10-03T17-47-49-679Z.sql -Clean
npx prisma migrate deploy
npm run local:doctor
```
