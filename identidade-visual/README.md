# Identidade visual Birth Hub 360º

Este diretório reúne os documentos oficiais e os artefatos HTML de referência aprovados durante a revisão visual de outubro de 2026.

## Fontes oficiais, em ordem de precedência

1. [Brandbook](BRANDBOOK-OFICIAL-BIRTH-HUB-360.html)
2. [Manual de Identidade Visual](MANUAL-DE-IDENTIDADE-VISUAL.html)
3. [Manual de Identidade do Produto](MANUAL-DE-IDENTIDADE-DO-PRODUTO.html)
4. [Catálogo de Componentes](CATALOGO-DE-COMPONENTES.html)

## Artefatos de referência

- [Landing](birthhub360/BirthHub360_Landing.html)
- [Login](birthhub360/BirthHub360_Login.html)
- [Tokens CSS](birthhub360/tokens/birthhub360.css), [JSON](birthhub360/tokens/birthhub360.json) e [TypeScript](birthhub360/tokens/birthhub360.ts)
- Assets mestres em `birthhub360/logos/`, preservados sem redesenho ou recoloração.

Os HTMLs consomem os assets por caminhos relativos e iniciam em light mode. Para abrir localmente, a partir da raiz do repositório: `python -m http.server 8767`; acesse `/identidade-visual/birthhub360/BirthHub360_Landing.html` ou `/identidade-visual/birthhub360/BirthHub360_Login.html`.

São referências visuais independentes: esta entrega não substitui as telas React, não integra autenticação nem altera o backend. As ações de acesso dos HTMLs permanecem demonstrativas. A Landing usa nomenclatura comercial de capacidades; os nomes formais dos pilares constam no Manual de Produto.

Landing e Login carregam fontes externas; a Landing também usa Tailwind CDN e Lucide. Sua renderização completa requer acesso à rede. Os SVGs mestres ainda contêm cores históricas que diferem dos tokens Neon atuais; foram preservados por determinação do usuário.

Os tokens incluem variantes semânticas de headings para contraste em light mode, derivadas da paleta existente. As classes compartilhadas `bh-card`, `bh-heading` e `bh-kicker`, com `data-accent`, implementam a assinatura de borda completa, título colorido e descrição neutra.
