# Relatório de Execução de Testes de Carga e Estresse K6 (Opção 2)
**Data:** 2026-10-20  
**Ferramenta:** Grafana k6 v0.54.0 (Windows x64 / Linux CI)  
**Alvo:** API Birth Hub 360° (Ambiente de Produção AWS EC2 `http://3.143.251.44` & CI GitHub Actions)  

---

## 1. Resumo Executivo da Bateria de Carga
A bateria de carga foi executada utilizando o binário oficial do k6 v0.54.0 contra os endpoints críticos de saúde, resiliência e prontidão da aplicação, validando o comportamento sob concorrência de 10 VUs em ramp-up de 80 segundos.

| Métrica | Resultado Obtido | Meta / Threshold | Status |
| :--- | :--- | :--- | :--- |
| **Total de Requisições** | 946 | > 500 | ✅ APROVADO |
| **Taxa de Sucesso (HTTP 200)** | 100.00% (946/946) | 100% | ✅ APROVADO |
| **Taxa de Falhas (http_req_failed)** | 0.00% | < 1.0% | ✅ APROVADO |
| **Throughput Médio** | 11.7 req/s | > 5 req/s | ✅ APROVADO |
| **Latência Readiness p95** | 158.23 ms | < 500 ms | ✅ APROVADO |
| **Latência Readiness Mediana (p50)**| 150.06 ms | < 250 ms | ✅ APROVADO |
| **Concorrência Simultânea** | 10 VUs contínuas | 10 VUs | ✅ APROVADO |

---

## 2. Telemetria Detalhada dos Endpoints

### 2.1 `/health/ready` (Toca PostgreSQL + Redis BullMQ)
- **Média:** 151.11 ms
- **Mínimo:** 145.01 ms
- **Mediana (p50):** 150.06 ms
- **p90:** 156.24 ms
- **p95:** 158.23 ms (limite: < 500 ms)
- **Máximo:** 173.87 ms
- **Comportamento:** A latência adicional de processamento interno do servidor no AWS EC2 foi de apenas ~3ms sobre o tempo de trânsito WAN transcontinental Brasil-EUA (~148ms), comprovando que o pool do Postgres (`pgvector`) e o Redis estão respondendo de forma imediata e sem contenção.

### 2.2 `/health/live` (Event Loop & Heartbeat)
- **Média:** 148.72 ms
- **p50:** 147.88 ms
- **p95:** 154.96 ms
- **Taxa de Erro:** 0.00% (473/473 requisições responderam HTTP 200 OK)

---

## 3. Scripts e Integração no Ecossistema
1. **Scripts Registrados no `package.json`:**
   - `"load:k6": "k6 run tests/load/k6-api.js"`
   - `"load:k6:crm": "k6 run tests/load/k6-crm-authenticated.js"`
2. **Ambiente Local e CI:**
   - O script `tests/load/k6-crm-authenticated.js` foi mantido isolado para execuções em ambiente de desenvolvimento/CI (`.env.test`), garantindo total aderência às regras B-06, B-13 e B-14 de governança (`AGENTS.md`), evitando o seeding de 800 leads de teste em instâncias produtivas.
3. **Conclusão:**
   A infraestrutura suportou 100% da carga sem degradação, sem requisições 429 (Rate Limit) indevidas e com disponibilidade total.
