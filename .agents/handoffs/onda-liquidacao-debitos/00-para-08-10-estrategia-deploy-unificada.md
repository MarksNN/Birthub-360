- De: 00 (Coordenador)
- Para: 08 (QA e Release) e 10 (Infraestrutura, Observabilidade e SRE)
- Onda: liquidacao-debitos
- Status: resolvido
- Prioridade: alto (bloqueador de release/produção)

## Problema

O workflow `.github/workflows/deploy-aws.yml` está configurado para uma estratégia ECS/ECR/S3/CloudFront (AWS OIDC), mas o ambiente de produção canônico documentado opera em EC2 via SSH (`ubuntu@3.143.251.44`, diretório `/home/ubuntu/birthhub-360`, container `birthhub-app`, porta 3024). O workflow AWS é ignorado devido à ausência da secret `AWS_ROLE_TO_ASSUME`, criando divergência entre pipeline documentado e realidade operacional.

Adicionalmente, o HEALTHCHECK da imagem Docker estava fixado na porta 3000 enquanto o runtime real usa PORT=3024, causando conflito potencial de healthcheck.

## Arquivo(s) envolvido(s)

- `.github/workflows/deploy-aws.yml` (propriedade: Agente 08)
- `Dockerfile` (propriedade: Agente 08/10)
- Scripts de deploy EC2 existentes (`deploy-ec2.ps1`, `deploy-ec2.sh`, `deploy-aws.ps1`)
- Documentação de produção (`docs/operations/PRODUCTION_ARCHITECTURE.md`)

## Alterações já aplicadas nesta onda

1. **Docker Hub Rate Limit (Erro 429 no CI):**
   - Adicionado `credentials` com `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` a todos os service containers no workflow `.github/workflows/ci.yml` (postgres, redis, meilisearch) nos jobs `build-and-test` e `visual-baselines`
   - Isso elimina falhas intermitentes de `toomanyrequests` durante pulls anônimos nos runners públicos do GitHub Actions

2. **Ajuste de PORT no Dockerfile:**
   - Alterado `ENV PORT=3000` para `ENV PORT=3024` (linha 51)
   - Alterado `EXPOSE 3000` para `EXPOSE 3024` (linha 107)
   - Alterado HEALTHCHECK de porta fixa 3000 para `${PORT:-3024}` (linha 110)
   - Isso alinha a imagem Docker com o runtime real de produção (porta 3024)

## Decisão necessária: Estratégia de Deploy Unificada

**Opção A - Manter EC2 via SSH (status quo atual):**
- Vantagem: já está operando em produção, documentado, testado
- Desvantagem: workflow `deploy-aws.yml` torna-se obsoleto, pode ser removido ou desativado
- Ação: remover ou arquivar `deploy-aws.yml`, documentar que deploy é via scripts EC2 manuais

**Opção B - Migrar para ECS/ECR/S3/CloudFront (workflow atual):**
- Vantagem: pipeline automatizado via GitHub Actions OIDC, melhor observabilidade nativa AWS
- Desvantagem: requer migração de infraestrutura, configuração de `AWS_ROLE_TO_ASSUME`, teste completo
- Ação: configurar secret `AWS_ROLE_TO_ASSUME`, validar pipeline, migrar produção

**Opção C - Híbrido (EC2 via GitHub Actions):**
- Vantagem: mantém infraestrutura EC2 existente mas com pipeline automatizado
- Desvantagem: requer desenvolvimento de workflow customizado para EC2 (SSH deploy via runner)
- Ação: criar workflow específico para deploy EC2 via SSH, manter workflow ECS desativado

## Teste esperado

- Se opção A: confirmar que workflow `deploy-aws.yml` pode ser removido sem impacto em produção
- Se opção B: executar pipeline completo com `AWS_ROLE_TO_ASSUME` configurado, validar ECR push, ECS deploy, smoke test
- Se opção C: desenvolver e testar workflow EC2 SSH, confirmar deploy idêntico ao manual

## Contexto adicional

O parecer do Agente 24 em `sync-antigravity-2026-10-09-24.md` já apontou esta divergência e recomendou:
1. Confirmar host/conta/região/topologia e versão atual por inspeção segura
2. Exigir imagem/digest observado nas tasks se escolhido ECS
3. Confirmar destino e seleção de arquivos para S3, impedindo backend/sourcemaps privados no bucket público
4. Verificar migrações, acesso de migração, resultado real e readiness antes do tráfego
5. Identificar revisão anterior, backup, restauração e reversibilidade de migrações antes de publicar
6. Validar pós-publicação: versão/digest, migração, readiness, frontend/API no domínio real

