# Parecer Agente 24 — PR #101 (P3 undici: overrides escopados) — **BLOQUEADO @ ddc0eb66**

- **Missão:** trocar o override global `"undici": "^6.20.0"` por overrides escopados por pacote.
- **Autor:** GHA, branch `agente/gha-undici-override`. **Draft.**
- **Base declarada:** `acd6c614`. O merge-base real é `aabf735a`: o branch é anterior à main atual. O diff foi avaliado em 3 pontos (`acd6c614...ddc0eb66`).
- **Head:** `ddc0eb6682297c9945bf79c5edd5dae884662302` (1 commit). O merge ref do CI é `c59af785`, cuja tree `3e400499` é igual a `git merge-tree --write-tree acd6c614 ddc0eb66`. O merge é limpo.
- **Revisor:** Agente 24. Não comentei no PR e não alterei código. Qualquer commit novo invalida este parecer.

## Veredito
**BLOQUEADO.** As evidências de supply chain estão corretas e a parte estática está apta. Mas o undici é runtime: é o cliente HTTP do `@qdrant/js-client-rest` e do `@ai-sdk/provider-utils`. Até agora esses dois pacotes rodavam **forçados em 6.29.1** pelo override global, e passam a rodar em 7.30.1. O gate da Release parou no Type Check herdado, e **Integração, Architecture, drift, Build e smoke não rodaram**. Não existe `agente/gha-diag-pr101-*`.

## 1. Escopo do diff
Só 3 arquivos: `package.json` (+13/−2), `package-lock.json` (+29/−1) e `docs/security/AUDIT_WAIVERS.md` (+3/−2). ✓
- No AUDIT_WAIVERS mudou só o texto de "Cadeia", "Override" e "Motivo" do waiver de undici (CVE-2026-84961/19534). **Nenhum waiver foi adicionado ou removido, e as datas não mudaram**: registro em 2026-10-07, "Reavaliar até" 2026-11-30. ✓
- `pnpm-lock.yaml` não mudou. Ele é legado e fica fora do scan.

## 2. Cópias de undici no lock (todas)
| Caminho | Versão | Range declarado pelo dependente | Satisfaz? |
|---|---|---|---|
| `node_modules/undici` (raiz) | 6.29.1 | raiz `^6.29.1`; `million@3.1.11` `^6.3.0`; peer opcional `openai@7.10.0` `>=5 <9` | ✓ |
| `node_modules/@ai-sdk/provider-utils/node_modules/undici` | 7.30.1 | `@ai-sdk/provider-utils@5.0.45` `^7.29.0` | ✓ |
| `node_modules/@qdrant/js-client-rest/node_modules/undici` | 7.30.1 | `@qdrant/js-client-rest@1.19.0` **`7.29.0` (exato)** | ✗ formalmente, mas o override é deliberado e justificado: 7.29.0 é vulnerável às três GHSA (seção 3). O patch fica no mesmo major |
| `node_modules/testcontainers/node_modules/undici` (dev) | 8.12.3 | `testcontainers@12.1.0` `^8.9.0` | ✓ (engine `node >=22.19.0`; o CI usa v22.23.3) |

- **Duplicação:** há duas cópias da 7.30.1 aninhadas. Isso é inevitável enquanto a raiz for 6.x, e não há cópia desnecessária.
- **Na main** havia uma única cópia (6.29.1), que o override global impunha também a qdrant, ai-sdk e testcontainers. Isso **violava os majors** que esses pacotes declaram, e o PR corrige o problema.
- **Nenhum undici < versão corrigida** em nenhum caminho.

## 3. Advisories (via `gh api /advisories/<ghsa>`, publicados em 23/10/2026 por volta das 19:13 BRT)
- **GHSA-xjj6-f33q-929c** (high, CVE-2026-109869, DoS por content-encodings): vulnerável em 6.23.0–<6.29.1, 7.18.0–<7.30.1 e 8.0.0–<8.12.2. Corrigido em 6.29.1, 7.30.1 e 8.12.2. ✓
- **GHSA-4qv8-2p9j-2685** (medium, EventSource): vulnerável em 6.5.0–<6.29.1, 7.0.0–<7.30.1 e 8.0.0–<8.12.2. Corrigido nas mesmas versões. ✓
- **GHSA-f72v-6w45-q472** (medium, SRI bypass): vulnerável em 7.15.0–<7.30.1 e 8.0.0–<8.12.2. Corrigido. ✓

