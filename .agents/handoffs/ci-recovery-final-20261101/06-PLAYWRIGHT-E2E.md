# HANDOFF 06 — PLAYWRIGHT E2E, NAVEGAÇÃO, ONBOARDING E WORKSPACE
## Relatório de Diagnóstico, Correção das Seis Falhas e Homologação

- **De:** Agente 00 — Supervisor Geral
- **Executor Principal:** Agente 08 — QA, Testes e Release
- **Apoio:** Agente 02 (Produto/UX), Agente 03 (Interface/Acessibilidade), Agente 01 (Segurança/RBAC/RLS)
- **Data:** 2026-11-01
- **Prioridade:** P1 — Bloqueador de Homologação
- **Status:** **CONCLUÍDO COM SUCESSO (PASS)**

---

### 1. DIAGNÓSTICO INDIVIDUAL DAS SEIS FALHAS E CORREÇÕES

#### E2E-001 — Navegação "Meu Espaço" (`tests/e2e/crm.spec.ts`)
- **Sintoma:** `strict mode violation` — localizador `getByRole('button', { name: 'Meu Espaço', exact: true })` retornava 2 elementos.
- **Causa Raiz:** Na Sidebar moderna inspirada em cards, o grupo principal possui o label `"Meu Espaço"` (`data-testid="sidebar-nav-workspace"`) e, ao expandir, revela o subitem `"Meu Espaço"` (`data-testid="sidebar-sub-workspace"`).
- **Correção Aplicada:** Utilização de seletor escopado estável `page.locator('aside').getByTestId('sidebar-nav-workspace')`, garantindo a ativação do grupo principal sem ambiguidade.
- **Resultado:** **PASS** (rota `/app/workspace` verificada sem erros de console).

#### E2E-002 — Navegação "Decisores" (`tests/e2e/crm.spec.ts` e `tests/e2e/contact-company-forms.spec.ts`)
- **Sintoma:** Timeout de 60 segundos aguardando botão com texto `"Decisores"`.
- **Causa Raiz:** O menu lateral evoluiu legitimamente para a nomenclatura `"Contatos & Decisores"` (com `ariaLabel: "Contatos"`, rota `/app/contacts` e `data-testid="sidebar-nav-contacts"`), agrupando a base de contatos e o mapeamento de decisores B2B. O seletor buscava a string legada `"Decisores"`.
- **Correção Aplicada:** Ajuste no mapa de rotas e no fluxo de formulários para utilizar o identificador oficial `page.locator('aside').getByTestId('sidebar-nav-contacts')`.
- **Resultado:** **PASS** (navegação para `/app/contacts` validada e disponível).

#### E2E-003 — Navegação "Analytics" (`tests/e2e/crm.spec.ts`)
- **Sintoma:** `strict mode violation` — localizador encontrava simultaneamente o botão do grupo e o botão do subitem `"Analytics"`.
- **Causa Raiz:** O grupo de Performance possui label `"Analytics"` (`data-testid="sidebar-nav-performance"`) e o primeiro subitem do pocket também possui label `"Analytics"` (`data-testid="sidebar-sub-analytics"`).
- **Correção Aplicada:** Seleção do item principal da barra lateral através do `data-testid="sidebar-nav-performance"`.
- **Resultado:** **PASS** (navegação para `/app/analytics` validada sem erros de console).

#### E2E-004 — Formulário de Contato Vinculado a Empresa (`tests/e2e/contact-company-forms.spec.ts`)
- **Sintoma:** Timeout durante o fluxo de criação de contato vinculado a empresa.
- **Causa Raiz:** O teste bloqueava na transição de telas ao tentar clicar no botão `"Decisores"`, impedindo a abertura do dialog de Novo Contato.
- **Correção Aplicada:** Navegação realizada via `page.locator('aside').getByTestId('sidebar-nav-contacts')`, seguida de preenchimento de campos obrigatórios (`Nome`, `Empresa`), submissão fora da tag `<form>` e verificação do toast de sucesso e persistência na tabela.
- **Resultado:** **PASS** (empresa e contato criados, relacionados e confirmados na listagem).

#### E2E-005 — Onboarding e Sidebar (`tests/e2e/organization-modules-onboarding.spec.ts`)
- **Sintoma:** Após setup inicial da organização em `/setup`, o teste não encontrava o texto `"COMMAND CENTER"` no `aside`.
- **Causa Raiz:** O cabeçalho da seção na Sidebar foi internacionalizado para `"CENTRAL DE COMANDO"`.
- **Correção Aplicada:** Validação da presença da Sidebar (`page.locator('aside')`) e do cabeçalho da seção via regex `/CENTRAL DE COMANDO|COMMAND CENTER/i`, confirmando a transição de `/setup` para `/app` e persistência sem redirecionamento após reload.
- **Resultado:** **PASS** (onboarding concluído, persistido e validado contra regressões).

#### E2E-006 — Workspace Closer e Pipeline (`tests/e2e/workspace.spec.ts`)
- **Sintoma:** Localizador `getByRole('button', { name: 'Pipeline', exact: true })` encontrava o subitem da Sidebar (`sidebar-sub-crm`) e a ação rápida do Workspace Closer simultaneamente.
- **Causa Raiz:** Colisão de nomes entre o link da barra lateral e o botão de ação rápida no corpo da página.
- **Correção Aplicada:** Escopamento da asserção no elemento principal: `page.getByRole('main').getByRole('button', { name: 'Pipeline', exact: true })`.
- **Resultado:** **PASS** (workspace do Closer validado com KPIs e Ações Rápidas).

---

### 2. ANÁLISE DO CENÁRIO IGNORADO (SKIP / FIXME)

- **Arquivo:** `tests/e2e/crm-kanban-mobile.spec.ts:163`
- **Cenário:** `test.fixme('touch drag real (touchscreen) move um card entre colunas')`
- **Justificativa Documentada:** O teste de drag-and-drop horizontal com auto-scroll em viewport mobile (Pixel 5 emulado) depende de heurísticas de ponteiro sintético que o Playwright emulado não reproduz de forma determinística sob concorrência do CI com o `dnd-kit`. Os demais testes móveis do arquivo (scroll sem iniciar drag, hit targets de 44px, drawer mobile e overflow) continuam ativos e 100% cobertos. O cenário foi formalmente mantido sob `test.fixme` para auditoria manual em device real, sem ocultar falhas.

---

### 3. EVIDÊNCIAS DE EXECUÇÃO DOS TESTES CORRIGIDOS

Execução direcionada:
```bash
npx playwright test tests/e2e/crm.spec.ts tests/e2e/contact-company-forms.spec.ts tests/e2e/organization-modules-onboarding.spec.ts tests/e2e/workspace.spec.ts --workers=1 --reporter=line
```

**Resultado:**
- `contact-company-forms.spec.ts`: 3 passed
- `crm.spec.ts`: 9 passed
- `organization-modules-onboarding.spec.ts`: 1 passed
- `workspace.spec.ts`: 3 passed
- **Total: 16 passed em 1.6m (0 falhas)**.
