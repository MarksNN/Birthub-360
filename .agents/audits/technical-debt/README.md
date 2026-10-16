# Inventário canônico de dívidas técnicas

Este diretório é a fonte de verdade para dívidas técnicas confirmadas do Birthub 360°.

## Inventário ativo

[`CURRENT.md`](CURRENT.md) aponta para o snapshot vigente.

Snapshot atual: [`2026-10-14/`](2026-10-14/README.md).

| Item | Quantidade |
|---|---:|
| Achados canônicos | 40 |
| Verificações | 216 |
| Categorias DT-01 a DT-40 | 40 |
| Ondas 00 a 09 | 10 |
| P0 / P1 / P2 / P3 | 0 / 17 / 20 / 3 |

Commit auditado: `c7e33a911b734ddb3131a3ad08d421efbc823fd4`.

## O que não é fonte oficial

- PR #741 e os 176 itens da varredura textual. O pacote forense reprova essa varredura. O PR não foi integrado por esta missão.
- `docs/audits/technical-debt/v2/`: hipóteses automáticas anteriores, com caminhos duplicados inexistentes.
- `docs/audits/debt-2026-10-14/`: passagem incremental de 24 achados e 200 verificações. Histórica. O consolidado de 40/216 incorpora o que permanece válido e não deve ser duplicado com outro ID.

## Estrutura

```text
.agents/audits/technical-debt/
├── README.md          ponto de entrada
├── CURRENT.md         ponteiro do snapshot ativo
└── 2026-10-14/
    ├── manifest.json
    ├── source/        pacote forense, byte a byte
    ├── data/          projeção normalizada
    ├── reports/       relatórios Markdown do pacote
    ├── evidence/      índice das citações já existentes
    ├── progress/      estado vivo da correção
    ├── dashboard/     painel HTML autocontido
    └── validation/    consistência e proveniência
```

## Como localizar uma dívida

1. Abra `2026-10-14/data/findings.json`.
2. Busque o ID, por exemplo `DEBT-SEC-001`.
3. Leia evidência, causa, correção proposta e `handoffPath`.
4. Confira o estado vivo em `2026-10-14/progress/remediation-status.json`.

O mesmo ID aparece no painel e nos relatórios. Não crie outro identificador para o mesmo achado.

## Como consultar verificações

`2026-10-14/data/checks.json` guarda as 216 verificações.
Filtre por `result`, `category`, `agent`, `module` ou `findingId`.
`Não verificado` não é aprovação.

## Como descobrir a onda

`2026-10-14/data/waves.json` lista as ondas 00 a 09 e os IDs de cada uma.
Cada achado também tem o campo `wave`.

## Como atualizar estados

Edite somente o registro daquele ID em `progress/remediation-status.json` e acrescente uma entrada em `progress/change-log.md`.

Preencha branch, PR, commit de correção, testes e evidência de encerramento apenas com valores reais.
Separe sempre:

- estado da auditoria (`result` / `auditStatus`), congelado no snapshot;
- estado da correção (`remediationStatus`);
- estado da validação (`validationStatus`);
- estado do release (`releaseStatus`).

Depois rode:

```text
node scripts/verify-technical-debt-inventory.cjs
```

## Como registrar evidências

Novas evidências de correção entram em `closureEvidence`, `testsExecuted` e no change log, com caminho de arquivo e SHA.
Citações da auditoria original ficam em `evidence/evidence-index.json` e apontam para `c7e33a911b734ddb3131a3ad08d421efbc823fd4`.
Não use a branch `main` como única prova de uma linha.

## Como evitar duplicidade

Antes de abrir handoff ou achado novo, busque o sintoma em `data/findings.json`.
Se o ID canônico existir, referencie esse ID.
Dívida nova, de outra causa raiz, não entra neste snapshot. Ela espera uma auditoria datada nova.

## Como validar

```text
node scripts/verify-technical-debt-inventory.cjs
```

O script não instala dependências. Exit code 0 significa que os invariantes obrigatórios passaram.

## Como encerrar um achado

1. A correção está integrada num commit identificável.
2. Os testes obrigatórios do achado foram executados e o resultado foi registrado.
3. `remediationStatus` pode ir a `RESOLVED` com `fixCommit` e `closureEvidence`.
4. `VERIFIED` só depois do parecer do Agente 24 sobre essa correção, com `validationResult`.
5. O change log cita os SHAs. O validador recusa `RESOLVED` ou `VERIFIED` sem evidência.

Nenhuma onda está concluída enquanto seus achados não tiverem evidência de execução.
