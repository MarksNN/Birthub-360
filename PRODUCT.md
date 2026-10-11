# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Operadores comerciais (SDR/closers) e gestores/founders no dia a dia Operate (dashboard autenticado). Precisam de densidade executiva, scan rápido de estado e próxima ação clara — não de landing marketing.

## Product Purpose

Birth Hub 360° é a central inteligente que conecta dados, inteligência, decisões e execução comercial (CRM, prospecção, integrações Bitrix, analytics, automações). Sucesso = operar o pipeline e a inteligência com confiança, velocidade de leitura e consistência visual em light e dark.

## Positioning

Ferramenta operacional SaaS premium de uso recorrente (“command center”), não template genérico. Marca única Birth Hub 360° (Antique Gold `#D4AF37` e tokens semânticos do Design System). Distinção por tenant/origem de dado (quando existir) não confundir com identidade de marca.

## Constraints

- Repo canônico: MaarkssN/Birthub-360.
- Redesign visual light+dark autorizado pelo Coordenador 00 (exceção de freeze): escopo `src/components/ui/**`, `src/styles/**`, e import CSS mínimo em `main.tsx` se necessário.
- Sem feature de produto nova nesta onda.
- Proibido sem handoff: `App.tsx`, Sidebar/navegação (02); `identidade-visual/**` (11); `voice-hub/**` (12); PredictiveScoringNbaCard* (00); arquivos do PR #689; `prisma/**`; workflows/Docker (08).
- `package.json`/lockfile: deps novas só com aprovação explícita do 00.
- Acessibilidade: WCAG 2.2 AA como piso; teclado, foco, contraste, `prefers-reduced-motion`.
- Tipografia de produto (Constituição): Sora (títulos/labels) + Inter (UI/corpo), self-hosted quando possível.
- Referência de inspiração Operate: https://vancouverplus-template.modulify.website/ — hierarquia clara, cards, tipografia moderna; **não** copiar só dark; entregar light e dark.
- Base de tokens a11y: branch/PR #692 (`agente/03-audit-a11y-ui`).

## Voice and brand commitments

- Tom: premium, executivo, tecnológico, preciso.
- Não distorcer logotipo; consumir abstrações em `src/components/brand/`.
- Cores de produto via tokens semânticos (`src/styles/globals.css` / tema vigente), não hex ad hoc quando existir token.
