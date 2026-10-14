De: 00 — Coordenador
Para: 17
Onda: lancamento-20261014
Status: aberto
Prioridade: alto
Bloqueador-ref: PROD-05
Sprint destino: Finalização para lançamento — 2026-10-14

## Problema
API permite cadência sem conteúdo e dispatcher envia placeholder

## Arquivo(s) envolvido(s)
src/features/cadence/cadence.routes.ts:60
src/features/cadence/infra/dispatchers/CadenceDispatchers.ts:104
src/features/cadence/domain/cadence.ts:146

## Evidência
templateRef optional no Zod; validateSequence valida ordens/fallback mas não conteúdo; email/WhatsApp usam texto mensagem de cadência sem conteúdo configurado quando ausente. NewSequenceDialog já exige conteúdo, portanto descompasso API/UI.
Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78. Ver docs/audits/launch-2026-10-14/findings.json.

## Alteração necessária
IMPLEMENTADO: validateSequence exige conteúdo email/WhatsApp (rota devolve400 pelo validador existente). Dispatchers bloqueiam legado omitido/vazio/branco antes do banco/provider; voz preservada. Sem mudança schema/contrato optional. NÃO INTEGRADO; revisão24/gates pendentes. Após revisão, validar e integrar somente o candidato identificado no manifest.json.

## Teste esperado
node .tmp/verify-cadence.mjs PASS: função de domínio real extraída válido/omitido/vazio/branco,voz preservada; guard extraído dispatcher retornafailed antes DB/provider. Integração HTTP/Vitest/typecheck/lint/build NÃO EXECUTADOS.

## Contexto adicional
Correção candidata isolada; falta integração e validação geral. Não há autorização de release, push ou deploy. Aprovação24 deve identificar revisão exata. A tarefa permanece aberta até integração validada; patch isolado não encerra handoff.

