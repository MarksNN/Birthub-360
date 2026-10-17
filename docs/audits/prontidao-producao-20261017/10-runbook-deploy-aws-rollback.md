# RUNBOOK OPERACIONAL — DEPLOY AWS E PROCEDIMENTO DE ROLLBACK

**Projeto:** Birth Hub 360° / Birthub 360  
**Data:** 2026-10-17  
**Responsáveis:** Agente 08A (Operações Git e Deploy AWS) & Agente 10 (SRE e Infraestrutura)  
**Auditor Independente:** Agente 24  
**Topologia de Produção:** AWS ECS Fargate / EC2 Docker, Amazon RDS PostgreSQL 16 (Multi-AZ), Amazon ElastiCache Redis 7, Amazon S3 / CloudFront  

---

## 1. PREPARAÇÃO E PRÉ-REQUISITOS (PRE-FLIGHT CHECKS)

Antes de iniciar qualquer implantação em staging ou produção:

1. **Confirmação do Commit Aprovado:**
   - Commit deve conter parecer formal APROVADO do Agente 24.
   - SHA de referência atual: `b01ad78f8b3656411be3d57f855a4cbf67c738fb` (ou commit de correção do format).
2. **Execução Local dos Gates:**
   ```bash
   npm run lint
   npm run format:check
   npm run typecheck
   npm run test:architecture
   npm run check:bundle-budget
   npm run security:audit-waivers
   npm run build
   ```
3. **Snapshot de Segurança do Banco de Dados:**
   - Disparar snapshot manual no Amazon RDS antes de aplicar novas migrações:
     ```bash
     aws rds create-db-snapshot --db-instance-identifier birthhub360-prod-pg --db-snapshot-identifier pre-deploy-$(date +%Y%m%d%H%M)
     ```
4. **Verificação de Credenciais e Variáveis de Ambiente:**
   - Confirmar injeção segura via AWS Secrets Manager / Parameter Store:
     - `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `BETTER_AUTH_SECRET`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`.

---

## 2. PROCEDIMENTO DE DEPLOY PASSO A PASSO (BLUE/GREEN OU ROLLING UPDATE)

### Passo 1: Construção e Publicação da Imagem Docker
```bash
docker build -t birthhub360-api:latest -f Dockerfile .
docker tag birthhub360-api:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/birthhub360-api:<commit_sha>
docker tag birthhub360-api:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/birthhub360-api:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com
docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/birthhub360-api:<commit_sha>
docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/birthhub360-api:latest
```

### Passo 2: Execução de Migrações (Task ECS Isolada / One-off Container)
- NUNCA executar migrações concorrentes a partir de múltiplas réplicas da aplicação.
- Disparar uma ECS Task com `npx prisma migrate deploy`:
  ```bash
  aws ecs run-task \
    --cluster birthhub360-cluster \
    --task-definition birthhub360-migration-task \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
  ```
- Aguardar o exit code 0 da task de migração antes de prosseguir.

### Passo 3: Atualização do Serviço ECS (Rolling Update com Health Checks)
```bash
aws ecs update-service \
  --cluster birthhub360-cluster \
  --service birthhub360-api-service \
  --force-new-deployment
```

### Passo 4: Validação Pós-Deploy (Smoke Tests)
1. Checar liveness e readiness probes:
   ```bash
   curl -f https://app.birthub360.com.br/health/live
   curl -f https://app.birthub360.com.br/health/ready
   curl -f https://app.birthub360.com.br/health/version
   ```
2. Validar carregamento do App Shell, login de teste e tela de status do VoiceHub.
3. Monitorar logs de erro nos primeiros 15 minutos via CloudWatch Logs:
   ```bash
   aws logs tail /ecs/birthhub360-api --follow --filter-pattern "ERROR"
   ```

---

## 3. PROCEDIMENTO DE ROLLBACK IMEDIATO

Se forem detectados erros 5xx acima de 0.5%, falhas em cascata de conexão com banco/Redis ou degradação severa de latência:

1. **Reversão do Serviço ECS para a Tag Anterior Estável:**
   ```bash
   aws ecs update-service \
     --cluster birthhub360-cluster \
     --service birthhub360-api-service \
     --task-definition birthhub360-api-service:<previous_task_definition_revision>
   ```
2. **Reversão de Migrações de Banco (se aplicável):**
   - Caso a nova versão do código tenha sido revertida e o schema atualizado seja incompatível, aplicar o script de rollback SQL reverso documentado para a migration.
   - Em caso de corrupção severa, restaurar o snapshot do Amazon RDS criado no pré-deploy (`pre-deploy-<timestamp>`).
3. **Invalidação de Cache no CloudFront:**
   ```bash
   aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
   ```
4. **Comunicação e Registro de Incidente:**
   - Registrar no canal de operações e documentar a causa raiz em `.agents/runs/`.
