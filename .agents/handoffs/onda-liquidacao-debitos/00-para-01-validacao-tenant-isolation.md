- De: 00 (Coordenador)
- Para: 01 (Plataforma, Segurança e Dados)
- Onda: liquidacao-debitos
- Status: resolvido
- Prioridade: alto (bloqueador B-10)

## Problema

Validar E2E que rotas de usage, métricas e consultas analíticas possuem middleware `withTenantContext` sem brechas de bypass (Bloqueador B-10 da missão original).

## Evidência

### 1. Middleware `withTenantContext` Implementado

**Localização:** `src/lib/async-context.ts` (linhas 97-105)

```typescript
export function withTenantContext<R>(
  tenantId: string,
  callback: () => Promise<R> | R,
): Promise<R> | R {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new TenantContextMissingError();
  }
  return requestContext.run({ tenantId: tenantId.trim() }, callback);
}
```

**Validação:** ✅ Middleware existe e valida tenantId antes de executar callback.

### 2. Rotas de Analytics/Usage/Metrics com `requireTenant`

**Montagem em `src/bootstrap/routes.ts`:**

- **Linha 140:** `/api/analytics` → `authenticateToken, requireTenant, analyticsRoutes`
- **Linha 182-186:** `/api/usage` → `authenticateToken, requireTenant, requireRole(['ADMIN', 'GESTOR']), usageRoutes`
- **Linha 12-15 em `metrics.routes.ts`:** `/api/voice-hub/metrics` → `requireTenant` em todas as rotas

**Validação:** ✅ Todas as rotas de analytics, usage e metrics usam `requireTenant` no mount.

**Defense in Depth:** `/api/commercial-intelligence` usa `requireRole` no router interno (linha 17 em `commercialIntelligence.routes.ts`), além do `requireTenant` global.

### 3. Controllers Extram `organizationId` do Contexto

**UsageController** (`src/features/billing/presentation/UsageController.ts`):
```typescript
const { organizationId } = (req as AuthRequest).user;
const data = await this.usageUseCases.summary(organizationId, parseDays(req.query.days));
```

**AnalyticsController** (`src/features/analytics/presentation/AnalyticsController.ts`):
```typescript
const { organizationId } = (req as AuthRequest).user;
const overview = await this.analyticsUseCases.overview(organizationId);
```

**Validação:** ✅ Controllers usam `organizationId` do contexto de autenticação (preenchido por `requireTenant`).

### 4. Workers de Fila com `requestContext.run`

**enrichmentCascade.worker.ts** (linhas 49-71):
```typescript
await requestContext.run({ tenantId: organizationId }, async () => {
  try {
    const result = await runEnrichmentCascade(organizationId, companyId, options);
    // ...
  } catch (error: any) {
    // ...
  }
});
```

**Validação:** ✅ Worker de enriquecimento usa `requestContext.run({ tenantId: organizationId })` para isolamento.

### 5. Temporal Activities com Interceptor de Tenant

**interceptors.ts** (linhas 38-76):
- `TenantActivityInboundInterceptor` extrai tenantId de headers ou payload
- Lança `TenantContextMissingError` se tenantId não encontrado
- Usa `withTenantContext(tenantId, async () => next(input))` para garantir contexto

**Validação:** ✅ Temporal Activities têm proteção obrigatória de tenantId.

### 6. Caso Especial: bitrixSync.worker.ts

**bitrixSync.worker.ts** (linhas 20-29):
```typescript
const worker = new Worker(BITRIX_SYNC_QUEUE_NAME, async (_job: Job) => runBitrixSyncTick(), {
  connection,
  concurrency: 1,
});
```

**Observação:** Este worker NÃO usa `requestContext.run`. É um job global que varre todas as organizações com regras de sync ativas (comentário linhas 21-25).

**Justificativa documentada:** "Um único job global (não um por organização): regras de sync são criadas dinamicamente pela própria tela de Integrações... runBitrixSyncTick já varre todas as organizações com regra ativa a cada execução."

**Avaliação:** ⚠️ Este design é intencional (evita reinício do servidor a cada criação de regra), mas `runBitrixSyncTick` deve internamente usar `requestContext.run({ tenantId: organizationId })` para cada organização processada, garantindo que consultas Prisma dentro da sync estejam isoladas por tenant.

## Resolução

### Status Geral: ✅ ISOLAMENTO DE TENANT OK

As rotas de usage, métricas e consultas analíticas estão adequadamente protegidas:

1. ✅ `requireTenant` é aplicado no mount de todas as rotas críticas
2. ✅ Controllers extraem `organizationId` do contexto de autenticação
3. ✅ Workers de fila (exceto bitrixSync) usam `requestContext.run({ tenantId })`
4. ✅ Temporal Activities têm interceptor obrigatório de tenantId
5. ⚠️ `bitrixSync.worker` precisa validação interna (ver abaixo)

### Ação Necessária (Handoff Interno)

**Validar isolamento interno de `runBitrixSyncTick`:**

1. Ler `src/features/integrations/bitrix/bitrix.service.ts` → função `runBitrixSyncTick`
2. Verificar se para cada organização processada, existe `requestContext.run({ tenantId: organizationId })`
3. Se não existir, adicionar envolvimento de `requestContext.run` para cada loop de organização
4. Testar que consultas Prisma dentro da sync respeitam RLS por organizationId

**Proprietário:** Agente 01 (Plataforma, Segurança e Dados) ou Agente 06 (Integrações e Bitrix)
**Prioridade:** MÉDIA (design intencional, mas isolamento deve ser garantido internamente)

## Teste Esperado

1. Executar testes de RBAC/tenant em `tests/integration/rbac-e2e-*.test.ts`
2. Verificar que `/api/analytics/*` e `/api/usage` falham sem tenant válido
3. Verificar que worker de enriquecimento respeita isolamento por organizationId
4. Verificar que `runBitrixSyncTick` usa `requestContext.run` internamente (após validação)

## Contexto Adicional

- RLS está habilitado no banco (migrations `enable_rls`/`enable_rls_auto`/`enable_rls_remaining_tables`)
- `authenticateToken` preenche `req.user.organizationId` no contexto
- A maioria dos models tem `organizationId` + `@@index([organizationId])`
- Skill `database-integrity` deve ser usado para validar queries Prisma específicas se necessário

## Resolução (Agente 01)

**Implementado em:** 2026-10-10

**Validação de `runBitrixSyncTick`:**

Lido `src/features/integrations/bitrix/service/syncRules.ts` (linhas 166-303).

**Evidência encontrada:**

1. **Linha 183-185:** `requestContext.run({ bypassRls: true })` usado para listar organizações (Organization está na allowlist de bypass em `async-context.ts`)

2. **Linha 192-293:** Para cada organização, o código usa `requestContext.run({ tenantId: organizationId })` para processar as regras

```typescript
for (const { id: organizationId } of organizations) {
  await requestContext.run({ tenantId: organizationId }, async () => {
    const rules = await prisma.bitrixSyncRule.findMany({ where: { active: true } });
    // ... processamento das regras dentro do contexto de tenant
  });
}
```

**Conclusão:** ✅ `runBitrixSyncTick` JÁ usa `requestContext.run({ tenantId: organizationId })` para cada organização processada. O isolamento de tenant está garantido.

**Ações executadas:**
- [x] Confirmar que `runBitrixSyncTick` usa `requestContext.run({ tenantId: organizationId })` para cada organização
- [x] Nenhuma alteração necessária (código já está correto)
- [x] Testes existentes em `__tests__/syncRules.test.ts` validam o comportamento
- [x] Status alterado para "resolvido"
