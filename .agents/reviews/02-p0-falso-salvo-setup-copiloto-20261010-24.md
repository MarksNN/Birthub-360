# Parecer Agente 24 — P0 #693 (Agente 02): falso salvo / setup / copiloto / fake data

- **Decisão:** **REPROVADO** (bloqueia merge) — 1 achado P1 comprovado na orquestração.
- **Branch auditada:** `agente/02-p0-falso-salvo-setup-copiloto`
- **SHA head exato:** `4992f36da1703bb0db62778bb6f4f15f4bfd8966`
- **Base:** `origin/main` @ `88eb0efe5eaca90153ec5563f579412486a0794a` (merge-base = main atual; run cita 33edc32, sem impacto)
- **Commits:** 8f5dfedc, 4c3bb13a, 7ffe23cc, 273af004, 4992f36d
- **Run:** `.agents/runs/02-p0-correcoes-20261010.md`
- **PR:** draft aguardando Submit do Marcelo — sem número no momento deste parecer.
- **Auditor:** Agente 24 — Revisão Independente · 2026-10-10 (BRT). Nenhum código da entrega foi alterado.

## 1. Escopo declarado vs diff

`git diff origin/main...HEAD --stat`: 17 arquivos, +890/−711.

| Arquivo | SHA-256 |
|---|---|
| .agents/runs/02-p0-correcoes-20261010.md | 2620a583cd3e28966593d6b00a1f7446bfd91fc676a1f3776fa4bddd887fb5ac |
| src/App.tsx | 756ecaa01a2cd1d32f391e9da954e5fda29b5951c3c2aeb78f248982e344c26b |
| src/features/onboarding/components/SetupWizard.tsx | c22e274230a601b5766cea5819cceebd69db8034e87d46b360f0fa8e5724b5ce |
| src/features/onboarding/organizationModules.api.ts | 4d7529aaf376f8864561366b14378cf949ca8ddff831068a396db921090541e1 |
| src/features/predictability/components/ForecastHub.tsx | ff843bfac86fe0ec0677d73e95e3122d4c28030a2a8b3113f0279ec67d14d5d0 |
| src/features/predictability/components/MetasHub.tsx | 3be2f290e14ae1350f551c398f5e47ac52ca4855a58f37bee638b3683de24dd1 |
| src/features/predictability/components/PipelinePonderadoHub.tsx | a1ae4f1206741e3aa177aa23c40f20026fbbd70e7c3ce22c0ed2e6718c523b9b |
| src/features/predictability/components/PredictabilityNoData.tsx | c83487a44ff325b1f2a6f049caf12e7d613226ee073ba72a4850ea5fcee22080 |
| src/features/sales-orchestration/components/DemoDataNotice.tsx | 48553907ebace46f099d4c956036746f0f442392a38358a877e00aa10ca053e2 |
| src/features/sales-orchestration/components/JornadasComerciaisHub.tsx | 36931bb6f4efe78624ea7365a428bfd54ad88c41bd28c75ade0b2242f87c63d2 |
| src/features/sales-orchestration/components/PlaybooksHub.tsx | 801dce5f8bd9c5d5cc96c00dbc96d4597bf1457f872bc3e84efde7c571c29d46 |
| src/features/sales-orchestration/components/ProcessosVendasHub.tsx | a42ae6a6ece7d248a245f4cc6a506567713c49c24baa304c5dac1f58e4be7d6c |
| src/features/sales-orchestration/components/RoteirosHub.tsx | 579abd6586040da6f3cd194c2c41c0fb966160d730f849b638c85a17d0f49868 |
| src/features/sales-orchestration/components/useOrchestrationOverview.ts | a59981bd66a7b0250f5a73a64edd4e45ee9058a6f5ea54a7eefd4156960d2703 |
| src/features/sales-orchestration/orchestration.api.ts | cfc53c8848d739172a3e6d8f599e7732020e2de6c7041dd6102292a67c0ff781 |
| src/features/settings/components/PillarSettingsPlaceholder.tsx | 94e5b11f22f6263626f2f150925b40a75385950a5353a84f23e91e75b6898d82 |
| src/hooks/useOrganizationModules.ts | f0f3f8aadd352973b65b7b5b076e74bbbc6b504d6770dffe5afc4cdfa31f4fe1 |

- **`src/components/ui/**` e `src/styles/**`: zero arquivos tocados** (confirmado por name-only). Componentes ui só são importados.
- Sem `package.json`/lock, server, prisma, Sidebar, tabMeta, navigationBus, voice-hub.
- Todos os arquivos batem com o escopo declarado (settings, setup/org-modules, copiloto_ia, orquestração/previsibilidade).

