# Parecer Agente 24 — PR #102 (Agente 15, segredos de integração at-rest) — reauditoria do P2 (runbook)

- **Veredito: BLOQUEADO @ `0d02eaf83e0df1afb43d9dd58cd010b17b402053`** — único motivo: diag `f0f85829` ainda em execução. A revisão estática do delta não tem bloqueio.
- Base: `main` = `acd6c61413d6e3fc617a1f8521e50a79072b22f0`
- Parecer anterior: BLOQUEADO @ 750452f5 (branch agente/24-review-pr102-750452f5; P2 do runbook + diag em execução)
- Método: só fetch/diff/show/gh api (sem checkout, worktree ou npm ci). Nenhum comentário no PR e nenhuma alteração no código auditado.

## Delta 750452f5 → 0d02eaf8
- `git merge-base --is-ancestor 750452f5 0d02eaf8` ✓ (fast-forward, 1 commit: `0d02eaf83 docs(security): 15 — runbook RB-SEC-010 …`).
- `git diff --name-only 750452f5..0d02eaf8` lista **só `.md`** ✓ (6 arquivos, +157/−42):
  - `docs/security/runbooks/ROTATE_CREDENTIALS_ENCRYPTION_KEY.md` (+188 com reescrita)
  - `docs/ADR/ADR-010-integration-settings-at-rest.md` (+1, passo 7)
  - `docs/security/SECRET_ROTATION_POLICY.md` (+2/−1)
  - `docs/security/SECURITY_GUIDE.md` (+2/−1)
  - `docs/security/runbooks/INCIDENT_RESPONSE.md` (+1/−1)
  - `.agents/handoffs/onda-52/15-para-24-integration-secrets-at-rest.md` (linha de Status)
- Como a árvore não-`.md` de 0d02eaf8 é idêntica à de 750452f5, a diag f0f85829 (parent 750452f5, só `ci.yml` blob `d8a7e3a0`, conferido) vale para este head.
- gitleaks: não está instalado no box nesta rodada. Fiz uma varredura regex nas linhas adicionadas do delta (base64 ≥ 40, `sk_live`, `ghp_`, `AKIA`, `PRIVATE KEY`) e não achei nada. Os placeholders são `<DB_URL>`, `<SNAPSHOT_ID>` e `$OLD_KEY`/`$NEW_KEY`. O 15 relata gitleaks com 0 achados na faixa. O secret scan da diag deu ✓.

## Runbook × código real (`reencrypt-credentials.ts` + `credential-script-guards.ts` @ 0d02eaf8)
Ordem ✓: pré-req backfill (opcional, com OLD_KEY) → 1 gerar chave (`read -rs`) → 2 dry-run com contagem esperada → 3 snapshot com id anotado → 4 dry-run opcional de `--model=Setting` → 5 `--apply --snapshot-confirmed=<id>` → **6 verificação obrigatória** → 7 troca da chave e deploy → validação → rollback.

Semântica do script, conferida:
- **Dry-run não grava** ✓. `let dryRun = true` e `dryRun = !pre.apply` (l.44, l.174). Os dois `UPDATE` ficam sob `if (!dryRun)` (l.147, l.241). Fora isso o script só faz `SELECT` e `SET/set_config` de sessão.
- **Guards com chaves trocadas (6a)** ✓. Exige OLD≠NEW (guards l.102) e CEK ∈ {OLD, NEW} (l.105). Não existe checagem contra a chave pública de dev nem de "CEK == OLD". Por isso `CEK=NEW OLD=NEW NEW=OLD` passa, e o CEK não é usado na cripto do script (só no guard). `--apply` junto com `--dry-run` é recusado (l.111). O runbook descreve exatamente isso (§2).
- **Contadores** ✓. Os nomes impressos são `Total linhas | Re-criptografadas | Puladas | Erros` (models, l.253) e `Total linhas | Re-criptografadas | Erros` (Setting, l.159), iguais aos do runbook (§2, l.59–61).
  - `Re-criptografadas` conta linhas com ≥1 campo `enc:v1:` que decifra com OLD_KEY.
  - `Erros` conta campos (nos models) ou linhas (no Setting) que não decifram, por tag GCM inválida ou envelope inválido.
  - `Puladas` conta campos sem prefixo (nulo/texto puro).
  - Texto puro nunca é contado como pendente nem como erro.
