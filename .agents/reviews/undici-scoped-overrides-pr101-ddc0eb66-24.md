# Parecer Agente 24 — PR #101 (P3 undici: overrides escopados) — **APROVADO @ ddc0eb66**

- **Veredito: APROVADO @ `ddc0eb6682297c9945bf79c5edd5dae884662302`**, com riscos residuais registrados. Substitui o BLOQUEADO @ ddc0eb66 (commit `70c9c48d`).
- A análise estática do commit `70c9c48d` continua válida e não muda aqui: escopo de 3 arquivos, cópias de undici no lock, advisories, proveniência/integrity e tsc no head.
- Qualquer commit novo, inclusive rebase, invalida este veredito.
- Método: só fetch/merge-tree/diff/`gh api`/logs dos jobs (sem checkout, worktree ou npm ci). Nenhum comentário no PR e nenhuma alteração no código auditado.

## Condições do BLOQUEADO anterior: situação (conferida às 19:30 BRT)
1. **PR fora de draft no mesmo SHA** ✓. `gh pr view 101`: `isDraft=false`, `OPEN`, `MERGEABLE`, `headRefOid=ddc0eb66…`, `baseRefOid=acd6c614…`.
2. **Desvio do pin do qdrant registrado no corpo do PR** ✓. Há a seção "Desvio registrado: pin exato do @qdrant/js-client-rest": o qdrant 1.19.0 fixa 7.29.0 (vulnerável a GHSA-xjj6/4qv8/f72v), o override escopado sobe para ^7.30.1 na mesma major, há evidência de compatibilidade e a saída do desvio é remover o override quando o qdrant deixar de fixar uma versão vulnerável. O lock em ddc0eb66 tem `@qdrant/js-client-rest/node_modules/undici` 7.30.1, `@ai-sdk/provider-utils/node_modules/undici` 7.30.1, `testcontainers/node_modules/undici` 8.12.3 e raiz 6.29.1.
3. **Diag sobre ddc0eb66** ✓ (abaixo).

## Identidade das trees (calculadas por mim)
- `M = git merge-tree --write-tree ddc0eb66 acd6c614` = **`3e400499`** = tree de `refs/pull/101/merge` (parents acd6c614 e ddc0eb66) ✓.
- `C = b8568026`: parent único `28a3bcdc`, cuja tree é **`3e400499`** = M ✓. `git diff --raw C^ C` = só `.github/workflows/ci.yml`, blob `a2a8656d → d8a7e3a0` ✓.
- O job da diag fez checkout de `f16b1cb Merge b8568026 into acd6c614`. A tree de f16b1cb (`1523514f`) é igual à tree de C ✓, porque C já contém acd6c614. Ou seja, a diag testou exatamente o merge do PR mais o patch de CI.

## Diag Release run `40236079081` — conferida no log do job 121297970775 (não no resumo)
Run concluída, headSha `b8568026`, branch `agente/gha-diag-pr101-ddc0eb66`. A falha da run é esperada: o application gate falha nos steps herdados, e o job `build` falha só na consolidação. Comparada com a diag de main acd6c614:
- **Type Check:** 88 erros, md5 `5dcefe64…`, **idêntico** ao baseline ✓.
- **Unit:** 3 falhas / 5118, com as linhas FAIL idênticas: AgentExecutor e gateway×3 ✓.
- **Integration:** 1 falha / 731, só `swarm-autonomous-mission-e2e.test.ts:191` ("expected +0 to be 1"), a mesma asserção do baseline ✓.
- **Architecture:** depcruise limpo (1862 módulos, 6113 dependências), 78 violações conhecidas, hotspots ✅ ✓.
- **Privilégios / DATA-007:** privilégios 3/3, DATA-007 "No difference detected." ✓.
- **Build:** "built in 27.54s" ✓. **Smoke:** ok ✓.
- **E2E:** 33 falhas com os mesmos nomes do baseline. Axe 489/45/3 ✓.
- **Steps com erro:** o mesmo conjunto do baseline (typecheck, unit, integration e e2e) ✓.
- Check-runs em ddc0eb66: secret scan, trivy, dependency review, CodeQL (js e python), bundle e visual ✓. Sonar ✗ (herdado).

## Riscos residuais (não bloqueiam; registrados)
- **qdrant (7.30.1 em vez de 7.29.0):** o PR alega que 41 arquivos de integração carregam o qdrant e que 40 passam (333 testes). Conferi que o único `src/lib/ai/embeddings/qdrant.ts` é importado por `src/lib/ai/gateway/embeddings.ts`, ou seja, alcançável pelo gateway. Também conferi que a única falha de Integration é a herdada do swarm. **A contagem 41/40 é transitiva e não foi recontada por mim**; aceito como alegação plausível. Os testes rodam o cliente, mas não necessariamente fazem I/O HTTP real contra o Qdrant, então o comportamento de rede do undici 7.30.1 no qdrant tem cobertura limitada.
- **@ai-sdk/provider-utils (7.30.1):** sem cobertura de integração. `src/lib/ai/vercel-ai.ts` não tem nenhum importador em `src` nem em `tests` (conferido por `git grep`), então hoje é código morto em runtime. O risco só se materializa quando alguém passar a usá-lo; nesse momento será preciso um teste.
- **testcontainers (8.12.3, dev):** usado só em `tests/container` (`npm run test:containers`, `vitest.container.config.ts`), que não roda no CI (nenhuma referência em `.github/workflows`). Não tem efeito em produção, mas a quebra local de `test:containers` não seria detectada pelo CI.
- **Duplicação:** duas cópias de undici 7.30.1 aninhadas, inevitável enquanto a raiz for 6.x.
- O waiver de undici em AUDIT_WAIVERS continua com "Reavaliar até" 2026-11-30.

## Notas
- O gate real do PR continua parado no Type Check herdado (88 erros, idêntico a main), que não é deste PR.
- Discrepâncias com o relato do GHA: nenhuma. Os números de tsc, unit, integration, e2e, depcruise, build e smoke, as identidades de tree e o estado do PR batem com o que verifiquei. Só a contagem 41/40 do qdrant ficou sem recontagem independente.
