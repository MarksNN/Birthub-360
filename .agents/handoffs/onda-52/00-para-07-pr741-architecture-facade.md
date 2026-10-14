De: 00 — Coordenador
Para: 07 — IA e Automações
Onda: 52
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: PR741-APP-GATE-01
Sprint destino: PR #741

## Problema

O application gate do PR #741 falha em uma fronteira de arquitetura: `intelligence.routes.ts` importa diretamente o serviço interno de telemetria Groq. O Agente 24 reprovou a primeira tentativa porque os arquivos do gateway e da feature Intelligence foram alterados sem aprovação do proprietário.

## Arquivo(s) envolvido(s)

- `src/features/intelligence/routes/intelligence.routes.ts`
- `src/lib/ai/gateway.ts`
- `src/lib/ai/gateway/groqTelemetry.service.ts`

## Evidência

- Run `38597034537`, job `115966520319`: `not-to-ai-gateway-internals-from-outside` em `intelligence.routes.ts` → `groqTelemetry.service.ts`.
- Parecer `.agents/reviews/pr-741-application-gate-v2-24.md`: F-01 exige ratificação/execução pelo Agente 07.
- A branch local `fix/pr-741-application-gate-v3` parte do HEAD remoto `6ecfcc4f895383ac2b712099972881d21f7c512d`.

## Alteração necessária

Revisar e assumir a correção no domínio 07: expor apenas uma função estreita para obter snapshot de telemetria via fachada pública do gateway e atualizar a rota para usar essa fachada. Preserve as alterações existentes do PR, em especial a correção já publicada em `groq.provider.ts` e `providers.golden.test.ts`. Não exponha o singleton de telemetria.

## Teste esperado

- Teste unitário da rota de telemetria Groq.
- `npm run test:architecture` após integração com os outros fixes do PR.
- `npm run typecheck`, lint pertinente e build.

## Contexto adicional

O Agente 00 preparou uma proposta nos arquivos listados no worktree de integração, mas ela não está aprovada. Trabalhe em branch/worktree próprio derivado do HEAD `6ecfcc4f895383ac2b712099972881d21f7c512d`, revise/ajuste a proposta e registre hashes da versão aceita. Não faça push. Responda com commit local e evidências; se a propriedade ou o contrato correto diferir, pare e atualize este handoff com a decisão.
