De: 12 — Voz e Telefonia
Para: 00 — Coordenador
Onda: p0-dialer-503
Status: em-andamento
Prioridade: alto
Bloqueador-ref: P0 Outbound/Dialer/Voice Hub UI + 503
Sprint destino: mesma onda

## Inventário — causa do 503

Fail-closed **intencional**, não pane:

| Prefixo | Gate | Código |
|---|---|---|
| `/api/voice-hub` | `unavailableLegacyModule('voice-hub')` | `MODULE_NOT_READY` |
| `/api/outbound` | `unavailableLegacyModule('outbound')` | `MODULE_NOT_READY` |
| `/api/dialer-3cx` | `unavailableLegacyModule('dialer-3cx')` | `MODULE_NOT_READY` |

Arquivos: `src/bootstrap/legacyModuleGate.ts`, montagem em `src/bootstrap/routes.ts`.
`/api/integrations/birth-voice` permanece montado de verdade.

Nota: o GitHub PR #693 é "Agente/02 mapa modulos" — **não** é esta missão P0.

## Fronteira com #686 / #688

Não editar arquivos do resgate Voice Studio (Canvas, useStudioStore, workflow persistence,
ValidationEngine, etc.). Esses drafts já tratam 503 no Studio e declaram backend ainda gated.

## Achado UI (corrigido nesta branch)

`src/features/voice-hub/pages/Results.tsx` em `main`:
- fetch silencioso a `/api/call-logs` (endpoint **não** montado no bootstrap atual);
- falha vira lista vazia (parece "sem chamadas");
- métricas fictícias hardcoded (`03:06`, `75%`, "100% integradas").

Correção: estados loading / empty / error / MODULE_NOT_READY; métricas só a partir de dados
reais; pedido canônico em `/api/voice-hub/call-logs` (espera 503 até ativação).

## Coordenação 17

Handoff aberto: `12-para-17-dialer-sql-seguro.md` (SQL em `cadence/dialer/**`, rota `/dialer` =
CadenceHub).

## Branch

`agente/12-dialer-voicehub-honest-503` — sem main. Ativação de gate / `server.ts` **não** neste PR.