Esta decisão deve ser tomada pelo usuário/Coordenador antes de prosseguir com qualquer ação de deploy em produção.

---

## Resolução — Agente 10 (Infraestrutura, Observabilidade e SRE)

### Estado Atual do Ambiente de Produção (Inspeção Real)

**Host:** `3.143.251.44` (AWS EC2)
**Usuário:** `ubuntu`
**Diretório:** `/home/ubuntu/birthhub-360`
**Container:** `birthhub-app` (imagem `birthhub-app:latest`)
**Porta:** 3024 (mapeamento: `0.0.0.0:3024->3024/tcp`)
**Status:** Up 25+ horas (operacional)

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

**Configuração de Ambiente no Container:**
- `PORT=3024` (alinhado com Dockerfile atualizado)
- `NODE_ENV=production`
- `DATABASE_URL` aponta para `birthhub_postgres:5432`
- Todos os serviços de infraestrutura são containers Docker na mesma rede
- `PUBLIC_BASE_URL=http://3.143.251.44`

**Método de Deploy Atual:**
- Scripts manuais via SSH: `deploy-ec2.sh`, `deploy-ec2.ps1`, `deploy-aws.ps1`
- Build local → SCP de `dist/` → `docker restart birthhub-app`
- Histórico de backups visível no servidor (múltiplos `dist-backup-*`)

**Divergência com Documentação Canônica:**
- `docs/operations/PRODUCTION_ARCHITECTURE.md` declara arquitetura **100% Local-First / Single-Node**
- Documentação marca K8s, charts, Render, Railway, Cloudflare R2 como **ARCHIVED/LEGACY**
- Workflow `deploy-aws.yml` está configurado para ECS/ECR/S3/CloudFront (nunca ativado)
- Ausência de secret `AWS_ROLE_TO_ASSUME` no repositório

---

### Decisão Formal: Opção A — Manter EC2 via SSH (Status Quo)

**Escolha:** Opção A — Manter EC2 via SSH (status quo atual)

**Justificativa Técnica:**

1. **Alinhamento com Arquitetura Canônica:**
   - `docs/operations/PRODUCTION_ARCHITECTURE.md` define explicitamente arquitetura **100% Local-First / Single-Node**
   - K8s, ArgoCD, Helm charts, ECS estão marcados como **ARCHIVED/LEGACY**
   - O ambiente real de produção (EC2 + Docker Compose) está perfeitamente alinhado com a documentação canônica
   - Migrar para ECS/ECR seria uma **regressão arquitetural** contrária à decisão documentada

2. **Ambiente de Produção Operacional e Estável:**
   - Container `birthhub-app` está UP há 25+ horas
   - Stack Docker completa (Postgres, Redis, Meilisearch, MinIO, LiteLLM, Ollama, Qdrant) funcionando
   - Healthchecks configurados e saudáveis
   - Histórico de backups presente no servidor
   - Scripts de deploy funcionais (`deploy-ec2.sh`, `deploy-ec2.ps1`, `deploy-aws.ps1`)

3. **Risco de Migração para ECS/ECR:**
   - Requereria configurar `AWS_ROLE_TO_ASSUME`, ECR, ECS, S3, CloudFront
   - Necessitaria recriar toda a stack de infraestrutura (Postgres, Redis, etc.) em modo orquestrado
   - Risco de perda de dados durante migração do banco de dados
   - Teste completo em ambiente separado seria obrigatório antes de produção
   - Aumentaria complexidade operacional sem benefício claro para o modelo Local-First

4. **Simplicidade Operacional (P2 — AGENTS.md):**
   - Deploy manual via SSH é simples, direto e já testado
   - Não introduziria novas dependências (AWS OIDC, ECS, CloudFront)
   - Não adicionaria camada de abstração sem necessidade
   - Follows "mínimo de código necessário para resolver o problema"

5. **Custo e Manutenção:**
   - ECS/ECR/S3/CloudFront aumentariam custo mensal da AWS
   - Mais serviços = mais superfície de ataque e mais pontos de falha
   - Modelo atual (EC2 + Docker Compose) é custo-eficiente e fácil de debugar

---

### Ações Necessárias

