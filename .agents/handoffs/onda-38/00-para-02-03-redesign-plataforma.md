- De: Agente 00 (Coordenador / Antigravity)
- Para: Agente 02 (Produto e UX) e Agente 03 (Design e Acessibilidade)
- Onda: 38
- Status: em_curso
- Prioridade: alto
- Atualizado: 2026-10-10 (America/Sao_Paulo)

## Problema
O usuário final solicitou redesign da plataforma com a melhor experiência e visual possível (botões, cards, tipografia, alinhamento, hierarquia, microinterações). Direção atual do Marcelo: skill Impeccable + referência Vancouver+ (https://vancouverplus-template.modulify.website/), temas **light e dark** (não só dark). Foco imediato citado: Operate/dashboard.

## Arquivo(s) envolvido(s)
- `identidade-visual/MANUAL_UI_UX_PLATAFORMA.md` (manual base)
- Referência Vancouver+ / tokens Impeccable (Agente 03)
- `src/App.tsx`, Sidebar/navegação (coordenar 02↔03)
- CSS/Tailwind e `src/components/ui/**` (dono Agente 03 durante o redesign)
- Componentes compartilhados de layout (handoff 03→02 se shell mudar)

## Papéis agora
1. **Agente 03** — lidera visual: tokens, ui/styles, a11y, Impeccable light+dark; fecha PR a11y em paralelo quando aplicável.
2. **Agente 02** — P0 #693 em curso (settings honestos, orquestração UX, /setup fluxo, copiloto vs Elite); **não** edita `src/components/ui/**` nem `src/styles/**` enquanto o redesign roda. Se App/Sidebar precisar mudar por causa do redesign, 03 abre handoff para 02.
3. **Cartógrafo** — mapa estrutural; fora do redesign visual.

## Alteração necessária (redesign)
1. Agente 03: tokens globais (Tailwind/Impeccable), light+dark, componentes ui.
2. Agente 02: quando liberado, aplicar tokens no shell (Sidebar/Header/modais), whitespace, Audio UI hooks do manual — via handoff do 03.
3. Isolar em branch `agente/03-*` / `agente/02-*`; nunca main; não colidir com #689/#692/#693 P0 funcionais.

## Teste esperado
- Plataforma sobe com light+dark sem quebrar layout/funcional.
- Gate E2E/Playwright não quebra por DOM/classes.
- Agente 24 audita antes de merge.

## Status operacional (2026-10-10)
- Redesign: **em curso** (03 lidera; freeze anterior da onda 38 superado pelo pedido explícito do Marcelo via Juni/00).
- Agente 02: focado nos P0 #693; handoff redesign aguardando coordenação de arquivos do 03.
- Agente 03: atualizar este arquivo com branch/PR de redesign quando abrir.

## Contexto adicional
Sincronia forte 02↔03. Não quebrar funcionalidade. P0 #693 (falso salvo, orquestração, setup, copiloto) seguem em paralelo em branches `agente/02-p0-*`.
