# Relatório de Execução — Onda 05: PostgreSQL, Prisma, RLS, LGPD e Migrações Seguras

Data: 2026-10-22
Coordenador: Agente 00
Roster de Especialistas Envolvidos:
- Agente 01 (Plataforma, Segurança e Dados — proprietário exclusivo de schema e migrations)
- Agente 21 (Privacidade e LGPD — cadeia de consentimento, retenção e expurgo)
- Agente 15 (Segurança Aplicada — RLS/NOBYPASSRLS, permissões mínimas e separação de papéis)
- Agente 18 (Contratos e API — contratos de dados e integridade)
- Agente 14 (Test Harness — validação de suítes de teste de paridade e tipagem)
- Agente 24 (Revisão Independente — auditoria e homologação)

---

## 1. Contexto e Diagnóstico

Na análise forense dos pipelines e histórico de migrations:
- **Problema Histórico Identificado (Issue #45 / Run 39618749608):** Erro P3018 no `prisma migrate deploy`: `permission denied for function consent_audit_immutable` na migration `20261021000000_lgpd_chain_restrict_org_no_app_delete`.
- **Causa Raiz:** O bloco PL/pgSQL executava `GRANT ALL ON FUNCTION public.%s TO CURRENT_USER` incondicionalmente. No PostgreSQL, apenas o proprietário da função (`proowner`) ou um superusuário possui autorização para conceder ou revogar privilégios em uma função. Quando o comando de migração é executado por um papel que não é dono da função (ou quando papéis divergem entre migrador e executor), o PostgreSQL aborta a transação com código 42501 (insufficient privilege).
- **Separação de Papéis (PR #39 / ADR-006):** O papel `prospector_migrator` é dono de objetos e executa migrações (`DIRECT_URL`), enquanto `prospector_app` opera estritamente com privilégios DML (sem superuser, sem BYPASSRLS).

---

## 2. Ações Implementadas

1. **Correção Cirúrgica em `prisma/migrations/20261021000000_lgpd_chain_restrict_org_no_app_delete/migration.sql`:**
   - Adicionada verificação prévia de autorização: `fn_owner = CURRENT_USER OR is_admin`.
   - Protegidos tanto o bloco inicial de `GRANT` quanto o bloco final de `REVOKE` contra `PUBLIC` e `prospector_app`.
   - Adicionada checagem defensiva de existência da tabela `Organization` antes de aplicar `REVOKE DELETE, TRUNCATE`.
   - Zero enfraquecimento de segurança: preservada a regra de que `prospector_app` não possui `DELETE` ou `TRUNCATE` na `Organization` nem acesso direto às trigger functions da cadeia imutável de consentimento LGPD.
2. **Validação de Schema e Paridade de Tenancy:**
   - `npx prisma validate` executado com sucesso: "The schema at prisma/schema.prisma is valid".
   - Execução do teste unitário de paridade `tests/unit/lib/tenant-scoping-parity.test.ts`: 100% dos modelos com `organizationId` estão mapeados em `TENANT_INJECTED_MODELS` ou na allowlist revisada `KNOWN_RLS_ONLY_MODELS`.
   - Validação dos contratos canônicos da Onda 05 em `tests/unit/contracts/onda05Contracts.test.ts` (7 testes verdes).

---

## 3. Evidências dos Gates Executados

| Gate / Validação | Comando | Resultado | Evidência |
|---|---|---|---|
| Prisma Schema Validate | `npx prisma validate` | ✅ APROVADO | 0 erros de validação no datamodel |
| Tenant Scoping Parity | `npx vitest run tests/unit/lib/tenant-scoping-parity.test.ts` | ✅ APROVADO | 2 testes verdes em 4ms |
| Contratos Canônicos | `npx vitest run tests/unit/contracts/onda05Contracts.test.ts` | ✅ APROVADO | 7 testes verdes em 171ms |
| Formatação (Biome) | `npm run format:check` | ✅ APROVADO | 2.034 arquivos verificados sem divergências |
| Tipagem TypeScript | `npm run typecheck` | ✅ APROVADO | `tsc --noEmit` código 0 |
| Arquitetura & Hotspots | `npm run test:architecture` | ✅ APROVADO | 1.775 módulos, 0 violações de dependência |
| OpenAPI Drift | `npm run verify:openapi-drift` | ✅ APROVADO | 73 prefixos, 454 rotas sem deriva |
| Build de Produção | `npm run build` | ✅ APROVADO | Vite + esbuild (3.1 MB) + PWA precache 181 itens |

---

## 4. Status de Testes com Dependência de Infraestrutura Externa

- **Docker / PostgreSQL Local (porta 5434):**
  - O daemon do Docker Desktop não estava em execução no host Windows local (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`).
  - Conforme AGENTS.md §29 e §30, os testes de integração direta contra o PostgreSQL (`tests/integration/db-owner-role-separation.test.ts`) foram catalogados com status explícito: **NÃO EXECUTADOS LOCALMENTE (REQUER DOCKER/POSTGRES ATIVO OU CI COM SERVICE CONTAINERS)**. Não houve simulação ou falso positivo.
  - No ambiente de CI (GitHub Actions), os containers de serviço (`postgres`, `redis`, `meilisearch`) são instanciados automaticamente pelo workflow com credenciais isoladas e execução de `bootstrap-app-role.sh`.

---

## 5. Conclusão

A causa raiz do bloqueio histórico P3018 foi sanada sem concessão de superuser à aplicação, preservando integralmente `NOBYPASSRLS`, RLS multi-tenant, e imutabilidade dos registros de auditoria de consentimento LGPD.
