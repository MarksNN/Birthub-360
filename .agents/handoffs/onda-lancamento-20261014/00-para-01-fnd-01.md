De: 00 — Coordenador
Para: 01, 21, 17
Onda: lancamento-20261014
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: FND-01
Sprint destino: Finalização para lançamento — 2026-10-14

## Problema
Exclusão LGPD podia concluir sem gravar supressão multicanal

## Arquivo(s) envolvido(s)
src/shared/services/dataSubjectErasure.service.ts:119
src/features/prospecting/services/cold-email.service.ts:90

## Evidência
CONFIRMADO ESTATICAMENTE: baseline apagava identificadores antes do registro OptOutRecord e engolia falhas em catches vazios. REPRODUZIDO ISOLADO no patch: mock de falha impede anonimização e propaga erro. 17 confirmou cold-email depende de OptOutRecord; cadência também bloqueia flag de Contact anonimizado.
Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78. Ver docs/audits/launch-2026-10-14/findings.json.

## Alteração necessária
IMPLEMENTADO no worktree: supressão obrigatória antes de anonimizar; falha propagada. Nenhuma integração realizada. Após revisão, validar e integrar somente o candidato identificado no manifest.json.

## Teste esperado
TESTADO isoladamente 2 cenários com função extraída + mocks; typecheck/lint/build/DB e fluxo HTTP NÃO EXECUTADOS.

## Contexto adicional
Correção candidata isolada; falta integração e validação geral. Não há autorização de release, push ou deploy. Aprovação24 deve identificar revisão exata. A tarefa permanece aberta até integração validada; patch isolado não encerra handoff.

