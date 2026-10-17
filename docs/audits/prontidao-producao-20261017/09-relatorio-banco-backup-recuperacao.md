# RELATÓRIO DE BANCO DE DADOS, INTEGRIDADE E PROCEDIMENTO DE BACKUP/RECUPERAÇÃO

**Projeto:** Birth Hub 360° / Birthub 360  
**Data:** 2026-10-17  
**Responsáveis:** Agente 01 (Plataforma e Dados) & Agente 01A (Confiabilidade de Dados e RLS)  
**Auditor Independente:** Agente 24  

---

## 1. INTEGRIDADE DO SCHEMA PRISMA E HISTÓRICO DE MIGRATIONS

- **Status do Schema:** Validado formalmente com `npx prisma validate` com status de sucesso (`The schema at prisma\schema.prisma is valid 🚀`).
- **Histórico de Migrações:** Total de **139 migrations versionadas** e comprovadas em `prisma/migrations/`, cobrindo toda a evolução estrutural desde o modelo relacional básico até o suporte às 6 capacidades.
- **Nota Técnica de Governança (Fase 4):** O comando `prisma validate` comprova a integridade sintática e relacional estática do `schema.prisma`. A comprovação da aplicação em banco de dados real (`_prisma_migrations`) requer conexão ativa com a infraestrutura via `prisma migrate status`. Por governança estrita e proteção contra acessos destrutivos não autorizados em produção, este check é executado como pre-flight gate isolado no deployment em staging.
- **Constraints e Foreign Keys:**
  - Integridade referencial garantida com constraints explícitas (`onDelete: Cascade` ou `onDelete: Restrict` conforme a política de retenção).
  - Índices compostos cobrindo `[organizationId, createdAt]`, `[organizationId, status]` e `[organizationId, externalId]` para prevenir full table scans em consultas filtradas por tenant.
- **Prevenção de Boot Inseguro (B-05):**
  - O script de inicialização do Docker / ECS executa `npx prisma migrate deploy` antes de subir o processo Node da API (`server.cjs`). Caso uma migração falhe, o container aborta a inicialização antes de expor a porta HTTP.

---

## 2. ROW-LEVEL SECURITY (RLS) E POLÍTICAS MULTI-TENANT

- Todas as tabelas transacionais possuem RLS ativado no Postgres (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- Políticas estritas (`FORCE ROW LEVEL SECURITY`) impedem acesso cruzado entre tenants, verificando:
  ```sql
  organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::text
  ```
- O usuário da aplicação (`prospector_app`) não possui privilégio de superusuário (`NOSUPERUSER`), tornando impossível ignorar o RLS via SQL injection tradicional.

---

## 3. PROCEDIMENTO DE BACKUP E DISASTER RECOVERY

1. **Rotina de Backup Automático:**
   - Orquestrada via workflow `.github/workflows/backup-production.yml` e scripts utilitários `scripts/backup/`.
   - Execução diária de `pg_dump -Fc` com compressão e envio seguro para bucket S3 com criptografia AES-256 e Versioning ativado.
2. **Retenção de Backups:**
   - Backups diários retidos por 30 dias.
   - Backups semanais retidos por 90 dias.
   - Backups mensais retidos por 12 meses.
3. **Ensaio de Restauração (Drill):**
   - Script automatizado `scripts/backup/run-backup-restore-drill.ts` (executável via `npm run backup:drill`) realiza o teste de restauração em banco isolado, validando:
     1. Descompactação do arquivo `.dump`.
     2. Restauração de schemas e dados em instância temporária.
     3. Checagem de contagem de linhas e integridade de chaves estrangeiras.
     4. Limpeza do ambiente de drill após a validação.
4. **Procedimento de Rollback de Migrações:**
   - Em caso de falha de migration durante a janela de deploy, o runbook define o uso de scripts SQL reversos manuais documentados em cada pasta de migration, sem execução de `migrate reset` destrutivo em produção.
