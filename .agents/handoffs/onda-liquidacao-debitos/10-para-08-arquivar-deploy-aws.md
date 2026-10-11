- De: 10 (Infraestrutura, Observabilidade e SRE)
- Para: 08 (QA e Release)
- Onda: liquidacao-debitos
- Status: resolvido
- Prioridade: alto (bloqueador de clareza de pipeline)

## Problema

O workflow `.github/workflows/deploy-aws.yml` está configurado para ECS/ECR/S3/CloudFront, mas:
- Nunca foi ativado (ausência de secret `AWS_ROLE_TO_ASSUME`)
- Diverge da arquitetura canônica documentada (`docs/operations/PRODUCTION_ARCHITECTURE.md` — 100% Local-First / Single-Node)
- Diverge do ambiente real de produção (EC2 via SSH, operacional)
- K8s, ArgoCD, Helm charts, ECS estão marcados como ARCHIVED/LEGACY na documentação

## Decisão Formal (Agente 10)

**Escolha:** Opção A — Manter EC2 via SSH (status quo)

**Justificativa técnica resumida:**
1. Alinhamento com arquitetura canônica documentada (Local-First / Single-Node)
2. Ambiente de produção EC2 + Docker Compose está operacional e estável
3. Migração para ECS/ECR seria regressão arquitetural desnecessária
4. Aumentaria complexidade, custo e risco sem benefício claro
5. Viola princípio P2 (Simplicidade primeiro) do AGENTS.md

## Arquivo(s) envolvido(s)

- `.github/workflows/deploy-aws.yml` (propriedade: Agente 08)
- `docs/operations/PRODUCTION_ARCHITECTURE.md` (propriedade: Agente 08/10 conjunta)

## Alteração necessária

### 1. Arquivar workflow `deploy-aws.yml`
- Renomear `.github/workflows/deploy-aws.yml` para `.github/workflows/deploy-aws.yml.disabled`
- OU mover para `.github/workflows/disabled/deploy-aws.yml.disabled`
- Adicionar comentário no topo explicando por que foi desativado (referência à decisão Opção A)

### 2. Atualizar documentação de deploy
- Atualizar `docs/operations/PRODUCTION_ARCHITECTURE.md` OU criar `docs/operations/DEPLOY_EC2.md`
- Documentar explicitamente o procedimento de deploy via scripts EC2:
  - Pré-requisitos (chave SSH, acesso ao host `ubuntu@3.143.251.44`)
  - Procedimento passo-a-passo usando `deploy-ec2.sh`, `deploy-ec2.ps1` ou `deploy-aws.ps1`
  - Comandos de verificação pós-deploy (healthcheck `/health/live`, `/health/ready`, `/health/version`)
  - Procedimento de rollback
  - Lista de serviços Docker em produção

## Teste esperado

- Workflow arquivado não é mais executável/disparável via GitHub Actions
- Documentação de deploy está clara e acessível
- Novos desenvolvedores conseguem identificar o procedimento correto sem confundir com ECS

## Contexto adicional

Estado atual do ambiente de produção (inspeção real Agente 10):
- Host: `3.143.251.44` (AWS EC2)
- Container: `birthhub-app` (imagem `birthhub-app:latest`)
- Porta: 3024
- Stack Docker completa: Postgres, Redis, Meilisearch, MinIO, LiteLLM, Ollama, Qdrant
- Status: Up 25+ horas (operacional)

## Resolução (Agente 08)

**Implementado em:** 2026-10-10

**Ações executadas:**
- [x] Workflow `deploy-aws.yml` renomeado para `deploy-aws.yml.disabled` com comentário explicativo
- [x] Documentação de deploy EC2 criada em `docs/operations/DEPLOY_EC2.md`
- [x] Status alterado para "resolvido"

**Evidências:**
- Arquivo: `.github/workflows/deploy-aws.yml.disabled` (existe)
- Documentação: `docs/operations/DEPLOY_EC2.md` (criado)
- Referência cruzada em `PRODUCTION_ARCHITECTURE.md` adicionada
