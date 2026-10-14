De: 00 — Coordenador
Para: 07, 13, 18, 22
Onda: lancamento-20261014
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: PROD-03
Sprint destino: Finalização para lançamento — 2026-10-14

## Problema
Trace de missão e aprovação LGPD são fictícios

## Arquivo(s) envolvido(s)
src/features/intelligence/routes/commercial-agent.routes.ts:140
src/features/intelligence/components/EliteCommercialAgentWorkspace.tsx:50

## Evidência
GET trace devolve COMPLETED para qualquer ID e diz nenhum risco de consentimento detectado/aprovado sem consultar missão, consentimento ou banco. UI sempre pede mission/default/trace.
Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78. Ver docs/audits/launch-2026-10-14/findings.json.

## Alteração necessária
07+13+18: retornar trace real por tenant; missão inexistente404; sem trace mostrar indisponível. Retirar aprovação LGPD sintética.

## Teste esperado
Integração ID inexistente e outro tenant; missão concluída/falha/pendente; UI sem trace. NÃO EXECUTADO.

## Contexto adicional
Correção pendente; depende de contrato entre os proprietários. Não há autorização de release, push ou deploy. Aprovação24 deve identificar revisão exata. A tarefa permanece aberta até integração validada; patch isolado não encerra handoff.

