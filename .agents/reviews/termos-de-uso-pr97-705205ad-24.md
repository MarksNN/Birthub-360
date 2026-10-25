# Parecer 24: PR #97 "feat: expand and structure Terms of Use page" @ 705205ad

**Decisão: REPROVADO** @ `705205ad3948920e55beb97325bfe4ebf9150604`

> **Escopo:** este parecer cobre a precisão técnica, a acessibilidade, o design system e o CI. **Não é revisão jurídica.** O melhor desfecho possível para este PR é um APROVADO técnico de **minuta**. A publicação do texto final depende da homologação do DPO/encarregado e do Marcelo.

## Identificação

| Campo | Valor |
|---|---|
| Missão | Auditar a expansão dos Termos de Uso (18 seções, sumário, flag de minuta) quanto a fidelidade ao código, coerência LGPD, a11y, design system e CI |
| PR | https://github.com/MarksNN/Birthub-360/pull/97 (OPEN, não draft, `mergeStateStatus=UNSTABLE`) |
| Autor | google-labs-jules[bot] (Jules), a pedido do MarksNN (task Jules 5346515007380573724) |
| Branch | `feature/update-terms-of-use-5346515007380573724` |
| Head | `705205ad3948920e55beb97325bfe4ebf9150604`, 1 commit de 25/10/2026 às 16:28 BRT. Conferido no início e no fim; não mudou |
| Merge-base | `6767729580fda0f333cfb59b66271f5e0bf05c7e`. A main atual é `735b1962a4791e8ba1181683add977f8916c8cf4` (o PR está 7 commits atrás, e nenhum deles toca `src/pages/TermsOfUse.tsx`: o blob é `809bd969` nas duas) |
| Arquivo (único) | `src/pages/TermsOfUse.tsx` +165/−55, blob `d99a922bd915b9812e7d2c2dd0da00abe3e36dbe`, sha256 `1610eb385e4b175257f6449df8e4f1df4ec9f494a279b309b3a7b8c57dcf1e03` |
| CI | Release run 40226215426 (evento `pull_request`, merge efêmero `21505ad2`), application gate job 121268157152, SonarQube job 121268033999 |

Se o blob mudar, este parecer deixa de valer (AGENTS.md §40).

## Critérios

1. O head e o diff batem com a descrição. O escopo toca só a página.
2. A flag "MINUTA SUJEITA À HOMOLOGAÇÃO JURÍDICA" fica visível e legível.
3. O texto não promete nada que a main não entregue: garantia, SLA, uptime, retenção, cifra, mascaramento de IA ou expurgo. Os pontos do parecer #87 (`ca64f691`) foram cruzados um a um. O texto também precisa ser coerente com `src/pages/PrivacyPolicy.tsx`, com `docs/legal/TERMOS_DE_USO_IA.md` e com os documentos LGPD, e não pode trazer fatos inventados nem um agente de IA como DPO.
4. Acessibilidade: um único h1 e ordem de headings correta, nav com aria-label e lista, âncoras iguais aos ids, links descritivos, sem cor fixa.
5. Design system: só tokens e classes que existem em `src/styles/globals.css` (Tailwind v4 `@theme`), sem hex, rgb ou inline style. Claro e escuro.
6. Há teste da página e ele passa.
7. CI sem regressão frente à main (C3): lint, format, tsc, trivy, Visual Regression, bundle budget e Unit.

## Comandos (só leitura, sem checkout, worktree ou npm ci)

```
git fetch origin main pull/97/head:pr/97 ; git merge-base origin/main pr/97
git diff --stat origin/main...pr/97 ; git log 67677295..origin/main -- src/pages/TermsOfUse.tsx
git show pr/97:src/pages/TermsOfUse.tsx ; git show origin/main:{src/pages/TermsOfUse.tsx,src/pages/PrivacyPolicy.tsx,src/styles/globals.css,tests/unit/features/smoke.test.tsx,tests/e2e/accessibility.spec.ts,visual-regression/visual.spec.ts,playwright.config.ts,docs/legal/TERMOS_DE_USO_IA.md,docs/deploy/producao.md,src/lib/analytics/posthog-client.ts,src/shared/services/aiPiiConsent.service.ts}
git show ca64f691:.agents/reviews/lgpd-policies-pr87-638677ce-24.md
gh pr view 97 --json headRefOid,isDraft,mergeStateStatus,files,body ; gh pr checks 97
gh api repos/MarksNN/Birthub-360/actions/jobs/{121268157152,121268033999}[/logs] --allow-escape-sequences
diff <(FAIL da main C3, job 121250562673) <(FAIL do Sonar #97)
```

