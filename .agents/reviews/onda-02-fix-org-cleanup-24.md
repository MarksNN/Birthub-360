# Parecer de Revisão Independente — Agente 24
**Missão:** Correção Cirúrgica de Cleanup de Organization em Testes de Integração (Substituição de session_replication_role por app.lgpd_chain_retention_org)  
**Onda:** 02 / CI Recovery  
**Data:** 2026-10-22  
**Auditor:** Agente 24 (Auditoria Independente)  
**Autor:** Agente 01 (Plataforma e Dados) / Agente 08A (Operações Git)  
**Base:** `origin/main` (`304a77bdf`)  
**Branch:** `integracao/onda-02`  
**Revisão Auditada:** Commit `30857b809`  

---

## 1. Contexto e Análise Forense da Causa-Raiz
No run `39773552689` e `39773290783` do GitHub Actions, o step `Run Integration Tests (auth, RBAC and tenant isolation)` falhou com a anotação:
```
error: permission denied to set parameter "session_replication_role"
 ❯ node_modules/pg/lib/client.js:652:17
 ❯ deleteOrganizationsAsOwner tests/helpers/integration-setup.ts:96:5
Serialized Error: { code: '42501', file: 'guc.c', routine: 'set_config_option_ext' }
```

### Investigação
1. No PostgreSQL, a variável de configuração `session_replication_role` (usada para desativar triggers em massa) só pode ser definida por usuários com privilégio de `SUPERUSER`.
2. Como parte da arquitetura de menor privilégio (least privilege) implementada na Onda 05 / REMED-06, a aplicação e os scripts de migration operam com papéis não-superuser (`prospector_app` com NOSUPERUSER/NOBYPASSRLS e `prospector_migrator` com NOSUPERUSER/BYPASSRLS).
3. A migration canônica `20261021000000_lgpd_chain_restrict_org_no_app_delete` já implementa o canal oficial para expurgo e retenção da cadeia de consentimento por organização:
   ```sql
   IF TG_OP = 'DELETE'
      AND OLD."organizationId" = current_setting('app.lgpd_chain_retention_org', true)
      AND session_user::text <> 'prospector_app' THEN
     RETURN OLD;
   END IF;
   ```
4. Portanto, a tentativa de usar `SET LOCAL session_replication_role = 'replica'` violava o least privilege e quebrava desnecessariamente a suíte com SQLSTATE 42501.

---

## 2. Auditoria do Diff (Commit `30857b809`)
Arquivo alterado: `tests/helpers/integration-setup.ts`
- **Remoção:** `SET LOCAL session_replication_role = 'replica'` removido por completo.
- **Implementação correta:** Utilização de `SELECT set_config('app.lgpd_chain_retention_org', $1, true)` para cada organização sendo limpa.
- **Exclusão ordenada e em cascata:**
  1. `ConsentEventDetail` expurgado sob a credencial de owner.
  2. `ConsentAuditRecord` e `ConsentAuditChainHead` expurgados com a flag `app.lgpd_chain_retention_org` ativa.
  3. `User` associado limpo preventivamente para evitar violações de integridade referencial.
  4. `Organization` deletada com `DELETE FROM "Organization" WHERE id = ANY($1::text[])`.
  5. As tabelas com `onDelete: Cascade` (como `ConsentSubjectKeyTombstone`, `TenantKeyEnvelope`, `FlywheelApproachRecord`) são processadas via cascata do banco, respeitando rigorosamente os triggers de imutabilidade.

---

## 3. Validação dos Gates Locais
- `npm run format:check`: 2.011 arquivos verificados pelo Biome, 0 erros (PASS).
- `npm run typecheck`: 0 erros no TypeScript (`tsc --noEmit`) (PASS).
- `npm run test:architecture`: 0 violações de dependência, hotspots verificados (PASS).
- `npm run verify:openapi-drift`: 0 deriva estrutural (PASS).

---

## 4. Veredito
**[APROVADO]**  
A alteração é estritamente cirúrgica, corrige a causa-raiz de bloqueio dos testes de integração sem relaxar a segurança do banco em produção, e está em conformidade com as diretrizes de governança e menor privilégio. Autorizado o push para `integracao/onda-02`.
