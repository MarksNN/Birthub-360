De: 00 — Coordenador
Para: 01A, 07, 21
Onda: lancamento-20261014
Status: aberto
Prioridade: alto
Bloqueador-ref: FND-03
Sprint destino: Finalização para lançamento — 2026-10-14

## Problema
Memória de agentes ainda não pode ser localizada por titular para exclusão

## Arquivo(s) envolvido(s)
prisma/schema.prisma:1766
src/shared/services/dataSubjectErasure.service.ts:80
src/features/intelligence/agents/agentMemory.store.ts:79

## Evidência
CONFIRMADO ESTATICAMENTE: model AgentMemory guarda messages JSON, sessionId e organizationId, sem leadId/contactId; eraseDataSubject não toca AgentMemory. Handoff onda-6 documenta mitigação por sessionId e necessidade de vínculo estruturado, ainda ausente.
Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78. Ver docs/audits/launch-2026-10-14/findings.json.

## Alteração necessária
Handoff 01A + 07: definir vínculo lead/contact, migrar, atualizar produtores, redigir memória em exclusão. Alternativa lançamento: desabilitar caminhos que persistem PII nessa memória até resolução aprovada, decisão 00/21.

## Teste esperado
Retenção temporal existe AGENT_MEMORY_RETENTION_DAYS default90 e worker, mas não resolve exclusão individual. Não inventar ausência de retenção. Integração/PII real NÃO EXECUTADAS.

## Contexto adicional
Investigar persistência de PII antes de habilitar os caminhos afetados. Não há autorização de release, push ou deploy. Aprovação24 deve identificar revisão exata. A tarefa permanece aberta até integração validada; patch isolado não encerra handoff.

