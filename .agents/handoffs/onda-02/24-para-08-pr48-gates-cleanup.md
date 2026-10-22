De: 24 — Revisão Independente
Para: 08 — QA e Release; 01 — Plataforma, Segurança e Dados (consulta sobre cleanup)
Onda: 02 / issue #45 / PR #48
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: PR #48 @ 21ce89954d261f9fe4639115287f0bacd4988ddc
Sprint destino: recuperação do CI do PR #47

## Problema
Não há evidências dos gates obrigatórios no SHA do PR #48. Apenas SonarQube foi executado. ci.yml filtra PRs para main/master e não dispara para a base integracao/onda-02. O ambiente desta auditoria não dispõe de Docker/psql/banco descartável configurado.

## Arquivos envolvidos
tests/integration/backfill-contact-pii.test.ts; tests/integration/prospecting-rls.test.ts; demais seis arquivos do PR; src/lib/prisma.ts; tests/helpers/integration-setup.ts; .github/workflows/ci.yml (leitura).

## Evidência
deleteMany de Contact/Company pode ser convertido em soft-delete pelo client Prisma; tenant correto não comprova remoção física de PII. Fallback owner preexistente usa session_replication_role=replica, que também desativa triggers de FK. Não há prova executada de regressão introduzida pelo PR.

## Alteração necessária
08 deve executar gates no SHA exato em banco exclusivamente descartável com pgvector, Redis e configuração de menor privilégio. Conferir package.json e executar format:check, lint:ci, typecheck, test:architecture, test:unit, test:integration e build, mais verificações aplicáveis. Não enfraquecer RLS, grants ou asserções. Validar resíduos físicos/órfãos por SQL com papel de inspeção de teste adequado e provar isolamento cruzado; envolver 01 se houver correção necessária. Registrar comando, exit code, ambiente e resultados.
O plugin disponível não expõe workflow_dispatch; rerun do run antigo do PR #47 testaria o SHA antigo. Execução manual do ci.yml no branch do PR #48 roda application gate, mas não publica o agregador build e também aciona visual-baselines; não anunciá-la como required check de PR aprovado.
Após novas alterações, solicitar nova revisão independente sobre o novo SHA.

## Teste esperado
Suíte completa de integração (incluindo db-owner-role-separation, rls-postgres-direct-enforcement, LGPD e prospecting-rls) aprovada em PostgreSQL real, cleanup sem resíduos inesperados, permissões negativas preservadas e demais gates pertinentes aprovados.

## Ordem de avanço
Parecer 24 APROVADO + gates pertinentes validados → integração do PR #48 em integracao/onda-02 → CI/E2E do PR #47 no novo SHA. Não integrar PR #47 em main nem executar deploy nesta missão.
