# Qdrant Vector Database - Deploy Guide

Onda IA-1 - Agente 10

## Visão Geral

Qdrant é um vector database open source para embeddings. Este deploy configura Qdrant como serviço self-hosted via Docker Compose.

## Arquitetura

- **Portas**: 6333 (HTTP), 6334 (gRPC)
- **Persistência**: Volume Docker `qdrant_data`
- **Healthcheck**: `/health` endpoint a cada 30s
- **Restart Policy**: `unless-stopped`

## Deploy

### Pré-requisitos

- Docker Desktop instalado
- Docker Compose disponível

### Comandos

```bash
# Subir serviço isoladamente via compose de serviços canônico (recomendado)
docker compose -f docker-compose.services.yml up -d qdrant

# Ou via overlay dedicado
docker compose -f docker-compose.qdrant.yml up -d

# Ver logs
docker compose -f docker-compose.services.yml logs -f qdrant

# Parar serviço
docker compose -f docker-compose.services.yml stop qdrant

# Reiniciar
docker compose -f docker-compose.services.yml restart qdrant
```

## Configuração

### Variáveis de Ambiente

Adicionar ao `.env`:

```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Deixar vazio para setup local sem autenticação
```

### Multi-tenant

Cada coleção deve ser prefixada com `tenantId` para isolamento:

```typescript
// Exemplo: coleção por tenant
const collectionName = `tenant_${tenantId}_documents`
```

## Backup e Restore

### Backup

```bash
# Backup do volume
docker run --rm -v birthhub_qdrant_data:/data -v $(pwd):/backup alpine tar czf /backup/qdrant-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore

```bash
# Restore do volume
docker run --rm -v birthhub_qdrant_data:/data -v $(pwd):/backup alpine tar xzf /backup/qdrant-backup-YYYYMMDD.tar.gz -C /
```

## Segurança

### Produção

Para produção, considerar:
- Ativar autenticação via API key
- Usar rede isolada
- Habilitar TLS/HTTPS
- Configurar backup automático
- Monitorar via Prometheus

### Autenticação

Adicionar ao docker-compose:

```yaml
environment:
  - QDRANT__SERVICE__API_KEY=your-secret-key
```

## Monitoramento

### Health Check

```bash
curl http://localhost:6333/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "version": "x.y.z"
}
```

### Metrics Endpoint

```bash
curl http://localhost:6333/metrics
```

## Troubleshooting

### Container não inicia

```bash
docker-compose -f docker-compose.qdrant.yml logs qdrant
```

### Porta já em uso

Editar `docker-compose.qdrant.yml` e alterar as portas mapeadas.

### Volume não persiste

Verificar se o volume `birthhub_qdrant_data` existe:

```bash
docker volume ls | grep birthhub_qdrant_data
```

## Integração com Aplicação

O cliente Qdrant já está implementado em `src/lib/ai/embeddings/qdrant.ts`.

Ver handoff: `.agents/handoffs/onda-ia-1/07-para-10-qdrant-config.md`

