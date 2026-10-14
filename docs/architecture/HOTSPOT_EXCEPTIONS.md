# Exceções de hotspot (arquivo excessivamente grande) — ITEM-13

Este arquivo é a contraparte legível-por-humano do gate rodado por
`scripts/architecture/check-hotspots.ts` (`npm run check:hotspots`), seguindo o mesmo padrão já
usado neste repositório para waiver de dívida técnica (`docs/security/AUDIT_WAIVERS.md` +
`scripts/security/check-audit-waivers.ts`): uma exceção só existe se estiver registrada aqui, com
dono e prazo — nunca só como comentário solto no código ou supressão silenciosa no script.

## Regra

`scripts/architecture/check-hotspots.ts` varre `src/**/*.{ts,tsx}`, `server.ts` e `worker.ts`
(excluindo testes, `.d.ts`, `dist/`, `build/`, `android/`, `ios/`) e classifica cada arquivo por
contagem de linhas:

- **≤ 700 linhas:** OK, sem aviso.
- **701–1000 linhas:** aviso não-bloqueante (`WARN`) — sinaliza um arquivo grande, não quebra o
  gate. Hoje (2026-08-25, na branch com ITEM-07/08/09 mergeados) existem alguns arquivos nessa
  faixa — são dívida pré-existente sinalizada, não uma regressão introduzida por este item.
- **> 1000 linhas:** falha o gate (`exit 1`), a menos que o arquivo tenha uma exceção ativa **e**
  não-expirada nesta seção cobrindo um limite igual ou maior ao tamanho atual do arquivo.

`1000` foi escolhido porque é o primeiro múltiplo redondo acima do maior arquivo real do
repositório no momento em que este gate foi criado (`src/features/integrations/components/
BitrixImportPanel.tsx`, 960 linhas) — alto o suficiente para não bloquear nenhum arquivo existente
sem exceção, baixo o suficiente para pegar um hotspot novo crescendo sem controle logo depois de
nascer.

## Formato de uma exceção nova

`scripts/architecture/check-hotspots.ts` só lê blocos `### \`caminho\`` de dentro da seção
"## Exceções ativas" abaixo — copie o bloco a seguir para lá ao adicionar uma exceção nova (não
deixe o bloco de exemplo aqui nesta seção, ele não é uma exceção real e é ignorado pelo parser de
propósito por estar fora de "## Exceções ativas"):

```
### `caminho/relativo/do/arquivo.ts`

- **Limite excepcional:** N linhas (o tamanho até onde o arquivo pode crescer sem quebrar o gate)
- **Dono:** Agente NN — Nome do agente (ou pessoa, se fora do roster de agentes)
- **Motivo:** por que o arquivo precisa ficar acima do limite padrão agora, e por que não é
  possível/desejável modularizar imediatamente
- **Registrado em:** YYYY-MM-DD
- **Reavaliar até:** YYYY-MM-DD (obrigatório — uma exceção sem esta data, ou com uma data já
  vencida, faz o gate falhar mesmo que o arquivo esteja coberto pelo limite excepcional)
```

## Exceções ativas

### `src/features/auth/components/LandingLoginSplitScreen.tsx`

- **Limite excepcional:** 1100 linhas
- **Dono:** Marks-Mah (autor das alterações visuais recentes; fora do roster de agentes)
- **Motivo:** a tela de login/landing reúne a composição visual e as animações da experiência institucional. As alterações visuais recentes elevaram o arquivo a 1082 linhas, bloqueando o gate. A exceção permite manter o deploy desbloqueado enquanto a extração dos blocos visuais para componentes próprios é planejada, sem elevar o limite padrão do repositório.
- **Registrado em:** 2026-09-30
- **Reavaliar até:** 2026-11-30

### `src/features/landing/pages/Landing360.tsx`

- **Limite excepcional:** 1900 linhas
- **Dono:** Marks-Mah
- **Motivo:** Nova landing page 360 integrada ao portal comercial e vitrine visual; pendente de modularização de seções.
- **Registrado em:** 2026-10-07
- **Reavaliar até:** 2026-11-30

### `src/features/integrations/bitrix/service/extraction.ts`

- **Limite excepcional:** 1100 linhas
- **Dono:** Agente 06A — Extrações Bitrix
- **Motivo:** Motor de extração incremental e paginação com streaming de dados Bitrix24.
- **Registrado em:** 2026-10-08
- **Reavaliar até:** 2026-11-30

### `src/features/crm360/infra/PrismaCrm360Repository.ts`