## 1. Head, diff e descrição: confere, com uma ressalva

- O diff three-dot `origin/main...pr/97` tem **um arquivo só**, `src/pages/TermsOfUse.tsx` (+165/−55), e `gh pr view --json files` confirma. O two-dot mostra mais arquivos apenas porque a main avançou (#86, #88 e #91 entraram depois). O PR não reverte nada da main, porque nenhum desses 7 commits toca o arquivo.
- A descrição bate com o diff: 18 seções, sumário e flag de minuta. Não se repete o caso do #93.
- **Ressalva:** a frase "Validated the UI layout via Playwright screenshot & video recording" não tem artefato no PR nem no CI. É uma alegação sem evidência (AGENTS.md §30). Ela também é desmentida, na prática, pelos tokens inexistentes da §5: qualquer screenshot mostraria a flag sem cor de alerta.

## 2. Flag de minuta: o texto está presente, mas a cor de alerta não renderiza

- A main **não tinha** a flag. O PR a introduz em `TermsOfUse.tsx:14-16`, dentro do `<header>` e logo abaixo do h1, o que é positivo.
- Ela usa `bg-alert/10 border border-alert/20 text-alert`. **O token `--color-alert` não existe** no `@theme` (`globals.css:614-959`) nem em outro lugar de `src/`, e nenhum outro arquivo usa `text-alert`, `bg-alert` ou `border-alert`. No Tailwind v4, uma utility sem token não gera CSS e não dá erro. O resultado é que a flag aparece como texto em negrito na cor herdada (`text-ink`), sem fundo nem borda de alerta, no claro e no escuro. Continua legível, mas não se destaca como aviso.
- Correção: usar um token existente, como `bg-warn/10 border-warn/20 text-warn-active` (ou o par `warning`), com contraste conferido nos dois temas, ou reaproveitar um componente de alerta do DS. Também vale incluir `role="note"` ou um texto auxiliar.

## 3. Conteúdo jurídico frente ao código (cruzamento com o #87)

### P1: promessas que a main não entrega (bloqueiam)

- **P1-1. IA, não-treinamento e PII (#87 P1-1, repetido e agravado).** `:98` diz "Não utilizamos dados pessoais de nossos clientes para treinar modelos fundacionais abertos, **garantindo isolamento através de nossa arquitetura RAG (Vector Database)**", e `:105` diz "Realizamos sanitização de PII". O código mostra outra coisa:
  - `src/shared/services/aiPiiConsent.service.ts:27-31` documenta que nome, e-mail, telefone e transcrição **são enviados** a Groq, OpenAI e LiteLLM quando a organização está em `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS`;
  - `piiTokenizer` só cobre CPF, CNPJ, telefone e e-mail por regex;
  - o não-treinamento depende do contrato com cada provedor, e o repositório não tem nada que o comprove;
  - RAG ou vector DB não "garante isolamento" contra treinamento, porque são coisas diferentes.

  A frase da main em `PrivacyPolicy.tsx:48-52` e `docs/legal/TERMOS_DE_USO_IA.md` §1.3 ("Todas as chamadas de inferência passam por tokenização prévia") carregam o mesmo vício, que é PRÉ-EXISTENTE. O PR o propaga e o transforma em garantia.
- **P1-2. Cookies "estritamente" de sessão.** `:112` diz "Utilizamos cookies [...] **estritamente** para manter a sessão". Só que `src/main.tsx:7,10` chama `initPostHogClient()`, e `src/lib/analytics/posthog-client.ts:4-9` inicializa o PostHog com a persistência padrão (cookie e localStorage `ph_*`, envio a `app.posthog.com`, fora do Brasil) sempre que `VITE_POSTHOG_KEY` está definida. O código prevê cookies de analytics, então "estritamente" é falso nesse caso. Ou se declara o analytics (com base legal e opção de opt-out), ou se condiciona a frase, com decisão do DPO.
- **P1-3. Infraestrutura inexata.** `:133` diz "alta disponibilidade [...] por meio de arquitetura moderna (Kubernetes, Postgres, Redis)". Pelo `docs/deploy/producao.md:186-195`, a produção roda no Render. Kubernetes/Helm/ArgoCD é um "caminho alternativo [...] não é usado pelo Render", e o Redis fica "desligado por padrão (`REDIS_URL` vazia)". O texto atribui a disponibilidade a componentes que não estão em produção.
- **P1-4. Decisões automatizadas sem lastro e contraditórias.** `:98` diz "Todas as decisões críticas [...] exigem supervisão humana (Human-in-the-Loop). A IA atua como recomendador consultivo." O `PRODUCT.md:15` diz o contrário: a plataforma "conecta dados, **decisões automatizadas** e cadências ativas". Na main também há um worker que anonimiza leads automaticamente em 90 dias (`autoAnonymizeDisqualified.worker.ts`), scoring e qualificação por agente, e o enxame autônomo (scheduler → CRM → ledger). Ou o texto lista quais decisões têm HITL e com qual mecanismo, ou isso fica como pendência ligada ao art. 20 (#87 P2-3).

### P2: imprecisões ou absolutos que pedem redação ou decisão do DPO

- **P2-1. Segurança absoluta (#87 P2-1 e P2-4).** `:119` usa "criptografia" de forma genérica e diz que dados estão "**blindadas** na arquitetura". A cifra existe só por coluna (AES-256-GCM em `Contact.email/phone/whatsapp` e em credenciais). A RLS é real, mas há uma allowlist de bypass (`BYPASS_RLS_ALLOWED_MODELS`), e ainda não há evidência de que o runtime de produção use `prospector_app` (ADR-006:62). O texto deve descrever as medidas sem garantir resultado.
- **P2-2. Titularidade e licenciante mudaram sem base.** Na main, `TermsOfUse.tsx` diz que o sistema é "licenciado para Birthub 360º" e que os direitos "pertencem à Birthub 360º". O PR troca isso por "licenciado para uso corporativo" (`:47`) e atribui a propriedade intelectual "exclusivamente à Birth Hub 360" (`:126`). A grafia vem do branding do #86 e é uma mudança de parte contratual sem decisão registrada. Além disso, a seção "1. Identificação" não identifica ninguém: falta razão social, CNPJ e endereço (art. 9º, III). O certo é colocar um placeholder explícito `[A DEFINIR: DPO/Marcelo]`. Positivo: **nada foi inventado**. Não há CNPJ, endereço ou e-mail novos, nem um agente de IA nomeado como DPO, e `:168` remete ao "e-mail oficial designado no seu contrato" e à Política de Privacidade.
- **P2-3. Controlador e operador.** `:84` coloca nas organizações (tenants) a responsabilidade pela "origem e legitimidade dos dados", o que é coerente com o Birth Hub 360 atuar como **operador** dos leads (#87 P2-2). Já `PrivacyPolicy.tsx:17-19` e `TERMOS_DE_USO_IA.md:4` ("Controlador: Birth Hub 360") apontam o Birth Hub como controlador. São duas qualificações para o mesmo dado, e a decisão é do DPO.
- **P2-4. Suboperadores e transferência internacional.** `:91` cita só Bitrix24, 3CX e "outros provedores". Ficam de fora os provedores de IA e voz (Groq, OpenAI, Gemini, OpenRouter, LiteLLM, Bland AI, LiveKit), analytics (PostHog) e enriquecimento (Apollo, Hunter, Serper, Tavily) (#87 P1-1, omissão). A remissão à Política de Privacidade não resolve, porque `PrivacyPolicy.tsx:44-53` também não lista nomes nem fala de transferência internacional.
- **P2-5. Limitação de responsabilidade.** `:140` diz "no estado em que se encontra", e `:147` permite suspensão "imediata". Isso pede revisão jurídica, inclusive sobre aplicabilidade e o CDC quando o usuário final não é empresa. Não há SLA numérico, uptime ou certificação inventados, o que é positivo.
- **P2-6. Foro e lei aplicável.** "Comarca de Ribeirão Preto - SP" (`:161`) é o mesmo foro da main. Lei brasileira, Marco Civil e LGPD estão coerentes. Ainda assim, o foro precisa da confirmação do DPO/Marcelo.

### P3: menores

- **P3-1.** "Última atualização: 25 de Setembro de 2026" (`:12`) ficou igual, embora o conteúdo tenha mudado. Num texto não homologado, o melhor é "Minuta de 25/10/2026, pendente de homologação", sem data de vigência.
- **P3-2.** Jargão interno num texto jurídico: "(zero mock)" (`:77`), "Dados em Movimento" e "Module Access" (`:56`, `:70`).
- **P3-3.** `:98` cita "nossos Termos de IA Responsável", mas não há link (o documento é `docs/legal/TERMOS_DE_USO_IA.md`, sem rota pública).

## 4. Acessibilidade e semântica

| Item | Resultado |
|---|---|
| Um único h1 | OK (`:8`) |
| Ordem dos headings | OK: h1, depois h2 "Sumário", depois 18 h2 de seção. Não há h3 nem salto de nível |
| Sumário | OK: `<nav aria-label="Sumário">` com `<ul>/<li>` |
| Âncoras e ids | OK: os 18 `href="#..."` são iguais aos 18 `section id` (diff programático vazio) |
| Texto dos links | OK: os textos são descritivos, e "Política de Privacidade" aponta para `/privacy` |
| Landmark | `<main>` foi introduzido dentro da página, o que é aceitável porque `/terms` fica fora do MainLayout e não há outro `<main>` em `App.tsx`/`main.tsx`. Mas o `vancouver-card` passou a ser o `<main>`. Ressalva menor |
| Foco e skip link | Os links do sumário só têm estilo de `hover:`. Falta `focus-visible:` próprio, e a página depende do outline global. Não há skip link, o que não pesa numa página única com sumário no topo. Também não há `scroll-margin-top` para os alvos |
| Cores fixas | Não há hex, rgb nem `style=` (grep vazio) |
| Contraste | `text-primary` = `--brand-text` (no claro, `color-mix(#00d4ff 53%, black)`, cerca de 5,7:1 sobre branco; no escuro, `#00d4ff` sobre `#14141a`). `#0284c7` não é usado. Não há axe para a página, então nada disso foi verificado em navegador |

## 5. Design system, claro e escuro

- **Tokens inexistentes (P1, porque quebram a flag obrigatória):** `bg-alert/10`, `border-alert/20` e `text-alert` (`:14`), além de `bg-bg-surface` (`:19`). Nenhum deles existe no `@theme`, cuja lista completa de `--color-*` não tem `alert` nem `bg-surface`, e nenhum é usado em outro ponto de `src/`. O Tailwind v4 descarta essas classes sem aviso. A flag fica sem cor de alerta e o sumário fica sem superfície. Os tokens corretos já existem: `bg-surface-2` ou `bg-surface-subtle` (veja `CrmBoard.tsx:725,847`), `border-line` e `warn`/`warning`.
- `border-border` resolve (`--color-border: var(--line)`). Também resolvem `text-ink`, `text-ink-2`, `bg-bg`, `vancouver-card`, `vancouver-gradient-text` e `font-display`.
- Não há inline style nem cor fixa, então o modo escuro não quebra por esse caminho.

## 6. Testes: há regressão

- A única cobertura da página é `tests/unit/features/smoke.test.tsx:20-23`, que renderiza `<TermsOfUse />` **sem Router**. Na main isso passa (5/5, job 121250562673).
- O PR importa `Link` de `react-router-dom` (`:1`, `:105`) e **quebra esse teste**. Medido no SonarQube "Run Tests with Coverage" do head (job 121268033999): `FAIL tests/unit/features/smoke.test.tsx > ... > renders TermsOfUse without crashing`, `TypeError: Cannot destructure property 'basename' of 'React10.useContext(...)' as it is null` em `LinkWithRef` (react-router). O resultado foi "Tests 4 failed | 5110 passed". Frente à main atual, a diferença é exatamente esse teste a mais. As 3 falhas de `gateway` e a suíte `AgentExecutor` já existiam, e a do `Sidebar` sumiu porque o #86 já está na main.
- Não há snapshot, `/terms` está ausente de `tests/e2e/accessibility.spec.ts` (axe) e de `visual-regression/visual.spec.ts`, e `visual-audit.spec.ts` é ignorado pelo `playwright.config.ts:17`. **Não há cobertura E2E nem axe para /terms.**

## 7. CI no head (consultado por volta de 16:40 BRT)

| Check | Resultado | Leitura |
|---|---|---|
| Trivy (gate de PR e Central), secret scan, dependency review, CodeQL js/ts e python | success | — |
| Frontend bundle budget | success | — |
| Visual Regression | success | Não cobre /terms, portanto não é evidência para esta página |
| application gate, step 9 Lint | success | 673 warnings e 13 infos, idêntico ao baseline C3 (0 erros) |
| application gate, **step 10 "Run Prettier check"** (`biome format src`) | **failure, NOVA** | "Found 1 error", com o único arquivo sendo `src/pages/TermsOfUse.tsx` (58 linhas acima de `lineWidth` 100). Na main esse step passa |
| application gate, steps 11 a 25 (Type Check, Unit, E2E…) | skipped | NÃO EXECUTADOS. O gate parou **antes** do Type Check herdado, então tsc não foi medido |
| SonarQube | failure em "Run Tests with Coverage" | Inclui a falha **nova** do smoke TermsOfUse (§6). O scan foi pulado |
| build (Consolidar veredito) | failure | Consequência do gate |

**O que um diag no estilo v4e precisaria mostrar depois da correção:** o `biome format` verde no step 10 e, com `continue-on-error` a partir do Type Check, as mesmas 99 linhas `error TS` (md5 `c2b7ca26`, sem erro novo em `TermsOfUse.tsx`). Também precisaria do Unit igual ao baseline da main atual (só `AgentExecutor` e gateway×3, com o smoke TermsOfUse verde) e do E2E com a mesma lista de 33 falhas herdadas de color-contrast `#0284c7` e nenhuma nova. Como hoje não há E2E nem axe de /terms, o ideal é o PR **acrescentar** `/terms` ao `accessibility.spec.ts` e mostrar 0 violações novas.

## O que o autor precisa fazer (novo head)

1. Rodar `npx biome format --write src/pages/TermsOfUse.tsx`.
2. Fazer o smoke test voltar a passar. Uma opção é envolver o render em `<MemoryRouter>` no `smoke.test.tsx`, igual aos outros casos do arquivo. Esse caminho exige alterar o teste, e a mudança deve constar da descrição do PR. A outra é trocar `Link` por `<a href="/privacy">`.
3. Trocar os tokens inexistentes por tokens do DS: `bg-alert`, `border-alert` e `text-alert` por `warn`/`warning` (com contraste conferido no claro e no escuro), e `bg-bg-surface` por `bg-surface-2` ou `bg-surface-subtle`. Acrescentar `focus-visible:` aos links do sumário.
4. Reescrever ou marcar como `[PENDENTE: DPO]` os pontos P1-1 a P1-4 e P2-1 a P2-4:
   - tirar a garantia RAG/não-treinamento e a "sanitização de PII" absoluta;
   - declarar ou condicionar o PostHog;
   - tirar Kubernetes e Redis;
   - qualificar o HITL;
   - colocar placeholders de identificação (razão social, CNPJ, endereço);
   - restaurar ou justificar o licenciante e o titular da PI;
   - remeter à lista de suboperadores.
5. Acrescentar `/terms` ao `tests/e2e/accessibility.spec.ts` e anexar um artefato real em vez da alegação "validated via Playwright".
6. Opcional: rebase sobre `735b1962`. Não há conflito, mas isso deixa o merge-base atual.

## Para o Agente 21 (Privacidade/LGPD)

- `docs/legal/TERMOS_DE_USO_IA.md` §1.3 ("Todas as chamadas de inferência passam por tokenização prévia") e `PrivacyPolicy.tsx:48-52` (não-treinamento) são PRÉ-EXISTENTES e contradizem `aiPiiConsent.service.ts`. A fonte do vício que o PR propagou está ali, e a correção deve ser feita na origem.
- Falta a lista única de suboperadores, incluindo PostHog e os provedores de IA e voz, com a indicação de transferência internacional. As três páginas (Termos, Privacidade e IA) devem remeter a ela.
- É preciso definir quais decisões têm HITL de fato. O `PRODUCT.md` fala em "decisões automatizadas" (art. 20).

## Para o DPO/Marcelo (decisão humana)

- Definir a parte contratual: "Birthub 360º" (main) ou "Birth Hub 360" (PR), com razão social, CNPJ e endereço, e o titular da PI.
- Qualificar o Birth Hub como controlador ou operador dos leads. Hoje os Termos dizem operador e a Política e os Termos de IA dizem controlador.
- Confirmar o foro de Ribeirão Preto/SP, a cláusula "no estado em que se encontra", a suspensão imediata e o canal de contato ("e-mail designado no contrato", ou um e-mail público).
- Decidir sobre o PostHog: base legal, banner e opt-out.
- O encarregado continua sendo `marcelo.nascimento@birthub360.com` em `PrivacyPolicy.tsx:69`, uma pessoa real, o que está correto. O PR não nomeia nenhum agente como DPO.

## Decisão

**REPROVADO** @ `705205ad`, por cinco motivos:

1. Regride o CI: falha nova de `biome format` no único arquivo do PR, e falha nova do smoke unit `renders TermsOfUse without crashing` por causa do `Link` sem Router.
2. A flag obrigatória de minuta e o sumário usam tokens que não existem no DS e não renderizam.
3. O texto garante não-treinamento por "arquitetura RAG", sanitização de PII, cookies "estritamente" de sessão, alta disponibilidade via Kubernetes/Redis e HITL universal, e nada disso tem lastro na main.
4. Muda o licenciante e o titular da PI sem decisão registrada.
5. A estrutura de a11y está boa: um h1, nav rotulada, 18 âncoras iguais aos ids, sem cor fixa e sem fato inventado.

Com essas correções, o melhor resultado possível é um **APROVADO técnico de minuta**. A publicação depende da homologação do DPO/Marcelo.
