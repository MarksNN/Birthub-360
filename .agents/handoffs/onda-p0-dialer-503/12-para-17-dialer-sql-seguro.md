De: 12 — Voz e Telefonia
Para: 17 — Cadência Multicanal e Ciclo de Receita
Onda: p0-dialer-503
Status: resolvido
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

## Resolução e Parecer Técnico do Agente 17 (2026-10-11)

### 1. Posicionamento Arquitetural do Discador (`src/features/cadence/dialer/**`)
- O motor em `src/features/cadence/dialer/**` é o candidato oficial de backend para discagem preditiva/progressiva, implementando arquitetura hexagonal completa com políticas de concorrência (`uq_call_attempts_active_agent_dn`), batching atômico (`claimNextEligible` com `FOR UPDATE SKIP LOCKED`) e controle de horários (`CallingHoursPolicy`).
- **Estado atual de montagem**: Permanece como microsserviço/processo de background isolado (`interface/http/server.ts` e `dialerLoop.ts`) e **NÃO deve ser montado no Express principal (`/api/dialer-3cx`)** neste momento.
- **Preservação estrita do gate fail-closed**: Os endpoints legados em `src/bootstrap/routes.ts` (`/api/dialer-3cx`, `/api/outbound`, `/api/voice-hub`) **DEVEM continuar travados sob `unavailableLegacyModule` (HTTP 503 `MODULE_NOT_READY`)** até autorização explícita do Coordenador 00 e alinhamento do schema multi-tenant pelo Agente 01.

### 2. Segurança, Multi-Tenancy e Opt-Out/DNC Unificado
- **Sanitização SQL**: Conforme auditado no handoff `17-para-01-alinhar-schema-dialer-prisma.md`, os repositórios `PgCallAttemptRepository.ts` e `PgDncRepository.ts` foram migrados para queries 100% tipadas e parametrizadas via tagged templates (`Prisma.sql` / `Prisma.join`), eliminando riscos de injeção.
- **Tenancy e DNC**: As tabelas legadas do discador (`001_init.sql` / `002_concurrency_safety.sql`) não possuem a coluna `organizationId`. Ativar o discador antes da convergência com o modelo canônico do Prisma (`DncList` com `organizationId` e `CallAttempt` com mapeamento adequado) causaria vazamento cross-tenant e discagens não autorizadas.
- O handoff formal com o Agente 01 já foi emitido em `.agents/handoffs/onda-enxuta/17-para-01-alinhar-schema-dialer-prisma.md` definindo os requisitos de modelagem:
  1. Suporte a `organizationId` nas entidades de cadência e discagem.
  2. Unificação da lista de DNC/opt-out entre chamadas manuais (Agente 12 via `birth-voice`), discador automático (Agente 17) e cadências multicanal (`PrismaOptOutRepository`).

### 3. Honestidade da Interface (UI CadenceHub e Rota `/dialer`)
- A UI não apresenta campanhas fictícias nem execuções simuladas:
  - Em `src/App.tsx`, a rota `/app/dialer` foi convertida em redirect canônico para `/app/cadence`.
  - Em `src/components/layout/tabMeta.ts`, a aba `dialer` foi registrada em `UNAVAILABLE_LEGACY_NAV_TABS` e associada a `NAV_TAB_ALIASES: { dialer: 'cadence' }`.
  - O componente `CadenceHub` exibe apenas dados reais persistidos (runs, sequências, opt-outs) com estados vazios e tratamento de erro honestos (testados e validados em `CadenceHub.test.tsx`).

### 4. Matriz de Responsabilidade (12 vs 17)
- **Agente 12 (Voz e Telefonia)**:
  - Propriedade: `src/features/integrations/birth-voice/**`, WebRTC/SIP, áudio, transações de chamadas operacionais 1:1, status de operadora/PBX 3CX e gateway de voz.
  - Consome: Contrato de supressão / DNC unificado provido pela camada de dados.
- **Agente 17 (Cadência Multicanal e Ciclo de Receita)**:
  - Propriedade: `src/features/cadence/**`, regras de sequência, agendamentos, opt-out multicanal, esteira de discagem em lote, e ciclo de vida de campanhas.
  - Fornece: Casos de uso e portas de discagem que delegarão chamadas de telefonia à infraestrutura validada.

### 5. Evidências de Validação
- `npx vitest run tests/unit/features/cadence/dialer/PgDialerRepositories.test.ts`: **9/9 testes passaram (100% verde)**.
  - Validação de upsert parametrizado em `call_attempts`.
  - Tratamento de violação de concorrência de agente (`uq_call_attempts_active_agent_dn` / `23505`) com captura limpa de `AgentDnConflictError` (cru e adapter-pg).
  - Consulta e inclusão parametrizada em `dnc_list`.
  - Exclusão rigorosa de status terminais (`completed`, `no_answer`, `busy`, `agent_unavailable`, `failed`).
- Suíte completa de cadência `tests/unit/features/cadence/`: **15 arquivos de testes, 103 testes passaram (100% verde)**.