As versões instaladas (6.29.1, 7.30.1 e 8.12.3) estão todas corrigidas.

## 4. Proveniência
- Os três `resolved` apontam para `https://registry.npmjs.org/undici/-/undici-<v>.tgz`.
- O `integrity` bate com o `npm view undici@<v> dist.integrity`:
  - 6.29.1 `sha512-EvRlUt…ZmGA==`
  - 7.30.1 `sha512-03KrMb…nLYxg==`
  - 8.12.3 `sha512-+fdndU…LOQHw==`
- Nenhuma entrada tem `hasInstallScript`. Os `scripts` publicados não têm preinstall, install nem postinstall; só `prepare`, que não roda em install de registry. ✓
- **Versões que não mudaram:** são só 3 entradas alteradas no lock inteiro, as três cópias novas. `body-parser` continua 2.4.0, `qs` 6.16.1 e `express` 5.2.1. ✓

## 5. CI no head (run 40231862450, merge ref c59af785)
- **Verdes:** `npm ci` (2330 pacotes), Audit waiver-aware, Lint, Prettier, working tree, Trivy (40231862424), Dependency Review (40231862469), CodeQL (40231862468) e Bundle Budget.
- **Audit:** "7 vulnerabilities (1 low, 6 moderate) … nenhum achado HIGH/CRITICAL", idêntico à main.
- **Type Check:** falhou com **88 erros**. O md5 da lista é `5dcefe64bcc705bc429bf1faa3821503`, **idêntico byte a byte** ao baseline da main acd6c614. **Nenhum erro novo.**
- **Pulados:** Architecture, drift, Unit (no gate), Migrations, Re-bootstrap, DATA-007, Integração, Build, smoke e E2E.
- **Evidência parcial de Unit** (SonarQube Analysis, run 40231862438, mesmo merge ref `c59af785`): `npm run test:unit -- --coverage` deu **Tests 3 failed / 5114 passed / 1 skipped (5118)** e Test Files 2 failed / 655 passed. As falhas são AgentExecutor (load) e gateway ×3, iguais ao baseline. O job falha por essas falhas herdadas, assim como na main (Sonar em acd6c614: failure).

## Condições para APROVADO
1. **(GHA, bloqueante)** Uma diag `agente/gha-diag-pr101-ddc0eb66` sobre `ddc0eb66`, com o ci.yml no blob `d8a7e3a0` (main + v4e + `if` no Re-bootstrap, ver `baseline-main-acd6c614-24.md`). Ela precisa mostrar, **igual ao baseline acd6c614**:
   - Unit 3/5118 (AgentExecutor e gateway ×3);
   - Integração 1/731 (só o swarm) e privileges 3/3;
   - Architecture, drift, DATA-007 "No difference", Build e smoke verdes;
   - tsc com md5 5dcefe64;
   - E2E com os mesmos 33 nomes.

   Atenção especial a testes de integração que toquem qdrant ou ai-sdk.
2. **(GHA)** Tirar do draft **no mesmo SHA** `ddc0eb66`. Um rebase ou commit novo exige nova auditoria.
3. **(Nota)** Registrar no PR ou no ADR de deps o desvio consciente do pin exato `7.29.0` do qdrant, e reavaliar quando o qdrant publicar uma versão que declare `>=7.30.1`.

## Comandos e evidências
- `git fetch`; `refs/pr/101h` = ddc0eb66; `git diff --stat acd6c614...ddc0eb66`; `git merge-tree --write-tree acd6c614 ddc0eb66` → 3e400499 = tree de c59af785.
- `node` sobre os dois lockfiles: cópias de `node_modules/**/undici`, ranges dos dependentes e diff de versões (3 mudanças).
- `gh api /advisories/GHSA-…` (×3); `npm view undici@{6.29.1,7.30.1,8.12.3} dist.integrity dist.tarball scripts`.
- `gh run view 40231862450 --json jobs`; logs do job 121285220551 (gate) e do job SonarQube de 40231862438, via `--allow-escape-sequences`.
- `git ls-remote origin 'refs/heads/agente/gha-diag-pr101*'` → nenhum.
