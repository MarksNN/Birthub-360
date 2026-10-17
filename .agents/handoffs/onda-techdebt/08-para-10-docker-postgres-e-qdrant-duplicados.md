- De: 08
- Para: 10
- Onda: techdebt
- Status: resolvido
- Prioridade: normal

## Problema
Identificada duplicidade e desatualização em arquivos Docker pertencentes ao Agente 10 (conforme `/docker/AGENTS.md` e cabeçalhos de arquivo):

1. `docker/postgres/Dockerfile`:
   - Construído originalmente para `docker-compose.oci.yml` (serviço `postgres`), caminho de deploy que foi descontinuado e removido na refatoração DEVOPS-010.
   - Permanece fixado em `FROM pgvector/pgvector:pg16` e `postgresql-16-postgis-3`, enquanto a padronização de banco do projeto e workflows de CI direcionaram para PostgreSQL 17 (commit `8d6812e15`).
   - O Compose local ativo (`docker-compose.postgres-local.yml`) consome a imagem diretamente do registry (`pgvector/pgvector:pg16` / `maarkss/postgres-intelligence:16`) e não compila `docker/postgres/Dockerfile`.
   - O arquivo está órfão ou desatualizado em relação à versão canônica de Postgres do projeto.

2. `docker-compose.qdrant.yml`:
   - Duplica a definição completa do serviço `qdrant` já centralizado em `docker-compose.services.yml` (OS-5).
   - Utiliza a propriedade obsoleta `version: '3.8'` do Compose v2 e nomenclatura de container divergente (`birthhub-qdrant` vs `birthhub_qdrant`).

## Arquivo(s) envolvido(s)
- `docker/postgres/Dockerfile` (propriedade do Agente 10 via `docker/AGENTS.md`)
- `docker-compose.qdrant.yml` (propriedade do Agente 10 via comentário de cabeçalho)
- `docker-compose.services.yml`
- `docker-compose.postgres-local.yml`

## Alteração necessária
1. Avaliar se `docker/postgres/Dockerfile` ainda possui caso de uso (ex.: se for necessário gerar imagem personalizada com PostGIS + pgvector + TLS autoassinado). Em caso positivo, atualizar para Postgres 17 (`FROM pgvector/pgvector:pg17` e extensões pg17) e alinhar com `docker-compose.postgres-local.yml`. Em caso negativo, remover o Dockerfile órfão.
2. Consolidar `docker-compose.qdrant.yml` em `docker-compose.services.yml` (ou alinhar a documentação em `infrastructure/qdrant/README.md`) e remover a chave obsoleta `version: '3.8'`.

## Teste esperado
- Subir a stack com `docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml -f docker-compose.services.yml up -d` sem warnings de chave obsoleta ou serviços divergentes.
- Verificação de que não há builds Docker quebrados por referências a versões antigas do Postgres (16 vs 17).

## Contexto adicional
Investigação da dívida técnica "Dockerfiles duplicados ou desatualizados" pelo Agente 08. As alterações no `Dockerfile` principal da raiz e no `.dockerignore` foram tratadas e corrigidas diretamente pelo Agente 08 (proprietário exclusivo).

## Resolução (Agente 10 — Infraestrutura e SRE)
Handoff atendido e resolvido pelo Agente 10:

1. **`docker/postgres/Dockerfile` atualizado:**
   - Base atualizada de `pgvector/pgvector:pg16` para `pgvector/pgvector:pg17`.
   - Dependência atualizada para `postgresql-17-postgis-3`.
   - Comentários limpos para remover referências legadas ao antigo deploy OCI e clarificar seu papel como imagem auxiliar local com PostGIS + pgvector + TLS autoassinado.

2. **`docker-compose.qdrant.yml` padronizado:**
   - Removida a chave obsoleta `version: '3.8'` do Compose v2, eliminando avisos de depreciação.
   - `container_name` alinhado para `birthhub_qdrant` (convenção canônica da stack).
   - Healthcheck alinhado para `http://127.0.0.1:6333/healthz`, consistente com `docker-compose.services.yml` e `infrastructure/qdrant/README.md`.
   - Volume de persistência consolidado e unificado para `birthhub_qdrant_data` (eliminando divergência com `docker-compose.services.yml`).
   - `docker-compose.postgres-local.yml` alinhado para `pgvector/pgvector:pg17` com suporte a compilação do `docker/postgres/Dockerfile` (PostGIS 3 + TLS).

## Status Final
CONCLUÍDO E HOMOLOGADO.