## 2. Propriedade
- `src/App.tsx`: mudança mínima (lazy import `CopilotoIaHub` + 1 linha de rota `copiloto_ia`). Navegação/rotas são do 02 segundo o AGENTS.md → **dentro da propriedade**. Sidebar intocada.
- `src/hooks/useOrganizationModules.ts` + `organizationModules.api.ts`: cliente do contrato do Agente 01; API **não** criada aqui (`/api/organization-modules` ainda inexistente em `src/bootstrap/routes.ts` do main) — coerente com o run.
- Orquestração/previsibilidade: UI do 02; contrato de API é do 04 (#696 orquestração, #697 previsibilidade, abertos em paralelo).

## 3. Gates (executados pelo 24 no SHA head)
| Gate | Resultado |
|---|---|
| `tsc --noEmit` (projeto) | exit 2 — **1 erro, fora do escopo**: `src/components/ui/KpiCard.tsx(231,11) TS2349` (pré-existente no main, já reportado no parecer Turbo). Zero erros nos arquivos do 02. O "tsc exit 0" do run **não se reproduz** no main atual. |
| `biome lint` nos 16 .ts/.tsx | OK, sem diagnósticos |
| `biome format` nos 16 | OK |
| `biome check` (assist) | 11 avisos `organizeImports` (P4; padrão do repo, não bloqueia) |
| Repro vitest descartável (não commitado) | `orchestrationApi.getOverview` com shape real do controller → **THROW "Resposta inválida da orquestração comercial."** (P1 abaixo); `organizationModulesApi.get` → unwrap OK |
| e2e/visual | não executado (sem backend); `visual-audit.spec.ts` (/app/forecast, /app/metas) deve mudar snapshot — esperado |

## 4. Spot-checks
- **Settings (falso salvo):** `handleSave`/`saveStatus`/"Configurações salvas com sucesso!" removidos; `rg` sem ocorrências restantes em settings/onboarding/orquestração/previsibilidade. Botão "Salvar indisponível" `disabled` com `aria-label`/`title`; banner "Pré-visualização — nada é salvo"; latências/"Conectado" fixos removidos. ✅
- **Setup/org-modules:** loop de POSTs → `PUT {modules}` + `POST onboarding/complete`; erros de carga/save visíveis (`role=alert`) em vez de `console.error`; 404/403/409 traduzidos. `isPendingOnboarding = configured && !onboardingCompleted`; falha aberta em erro (sem redirect, módulos liberados). ✅
- **Copiloto IA:** rota `copiloto_ia` → `CopilotoIaHub` (arquivo existe em `src/features/copiloto-ia/components/`); Elite Agent mantido em `intelligence/elite-agent`. ✅
- **Previsibilidade:** nenhum `R$`/valor numérico fixo remanescente em Forecast/Metas/PipelinePonderado; "Sem dados" + aviso + empty states. ✅
- **Orquestração:** KPIs fixos removidos, `fallbackOverview` removido, botões "Novo …" desabilitados, `DemoBadge`/empty states. Honesto na UI ✅ — porém o caminho de dados reais está quebrado (P1).

## 5. Achados

### P1 — Orquestração nunca exibe dados da API (cliente quebra no envelope)
`src/lib/api.ts` (`apiFetch`) já desembrulha `{ success, data }` → retorna `data` (ou `{ data, meta }` se houver `meta` top-level). `orchestration.api.ts#getOverview` faz `api.get<{success,data}>` e depois exige `res.success && res.data` — campos que **não existem após o unwrap**. O controller atual (`SalesOrchestrationController.getOverview`) responde `{ success: true, data: overview }` → o cliente sempre lança `SalesOrchestrationApiError("Resposta inválida…")` e os 4 hubs (Playbooks/Jornadas/Processos/Roteiros) ficam sempre em "Dados indisponíveis". O ramo `meta.source` de `useOrchestrationOverview` é inalcançável, inclusive com o contrato do #696 (com `meta` top-level, `apiFetch` devolve `{data, meta}`, ainda sem `success`).
Reproduzido por teste vitest descartável (fetch mockado com o shape do controller).
**Correção esperada (02):** consumir o valor já desembrulhado (`const overview = await api.get<SalesOrchestrationOverview>(…)`; se #696 usar `meta` top-level, aceitar `{data, meta}` e mesclar `meta`), validar presença de `kpis`/`playbooks`, e adicionar teste unitário do cliente cobrindo os dois shapes. Alinhar com o contrato final do #696.

### P2 — nenhum

### P3
- P3-1: `isPendingOnboarding = configured && !onboardingCompleted` significa que org nova (`configured:false`) nunca é levada ao `/setup` automaticamente. Decisão consciente (evita jogar ADMINs antigos no setup) e não é regressão (antes era stub `false`), mas precisa ser confirmada por produto/01.
- P3-2: Sem testes unitários novos para `useOrganizationModules`, `organizationModules.api`, `useOrchestrationOverview`/`formatMetric`.
- P3-3: Run declara `tsc --noEmit` exit 0; no main atual há 1 erro (KpiCard, fora do escopo). Atualizar a evidência.

### P4
- `organizeImports` (biome assist) em 11 arquivos; cast `null as unknown as number` em `useOrchestrationOverview` (tipos de `JornadaEtapa`/`RoteiroItem` deveriam aceitar `number | null`).

## 6. Tenancy / LGPD
Somente frontend. Nenhuma query/rota de servidor alterada; `/api/sales-orchestration` segue com `authenticateToken, requireTenant`; `/api/organization-modules` depende do 01 (tenancy/RBAC a auditar na entrega do 01). Sem PII nova, sem logs de dados pessoais. **N/A para esta entrega.**

## 7. Veredito
**REPROVADO no SHA `4992f36da1703bb0db62778bb6f4f15f4bfd8966` — merge bloqueado enquanto o P1 existir.**

Avaliação parcial (não autoriza merge isolado): settings (falso salvo), setup/org-modules client, rota `copiloto_ia` → `CopilotoIaHub` e previsibilidade sem R$ fixo estão **conformes** em código/escopo. A orquestração remove o fake data, mas o cliente não consome a API real.

Para reabrir: novo commit corrigindo o P1 + teste do cliente; o 24 refaz o parecer no novo SHA. Fora deste parecer: GA visual/e2e, contrato do #696/#697 (Agente 04), API org-modules (Agente 01), erro KpiCard (dono de ui/**).