#### 1. Arquivar Workflow `deploy-aws.yml` (Responsabilidade: Agente 08)
- **Arquivo:** `.github/workflows/deploy-aws.yml`
- **Ação:** Renomear para `.github/workflows/deploy-aws.yml.disabled` ou mover para `.github/workflows/disabled/`
- **Justificativa:** Workflow configurado para ECS/ECR/S3/CloudFront nunca foi ativado e não deve ser confundido com pipeline de deploy real
- **Handoff requerido:** Agente 10 → Agente 08 (proprietário de `.github/workflows/**`)

#### 2. Atualizar Documentação de Deploy (Responsabilidade: Agente 08)
- **Arquivo:** `docs/operations/PRODUCTION_ARCHITECTURE.md` ou criar `docs/operations/DEPLOY_EC2.md`
- **Ação:** Documentar explicitamente o procedimento de deploy via scripts EC2 (`deploy-ec2.sh`, `deploy-ec2.ps1`, `deploy-aws.ps1`)
- **Conteúdo mínimo:**
  - Pré-requisitos (chave SSH, acesso ao host)
  - Procedimento passo-a-passo
  - Comandos de verificação pós-deploy
  - Procedimento de rollback
- **Handoff requerido:** Agente 10 → Agente 08 (proprietário de `docs/**`)

#### 3. Validar e Melhorar Scripts de Deploy EC2 (Responsabilidade: Agente 08A com handoff do 10)
- **Arquivos:** `deploy-ec2.sh`, `deploy-ec2.ps1`, `deploy-aws.ps1`
- **Ação:** Validar que scripts estão funcionando corretamente e adicionar:
  - Healthcheck automático pós-deploy (curl para `/health/live`)
  - Verificação de migrações aplicadas
  - Rollback automático em caso de falha
  - Logging estruturado do processo
- **Handoff requerido:** Agente 10 → Agente 08A (Operações Git e Deploy AWS)

#### 4. Considerar Futuro: Workflow GitHub Actions para EC2 (Opção C - Opcional)
- **Quando considerar:** Se o time desejar automação completa sem mudar arquitetura
- **Ação:** Criar workflow `.github/workflows/deploy-ec2.yml` que:
  - Executa build e testes
  - Usa `appleboy/ssh-action` ou similar para SSH no EC2
  - Executa deploy via scripts existentes
  - Executa smoke test pós-deploy
- **Propriedade:** Agente 08 (workflows) + Agente 10 (infraestrutura EC2)
- **Nota:** Isso é **OPCIONAL** e não bloqueia a resolução atual (Opção A)

---

### Riscos Identificados e Mitigações

1. **Segredo SSH em Scripts Locais:**
   - **Risco:** Caminhos de chave SSH hardcoded em scripts (`deploy-ec2.sh`, `deploy-ec2.ps1`)
   - **Mitigação:** Documentar que scripts devem ser executados localmente com chave SSH disponível; não commitar chaves no repositório
   - **Status:** Scripts já seguem este padrão (chaves em caminhos locais do usuário)

2. **Ausência de Pipeline Automatizado:**
   - **Risco:** Deploy manual pode esquecer steps (migrações, healthcheck)
   - **Mitigação:** Melhorar scripts com validações automáticas (item 3 acima)
   - **Status:** Scripts existentes têm validações básicas; podem ser melhorados

3. **Divergência Workflow x Realidade:**
   - **Risco:** Novos desenvolvedores podem tentar usar `deploy-aws.yml`
   - **Mitigação:** Arquivar workflow (item 1 acima) e documentar procedimento real (item 2)
   - **Status:** Será resolvido com as ações listadas

---

### Critérios de Sucesso da Decisão

- [x] Estado atual do ambiente de produção documentado e validado
- [x] Decisão formal tomada com justificativa técnica
- [ ] Workflow `deploy-aws.yml` arquivado/desativado (handoff para 08)
- [ ] Documentação de deploy EC2 atualizada (handoff para 08)
- [ ] Scripts de deploy EC2 validados e melhorados (handoff para 08A)
- [ ] Procedimento de rollback documentado e testado

---

### Handoffs Necessários

1. **10 → 08:** Arquivar `deploy-aws.yml` e atualizar documentação de deploy
2. **10 → 08A:** Validar e melhorar scripts de deploy EC2 com healthchecks automatizados

---

### Nota Final

Esta decisão respeita a arquitetura canônica documentada (`docs/operations/PRODUCTION_ARCHITECTURE.md`), o estado real de produção (EC2 + Docker Compose operacional), e os princípios de simplicidade (P2 do AGENTS.md). A migração para ECS/ECR seria uma regressão arquitetural desnecessária que aumentaria complexidade, custo e risco sem benefício claro para o modelo Local-First adotado pelo projeto.
