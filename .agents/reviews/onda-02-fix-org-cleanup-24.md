# Parecer de Revisão Independente — Agente 24
**Missão:** Correção Cirúrgica de Cleanup de Organization em Testes de Integração (Ativação Canônica de app.lgpd_chain_retention_org no deleteMany Global)  
**Onda:** 02 / CI Recovery  
**Data:** 2026-10-22  
**Auditor:** Agente 24 (Auditoria Independente)  
**Autor:** Agente 01 (Plataforma e Dados) / Agente 08A (Operações Git)  
**Base:** `origin/main` (`304a77bdf`)  
**Branch:** `integracao/onda-02`  
**Revisão Auditada:** Commit `6730b6e1b`  

---

## 1. Contexto e Análise Forense da Causa-Raiz
No run `39785687650` do GitHub Actions, o step `Run Integration Tests (auth, RBAC and tenant isolation)` falhou no cleanup global com:
```
error: update or delete on table "Organization" violates foreign key constraint "ConsentAuditChainHead_organizationId_fkey" on table "ConsentAuditChainHead"
Detail: Key (id)=(test-lgpd-off-d30a193b) is still referenced from table "ConsentAuditChainHead".
```

### Investigação
1. A tabela `ConsentAuditChainHead` possui chave estrangeira `ON DELETE RESTRICT` referenciando `Organization`.
2. Para que uma linha em `ConsentAuditChainHead` possa ser apagada (expurgo e retenção ADR-006 / migration `20261021000000`), o trigger `consent_chain_head_guard` exige:
   ```sql
   IF OLD."organizationId" = current_setting('app.lgpd_chain_retention_org', true)
      AND session_user::text <> 'prospector_app' THEN
     RETURN OLD;
   END IF;
   ```
3. No cleanup global sem filtro (`prisma.organization.deleteMany()`), `targetIds` vinha vazio e o código executava um `DELETE FROM "ConsentAuditChainHead"` sem especificar o tenant correspondente na configuração da sessão. Como resultado, o trigger bloqueava o delete individual com `insufficient_privilege`, deixando as linhas órfãs em `ConsentAuditChainHead` e disparando a violação de integridade referencial ao apagar `Organization`.

---

## 2. Auditoria do Diff (Commit `6730b6e1b`)
Arquivo alterado: `tests/helpers/integration-setup.ts`
- **Descoberta proativa de tenants no deleteMany global:** Quando nenhum filtro é passado (`targetIds.length === 0`), executa `SELECT id FROM "Organization"` para obter a lista completa de IDs no banco de teste.
- **Ciclo de expurgo canônico por tenant:** Itera sobre cada organização encontrada, emitindo `SELECT set_config('app.lgpd_chain_retention_org', $1, false)` antes de apagar as tabelas protegidas (`ConsentAuditRecord`, `ConsentAuditChainHead` e `User`).
- **Exclusão final consolidada:** Executa `DELETE FROM "Organization" WHERE id = ANY($1::text[])`, permitindo a deleção limpa e cascata ordenada de todas as demais tabelas filhas.
- **Ausência de transações manuais instáveis:** Preserva o modo autocommit, eliminando o risco de `25P02`.

---

## 3. Validação dos Gates Locais
- `npm run format:check`: 2.011 arquivos verificados pelo Biome, 0 erros (PASS).
- `npm run typecheck`: 0 erros no TypeScript (`tsc --noEmit`) (PASS).
- `npm run test:architecture`: 0 violações de dependência, hotspots verificados (PASS).
- `npm run verify:openapi-drift`: 0 deriva estrutural (PASS).

---

## 4. Veredito
**[APROVADO]**  
A causa-raiz de violação de chave estrangeira em `ConsentAuditChainHead` foi totalmente eliminada com respeito estrito às regras da migration `20261021000000_lgpd_chain_restrict_org_no_app_delete`. Autorizado o push para `integracao/onda-02` e acompanhamento do PR #49.
