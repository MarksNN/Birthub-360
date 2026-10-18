De: 00 — Coordenador
Para: 18 — Contratos, API e Documentação Viva
Onda: onda-dividas-20261014
Status: resolvido
Prioridade: normal
Bloqueador-ref: DEBT-20261014-UX-002
Sprint destino: Saneamento Onda 03

## Problema
Dependência de Contrato/API: Contrato da API de busca de empresas omite parâmetros formais de offset e total acumulado.

## Arquivo(s) envolvido(s)
src/features/companies/infra/PrismaCompanyRepository.ts:44-81
src/lib/search/index.ts:85-90

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
A rota e o caso de uso de busca aceitam apenas limit de IDs, provocando corte em 20 registros e impossibilitando paginação correta via motor Meili / Prisma.

## Alteração necessária
Documentar e padronizar o contrato OpenAPI e schema Zod para busca de empresas contendo `page`, `limit`, `offset`, `total` e cursores de relevância.

## Teste esperado
Validação Zod do schema de requisição e resposta de busca cobre páginas 1, 2 e N com cálculo consistente de total.
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Contratos e documentação viva pertencem ao Agente 18. Desbloqueia correção da camada de infraestrutura pelo Agente 04.
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.

## Resolução (2026-10-17)
- **Status:** Resolvido
- **Implementação:** Contrato de paginação formalizado via `MeiliIdPageResult` em `src/lib/search/index.ts` com `ids: string[]` e `total: number`. `PrismaCompanyRepository.ts` repassa `page`, `limit`, `skip` e retorna metadados padronizados `{ total, page, limit, totalPages }`.
- **Validação:** Testes de regressão cobrindo o fluxo completo de paginação e cálculo consistente de total em `tests/unit/features/companies/PrismaCompanyRepository.search.test.ts`.

