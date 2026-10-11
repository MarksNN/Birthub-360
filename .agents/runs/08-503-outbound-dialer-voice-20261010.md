# 08 — Evidência 503 Outbound / Dialer / Voice (P0 #693 item 6)

De: Agente 08 — QA e Release · Para: 12 (Voz/Telefonia), 17, cc 00/02/05/24
Data: 2026-10-10 (America/Sao_Paulo) · Base analisada: `origin/main` @ `36cea20` (inclui merge `8874a88` agente/12-voice-recovery e #689)
Worktree de análise: `/workspace/b360-08-503` (detached, node_modules via symlink). Sem commit/push/merge.

Contexto: `docs/product/MAPA-MODULOS.md` (#693, item 6) — "`outbound`, `dialer`, `voice-hub`: rotas abertas com backend 503 / alias".

## TL;DR

1. **O 503 de Outbound/Dialer/Voice Hub NÃO é bug nem infra: é gate intencional** em `src/bootstrap/legacyModuleGate.ts:4-13`, montado em `src/bootstrap/routes.ts:196-203` para `/api/voice-hub/*`, `/api/outbound/*`, `/api/dialer-3cx/*`. Toda requisição autenticada responde `503 {code:"MODULE_NOT_READY"}`, qualquer método/subpath. Nenhum router legado é executado.
2. **Front aberto x back fechado**: `/app/voice-hub` (Voice Studio recuperado pelo 12) chama `GET/POST /api/voice-hub/workflow` → 503 sempre → UI cai em `loadState:'error'` genérico. `/app/outbound/*` chama APIs não montadas (404, não 503). `/app/dialer` é alias de `CadenceHub` (sem chamada a `/api/dialer-3cx`).
3. **503 por configuração (fail-closed, esperado)** nas rotas de voz que ESTÃO montadas: `/api/integrations/birth-voice/call/:leadId` (falta BIRTH_VOICES_* / PUBLIC_BASE_URL), webhooks `birth-voice/webhook`, `/api/webhooks/voice-result`, `/api/integrations/3cx/webhook` (falta segredo).
4. **Código morto/inalcançável**: `src/lib/voice-hub/routes/*` (Twilio telephony + `/voice/outbound`) não é importado em lugar nenhum e o pacote **`twilio` não está em package.json/node_modules**; `src/features/cadence/dialer/index.ts` (loop 3CX) não é importado por server/worker.
5. **Repro local: SIM** (Express isolado com middlewares/routers reais da main). Gate e webhooks reproduzidos; rota `birth-voice/call` só análise estática (precisa Prisma/DB).

## Inventário de endpoints que retornam 503

| # | Endpoint | Montado? | Condição do 503 | Classe | Código |
|---|---|---|---|---|---|
| A | `ALL /api/voice-hub/*` | sim (gate) | sempre, após `authenticateToken`+`requireTenant` | **decisão de produto/segurança (intencional)** | `src/bootstrap/routes.ts:196`, `src/bootstrap/legacyModuleGate.ts:4-13` |
| B | `ALL /api/outbound/*` | sim (gate) | sempre (idem) | intencional | `src/bootstrap/routes.ts:197` |
| C | `ALL /api/dialer-3cx/*` | sim (gate) | sempre (idem) | intencional | `src/bootstrap/routes.ts:198-203` |
| D | `POST /api/integrations/birth-voice/call/:leadId` | sim | `BirthVoiceNotConfiguredError`: sem `VoiceHubConnection` habilitada E sem `BIRTH_VOICES_URL`/`_API_KEY`/`_AGENT_ID`, ou sem `PUBLIC_BASE_URL` | **config** | `birthVoice.routes.ts:59-81` → `birthVoice.service.ts:35-63` |
| E | `POST /api/integrations/birth-voice/webhook` | sim (pre-json) | sem segredo de conexão nem `BIRTH_VOICES_WEBHOOK_SECRET` | config (fail-closed) | `birthVoice.webhook.ts:328-335,407`; `bootstrap/webhooks.ts:22` |
| F | `POST /api/webhooks/voice-result` (Bland) | sim (pre-json) | sem `BIRTHHUB360_WEBHOOK_SECRET` | config (fail-closed) | `voiceResult.webhook.ts:117-126,399`; `bootstrap/webhooks.ts:29` |
| G | `POST /api/integrations/3cx/webhook` | sim (pre-json) | sem `THREECX_WEBHOOK_SECRET` | config (fail-closed) | `threecx.routes.ts:35-42`; `bootstrap/webhooks.ts:23` |
| H | `POST <voice-hub router>/voice/outbound` | **não montado** (atrás do gate A se fosse) | `TwilioNotConfiguredError` (falta `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`/`PUBLIC_BASE_URL`) | morto | `voiceOutbound.routes.ts`, `voiceOutbound.controller.ts:32-35`, `twilioClient.ts:10,49-53` |
| I | `POST /telephony/twilio/{voice,outbound,gather,status,dial-status}` | **não montado** (404) | sem `TWILIO_AUTH_TOKEN`/`PUBLIC_BASE_URL` | morto | `lib/voice-hub/routes/telephony.routes.ts:29,45-49` |
| J | voice-hub legado: knowledge upload (antivírus), aiConsent, health, birthhub360 Bland callback | **não montados** | ClamAV off / consent / Redis / segredos | morto | `knowledge.controller.ts:146`, `middlewares/aiConsent.ts:31`, `health.controller.ts:46`, `features/prospecting/routes/birthhub360.routes.ts:61-197` |

Fora do escopo voz mas relacionado a Outbound/prospecção: `leads.routes.ts:899` (sub-app legado `prospecting/outbound/server`) retorna 503 sem Google Places key — esse server legado também não está montado no bootstrap.

## Snippets-chave

`src/bootstrap/legacyModuleGate.ts:4-13`
```ts
export function unavailableLegacyModule(module: 'voice-hub' | 'outbound' | 'dialer-3cx'): RequestHandler {
  return (_req, res) => {
    res.status(503).json({ success: false, code: 'MODULE_NOT_READY', module,
      error: 'Módulo indisponível: integração segura por organização ainda não concluída.' });
  };
}
```
`src/bootstrap/routes.ts:194-203`
```ts
// Imported legacy modules do not yet share the canonical identity and tenant data model.
// Never execute their routers against the shared database before those adapters are verified.
app.use('/api/voice-hub', authenticateToken, requireTenant, unavailableLegacyModule('voice-hub'));
app.use('/api/outbound', authenticateToken, requireTenant, unavailableLegacyModule('outbound'));
app.use('/api/dialer-3cx', authenticateToken, requireTenant, unavailableLegacyModule('dialer-3cx'));
```
Consumidores no front (main):
- `src/features/voice-hub/store/workflowPersistence.ts:99-100` → `fetch('/api/voice-hub/workflow')`; `if (!res.ok) throw new Error(\`HTTP ${res.status}\`)` → `loadState:'error'` (:137), mensagem genérica "Não foi possível carregar o fluxo" — **não distingue `MODULE_NOT_READY`**.
- `workflowPersistence.ts:153` (POST save), `useStudioStore.ts:924` (publish), `:995` (versions), `:1036` (rollback) — todos caem no gate.
- `src/App.tsx:289-291,394-396`: `/app/dialer` → `DialerFrontend` = `CadenceHub` (alias); `/app/outbound/*` → `prospecting/outbound/App.tsx`, que chama `/api/prospect`, `/api/campaigns`, `/api/db/*`, `/api/chat`, `/api/ollama/status`… (não montados → 404 via catch-all `routes.ts:250`, não 503).
- `src/components/layout/tabMeta.ts:220`: rótulo "Discador 3CX" para `dialer`.
- `src/features/crm/components/LeadDetailDrawer.tsx:224`: `POST /api/integrations/birth-voice/call/:id` → endpoint D (503 se não configurado; toast mostra a mensagem com as variáveis faltando).

Dependências/código morto:
- `rg "lib/voice-hub/routes" src server.ts worker*.ts` → 0 resultados: router legado nunca montado.
- `package.json` não declara `twilio`; `node_modules/twilio` ausente → `telephony.routes.ts`/`twilioClient.ts` nem importam (`Cannot find package 'twilio'`).
- `src/features/cadence/dialer/index.ts` (startDialerLoop/ThreeCxDialerProvider) sem importadores → discador 3CX automático nunca roda; env `THREECX_DOMAIN/CLIENT_ID/API_KEY/AGENT_DNS` (`cadence/dialer/config/env.ts:22-27`) só seria exigido se ligado.
- Manifests de deploy ativos (docker-compose, k8s, deploy-ec2) não declaram `BIRTH_VOICES_*`, `BIRTHHUB360_WEBHOOK_SECRET`, `THREECX_WEBHOOK_SECRET`; só `.env.example:195-213` e `infrastructure/archive/render.yaml.disabled`. Em prod dependem de `.env` do host → D/E/F/G dão 503 se o host não tiver.

## Reprodução

### 1) Teste unitário existente (gate real via HTTP)
```
npm run test:unit -- tests/unit/features/voice-hub-availability-gate.test.ts
# ou: npx vitest run --config vitest.unit.config.ts tests/unit/features/voice-hub-availability-gate.test.ts
```
Resultado 2026-10-10 22:58 BRT: **1/1 pass, exit 0** (GET/POST/publish → 503 MODULE_NOT_READY).

### 2) Script isolado (sem secrets, sem DB/Redis)
Arquivo: `.agents/runs/08-503-repro-20261010.mts` (rodar da raiz do repo com node_modules):
```
env -i PATH="$PATH" HOME=/tmp NODE_ENV=test npx tsx .agents/runs/08-503-repro-20261010.mts
```
Monta em Express isolado o gate real (com stub de auth: 401 sem header, passa com `Authorization`) + routers reais `threecxWebhookRouter`, `voiceResultWebhookRoutes`, `birthVoiceWebhookRoutes`, e tenta `telephony.routes`/`twilioClient`. Saída completa: `.agents/runs/08-503-repro-output-20261010.txt`. Resumo:

```
GET  /api/voice-hub/workflow          [no-auth] -> 401 (stub)
GET  /api/voice-hub/workflow          [auth]    -> 503 MODULE_NOT_READY voice-hub
POST /api/voice-hub/workflow          [auth]    -> 503 MODULE_NOT_READY voice-hub
POST /api/voice-hub/workflow/publish  [auth]    -> 503 MODULE_NOT_READY voice-hub
POST /api/voice-hub/calls/outbound    [auth]    -> 503 MODULE_NOT_READY voice-hub
GET  /api/outbound/campaigns          [auth]    -> 503 MODULE_NOT_READY outbound
POST /api/dialer-3cx/call             [auth]    -> 503 MODULE_NOT_READY dialer-3cx
POST /api/telephony/twilio/voice|outbound       -> 404 (router não carrega: Cannot find package 'twilio')
POST /api/integrations/3cx/webhook              -> 503 "Webhook não configurado." (log: THREECX_WEBHOOK_SECRET ausente)
POST /api/webhooks/voice-result                 -> 503 "Webhook não configurado." (log: BIRTHHUB360_WEBHOOK_SECRET ausente)
POST /api/integrations/birth-voice/webhook      -> 503 "Webhook não configurado." (log: nenhum segredo de conexão/global)
```
Obs.: `src/config/env.ts` loga erro de validação por `DATABASE_URL` ausente, mas não aborta em `NODE_ENV=test`.

### 3) Contra servidor real (staging/local com DB) — para 12/17 executarem
```
# precisa de cookie/sessão válida (better-auth) + CSRF para métodos não-GET
curl -i -b "$COOKIE" https://<host>/api/voice-hub/workflow              # esperado 503 MODULE_NOT_READY
curl -i -b "$COOKIE" https://<host>/api/outbound/anything                # 503 module=outbound
curl -i -b "$COOKIE" https://<host>/api/dialer-3cx/anything              # 503 module=dialer-3cx
curl -i https://<host>/api/voice-hub/workflow                            # 401 (auth vem antes do gate)
curl -i -X POST -H 'content-type: application/json' -d '{}' https://<host>/api/webhooks/voice-result   # 503 se BIRTHHUB360_WEBHOOK_SECRET ausente; 401 se presente
curl -i -X POST -b "$COOKIE" -H "x-csrf-token: $CSRF" -H 'content-type: application/json' \
  -d '{"agentType":"sdr"}' https://<host>/api/integrations/birth-voice/call/<leadId>   # 503 + lista de vars faltando, se não configurado
```
Atenção: POST passa pelo `csrfGuard` global (`bootstrap/security.ts:174`) antes do gate — sem token CSRF o retorno é 403, não 503.

### Não reproduzido / limites
- Endpoint D (`birth-voice/call`) — exige Prisma (`voiceHubConnection.findFirst`); só análise estática.
- Servidor completo não subido (sem DATABASE_URL/Redis no box). Cadeia real `authenticateToken`→`requireTenant` não exercitada (stub).
- Logs de CI/Actions: nenhum artefato em `.agents/runs/` com 503 dessas rotas; únicas menções em `.agents/handoffs/onda-resgate-20261010/{12-para-00-voice,08-para-00-voice-tests}.md` (confirmam que main "desativa /api/voice-hub com 503" e que testes cobrem carga 503). Não varri logs de jobs do Actions.

## Hipótese

O "503 Outbound/Dialer/Voice" observado no app é **comportamento por design**: o gate `MODULE_NOT_READY` foi introduzido para impedir que routers legados importados (sem modelo de identidade/tenant canônico, sem RLS verificada) toquem o banco compartilhado. O problema real é de **produto/UX**: as rotas de front (`/app/voice-hub`, `/app/outbound/*`, `/app/dialer`) continuam navegáveis e não tratam o 503 como "módulo indisponível". Os 503 restantes (D–G) são fail-closed por **configuração** ausente no ambiente. Não há evidência de 503 por infra (LB/ECS/upstream) nessas rotas.

## Recomendações para 12/17

1. **Não remover o gate** sem missão própria (contratos, authz, RLS, publish gates — handoff 12-para-00). Reabrir é decisão humana/00.
2. **UX (12, com 02/03):** em `workflowPersistence.ts:99-100`, ler o corpo em 503 e, se `code==='MODULE_NOT_READY'`, setar estado `unavailable` com mensagem explícita "Voice Hub indisponível nesta versão" (em vez de erro genérico + retry). Mesmo tratamento para publish/versions/rollback (`useStudioStore.ts:924,995,1036`).
3. **Navegação (02/05/12):** esconder ou marcar "indisponível" `/app/outbound/*` e `/app/voice-hub` em Sidebar/CommandPalette/MacDock; `/app/dialer` → redirect para `/app/cadence` ou tela indisponível; trocar rótulo "Discador 3CX" (`tabMeta.ts:220`).
4. **Config (17/infra + Marcelo):** se o SDR de voz deve funcionar em prod, declarar no manifest de deploy ativo (EC2/compose) `BIRTH_VOICES_URL`, `BIRTH_VOICES_API_KEY`, `BIRTH_VOICES_AGENT_ID`, `BIRTH_VOICES_WEBHOOK_SECRET`, `BIRTHHUB360_WEBHOOK_SECRET`, `PUBLIC_BASE_URL` (não-localhost) — ou cadastrar `VoiceHubConnection` por organização; `THREECX_WEBHOOK_SECRET` se 3CX for usado. Valores são humanos; não versionar.
5. **Smoke pós-deploy:** adicionar ao verify-prod um check que `/api/voice-hub/x` com sessão retorne exatamente `503 MODULE_NOT_READY` (garante que o gate não foi removido por acidente) e que `/api/webhooks/voice-result` sem assinatura retorne 401 (não 503) quando o segredo estiver configurado.
6. **Dívida (12):** decidir destino de `src/lib/voice-hub/routes/*` (twilio ausente do package.json → não compila em runtime) e de `src/features/cadence/dialer/index.ts` (loop 3CX nunca iniciado). Ou adicionar `twilio` e plano de montagem, ou remover/arquivar.

## Artefatos
- Relatório: `.agents/runs/08-503-outbound-dialer-voice-20261010.md`
- Script: `.agents/runs/08-503-repro-20261010.mts`
- Saída: `.agents/runs/08-503-repro-output-20261010.txt`
