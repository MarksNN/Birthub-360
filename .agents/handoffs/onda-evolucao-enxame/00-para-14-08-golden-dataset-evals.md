De: Agente 00 — Coordenador Global
Para: Agentes 14 (Test Harness) & 08 (QA e Release)
Onda: Evolução Enxame IA
Status: resolvido
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

## Resolução
- Criado `tests/evals/golden-dataset-tactical.json` contendo 28 casos canônicos para os 3 agentes táticos:
  - 15 casos de transcrições reais sanitizadas para o `PromiseGuardianAgent` (incluindo controles negativos e multi-promessas).
  - 5 perfis canônicos para o `AccountDetectiveAgent` (validação de 10 seções, fontes idôneas e isolamento estrito de hipóteses `isHypothesisOnly: true`).
  - 8 cenários de deals comerciais para o `DevilsAdvocateAgent` (validação de viés de otimismo, estagnação, ghosting e revisões de probabilidade).
- Refatorado `scripts/evaluate-golden-dataset-live.ts` para calcular formalmente Acurácia, Precisão, Recall e Taxa de Alucinação sobre o swarm tático e baseline determinística dos 24 casos canônicos legados.
- Criada suíte de testes automatizados `tests/unit/intelligence/goldenDatasetTactical.test.ts` (3 testes aprovados).
- Executado `npm run eval:golden` com resultado:
  - Acurácia Global: 100.00% (>= 90%)
  - Recall Global: 100.00% (>= 90%)
  - Precisão Global: 100.00%
  - Alucinação: 0.00%
  - Promessas perdidas: 0
