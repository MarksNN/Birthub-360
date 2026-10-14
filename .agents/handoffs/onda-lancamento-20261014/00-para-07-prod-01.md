De: 00 — Coordenador
Para: 07, 04, 18
Onda: lancamento-20261014
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: PROD-01
Sprint destino: Finalização para lançamento — 2026-10-14

## Problema
Copiloto exibe receita, meta e forecast fabricados

## Arquivo(s) envolvido(s)
src/features/intelligence/routes/commercial-agent.routes.ts:40
src/App.tsx:400
src/bootstrap/routes.ts:141

## Evidência
Leitura estática: meta=200000; receita=wonLeads.length*25000; pipeline=openLeads.length*30000; forecasts=60%/75%. Consulta limitada aos dez leads mais recentes, sem filtro mensal nem deletedAt; score ausente vira85. UI mostra os valores como métricas comerciais.
Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78. Ver docs/audits/launch-2026-10-14/findings.json.

## Alteração necessária
07+04+18: usar analytics/metas do tenant; valores indisponíveis devem ter contrato explícito de unavailable, nunca zero inventado. Não modificar nullability sem acordo18.

## Teste esperado
Teste integração base vazia, valores reais, >10 leads, mês Brasil, soft-delete e tenant; conferir UI. REQUER OUTRO AGENTE/contrato.

## Contexto adicional
Correção pendente; depende de contrato entre os proprietários. Não há autorização de release, push ou deploy. Aprovação24 deve identificar revisão exata. A tarefa permanece aberta até integração validada; patch isolado não encerra handoff.

