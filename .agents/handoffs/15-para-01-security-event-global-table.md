# Handoff 15 → 01 — tabela `security_event` global (opcional, sem FK de tenant)

**Status:** aberto (não bloqueia) · **Origem:** branch `agente/15-security-audit-global-channel`

## Contexto
`continuousSecurityAudit` publicava `SECURITY_AUDIT_SWEEP_COMPLETED` no domainEventMesh com
`organizationId: 'global-security-governance'`, violando a FK `organizationId → Organization`
da outbox (REMED-05, #32/#34). Decisão do 15: **não** criar org de sistema (tenant falso = bypass
de RLS e poluição de queries por tenant). Eventos de plataforma vão por um port próprio
`IGlobalSecurityEventSink` (`src/lib/security/events/globalSecurityEvent.port.ts`);
a implementação padrão é log estruturado (pino/Loki).

## Pedido (quando houver necessidade de durabilidade/consulta)
Tabela `security_event` **sem** `organizationId` e **fora** da outbox:
- colunas: `id uuid pk`, `event_type text`, `event_version text`, `occurred_at timestamptz`,
  `correlation_id text`, `producer text`, `aggregate_id text`, `payload jsonb` (sem PII).
- append-only: trigger que rejeita UPDATE/DELETE para `prospector_app`.
- RLS habilitada + `FORCE`; `prospector_app` só com `INSERT` (sem SELECT); leitura via role de
  auditoria/ops dedicado. Nunca entrar no allowlist de bypass de tenant.
- retenção (ex.: 400 dias) por job de ops, não pelo app.

Com a tabela pronta, o 15 escreve `PrismaGlobalSecurityEventSink` implementando o mesmo port.
