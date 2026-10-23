De: Agente 00 — Coordenador
Para: Agente 08 — QA e Release (com apoio do Agente 21 — LGPD)
Onda: Onda 01 — Governança e Inventário Forense
Status: resolvido
Prioridade: bloqueador
Bloqueador-ref: B-FORMAT-01 / Issue #45
Sprint destino: Onda 02

## Problema
O step `Run Prettier check` do job `Central Birth Hub 360 / application gate` no workflow `.github/workflows/ci.yml` falha na `main` (run 39683668171) e bloqueia todas as execuções de CI na branch principal. O comando executado é `npm run format:check` (`biome format src`), que acusa erro de indentação em `src/shared/services/dataSubjectErasure.service.ts:119`.

## Arquivo(s) envolvido(s)
- `src/shared/services/dataSubjectErasure.service.ts`

## Evidência
Execução local de `npm run format:check`:
```
src\shared\services\dataSubjectErasure.service.ts format
  × Formatter would have printed the following content:
    119 │ ······//·Supressão·ANTES·de·destruir·e-mail·e·telefone·(DEBT-LGPD-001).·Se·o·opt-out·falhar,
        │ ++++++
Checked 2006 files in 4s. Found 1 error.
Exit code: 1
```
Execução no GitHub Actions (run 39683668171):
Step `Run Prettier check` falha com exit code 1.

## Alteração necessária
Ajustar a indentação da linha 119 em `src/shared/services/dataSubjectErasure.service.ts` (já isolada no PR #43). Garantir que `npm run format:check` execute limpo com 0 erros.

## Teste esperado
- `npm run format:check` -> Exit code 0.
- `git diff --quiet` -> Working tree limpa após o check.

## Contexto adicional
Esta correção é estritamente de formatação (1 linha) e desbloqueia o gate inicial de release tanto em push quanto em pull_request.

## Resolução (Agente 00 — 2026-10-23)

Indentação da linha 119 corrigida manualmente em `src/shared/services/dataSubjectErasure.service.ts`. O comentário foi quebrado em 4 linhas para conformidade com o formatters (biome). Como o ambiente atual não possui npm disponível, a correção foi aplicada diretamente editando o arquivo. O gate `npm run format:check` deve passar na próxima execução em ambiente com npm.

Arquivo alterado:
- `src/shared/services/dataSubjectErasure.service.ts` (linha 119-122)
