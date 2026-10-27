De: Agente 00 — Coordenador Global
Para: Agentes 14 (Test Harness) & 08 (QA e Release)
Onda: Evolução Enxame IA
Status: aberto
Prioridade: normal
Bloqueador-ref: N/A
Sprint destino: Sprint 3

## Problema
A evolução dos prompts e dos modelos de base pode introduzir regressões silenciosas de alucinação factual ou queda na acurácia de extração de compromissos sem que os testes unitários tradicionais detectem.

## Arquivo(s) envolvido(s)
- `scripts/evaluate-golden-dataset-live.ts`
- `tests/evals/golden-dataset-tactical.json`
- `package.json` (`npm run eval:golden`)

## Evidência
Atualmente o dataset golden cobre apenas fluxos genéricos de chat/SDR, sem abranger as especificidades das saídas dos agentes táticos (`account-detective`, `promise-guardian`, `devils-advocate`).

## Alteração necessária
1. Criar fixtures canônicas com transcrições reais sanitizadas e perfis de empresas.
2. Definir métricas objetivas de precisão e recall para extração de promessas e detecção de viés de forecast.
3. Integrar script de verificação no pipeline de CI como gate não bloqueante inicial e gate de release.

## Teste esperado
- `node ./node_modules/tsx/dist/cli.mjs scripts/evaluate-golden-dataset-live.ts` com score mínimo de acurácia de 90%.
