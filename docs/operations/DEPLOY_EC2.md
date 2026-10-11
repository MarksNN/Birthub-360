# Deploy EC2 — Procedimento Oficial

Este documento descreve o procedimento oficial de deploy da plataforma Birth Hub 360° no ambiente de produção EC2.

## Decisão de Arquitetura

**Opção A — Manter EC2 via SSH (status quo):**

Esta é a estratégia oficial de deploy, conforme decisão do Agente 10 (`.agents/handoffs/onda-liquidacao-debitos/00-para-08-10-estrategia-deploy-unificada.md`).

**Justificativa:**
- Alinhamento com arquitetura canônica 100% Local-First / Single-Node
- Ambiente de produção EC2 + Docker Compose está operacional e estável
- Migração para ECS/ECR seria regressão arquitetural desnecessária
- Simplicidade operacional (P2 do AGENTS.md)

---

## Ambiente de Produção

**Host:** `3.143.251.44` (AWS EC2)  
**Usuário:** `ubuntu`  
**Diretório:** `/home/ubuntu/birthhub-360`  
**Container:** `birthhub-app` (imagem `birthhub-app:latest`)  
**Porta:** 3024

**Stack Docker em Produção:**
- `birthhub-app` (aplicação principal)
- `birthhub_postgres` (PostgreSQL 16 via imagem `maarkss/postgres-intelligence:16`)
- `birthhub_redis` (Redis 7-alpine)
- `birthhub_meilisearch` (Meilisearch v1.6)
- `birthhub_minio` (MinIO S3-compatible storage)
- `birthhub_litellm` (LiteLLM proxy)
- `birthhub_ollama` (Ollama para modelos locais)
- `birthhub_qdrant` (Qdrant vector database)
- `birthhub_minio_init` (init script do MinIO)

---

## Pré-requisitos

### 1. Acesso SSH
- Chave SSH privada configurada localmente
- Acesso ao host `ubuntu@3.143.251.44`
- Permissão de execução de comandos Docker

### 2. Build Local
- Node.js 22 instalado
- npm ou yarn instalado
- Dependências instaladas (`npm ci`)

### 3. Scripts de Deploy
Os seguintes scripts devem estar disponíveis na raiz do repositório:
- `deploy-ec2.sh` (bash/Linux)
- `deploy-ec2.ps1` (PowerShell)
- `deploy-aws.ps1` (PowerShell wrapper)

---

## Procedimento de Deploy

### Opção 1: Usando `deploy-ec2.sh` (Linux/Mac)

```bash
# 1. Build da aplicação
npm run build

# 2. Executar deploy
./deploy-ec2.sh
```

### Opção 2: Usando `deploy-ec2.ps1` (PowerShell)

```powershell
# 1. Build da aplicação
npm run build

# 2. Executar deploy
.\deploy-ec2.ps1
```

### Opção 3: Usando `deploy-aws.ps1` (PowerShell wrapper)

```powershell
# 1. Build da aplicação
npm run build

# 2. Executar deploy
.\deploy-aws.ps1
```

---

## O que os Scripts Fazem

Os scripts de deploy executam os seguintes passos:

1. **Build local:** Compila TypeScript, cria bundle Vite e server bundle
2. **SCP:** Transfere `dist/` para o servidor EC2
3. **Docker restart:** Reinicia o container `birthhub-app`
4. **Healthcheck automático:** Verifica se a aplicação está respondendo

---

## Verificação Pós-Deploy

### 1. Healthcheck da Aplicação

Após o deploy, verifique se a aplicação está respondendo:

```bash
# A partir do servidor EC2
curl http://localhost:3024/health/live
# Esperado: HTTP 200 + {"status":"ok"}

curl http://localhost:3024/health/ready
# Esperado: HTTP 200 + {"status":"ready"}

curl http://localhost:3024/health/version
# Esperado: HTTP 200 + {"version":"X.Y.Z"}
```

### 2. Verificação dos Serviços Docker

```bash
# Verificar status de todos os containers
docker ps

# Verificar logs do container principal
docker logs birthhub-app --tail 50
```

### 3. Verificação de Migrações

```bash
# Executar dentro do container
docker exec birthhub-app npx prisma migrate status
```

---

## Procedimento de Rollback

### Opção 1: Rollback Manual via SSH

```bash
# 1. Conectar ao servidor
ssh ubuntu@3.143.251.44

# 2. Verificar histórico de imagens
docker images birthhub-app

# 3. Reverter para imagem anterior
docker tag birthhub-app:previous birthhub-app:latest
docker restart birthhub-app
```

### Opção 2: Rollback Automático (se implementado no script)

Se os scripts de deploy foram melhorados com rollback automático (ver handoff `10-para-08A-deploy-ec2-scripts.md`), o rollback é executado automaticamente se o healthcheck pós-deploy falhar.

---

## Lista de Serviços Docker em Produção

| Serviço | Imagem | Porta | Propósito |
|---------|--------|-------|-----------|
| birthhub-app | birthhub-app:latest | 3024 | Aplicação principal |
| birthhub_postgres | maarkss/postgres-intelligence:16 | 5432 | Banco de dados |
| birthhub_redis | redis:7-alpine | 6379 | Cache e filas |
| birthhub_meilisearch | getmeili/meilisearch:v1.6 | 7700 | Motor de busca |
| birthhub_minio | minio/minio:latest | 9000 | Storage S3-compatible |
| birthhub_litellm | litellm/litellm:latest | 4000 | Proxy de IA |
| birthhub_ollama | ollama/ollama:latest | 11434 | Modelos locais |
| birthhub_qdrant | qdrant/qdrant:latest | 6333 | Vector database |

---

## Workflow Desativado

O workflow `.github/workflows/deploy-aws.yml.disabled` foi arquivado porque:
- Está configurado para ECS/ECR/S3/CloudFront
- Nunca foi ativado (ausência de secret `AWS_ROLE_TO_ASSUME`)
- Diverge da arquitetura canônica (100% Local-First / Single-Node)
- Diverge do ambiente real de produção (EC2 via SSH)

**Não use este workflow para deploy em produção.** Use os scripts EC2 descritos acima.

---

## Troubleshooting

### Deploy falha no passo SCP
- Verificar conexão SSH
- Verificar permissões no diretório `/home/ubuntu/birthhub-360`
- Verificar espaço em disco no servidor

### Deploy falha no healthcheck
- Verificar logs do container: `docker logs birthhub-app`
- Verificar se migrações foram aplicadas
- Verificar se variáveis de ambiente estão corretas (PORT=3024)

### Container não inicia após restart
- Verificar logs com `docker logs birthhub-app`
- Verificar se o build local foi bem-sucedido
- Verificar se há conflito de portas

---

## Referências

- Decisão de estratégia: `.agents/handoffs/onda-liquidacao-debitos/00-para-08-10-estrategia-deploy-unificada.md`
- Arquitetura canônica: `docs/operations/PRODUCTION_ARCHITECTURE.md`
- Handoff de scripts: `.agents/handoffs/onda-liquidacao-debitos/10-para-08A-deploy-ec2-scripts.md`
