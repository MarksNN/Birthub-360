De: 00 — Coordenador
Para: 11 — Marca e Ativos Institucionais
Onda: onda-dividas-20261014
Status: aberto
Prioridade: normal
Bloqueador-ref: DEBT-20261014-UX-006
Sprint destino: Saneamento Onda 04

## Problema
Dependência de Marca/Assets: Ícones e atalhos declarados no manifesto PWA não estão presentes na pasta public/.

## Arquivo(s) envolvido(s)
public/icons/
vite.config.ts:30-40

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
O manifesto PWA configurado no Vite referencia ícones pwa-192x192.png, pwa-512x512.png e atalhos que retornam 404 em ambiente de produção.

## Alteração necessária
Produzir e disponibilizar na pasta public/icons/ os ativos gráficos oficiais do Birth Hub 360° com as dimensões, transparências e propriedades maskable requeridas pela especificação W3C.

## Teste esperado
Verificação automatizada checa existência física e dimensões dos arquivos referenciados em vite.config.ts (manifest.icons e manifest.shortcuts).
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Ativos institucionais e identidade visual são de propriedade do Agente 11. Handoff desbloqueia DEBT-20261014-UX-006 (Agente 09).
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.
