# Parecer do Agente 24 — fixture do teste golden Groq com resposta vazia

## Identificação

- **Missão/Onda:** correção estritamente focada da falha do teste golden Groq com body vazio; Onda 53.
- **Autor:** Agente 07.
- **Auditor:** Agente 24.
- **Base:** `origin/main` = `b2fb5a6f7b1e74f985cd2cb62fe32f3bf8da951e`.
- **Branch:** `agents/fix-groq-provider-golden-test`.
- **Revisão auditada:** HEAD `b2fb5a6f7b1e74f985cd2cb62fe32f3bf8da951e`, mais a alteração não commitada abaixo. O HEAD coincide com `origin/main`; não houve commit da entrega.
- **SHA-256 do arquivo alterado:** `src/lib/ai/gateway/__tests__/providers.golden.test.ts` — `90B358AF43D6D20877E838C400EEBE9E6803ACD201DE85EF71B95BA437714709`.

## Escopo e critérios

Revisão somente da alteração ao mock de `fetch` no teste de resposta vazia: cada chamada deve receber um `Response` novo, reproduzindo o comportamento de uma resposta Fetch por requisição; o teste deve continuar verificando a rejeição observável com `resposta vazia`. O adapter, cliente HTTP e contrato de provider devem permanecer inalterados. Fora do escopo: avaliar disponibilidade real do Groq, executar Studio ou chamadas externas, publicar, commit e push.

**Arquivos no diff de produto:** somente `src/lib/ai/gateway/__tests__/providers.golden.test.ts`.

## Plano executado e evidências

1. **Conferir identidade e escopo → PASS.** `git status --short`, `git diff --name-only b2fb5a6f7b1e74f985cd2cb62fe32f3bf8da951e`, `git rev-parse HEAD`, `git rev-parse origin/main` e `git branch --show-current` confirmaram o HEAD/base, branch e único arquivo de produto alterado. O diff troca `mockResolvedValue(Response compartilhada)` por `mockImplementation(() => Promise.resolve(jsonResponse(...)))`; não há alterações staged.
2. **Confrontar a causa com a implementação → PASS.** `groq.provider.ts` tenta modelos candidatos e trata `resposta vazia` como motivo para continuar. `http-client.ts` consome o body uma vez (`response.json()` para sucesso; `readProviderError(response)` usa `response.text()` para erro). Com a fixture antiga, a próxima tentativa podia receber a mesma instância já consumida e falhar com erro de body indisponível, em vez de continuar o fluxo de resposta vazia esperado.
3. **Verificar semântica de body Fetch → PASS.** Experimento Node com a mesma instância `Response`, chamando `json()` duas vezes, confirmou `TypeError: Body is unusable: Body has already been read`. A factory do mock cria um objeto novo em cada chamada e evita compartilhar estado consumido entre tentativas.
4. **Executar teste e gates locais → PASS.** O teste, lint, typecheck e build executados abaixo concluíram com código 0.
5. **Consultar histórico relevante → concluído.** `.agents/reviews/identidade-documentos-base-964abe-24.md` e `.agents/runs/identidade-documentos-20261012-08A.md` registram uma falha anterior do gate **live** `npm run eval:golden`, com Groq retornando resposta vazia, além de bloqueio de merge naquela revisão. Essa evidência histórica é de execução real externa, não da fixture unitária ora revisada, e não demonstra que este patch restaure disponibilidade do Groq ou faça o gate live passar. Nenhum handoff específico de Groq/golden foi localizado em `.agents/handoffs`.

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `git status --short` | Apenas `M src/lib/ai/gateway/__tests__/providers.golden.test.ts` antes deste parecer. |
| `git diff --check` | PASS, código 0. |
| `npx vitest run -c vitest.unit.config.ts src/lib/ai/gateway/__tests__/providers.golden.test.ts` | PASS, 1 arquivo e 13 testes. |
| `npx biome lint src/lib/ai/gateway/__tests__/providers.golden.test.ts` | PASS, 1 arquivo verificado, sem correções. |
| `npm run lint` | PASS, código 0. A saída também reportou avisos em arquivos alheios ao diff. |
| `npx tsc --noEmit` | PASS, código 0. |
| `npm run build` | PASS, código 0 (Vite, esbuild e `verify:pwa-precache`). |
| `node -e "... Response ... json() ... json()"` | PASS para confirmar a semântica esperada: segunda leitura rejeita com `Body is unusable`. |
| `npm run verify:ai` | **NÃO EXECUTADO pelo auditor.** O autor reporta que ficou bloqueado por ambiente (`NODE_ENV`/`DATABASE_URL` ausentes) e que o script inicia Studio real. Não é gate aplicável para validar uma fixture unitária sem mudança de integração; não foram feitas chamadas externas nem inventadas credenciais. |

## Achados

- **Nenhum achado impeditivo na correção auditada.** A mudança é localizada, consistente com o ciclo de vida one-shot do body de `Response` e mantém o teste de rejeição do conteúdo vazio. Nenhum arquivo de implementação ou contrato foi alterado.
- **Contexto fora do escopo:** a falha histórica do gate live mencionada acima não é corrigida nem revalidada por esta alteração de mock. Este parecer não a considera resolvida e não aprova a saúde real do Groq, o gate live, merge ou release.

## Pendências, riscos e handoffs

- O resultado de `verify:ai` está bloqueado conforme evidência reportada pelo autor; permanece não executado nesta auditoria por requerer ambiente e Studio reais. Não bloqueia a aprovação delimitada à fixture.
- Nenhum handoff aberto nesta missão: não foi identificada correção pendente no adapter/cliente/contrato dentro do escopo autorizado.
- Risco residual: disponibilidade e comportamento de resposta do provedor real não foram exercitados; a aprovação não deve ser usada como evidência de que a falha live histórica foi resolvida.

## Decisão

**APROVADO — somente para a correção da fixture em `src/lib/ai/gateway/__tests__/providers.golden.test.ts`, no conteúdo identificado pelo SHA-256 acima.** A aprovação cobre a emissão de um `Response` novo por chamada no teste de resposta vazia e os gates locais executados. Não autoriza commit, push, merge, release ou alegação de recuperação do gate live/provedor real. Qualquer alteração nos bytes auditados exige novo parecer.
