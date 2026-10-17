# RELATÓRIO DE PERFORMANCE, RESILIÊNCIA E OBSERVABILIDADE

**Projeto:** Birth Hub 360° / Birthub 360  
**Data:** 2026-10-17  
**Responsáveis:** Agente 10 (SRE e Infraestrutura), Agente 16 (Runtime e Filas) & Agente 23 (Custo e Performance de IA)  
**Auditor Independente:** Agente 24  

---

## 1. LIMITES OPERACIONAIS E ORÇAMENTOS DE PERFORMANCE (BUDGETS)

### 1.1. Frontend Bundle Budget
- **Limite Máximo Permitido:** 3,14 MB compactado (gzip).
- **Consumo Real Medido:** 2,13 MB (2.136.474 bytes gzipados distribuídos em 141 chunks).
- **Margem de Segurança:** 32,1% de folga abaixo do teto estrito de CI.
- **Maiores Chunks Otimizados:**
  1. `Sparkles-WvkRHw7L.js`: 273 kB gzip (Three.js / Shader FX isolado com code splitting).
  2. `vendor-excel-CFch5A7j.js`: 269 kB gzip (SheetJS carregado sob demanda para exportação).
  3. `vendor-echarts-Bx2E32dG.js`: 221 kB gzip (Gráficos analíticos carregados sob demanda).
  4. `vendor-react-sGtgO80U.js`: 203 kB gzip (Core framework e hooks compartilhados).

### 1.2. Public Assets Budget
- `public/`: Não possui arquivos pesados estáticos soltos; todos os ícones, fontes e texturas são servidos com hashing imutável e compressão Brotil/Gzip em `dist/assets/`.

---

## 2. ARQUITETURA DE RESILIÊNCIA E FILAS (REDIS / BULLMQ)

1. **Topologia de Filas:**
   - Filas assíncronas dedicadas em `src/lib/queue/`: `bitrixSync`, `coldCall`, `enrichment`, `knowledgeIngestion`, `search`, `whatsappCommand`.
2. **Circuit Breakers & Retries:**
   - Integração com IA (`Groq`, `OpenAI`, `Whisper`) envelopada por Circuit Breaker configurado com limite de 5 falhas consecutivas antes de abrir o circuito por 30s.
   - Retentativas automáticas com backoff exponencial e jitter para evitar thundering herd.
3. **Dead-Letter Queues (DLQ):**
   - Mensagens que falham após 5 tentativas são movidas automaticamente para `src/lib/queue/deadLetter.ts` com payload sanitizado e motivo do erro para inspeção humana.
4. **Locks Distribuídos:**
   - Sincronização de leads e extrações Bitrix protegidas por `distributedLock.ts` via Redis, prevenindo concorrência e processamento duplicado de webhooks.

---

## 3. TELEMETRIA E OBSERVABILIDADE

1. **Logs Estruturados:**
   - Implementado via Pino com níveis padronizados (`INFO`, `WARN`, `ERROR`), incluindo metadados obrigatórios em todas as entradas: `service`, `env`, `organizationId`, `correlationId`, `durationMs`.
2. **Métricas HTTP e de Filas:**
   - Métricas de duração de requisição e contadores de fila registrados em `src/lib/queue/metrics.ts` e expostos para Prometheus / CloudWatch.
3. **Health Checks Operacionais:**
   - `/health/live`: Liveness probe retornando status 200 rápido para o orquestrador (Docker / ECS / K8s).
   - `/health/ready`: Readiness probe confirmando conectividade viva com PostgreSQL (`SELECT 1`), Redis (`PING`) e armazenamento S3.
   - `/health/version`: Informa commit SHA, versão e tempo de atividade do container.
