De: 00 — Coordenador
Para: 08 — QA e Release
Onda: onda-dividas-20261014
Status: resolvido (APROVADO pelo Agente 24 em .agents/reviews/24-liquidacao-geral-dividas-e-forense-20261023.md)
Prioridade: normal
Bloqueador-ref: DEBT-20261014-GOV-002
Sprint destino: Saneamento Onda 09

## Problema
Dependência de CI: Workflow docker-publish dispara automaticamente em commits da branch main, em divergência com a política local-first.

## Arquivo(s) envolvido(s)
.github/workflows/docker-publish.yml:11-15
docs/development/LOCAL_FIRST.md

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
O workflow docker-publish.yml possui gatilho automático via workflow_run: CI na branch main, gerando builds de container cloud durante período declarado de governança local-first.

## Alteração necessária
Adicionar condicional de acionamento manual (workflow_dispatch) ou flag de ambiente para publicação de containers, mantendo coerência com o manifesto LOCAL_FIRST.md.

## Teste esperado
Execução de workflow em branch de teste valida que commit na main não inicia upload de container a menos que explicitamente solicitado.
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Workflows de CI/CD são propriedade exclusiva do Agente 08. Dependência de governança (DEBT-20261014-GOV-002).
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.
