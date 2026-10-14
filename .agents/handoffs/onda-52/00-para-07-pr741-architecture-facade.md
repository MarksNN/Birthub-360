De: 00 — Coordenador
Para: 07 — IA e Automações
Onda: 52
Status: resolvido
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

## Resolução

O Agente 07 revisou e ratificou a facade estreita em seu worktree isolado. O commit local `9e1def021175fd87b6348bb07ad2132f0106d44c` foi integrado como `0b141d3a` em `fix/pr-741-application-gate-v4`; sem push.

- Rota de telemetria: teste direcionado passou (3/3).
- `npx tsc --noEmit`: passou.
- Lint nos três arquivos: passou.
- `npm run lint:architecture`: não reportou mais a violação da facade; na branch do proprietário ainda restavam as três violações Signals & Risks encaminhadas separadamente ao Agente 04.
- Arquivos preservados byte a byte entre o worktree do proprietário e a integração; hashes SHA-256:
  - `src/features/intelligence/routes/intelligence.routes.ts`: `246596BBDD6C75EAA3C5F1FD3BB0F73DC8883EDAAE7FA49D8665F6DD71425931`
  - `src/lib/ai/gateway.ts`: `551F525850426C4107DB32F2A85C006FEAC71C6957A367FBFAB9F84610D1BCA0`
  - `src/lib/ai/gateway/groqTelemetry.service.ts`: `7504D4E02555DA78F1867F07DF72238A6ABF5455C25BDD12E24CBC3D7FC6C7D8`