- **Limite excepcional:** 1210 linhas
- **Dono:** Agente 17 — Cadência Multicanal e Ciclo de Receita
- **Motivo:** achado ACH-17-08 (auditoria multiagente) — `updateDocumentStatus` marcava uma
  proposta como "Pago" sem passar pelo `dealClosureGate`, deixando o fechamento de negócio
  dependente 100% da mudança manual de estágio no Kanban. A correção (gate de fechamento de
  negócio + propagação de `actorUserId` pela cadeia de chamada, mesmo padrão já usado pelo
  ACH-17-01 para o caminho de assinatura) levou o arquivo de ~1000 para 1028 linhas — crescimento
  de lógica de negócio real, não bloat. **Onda 5 (2026-09-13), BILLING-003:** reconciliação real
  Fatura x Stripe (`reconcileFaturaStripePayment`) antes de marcar "Pago" — mesma classe de
  correção financeira real do ACH-17-08 original — levou o arquivo a 1178 linhas; a injeção de
  `StripeChargePort` via construtor (fix de `no-cross-feature-imports`) soma mais algumas linhas
  de infraestrutura. Modularizar (extrair os métodos de propostas/documentos para um repositório
  próprio, separado do resto de `PrismaCrm360Repository`) fica para um item de dívida técnica
  dedicado. A contagem atual chegou a 1203 linhas, 3 acima do teto anterior; o aumento do teto é
  temporário e não substitui a modularização.
- **Registrado em:** 2026-09-12
- **Atualizado em:** 2026-09-13 (Onda 5, BILLING-003)
- **Atualizado em:** 2026-10-14 (exceção temporária para a contagem atual)
- **Reavaliar até:** 2026-11-30 (mesmo checkpoint dos demais itens desta lista)

### `src/features/integrations/components/BitrixImportPanel.tsx`

- **Limite excepcional:** 1300 linhas
- **Dono:** Agente 06 — Integrações e Bitrix
- **Motivo:** mesma situação do `CadenceHub.tsx` acima — já listado como débito conhecido em 960
  linhas (2026-08-25), cresceu para 1193 linhas sem que o gate rodasse de verdade em CI pelo mesmo
  motivo (mascarado por `no-cross-feature-imports` na etapa anterior). Não é regressão de nenhum
  PR específico. Modularizar fica para um item de dívida técnica dedicado.
- **Registrado em:** 2026-08-29
- **Reavaliar até:** 2026-11-30 (mesmo checkpoint do `KNOWN_VIOLATIONS.md`)

### `src/features/integrations/components/Integrations.tsx`

- **Limite excepcional:** 1200 linhas
- **Dono:** Agente 06 — Integrações e Bitrix
- **Motivo:** Exceção criada para liberar o build, arquivo passou das 1000 linhas (1081).
- **Registrado em:** 2026-09-23
- **Reavaliar até:** 2026-11-30 (mesmo checkpoint dos demais itens desta lista)

### `src/features/integrations/components/ExternalCrmPanel.tsx`

- **Limite excepcional:** 1100 linhas
- **Dono:** Agente 06 — Integrações e Bitrix
- **Motivo:** arquivo preexistente com 1077 linhas, acima do limite geral. A extração de
  subcomponentes é uma refatoração de UX/integração independente desta correção de CI e deve ser
  planejada pelo dono do domínio. Exceção temporária para manter o gate executável sem alterar o
  limite geral do repositório.
- **Registrado em:** 2026-10-14
- **Reavaliar até:** 2026-11-30

### `src/features/commercial-intelligence/domain/CommercialIntelligence.ts`

- **Limite excepcional:** 1250 linhas
- **Dono:** maarkss1 (fora do roster de agentes)
- **Motivo:** catálogo só de tipos (`interface`/`type` dos DTOs de Inteligência Comercial), sem
  lógica: passou de 1000 linhas (1193) com forecast auto-calibrado, gargalo de funil, benchmark de
  vendedor, cenário de contratação, atribuição por canal e motivo de perda por IA. Dividir por
  subdomínio (mantendo este arquivo como barrel de re-export) é o caminho certo, mas é uma
  refatoração mecânica ampla que não cabe junto de uma correção de CI.
- **Registrado em:** 2026-09-23
- **Reavaliar até:** 2026-11-30 (mesmo checkpoint dos demais itens desta lista)

### `src/features/prospecting/outbound/server/routes/leads.routes.ts`

- **Limite excepcional:** 1500 linhas
- **Dono:** Agente 05 — Prospecção
- **Motivo:** Modularizado na campanha techdebt-2026-09-29 (extraídos leadSearch.service, formatLead, e sub-routers auth, campaigns, tasks, chat, system, integrations), reduzindo de 3614 para 1368 linhas.
- **Registrado em:** 2026-09-29
- **Reavaliar até:** 2026-11-30

### `src/features/voice-hub/components/design-system/index.tsx`

