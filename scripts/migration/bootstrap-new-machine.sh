#!/usr/bin/env bash
# Script idempotente de bootstrap e validação do Birth Hub 360 na nova máquina (Ubuntu / WSL / Bash).
# Não instala ferramentas globais sem autorização.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

VAULT_PATH=""
INSTALL_DEPS=false
RUN_GATES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vault)
      VAULT_PATH="${2:-}"
      shift 2
      ;;
    --install-deps)
      INSTALL_DEPS=true
      shift
      ;;
    --run-gates)
      RUN_GATES=true
      shift
      ;;
    *)
      echo "Argumento desconhecido: $1" >&2
      echo "Uso: $0 [--vault <caminho>] [--install-deps] [--run-gates]" >&2
      exit 1
      ;;
  esac
done

echo "===================================================================="
echo "  BIRTH HUB 360 — BOOTSTRAP E VALIDAÇÃO DE NOVA MÁQUINA (BASH)"
echo "===================================================================="

if [[ -n "$VAULT_PATH" && -d "$VAULT_PATH" ]]; then
  echo ""
  echo "[1/3] Restaurando configurações locais a partir do cofre: $VAULT_PATH"
  UNTRACKED_DIR="$VAULT_PATH/untracked-and-ignored"

  if [[ -f "$UNTRACKED_DIR/root-env/.env" && ! -f ".env" ]]; then
    cp "$UNTRACKED_DIR/root-env/.env" ".env"
    echo "  + .env restaurado com sucesso."
  fi

  if [[ -f "$UNTRACKED_DIR/root-env/.env.test" && ! -f ".env.test" ]]; then
    cp "$UNTRACKED_DIR/root-env/.env.test" ".env.test"
    echo "  + .env.test restaurado com sucesso."
  fi

  if [[ -f "$UNTRACKED_DIR/vscode/mcp.json" && ! -f ".vscode/mcp.json" ]]; then
    mkdir -p ".vscode"
    cp "$UNTRACKED_DIR/vscode/mcp.json" ".vscode/mcp.json"
    echo "  + .vscode/mcp.json restaurado com sucesso."
  fi

  if [[ -d "$UNTRACKED_DIR/backups" ]]; then
    mkdir -p "backups"
    for sql_file in "$UNTRACKED_DIR/backups"/*.sql; do
      [[ -e "$sql_file" ]] || continue
      base_name="$(basename "$sql_file")"
      if [[ ! -f "backups/$base_name" ]]; then
        cp "$sql_file" "backups/$base_name"
        echo "  + Dump SQL restaurado: $base_name"
      fi
    done
  fi
else
  echo ""
  echo "[1/3] Nenhum --vault informado (ou diretório ausente). Pulando cópia do cofre."
fi

if [[ "$INSTALL_DEPS" == "true" ]]; then
  echo ""
  echo "[2/3] Instalando dependências a partir dos lockfiles (npm ci)..."
  npm ci
  if [[ -f "landing/package-lock.json" ]]; then
    npm --prefix landing ci
  fi
  if [[ -f "agente-codigo-local/package-lock.json" ]]; then
    npm --prefix agente-codigo-local ci
  fi
else
  echo ""
  echo "[2/3] Flag --install-deps não passada. Mantendo node_modules atual."
fi

echo ""
echo "[3/3] Executando verificador de prontidão..."
if [[ "$RUN_GATES" == "true" ]]; then
  node scripts/migration/verify-migration-readiness.mjs --run-gates
else
  node scripts/migration/verify-migration-readiness.mjs
fi
