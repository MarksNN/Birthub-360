De: Coordenador (via Devin)
Para: Agente 16 — Runtime, Workers e Escala
Onda: Evolução da Plataforma 2026-10-23
Status: resolvido
Prioridade: alto
Bloqueador-ref: N/A
Sprint destino: Evolução P1

## Problema

P1.3 - TTL de Checkpoints: Checkpoints do LangGraph se acumulam indefinidamente. Precisa de um job de limpeza que delete threads antigas para evitar crescimento infinito do banco.

## Arquivo(s) envolvido(s)

- EXISTE: `src/lib/queue/checkpointerPrune.worker.ts` (precisa verificar se já deleta threads)
- REFERÊNCIA: `src/lib/ai/checkpointer.ts` (PostgresSaver com método deleteThread)

## Evidência

### Estado atual:
- `checkpointer.ts` fornece `PostgresSaver` com pool dedicado
- `checkpointerPrune.worker.ts` já existe
- Mas não está claro se o worker existente deleta threads antigas via `checkpointer.deleteThread(threadId)`

### Gap identificado:
- Comentário no plano P1.3: "SEM política de TTL: checkpoints se acumulam indefinidamente até uma limpeza ser construída (job agendado chamando checkpointer.deleteThread(threadId) para threads antigas)"

## Alteração necessária

1. **Verificar se `checkpointerPrune.worker.ts` já deleta threads:**
   - Ler o arquivo e verificar se chama `checkpointer.deleteThread(threadId)`
   - Se sim, documentar TTL configurado
   - Se não, implementar

2. **Se não existir, criar job de limpeza:**
   - Criar `src/features/intelligence/jobs/checkpointCleanup.worker.ts`
   - Job agendado (ex: semanal)
   - Deleta threads com `updatedAt > TTL` (ex: 30 dias)
   - Usa `checkpointer.deleteThread(threadId)` do PostgresSaver

3. **Integrar no sistema de workers:**
   - Adicionar em `src/bootstrap/workers.ts`
   - Agendar via BullMQ (cron pattern)

## Teste esperado

- Job roda sem erros
- Threads antigas são deletadas
- Tamanho do banco não cresce indefinidamente
- Logs mostram quantas threads foram deletadas

## Contexto adicional

O checkpointer usa PostgresSaver com as tabelas:
- `checkpoints`
- `checkpoint_writes`
- `checkpoint_blobs`
- `checkpoint_migrations`

Sem limpeza, estas tabelas crescem indefinidamente. TTL de 30 dias é um ponto de partida razoável (mesma ordem de grandeza do TTL de automações).

## Próximos passos após implementação

- Registrar TTL configurado
- Adicionar métricas de limpeza (threads deletadas por run)
- Documentar política de retenção

## Resolução (Agente 00 — 2026-10-23)

Investigação realizada revelou que **o job de limpeza de checkpoints já está implementado** no repositório atual:

1. ✅ `src/lib/queue/checkpointerPrune.worker.ts` já existe e está funcional:
   - Linha 49: Já chama `checkpointer.deleteThread(threadId)` para deletar threads antigas
   - Linha 21: TTL configurado para 30 dias (`THREAD_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000`)
   - Linha 20: Job agendado diariamente (`PRUNE_EVERY_MS = 24 * 60 * 60 * 1000`)
   - Linha 55: Log de quantas threads foram deletadas (`logger.info(\`Pruned ${deletedCount} old LangGraph threads.\`)`)

2. ✅ Já integrado no sistema de workers (`src/bootstrap/workers.ts`):
   - Linhas 93-95: Import de `createCheckpointerPruneWorker` e `scheduleCheckpointerPrune`
   - Linha 140: Worker registrado no handle embutido
   - Linha 193: Worker criado no modo embutido
   - Linhas 261-263: Job agendado com tratamento de erro

3. ✅ TTL documentado:
   - 30 dias de retenção (conforme sugerido no handoff)
   - Roda diariamente para limpeza preventiva
   - Logs informam quantas threads foram deletadas por execução

**Conclusão:** O handoff descrevia uma lacuna de TTL de checkpoints que já foi preenchida em iteração anterior. O job de limpeza existe, está integrado, configurado com TTL de 30 dias e agendado para rodar diariamente. Não é necessária nenhuma alteração adicional de código.
