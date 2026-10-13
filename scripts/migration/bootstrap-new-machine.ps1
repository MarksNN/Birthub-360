<#
.SYNOPSIS
  Script idempotente de bootstrap e validação do Birth Hub 360 na nova máquina (Windows / PowerShell).
.DESCRIPTION
  Não instala ferramentas globais sem autorização. Restaura opcionalmente arquivos do cofre de migração,
  instala dependências respeitando estritamente os lockfiles (npm ci) e executa o verificador de prontidão.
#>
param(
  [string]$VaultPath = "",
  [switch]$InstallDeps,
  [switch]$RunGates
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  BIRTH HUB 360 — BOOTSTRAP E VALIDAÇÃO DE NOVA MÁQUINA (POWERSHELL)" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# 1. Restaurar arquivos do cofre privado se informado
if ($VaultPath -and (Test-Path $VaultPath)) {
  Write-Host "`n[1/3] Restaurando configurações locais a partir do cofre: $VaultPath" -ForegroundColor Yellow
  $untrackedDir = Join-Path $VaultPath "untracked-and-ignored"

  if (Test-Path (Join-Path $untrackedDir "root-env\.env")) {
    if (-not (Test-Path ".env")) {
      Copy-Item (Join-Path $untrackedDir "root-env\.env") ".env"
      Write-Host "  + .env restaurado com sucesso." -ForegroundColor Green
    } else {
      Write-Host "  = .env já existe na raiz (preservado sem sobrescrever)." -ForegroundColor Gray
    }
  }

  if (Test-Path (Join-Path $untrackedDir "root-env\.env.test")) {
    if (-not (Test-Path ".env.test")) {
      Copy-Item (Join-Path $untrackedDir "root-env\.env.test") ".env.test"
      Write-Host "  + .env.test restaurado com sucesso." -ForegroundColor Green
    } else {
      Write-Host "  = .env.test já existe na raiz (preservado sem sobrescrever)." -ForegroundColor Gray
    }
  }

  if (Test-Path (Join-Path $untrackedDir "vscode\mcp.json")) {
    New-Item -ItemType Directory -Force -Path ".vscode" | Out-Null
    if (-not (Test-Path ".vscode\mcp.json")) {
      Copy-Item (Join-Path $untrackedDir "vscode\mcp.json") ".vscode\mcp.json"
      Write-Host "  + .vscode\mcp.json restaurado com sucesso." -ForegroundColor Green
    } else {
      Write-Host "  = .vscode\mcp.json já existe (preservado sem sobrescrever)." -ForegroundColor Gray
    }
  }

  if (Test-Path (Join-Path $untrackedDir "backups")) {
    New-Item -ItemType Directory -Force -Path "backups" | Out-Null
    Get-ChildItem -Path (Join-Path $untrackedDir "backups") -Filter "*.sql" | ForEach-Object {
      $dest = Join-Path "backups" $_.Name
      if (-not (Test-Path $dest)) {
        Copy-Item $_.FullName $dest
        Write-Host "  + Dump SQL restaurado: $($_.Name)" -ForegroundColor Green
      }
    }
  }
} else {
  Write-Host "`n[1/3] Nenhum -VaultPath informado (ou caminho não encontrado). Pulando cópia do cofre." -ForegroundColor Gray
}

# 2. Instalar dependências respeitando lockfiles
if ($InstallDeps) {
  Write-Host "`n[2/3] Instalando dependências a partir dos lockfiles (npm ci)..." -ForegroundColor Yellow
  npm ci
  if (Test-Path "landing\package-lock.json") {
    npm --prefix landing ci
  }
  if (Test-Path "agente-codigo-local\package-lock.json") {
    npm --prefix agente-codigo-local ci
  }
} else {
  Write-Host "`n[2/3] Flag -InstallDeps não passada. Mantendo node_modules atual." -ForegroundColor Gray
}

# 3. Executar verificador de prontidão
Write-Host "`n[3/3] Executando verificador de prontidão..." -ForegroundColor Yellow
$verifyArgs = @("scripts/migration/verify-migration-readiness.mjs")
if ($RunGates) {
  $verifyArgs += "--run-gates"
}
node @verifyArgs
exit $LASTEXITCODE
