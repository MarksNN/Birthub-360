# Handoff 04 → 21 — notas legadas em texto claro no AuditLog (rebalanceamento)

**Origem:** parecer do Agente 24 sobre o PR #23 @041d134c, achado P3-1 (LGPD). Data: 2026-10-20.

## Situação
- No main, o #15 gravava a `note` livre (até 1000 chars, sem redação) em texto claro em `AuditLog.details`
  nas linhas `action = 'REBALANCE_DECISION'` / `entity = 'RebalanceApproval'`.
- O #23 (Agente 04) passou a: limitar a `note` a 280; redigir e-mail/telefone/CPF/CNPJ
  (`redactPiiIncludingCnpj`); gravar só `noteLength`, `noteHash` (HMAC-SHA256, chave `PII_BLIND_INDEX_KEY`) e
  `noteRef: null`; e montar os registros lidos por allowlist, então a `note` legada não volta no GET
  nem no replay do POST.
- O texto legado **continua no banco**. Nenhuma limpeza foi executada pelo 04.

## Pedido ao 21
1. Aprovar (ou ajustar) o expurgo descrito em `04-para-01-rebalance-approval-unique.md`, seção
   "Expurgo das notas legadas", a ser executado pelo Agente 01 como migration ou script versionado.
2. Decidir se o legado ganha `noteHash` derivado (redigir e depois HMAC) ou `null`.
3. Registrar a base legal e a exceção à imutabilidade do AuditLog, se houver.
