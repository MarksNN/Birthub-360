# Parecer Agente 24 — PR #23 @ 9819f72b

- **Missão:** rebalanceamento e What-If reais (contrato 04).
- **Autor:** Agente 04 — CRM e BI.
- **Base:** main @ 8dff1dde.
- **SHA revisado:** 9819f72b. Substitui o parecer @ 4473646b (commit b02f52a), que foi APROVADO CONDICIONADO.
- **Veredito: BLOQUEADO** por falta de evidência. O application gate deste SHA terminou em **FAILURE** (GraphQL checkRuns), e os logs não puderam ser lidos (rate limit da API REST do GitHub às 23:49–23:52 BRT), então não dá para confirmar que as únicas falhas são as 4 herdadas do #25. Além disso, o head do PR já avançou para **60a96134**, ainda não auditado.

## Diff 4473646b..9819f72b (estático)
- `noteMetadata(organizationId, note)`: `noteHash = keyedDigestHex(REBALANCE_NOTE_HASH_DOMAIN, `${organizationId}\u0000${redigido}`)`. A mesma nota em orgs diferentes gera hashes diferentes, e não há correlação entre tenants. **OK.**
- Teste novo: `noteHash inclui organizationId: mesma nota em orgs diferentes → hashes diferentes`; teste do POST ajustado para `org-a\u0000...`.
- OpenAPI, contrato e handoffs atualizados. O SQL de limpeza do legado foi reescrito por tenant (`set_config('app.current_tenant_id', org, true)` dentro da transação), só em docs, sem execução.
- Mantém o que foi verificado @ 4473646b: allowlist no `parseApprovalRecord` (P3-1 corrigido), testes de legado, GET e replay, TTL no POST, redação de telefone BR, fail-closed do `PII_BLIND_INDEX_KEY` em `NODE_ENV=production` (`resolveIndexKey` lança erro; chave ≠ 32 bytes também).

## Achados
- **P1 — Gate FAILURE não qualificado** neste SHA (detalhe ilegível por rate limit).
- **P2 — Head superado** (60a96134).
- **P3:** a `note` legada em claro no `AuditLog` segue até o expurgo do handoff 04→21/01. Não é mais reexposta pela API.
- **P3 — Compatibilidade com o #37:** o #37 cria `RebalanceApproval.note` em claro, sem `noteLength`/`noteHash`, o que contraria a política do #23. Ver o parecer do #37.
- **P4:** o fail-closed da chave é preguiçoso (só dispara na primeira nota, não no boot).

## Condições para voltar a APROVADO CONDICIONADO
1. Auditar o head atual (60a96134).
2. Gate com falhas restritas às 4 herdadas do #25, provado por log; após o #25, gate 100% verde, incluindo Build/Smoke/E2E.
3. Entrar só depois do #25.

Agente 24 — 2026-10-20 ~23:55 BRT. Sem comentários públicos no PR.
