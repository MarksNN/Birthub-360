# Parecer Agente 24: PR #25 @ bb5c3d5014530be3a788fbf066d8cb3df353b0e1

**Veredito: APROVADO CONDICIONADO** (vale só para este SHA; qualquer commit novo invalida o parecer)

- Missão: corrigir a integração de job-roles/capabilities dos agentes account-detective, promise-guardian e devils-advocate
- Autor: MarksNN (branch agente/gha-agents-capabilities)
- Base: main @ e06834775b8acef0c411c7c9ff4e5b8018bc12c4
- Diff: +62/-14 em 5 arquivos, 1 commit

## Critérios
Não pode haver escalonamento de privilégio nem mudança de tenancy. As capabilities têm de ser coerentes com tactical/*.agent.ts, com os testes válidos e os gates verdes.

## Achados
- O escopo é o catálogo de capabilities de AGENTES. Não é RBAC de usuário e não toca requireRole nem rotas.
- account-detective vai para LDR (company.read, lead.read).
- promise-guardian vai para CLOSER (meeting.read/analyze, deal.read).
- devils-advocate vai para GERENTE_COMERCIAL (deal.read/analyze, forecast.read, pipeline.analyze).
- Só há leitura e análise, sem escrita. O baseline agent.discover/execute/request_cross_role é igual ao dos outros 391 agentes. Não encontrei escalonamento.
- P3: os testes de contagem ficaram tautológicos (379+len == 379+len). Recomendo fixar 394 e 15.
- P3: falta um teste de autorização garantindo que os 3 agentes não recebem capability de escrita.

## Comandos e evidências
- Revisão manual do diff (get_diff).
- biome no diff: limpo.
- CI: o application gate falha (job 118932689368), herdado da main (vite, corrigido por #24).

## Gates NÃO executados (ausência de evidência não é aprovação)
typecheck (inconclusivo: OOM), vitest completo, test:architecture (Node 22), check:hotspots, verify:openapi-drift, verify:migration-drift e a integração (capability-engine, seed-multi-cargo), que precisa de banco. Motivo: o box está sem memória (cerca de 1,3 GB livre de 16 GB em 2026-10-20 21:30 BRT), então não deu para rodar npm ci nem os gates sem novo OOM.

## Condições
Merge manual só depois de #24 e #30, com o gate de CI verde incluindo typecheck, integração e arquitetura. Se algum desses falhar, o veredito vira REPROVADO.
