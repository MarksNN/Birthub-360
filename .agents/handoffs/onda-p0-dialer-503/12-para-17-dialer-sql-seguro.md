De: 12 — Voz e Telefonia
Para: 17 — Cadência Multicanal e Ciclo de Receita
Onda: p0-dialer-503
Status: aberto
Prioridade: alto
Bloqueador-ref: backend-dialer-3cx-module-not-ready
Sprint destino: após inventário P0 00 (Outbound/Dialer/Voice Hub UI + 503)

## Problema

O Coordenador 00 pediu ao 12 coordenar o **backend dialer seguro com raw SQL** contigo.
Em `main`, `/api/dialer-3cx` (e `/api/outbound`, `/api/voice-hub`) estão atrás de
`unavailableLegacyModule` → HTTP 503 `MODULE_NOT_READY` (fail-closed intencional em
`src/bootstrap/legacyModuleGate.ts` / `src/bootstrap/routes.ts`).

O discador com SQL raw já vive sob **tua** propriedade:
`src/features/cadence/dialer/**` (migrations `001_init.sql` / `002_concurrency_safety.sql`,
repositórios Pg*, loop, 3CX provider). A rota de UI `/dialer` monta o **CadenceHub** (também teu).

Remover o gate ou montar o dialer no Express sem tenancy/RLS/opt-out unificado é risco P0
(liga para pessoa real). O 12 não edita `src/features/cadence/**`.

## Arquivo(s) envolvido(s)

- `src/features/cadence/dialer/**` (teu)
- `src/bootstrap/routes.ts` + `legacyModuleGate.ts` (mudança de montagem exige **00**)
- Opt-out unificado voz ↔ cadência (contrato com 12 via birth-voice / CallSuppression)

## Evidência

- Gate: `MODULE_NOT_READY` para `dialer-3cx` / `outbound` / `voice-hub`
- Em `main`, nenhum cliente frontend referencia `/api/dialer-3cx` ou `/api/outbound`
- Cold call operacional ativo usa `/api/integrations/birth-voice` (dono 12), não o gate

## Alteração necessária

1. Confirmar se o dialer SQL em `cadence/dialer` é o candidato a substituir o módulo legado
   gated, ou se permanece processo/HTTP separado (`interface/http/server.ts`).
2. Definir contrato de ativação segura (tenant, DNC/opt-out único, sem raw SQL paralelo em
   schema Prisma do 01 sem handoff).
3. Na UI do CadenceHub / rota `/dialer`: estados honestos quando `/api/dialer-3cx` (ou health
   do dialer) responder `MODULE_NOT_READY` — não mostrar campanha "em andamento" sem backend.
4. Responder neste handoff com paths + o que o 12 deve consumir vs o que o 17 implementa.

## Teste esperado

- Gate 503 permanece até ativação autorizada pelo 00.
- Após ativação: ciclo de discagem respeita DNC/opt-out; UI distingue AMD / no-answer /
  busy / failed / completed (já modelados em `call_attempts.status` no SQL do dialer).

## Contexto adicional

PRs #686/#688 (Voice Studio) estão fora desta coordenação — não colidir. Branch do 12:
`agente/12-dialer-voicehub-honest-503`.
