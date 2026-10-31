# 14 → 00/08 — estabilização e baselines visuais Linux

De: 14 — Ambiente de Execução e Test Harness
Para: 00 — Coordenação; 08 — QA e Release
Onda: main-ci-recovery-20261027
Status: em-andamento
Prioridade: bloqueador
Bloqueador-ref: suíte Visual Regression sem referências; 88 falhas nos PRs 118/119
Sprint destino: missão atual

## Problema e evidências

Base examinada: `6a00acd1094ea0d7185a096c24eb474aad5a008d`.
Branch isolada: `agente/14-visual-ci-recovery-20261027`.

- `git ls-files visual-regression/baselines` retorna zero imagens. Os 88 casos são
  11 superfícies × 2 temas × 4 viewports da suíte `visual-regression/visual.spec.ts`.
- Os dez PNGs de `tests/e2e/visual.spec.ts-snapshots/` pertencem a outra suíte,
  com outros nomes e viewport. Não corrigem a ausência das 88 referências.
- O log do [job `121931574197` do PR 118](https://github.com/MarksNN/Birthub-360/actions/runs/40425933418/job/121931574197)
  informa screenshot instável, depois referência ausente
  `visual-regression/baselines/visual.spec.ts/dashboard-light-desktop.png`, e encerra com `88 failed`.
  O identificador de job e a mensagem foram lidos diretamente pelo conector.
- `setupDeterministicState()` aguardava `document.fonts.ready` antes do primeiro
  `page.goto()`, portanto aguardava apenas o documento vazio, não as fontes do aplicativo.
- O topbar e o calendário utilizam `Date` do navegador. Referências capturadas em outro dia/minuto
  difeririam mesmo sem alteração do produto.
- O job manual em `ci.yml` procurava `*-chromium-linux.png`, enquanto a suíte visual dedicada
  gerava `*-desktop.png`, `*-laptop.png`, `*-tablet.png` e `*-mobile.png`.
  Handoff comunicado ao 08 para corrigir o glob e alinhar os serviços da geração/verificação.

## Implementado

- Helper `visual-regression/deterministic-state.ts`: data de referência fixa em
  `2026-01-15T15:00:00.000Z`, usando `page.clock.setFixedTime()`; timers continuam funcionando.
  Tema continua definido antes da navegação. Fonte é aguardada no documento navegado.
- Todas as onze superfícies chamam `waitForVisualFonts()` após `waitForAppReady()`.
- Configuração visual fixa locale `pt-BR`, timezone `America/Sao_Paulo` e `reducedMotion: reduce`.
- `updateSnapshots: 'none'` no modo normal: uma referência ausente continua sendo erro,
  sem gerar uma referência automaticamente durante a verificação. O comando manual explícito
  `--update-snapshots` sobrepõe essa opção para geração revisável.
- Nome inclui a plataforma: `{arg}-{projectName}-{platform}.png`.
  Exemplo Linux: `visual-regression/baselines/visual.spec.ts/dashboard-light-desktop-linux.png`.
- `maxDiffPixels: 1300`, as 88 asserções e as quatro máscaras já existentes permanecem intactos.
  Não foram criadas imagens de referência locais nem modificados waivers.

## Validação executada

Node `22.23.4`; dependências do `npm ci` do coordenador via symlink local ignorado na entrega.

| Comando | Resultado |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run -c vitest.unit.config.ts tests/unit/visual-regression-state.test.ts --reporter=dot` | PASS, 1 arquivo e 4 testes; inicialização de light/dark, espera real da promessa de fontes e propagação de erro |
| `NODE_ENV=test DATABASE_URL=<URL sanitizada de teste> BETTER_AUTH_SECRET=<valor público de teste> node node_modules/playwright/cli.js test --list -c playwright.visual.config.ts` | PASS, 88 testes em um arquivo; descoberta, não execução visual |
| Mesma descoberta sem env obrigatória | FAIL, validação de NODE_ENV e DATABASE_URL; repetida com env sanitizada acima |
| `node node_modules/prettier/bin/prettier.cjs --write <quatro arquivos alterados>` | PASS; sem alterações de fontes de produto |
| `git diff --check` | PASS |
| Biome format nos quatro arquivos | Não processados: configuração do projeto ignora esses caminhos. Não tratado como PASS |
| `command -v docker`, `command -v dockerd`, `command -v psql` | Nenhum executável encontrado |
| Probe HTTP Node em `127.0.0.1`, porta efêmera | PASS (`TCP_LISTEN_OK`); problema de IPC do tsx não implica bloqueio geral de portas TCP |

Typecheck/lint/build completos devem ser executados pelo coordenador no diff combinado.
Execução visual real, integração e geração de baselines permanecem **BLOQUEADAS neste worktree**
por ausência da infraestrutura PostgreSQL+pgvector/Redis/Meilisearch. Não foram declaradas N/A.
O reporter HTML do `--list` sobrescreveu relatórios antigos versionados; apenas essa saída
gerada por esta execução foi restaurada com `git restore -- visual-regression-report`.

## Continuação necessária no CI (08/00)

1. Publicar a revisão auditada em branch sem disparar deploy. Não mergear nada.
2. Confirmar que o job de geração e a verificação usam o mesmo lockfile, Chromium instalado,
   configuração visual e serviços (Postgres com pgvector, Redis e Meilisearch).
3. Executar manualmente o workflow canônico `Central Birth Hub 360 Release` na **branch exata**
   da correção, job `Gerar baselines visuais Linux (manual)`, com `npm run test:visual:update`.
4. O artifact `visual-snapshots-linux` deve conter exatamente 88 PNGs em
   `visual-regression/baselines/visual.spec.ts/`. Glob do upload: `visual-regression/baselines/**/*.png`.
   Não aceitar artifact ausente, parcial, de outra branch ou de outro SHA.
5. Conferir a matriz de nomes: prefixos `login`, `dashboard`, `workspace`, `crm`, `prospect`,
   `intelligence`, `analytics`, `integrations`, `calendar`, `automations`, `admin-module-access`;
   temas `light`/`dark`; projetos `desktop`/`laptop`/`tablet`/`mobile`; sufixo `linux.png`.
6. Revisar visualmente todas as 88 imagens ou contact sheets rastreáveis aos PNGs.
   Rejeitar tela vazia, fallback de carregamento, login inesperado, redirecionamento, erro de API,
   skeleton preso, fonte ausente, viewport incorreto ou conteúdo de outra superfície.
   O caso Module Access deve representar o fundador ADMIN real que `signUp()` já verifica,
   sem aceitar um 403 genérico como referência do painel administrativo.
7. Só incorporar ao diff referências efetivamente revisadas, registrando run, SHA, build do
   Chromium e decisão humana/parecer independente. Nenhuma referência é aceita só por existir.
8. Executar `npm run test:visual` em um runner limpo, sem `--update-snapshots`; comprovar
   88 casos executados e aprovados, sem `continue-on-error` nem baselines criadas no próprio check.
9. Submeter o diff exato ao 24. Fontes/código sem baselines validadas não permitem declarar
   homologação CI visual concluída.

## Riscos e pendências

- Não há ainda prova de screenshots estáveis contra o produto real após o ajuste;
  a prova unitária não substitui a execução das 88 telas.
- Os logs visuais não exibiram outra causa detalhada além de instabilidade inicial e baselines
  ausentes. O aviso Meilisearch sem versão é consistente com serviço ausente no workflow visual;
  08 recebeu essa evidência para alinhar infraestrutura. Não atribuir os 88 erros somente a fontes.
- Referências passam a distinguir Linux/Windows. A suíte normal deve continuar falhando em SO
  sem baseline própria; não copiar/renomear PNGs entre plataformas.
- Nenhuma alteração administrativa, credencial, deploy, merge, commit ou push foi realizada pelo 14.