- **6a** (`OLD_KEY=$NEW_KEY NEW_KEY=$OLD_KEY`, dry-run, `Erros: 0`) ✓. Prova que todo `enc:v1:` decifra com a NEW_KEY. Com GCM (tag de 128 bits), decifrar com a chave errada falha deterministicamente, então 6a sozinho já implica "nada sob OLD". O 6b (`Re-criptografadas: 0` na direção original) é redundante, mas é uma checagem cruzada correta e inócua. Em 6b, `Erros > 0` é esperado, e o runbook diz isso.
- **Reexecução do apply após abort** ✓. Os campos já re-cifrados falham com OLD, contam como `Erros` e não são regravados.
- **Código de saída** ✓. O runbook diz explicitamente (l.68) que o script sai com 0 e `✅ Concluído com sucesso.` mesmo com `Erros > 0`, e que o aceite é ler os contadores. Também manda conferir `Modo: 🚀 LIVE` / `[Modo: LIVE]` no apply.
- **Janela congelada** ✓ (pré-req 3). Gravações da app com a chave antiga entre os passos 5 e 7 são pegas pelo 6a/6b.
- **Rollback** ✓. Antes da troca: restaurar o snapshot, ou fazer a rotação reversa com novo snapshot e verificação invertida. Depois da troca: env **e** dados juntos, nunca só um dos dois. Todo rollback depende do OK do Marcelo.
- **Fluxo perigoso antigo eliminado** ✓. Não há mais passo "Live" sem `--apply`. O aviso (l.13) explica o defeito antigo. O OK explícito do Marcelo é exigido (l.10), e OK repassado por agente não vale.

Outros docs ✓: ADR-010 passo 7, SECRET_ROTATION_POLICY.md:95–96, SECURITY_GUIDE.md:154–155 e INCIDENT_RESPONSE.md:29 estão coerentes com o contrato (dry-run por padrão, `--apply --snapshot-confirmed=<id>`, verificação, OK do Marcelo). `git grep` de reencrypt nos `.md`: as únicas menções restantes ao fluxo antigo estão em handoffs históricos da onda-14 (registro, não instrução).

## Achados (nenhum bloqueante)
- **P3 (doc):** `ROTATE_CREDENTIALS_ENCRYPTION_KEY.md:66` diz que "Linhas com erro **nunca** são gravadas (fail-closed)". Isso vale só para o `Setting`, onde `reencryptIntegrationSettingValue` lança e a linha inteira é pulada. Nos models (script l.225–246), uma linha com um campo ilegível e outro legível tem o campo legível regravado (rotação parcial da linha). Na prática não tem efeito, porque o passo 2 manda parar com `Erros > 0`. Corrigir o texto no PR de follow-up.
- **P3 (cobertura do runbook):** as sessões WhatsApp/Baileys no Redis (`wa-auth:<org>:*`, `src/features/integrations/whatsapp/useRedisAuthState.ts:32,38`, `encryptField`/`decryptField` com a mesma `CREDENTIALS_ENCRYPTION_KEY`) não são cobertas pelo `reencrypt-credentials.ts` nem citadas no runbook. Depois da troca da chave elas ficam ilegíveis, e cada org vai precisar parear o QR de novo. O problema já existia antes do #102. O runbook (§1 e §5) deve avisar disso, ou o reencrypt deve cobrir o Redis, **antes de qualquer rotação**.
- **Info (pré-existente, fora do delta):** `SECRET_ROTATION_POLICY.md:80` aponta para um link `file:///c:/Github/...`.

## Diag f0f85829 — status neste parecer (18:55 BRT)
- Release run `40236532644`: **in_progress**.
  - secret scan, trivy e dependency review ✓.
  - application gate (job 121299338815) está no step 22 (Integration). Build, smoke, E2E e o upload do diagnóstico estão pendentes.
  - O log do job ainda não está disponível. Os steps com continue-on-error aparecem como "success" no resumo, então Unit, Re-bootstrap e DATA-007 ainda não têm evidência de resultado.
- Outros workflows da diag: CodeQL ✓, Trivy ✓, Dependency Review ✓, Bundle ✓, Visual ✓, Sonar ✗ (herdado: SONAR_TOKEN vazio e cobertura cai junto com o Unit, como no baseline).

## Para virar APROVADO @ 0d02eaf8 (sem novo commit)
Run 40236532644 concluída e batendo com o baseline main acd6c614:
- tsc 88, drift ✓;
- Unit falhando só AgentExecutor + gateway×3 (3/5118), com os testes novos do #102 verdes;
- Architecture/hotspots ✓, Migrations ✓, Re-bootstrap/privilégios 3/3 ✓, DATA-007 "No difference" ✓;
- Integration 1/731 (só swarm-autonomous-mission-e2e);
- Build ✓, smoke ✓;
- E2E 33 (mesmas falhas axe de accessibility.spec.ts).

## Condições que acompanham o futuro APROVADO
1. Backfill ou rotação em staging/produção **só com o OK explícito do Marcelo** e com snapshot confirmado (id registrado).
2. Follow-ups P3 em PR separado, **antes de qualquer rotação**: reencrypt com saída ≠ 0 quando `Erros > 0` e modo `--verify`; os dois P3 de doc/cobertura acima (l.66 e Redis WhatsApp).
3. Follow-up ADR-010 v2: AAD/key-id e AuditLog no backfill.