- **Limite excepcional:** 1200 linhas
- **Dono:** Agente 12 — Voz e Telefonia
- **Motivo:** Catálogo de componentes de design system do Voice Hub. Convertido para re-export canônico na campanha techdebt-2026-09-29 (eliminando 1060 linhas duplicadas).
- **Registrado em:** 2026-09-28
- **Atualizado em:** 2026-09-29 (correção de proprietário)
- **Reavaliar até:** 2026-11-30

### `src/features/voice-hub/pages/Dashboard/Overview.tsx`

- **Limite excepcional:** 1500 linhas
- **Dono:** Agente 06 — Integrações e Telefonia
- **Motivo:** Integração massiva e bruta da aplicação satélite Voice Hub na onda 13.
- **Registrado em:** 2026-09-24
- **Reavaliar até:** 2026-11-30

### `src/features/auth/components/NewLoginScreen.tsx`

- **Limite excepcional:** 2100 linhas
- **Dono:** Agente 02 — Produto e UX
- **Motivo:** Arquivo refatorado mas acabou cruzando o limite de falha; necessita planejamento de componentização e limpeza de lógica visual.
- **Registrado em:** 2026-10-03
- **Reavaliar até:** 2026-11-30

### `src/features/intelligence/routes/intelligence.routes.ts`

- **Limite excepcional:** 1100 linhas
- **Dono:** Agente 07 — IA e Automações
- **Motivo:** O arquivo superou o limite de 1000 linhas devido à adição contínua de rotas e integrações de IA, precisará ser fatiado em sub-rotas por domínio (agents, swarms, automations).
- **Registrado em:** 2026-10-03
- **Reavaliar até:** 2026-11-30

### `src/features/market-intelligence/server/marketIntelligenceCompany.service.ts`

- **Limite excepcional:** 1020 linhas
- **Dono:** Agente 13 — Enxame Autônomo e Governança de Agentes de Runtime (proprietário de
  LDR/Market Intelligence, Onda 43)
- **Motivo:** a formatação de linhas longas no PR #741 elevou a contagem de 994 para 1016 linhas,
  sem mudança funcional. A exceção mantém a formatação verificada e registra a modularização do
  serviço como trabalho posterior do dono do domínio.
- **Registrado em:** 2026-10-14
- **Reavaliar até:** 2026-11-30

### `src/features/voice-hub/store/useStudioStore.ts`

- **Limite excepcional:** 1150 linhas
- **Dono:** Agente 12 — Voz e Telefonia
- **Motivo:** Modularizado na campanha techdebt-2026-09-29 (extraídos studioTypes.ts, nodeRegistry.ts e initialData.ts), reduzindo de 1744 para 1084 linhas. Arquivo voltou a 1103 linhas (acima do teto 1100); bump temporário 1150 para desbloquear CI (#695/#692). Agente 12 deve re-modularizar ou confirmar teto.
- **Registrado em:** 2026-09-29
- **Atualizado em:** 2026-10-11 (Agente 08 — QA Release e Git)
- **Reavaliar até:** 2026-11-30

### `src/lib/voice-hub/services/workflowRuntimeService.ts`

- **Limite excepcional:** 1500 linhas
- **Dono:** Agente 06 — Integrações e Telefonia
- **Motivo:** Integração massiva e bruta da aplicação satélite Voice Hub na onda 13.
- **Registrado em:** 2026-09-24
- **Reavaliar até:** 2026-11-30

### `src/components/CrmBoard.tsx`

- **Limite excepcional:** 1100 linhas
- **Dono:** Agente 02 — Produto e UX
- **Motivo:** Cruzou o limite de 1000 linhas (1003 linhas) após a modernização visual dos módulos operacionais (PR #729 / Onda F), aplicando tokens semânticos e estados de foco acessíveis WCAG AA. Exceção registrada para manter o pipeline liberado enquanto se planeja a extração de subcomponentes do pipeline e toolbar.
- **Registrado em:** 2026-10-11
- **Reavaliar até:** 2026-11-30

## Débito conhecido, abaixo do limite de falha (sem exceção necessária)

Arquivos na faixa de aviso (701–1000 linhas) no momento em que este gate foi criado — não
requerem exceção porque não quebram o gate, só ficam registrados aqui para não serem
"descobertos" de novo como achado novo em uma auditoria futura. `BitrixImportPanel.tsx` e
`CadenceHub.tsx` saíram desta lista em 2026-08-29 por já terem cruzado 1000 linhas — ver
"Exceções ativas" acima.

- `src/features/market-intelligence/server/accountIntelligence.service.ts` (857 linhas)
- `src/features/intelligence/components/SwarmDashboard.tsx` (770 linhas)
- `src/features/crm/components/LeadDetailDrawer.tsx` (726 linhas)
- `src/components/CrmBoard.tsx` (977 linhas, 2026-09-11)

Se qualquer um desses cruzar 1000 linhas num PR futuro sem uma exceção registrada acima, o gate
bloqueia normalmente — esta lista é só contexto, não é uma isenção.
