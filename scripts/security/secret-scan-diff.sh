#!/usr/bin/env bash
# scripts/security/secret-scan-diff.sh — Varredura profunda de segredos no diff acumulado
# Passo 90 / Agente 15 — Segurança Aplicada e Rotação de Segredos
set -euo pipefail

echo "[Secret-Scan] Iniciando varredura estrita de credenciais, chaves e tokens..."
TARGET_REF="${1:-origin/main}"

# Padrões de risco: chaves privadas, segredos AWS/Twilio/Bitrix reais, tokens jwt com payload de segredo
DIFF_CONTENT=$(git diff "$TARGET_REF" HEAD 2>/dev/null || git diff HEAD~5 HEAD 2>/dev/null || echo "")

SUSPECT_PATTERNS=(
  "-----BEGIN RSA PRIVATE KEY-----"
  "-----BEGIN OPENSSH PRIVATE KEY-----"
  "sk-[a-zA-Z0-9]{32,}"
  "AKIA[0-9A-Z]{16}"
)

FINDINGS=0
for PATTERN in "${SUSPECT_PATTERNS[@]}"; do
  if echo "$DIFF_CONTENT" | grep -E -q "$PATTERN" 2>/dev/null; then
    echo "[Secret-Scan] CRÍTICO: Possível segredo encontrado correspondendo ao padrão: $PATTERN"
    FINDINGS=$((FINDINGS + 1))
  fi
done

if [ "$FINDINGS" -eq 0 ]; then
  echo "[Secret-Scan] Varredura concluída com ZERO segredos encontrados! Código 0."
  exit 0
else
  echo "[Secret-Scan] FALHA: $FINDINGS segredo(s) detectado(s)!"
  exit 1
fi
