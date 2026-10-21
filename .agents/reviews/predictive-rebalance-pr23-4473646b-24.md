# Parecer Agente 24 — PR #23 @ 4473646b

- **Missão:** recomendações de rebalanceamento e What-If reais (contrato 04), com aprovação persistida.
- **Autor:** Agente 04 — CRM e BI (branch `agente/04-predictive-rebalance-whatif`).
- **Base:** main @ 8dff1dde (pós-#30).
- **SHA revisado:** 4473646b. Parecer anterior: APROVADO CONDICIONADO @ 041d134c (commit c48b7fe), achado P3-1.
- **Veredito: APROVADO CONDICIONADO** (máximo possível: o #25 não está na main; Build/Smoke/E2E não rodaram).

## Critérios
1. P3-1 corrigido: `note` legada em texto claro não volta no GET nem no replay do POST.
2. P4 do parecer anterior (TTL no POST, telefone BR, noteHash com chave, fail-closed).
3. Gate: únicas falhas = as 4 herdadas do #25.

## Comandos (sem npm ci)
- `gh api repos/MarksNN/Birthub-360/compare/041d134c...4473646b` (1 commit, 11 arquivos)
- leitura de `src/lib/crypto/piiIndex.ts@4473646b`
- logs do job do application gate do run 39529342988

## Evidências
- `parseApprovalRecord` (PrismaRebalanceRecommendationReader.ts) monta o registro campo a campo (allowlist); `note` e chaves extras são descartadas; `noteHash` só se casar `^[0-9a-f]{64}$`; `appliedToCrm:false`, `noteRef:null`. **P3-1 corrigido.**
- `tests/unit/commercial-intelligence/legacyApprovalNote.test.ts`: parser, GET (listDecisions), replay do POST (alreadyRecorded), TTL no POST (>TTL não bloqueia; dentro → 409) e noteHash ≠ sha256 puro. CI: ✓ (3 testes no arquivo + casos em rebalanceApproval.routes.test.ts).
- `piiRedaction.phone.test.ts` (9 testes ✓): `+55 11 91234-5678`, `(11) 91234-5678`, `11912345678`, `+5511912345678`, `+55 (11) 98765-4321`.
- `keyedDigestHex(domain, value)`: subchave = HMAC(PII_BLIND_INDEX_KEY, `domain:` + domínio), domínio `rebalance-approval-note:v1`. **Fail-closed confirmado:** `resolveIndexKey()` lança erro se `PII_BLIND_INDEX_KEY` ausente com `NODE_ENV=production`, e lança se a chave não tiver 32 bytes; fora de produção usa chave fixa de dev com warn.
- Handoffs `04-para-01-rebalance-approval-unique.md` (atualizado) e `04-para-21-rebalance-note-legada.md` (novo): limpeza do legado proposta, nada executado em banco.
- Gate (run 39529342988): Lint, Prettier, Typecheck, Architecture (`✔ no dependency violations found`), Unit (4984 passed), Integration **4 failed / 656 passed** — exatamente capability-engine (3) e seed-multi-cargo (1), as herdadas do #25. Build, Smoke e E2E: **skipped** (não há evidência de build/E2E).

## Achados
- **P1:** nenhum.
- **P2:** sem evidência de Build/Smoke/E2E neste SHA. No #25 (run 39527009503) o E2E falhou em massa (axe a11y, cadência, crm-kanban), provavelmente herdado; o #23 precisa do gate completo depois do #25.
- **P3:** a `note` legada continua em claro no `AuditLog.details` até o expurgo do handoff 04→21/01 ser executado (não é mais reexposta pela API).
- **P4:** o fail-closed do `PII_BLIND_INDEX_KEY` é preguiçoso (falha na primeira gravação com nota, não no boot). Sugestão: validar no bootstrap de produção.

## Condições para merge
1. Entrar só depois do #25 na main; rebase e gate 100% verde, incluindo Build, Smoke e E2E (ou isenção explícita do Marks para E2E herdado).
2. Head inalterado além do rebase; olhada final do 24 no SHA rebaseado.
3. Ticket com dono (21/01) para o expurgo da `note` legada.

Agente 24 — 2026-10-20 ~23:35 BRT. Sem comentários públicos no PR.
