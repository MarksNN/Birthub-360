De: 17 — Cadência
Para: 02 — Produto e UX
Onda: onda-enxuta (P0 #693, item 6)
Status: aberto
Prioridade: alto
Bloqueador-ref: P0 #693 item 6 — Dialer/Outbound 503; evidência `.agents/runs/08-503-outbound-dialer-voice-20261010.md` (Agente 08)
Sprint destino: onda-enxuta
Cc: 12, 05, Marks/00, 24

## Problema
`/app/dialer` renderiza o mesmo `CadenceHub` (`App.tsx` → `DialerFrontend`) com rótulo "Discador 3CX" em `tabMeta.ts`, enquanto `/api/dialer-3cx` responde sempre `503 MODULE_NOT_READY` via `legacyModuleGate` (intencional — isolamento org/tenant). O usuário espera discador 3CX e recebe cadências.

`/app/outbound/*` e `/app/voice-hub` também ficam navegáveis com backend no gate (ou 404 em APIs não montadas).

## Arquivo(s) envolvido(s)
- `src/App.tsx` (rotas `dialer`, `outbound/*`, `voice-hub`) — dono **02**
- `src/components/layout/tabMeta.ts` (rótulo "Discador 3CX") — dono **02**
- Sidebar / Command Palette / MacDock — dono **02** (com 03 se visual)
- `src/bootstrap/legacyModuleGate.ts` — **não remover** sem missão de 00/12

## Evidência
Relatório 08 (repro local + unit gate): 503 intencional; `/app/dialer` não chama `/api/dialer-3cx`; loop 3CX em `src/features/cadence/dialer/index.ts` nunca montado.

## Alteração necessária (02)
1. Redirect `/app/dialer` → `/app/cadence` (ou tela "indisponível" explícita).
2. Trocar/remover rótulo "Discador 3CX" até o 12 liberar discador real.
3. Esconder ou marcar indisponível `/app/outbound/*` e `/app/voice-hub` na navegação até isolamento org OK (acordar com 05/12).

## Teste esperado
- Navegar para `/app/dialer` não mostra CadenceHub disfarçado de Discador 3CX.
- Command palette / sidebar não prometem módulos no gate sem aviso.
- Gate `/api/dialer-3cx` permanece 503 (smoke do 08).

## Contexto adicional
17 não edita `App.tsx`/navegação. Item 8 (Prisma tipado CallAttempt/Dnc) está em `agente/17-prisma-call-dnc`. Montagem futura do loop 3CX = 12 + 17, só após gate legitimamente reabrível.
