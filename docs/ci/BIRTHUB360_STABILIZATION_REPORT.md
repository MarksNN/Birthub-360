# BIRTHUB 360 — Relatório de Estabilização (WAR ROOM)

**Data:** 2026-11-01  
**Branch:** `fix/stabilize-ci-css-and-tests`  
**PR:** [#139](https://github.com/MarksNN/Birthub-360/pull/139)  
**HEAD inicial da main:** `2b4136c1c34355bc37038d786b151eae14452f82`  
**HEAD atual da branch:** `12f694bd74fa3a9c955e6ac963ab89d27a789f36`

## Resumo Executivo

Operação de estabilização iniciada para corrigir falhas no Central Birth Hub 360 Release (Application Gate) e testes unitários associados. Correções de causa raiz aplicadas e validadas localmente. CI remoto em reexecução no SHA mais recente.

## Falhas Identificadas e Corrigidas

### 1. Application Gate — Run Lint (Biome)
- **Causa:** `noDescendingSpecificity` em `src/styles/official-identity.css` (seletores `[data-page-accent]` após seletor de maior especificidade + duplicata) + `noUndeclaredVariables` (`createUntrustedContentGuard` sem import).
- **Correção:** Reordenação dos seletores (especificidade crescente) + remoção de duplicata + import correto da fachada pública.
- **Status:** Lint passa localmente e no CI remoto.

### 2. Application Gate — Run Prettier check
- **Causa:** Formatação Biome divergente nos arquivos alterados (import longo e map inline).
- **Correção:** `biome format --write` aplicado.
- **Status:** `format:check` passa localmente. Aguardando confirmação no CI remoto.

### 3. Testes unitários previamente falhando (SonarQube)
- `tests/unit/components/layout/sidebarHorizonte1.test.ts`: assertions desatualizadas em relação aos ids reais dos grupos (`revenue_tree`, `cadences`, `performance`) e parâmetro `isAdmin`.
- `src/features/intelligence/commercial-v3/__tests__/commercialV3.test.ts`: `listSkills('supervisor')` retornava skills sem `agentId`.
- **Correção:** Atualização das assertions + enriquecimento do `agentId` no `CommercialAgentV3RegistryService` ao carregar índices.
- **Status:** Ambos os testes passam localmente.

## Workflows Auditados (status no SHA anterior / em andamento)

| Workflow | Status (SHA ac76fd05c) | Observação |
|----------|------------------------|----------|
| Central Birth Hub 360 Release | Falha (Prettier) | Corrigido no SHA atual |
| SonarQube Analysis | Sucesso | - |
| Security - CodeQL | Sucesso | - |
| Security - Trivy | Sucesso | - |
| Security - Dependency Review | Sucesso | - |
| Frontend Bundle Budget | Sucesso | - |
| Visual Regression Tests | Falha | Logs truncados; investigação pendente |
| Postman sync | Não listado recentemente | - |

## Regras de Proteção da main

- **main-1:** Apenas proibição de deleção. Sem bypass.
- **main-2:** `required_status_checks` com lista **vazia**. Bypass permanente para RepositoryRole (Admin).
- **Ação necessária (administrativa):** Preencher a lista de required status checks com os jobs obrigatórios (Application Gate, SonarQube, CodeQL, Trivy, etc.). Não aplicado nesta operação.

## Próximos Passos

- Confirmar Application Gate verde no SHA `12f694bd7`.
- Investigar falha de Visual Regression (snapshots vs. ambiente).
- Executar homologação funcional (PostgreSQL + Redis + Prisma) quando os gates de qualidade estiverem verdes.
- Completar relatório com links de execução, contagem de testes e bloqueadores remanescentes.

## Recomendação de Merge

**Não recomendado ainda.** Aguardando confirmação remota de todos os checks obrigatórios e homologação funcional. Sem merge sem autorização explícita.

## Atualização 2026-11-01 (continuação)

- Application Gate avançou: Lint, Prettier, Type Check e Architecture tests **passaram** no CI remoto.
- Falha restante no gate: deriva de OpenAPI (endpoints commercial-v3).
- Main avançou (PRs de formatação e mock). Branch atualizada via merge de origin/main.
- OpenAPI: paths commercial-v3 já existiam em main; removida duplicata introduzida localmente + corrigida indentação. `verify:openapi-drift` passa.
- SHA atual: `b297d91fe` (inclui merge + limpeza OpenAPI).

### Bloqueadores remanescentes
- Visual Regression (falha consistente; logs truncados — possível flakiness de snapshot ou diferença de ambiente).
- SonarQube Quality Gate (falhou no SHA anterior; reexecução em andamento).
- Homologação funcional integrada ainda não executada.

**Recomendação:** aguardar resultado do Application Gate no SHA atual. Não fazer merge ainda.
