Para: Agente 16 — Runtime, Workers e Escala
Onda: Evolução da Plataforma 2026-10-23
Status: resolvido
Prioridade: alto
Bloqueador-ref: N/A
Sprint destino: Evolução P1

## Problema

P1.3 - TTL de Checkpoints: Checkpoints do LangGraph se acumulam indefinidamente. Precisa de job de limpeza que delete threads antigas.

## Arquivo(s) envolvido(s)

- `src/lib/queue/checkpointerPrune.worker.ts` (worker existente)
- `src/lib/ai/checkpointer.ts` (PostgresSaver com deleteThread)
- `src/bootstrap/workers.ts` (integração modo embutido)
- `worker.ts` (integração processo dedicado)

## Evidência

Verificação realizada: o worker `checkpointerPrune.worker.ts` já existe e implementa corretamente a funcionalidade solicitada.

## Resolução

**Verificação realizada pelo Agente 16:**

1. ✅ `checkpointerPrune.worker.ts` já deleta threads via `checkpointer.deleteThread(threadId)` (linha 49)
2. ✅ Job já está agendado diariamente (PRUNE_EVERY_MS = 24 horas)
3. ✅ TTL configurado para 30 dias (THREAD_MAX_AGE_MS = 30 dias)
4. ✅ Integrado em `src/bootstrap/workers.ts` (modo embutido, linhas 93-95 e 261-263)
5. ✅ Integrado em `worker.ts` (processo dedicado, linhas 20, 108, 155 e 193)

**Nota sobre implementação:**
- O worker extrai o timestamp do próprio `thread_id` (formato: `organizationId:session-agentType-1700000000000`)
- O schema do LangGraph PostgresSaver não possui coluna `updated_at` por padrão
- A abordagem atual (extrair timestamp do thread_id) é correta para o schema real

**Conclusão:** Não foi necessário criar novo worker. A funcionalidade solicitada já está implementada e integrada corretamente.

## Teste esperado

Job roda sem erros, threads antigas são deletadas, tamanho do banco não cresce indefinidamente.

## Após conclusão

Funcionalidade já existia. Notificar Agente 24 para revisão de conformidade.
