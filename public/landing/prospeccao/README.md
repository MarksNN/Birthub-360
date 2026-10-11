# Assets reais — Prospecção (landing page)

Capturas da plataforma BirthHub 360° **funcionando** (não são mockups), para uso no `Landing360`.

## Contexto da captura

- **Data:** 2026-10-10 (America/Sao_Paulo)
- **Ambiente:** preview local `http://localhost:3024` (usar `localhost`, **não** `127.0.0.1` — o check de origem bloqueia o login em 127.0.0.1)
- **Conta:** demo de preview
- **Rota:** `/app/prospect`

## Honestidade dos dados

- **Radar Discovery (Fontes abertas):** a busca por ICP (Software / SaaS, São Paulo, "saas, software") retornou **0 leads**, porque as consultas pagas (Apollo, Google Places, enriquecimento) estão desligadas no preview. A tela mostra esse estado vazio de forma honesta ("Consultas pagas não autorizadas"). Não há lista de resultados nem fluxo "Salvar no CRM → No CRM" no clipe.
- **Busca Direta (CNPJ/Nome):** CNPJ `19.131.243/0001-97` (Open Knowledge Brasil) retornou **dados reais** — ver `prospect-cnpj-result-light.png`.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `prospect-hub-desktop-light.png` | Hub de prospecção, tema claro (desktop) |
| `prospect-hub-desktop-dark.png` | Hub de prospecção, tema escuro (desktop) |
| `poster-prospect-radar.png` | Poster/frame inicial do clipe (aba Radar Discovery) |
| `prospect-cnpj-result-light.png` | Resultado real da Busca Direta por CNPJ (extra) |
| `prospect-radar-demo.mp4` | Clipe 15 s, H.264, sem áudio, 1280×712, `faststart` |
| `prospect-radar-demo.webm` | Mesmo clipe, VP9, sem áudio, 1280×712 |

## Embed no Landing360

Os arquivos são servidos de `public/`, logo o caminho no componente é `/landing/prospeccao/<arquivo>`:

```tsx
<video autoPlay muted loop playsInline poster="/landing/prospeccao/poster-prospect-radar.png">
  <source src="/landing/prospeccao/prospect-radar-demo.webm" type="video/webm" />
  <source src="/landing/prospeccao/prospect-radar-demo.mp4" type="video/mp4" />
</video>
```

## Ressalvas do vídeo

- A barra do navegador (abas + URL, 88 px) foi **recortada** com ffmpeg (`crop=1280:712:0:88`); originais 1280×800 mantidos fora do repo.
- A **borda direita está cortada**: a gravação foi feita numa janela de 1280 px e o conteúdo da página excede essa largura (aba "Ferramentas" e textos dos resultados truncados). Não dá para recuperar por recorte — para corrigir, regravar com viewport ≥ 1440 px.
- O cursor do mouse aparece no clipe.
- O poster PNG pode ainda conter a barra do navegador se foi extraído do vídeo original.
