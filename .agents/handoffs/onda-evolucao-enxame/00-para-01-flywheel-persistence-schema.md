De: Agente 00 — Coordenador Global
Para: Agente 01 — Plataforma, Segurança e Dados
Onda: Evolução Enxame IA
Status: resolvido
Prioridade: alto
Bloqueador-ref: REMED-06
Sprint destino: Sprint 1

## Problema
O serviço `CommercialLearningFlywheelService` armazena o aprendizado contínuo de abordagens comerciais e exemplos Few-Shot em memória (`Map`), com delegates mockados para `FlywheelApproachRecord` e `FlywheelFewShotExample`. Sem persistência no PostgreSQL, o aprendizado é volátil entre restarts e o expurgo exigido pela LGPD não persiste em banco.

## Arquivo(s) envolvido(s)
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/features/intelligence/services/commercialLearningFlywheel.service.ts`

## Evidência
Comentário explícito em `commercialLearningFlywheel.service.ts`:
"Delegates estruturais dos models FlywheelApproachRecord e FlywheelFewShotExample (ainda inexistentes no schema — handoff ao Agente 01)."

## Alteração necessária
1. Adicionar os models `FlywheelApproachRecord` e `FlywheelFewShotExample` no `schema.prisma`.
2. Incluir campo obrigatório `organizationId` com política RLS multi-tenant ativa.
3. Configurar relacionamento com `Organization` e `Lead`, com onDelete: Cascade para expurgo físico do titular.
4. Gerar migration via Prisma sem quebrar o baseline.

## Teste esperado
- `npx prisma validate`
- `npm run verify:migration-drift`
- Teste de inserção e exclusão atômica em transação com RLS ativado.

## Contexto adicional
Alinhado com a recomendação da LGPD (Agente 21) de exclusão física definitiva no exercício dos direitos do titular.

## Resolução
- **Status:** **RESOLVIDO E MERGEADO EM MAIN**
- **Data:** 2026-11-01
- **Executores:** Agente 01 (Plataforma, Segurança e Dados) & Agente 21 (LGPD)
- **Commits em main:** `4b3718474`, `9c8aa2072`, `25118dca6`, `123017e64`, `f6be6a3ec`, `518772574`, `05963537d`, `60161d37f`.

### Ações Executadas:
1. Adicionados os modelos relacionais `FlywheelApproachRecord` e `FlywheelFewShotExample` em `prisma/schema.prisma` com `organizationId` obrigatório e política RLS de tenant isolation.
2. Migrações seguras geradas e aplicadas (`20261026000001_flywheel_schema_rls_enrichment` e `20261025000001_flywheel_initial`).
3. Suporte a cascade de expurgo físico LGPD vinculado a `Lead` e `Organization`.
4. Atualizado `CommercialLearningFlywheelService` para persistência durável no PostgreSQL com fallback seguro.
5. Migration drift resolvido com adição de `@default(now())` em `updatedAt`.

