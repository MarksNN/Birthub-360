De: 00 — Coordenador
Para: 14 — Ambiente de Execução e Test Harness
Onda: onda-dividas-20261014
Status: resolvido (APROVADO pelo Agente 24 em .agents/reviews/24-liquidacao-geral-dividas-e-forense-20261023.md)
Prioridade: alto
Bloqueador-ref: PRÉ-REQUISITO-GERAL
Sprint destino: Saneamento Onda 00

## Problema
Pré-requisito Ambiental: Ausência de baseline isolado e test harness para execução segura das ondas de saneamento.

## Arquivo(s) envolvido(s)
scripts/test-harness/
vitest.config.ts
.env.test.example

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
O ambiente atual não possui dependências instaladas no host principal e exige isolamento rigoroso para que nenhum teste de saneamento acione banco de produção ou APIs externas.

## Alteração necessária
Preparar harness de testes isolado com mocks contratuais para Bitrix, WhatsApp, IA e provedores de e-mail, além de fixtures de banco de dados SQLite/PostgreSQL em memória para validação das ondas.

## Teste esperado
Execução de suite sentinela no harness confirma isolamento completo de rede e ausência de chamadas externas.
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Harness de testes e ambiente de execução pertencem ao Agente 14. Pré-requisito obrigatório para início das Ondas 01 a 08.
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.
