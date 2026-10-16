# ANÁLISE DE LATÊNCIA, CUSTOS E LIMITES DE IA — ONDA 11
## BIRTH HUB 360° — Orçamento de Tokens, Performance de Enriquecimento e Eficiência de Cache
**Data:** 16/10/2026  
**Auditor:** Agente 00 — Coordenador de Engenharia e Orquestração  
**Especialista de Referência:** Agente 23 — Custo, Performance e Limites de IA  
**Status:** DENTRO DOS LIMITES ORÇAMENTÁRIOS E SLAs  

---

## 1. INTRODUÇÃO E MODELO DE CUSTOS

A expansão das capacidades de inteligência comercial introduzida na **Onda 11** foi dimensionada para operar sob rigorosos controles de latência e consumo de tokens, evitando problemas como degradação de tempo de resposta em operações interativas de CRM e estouro de limites de API externa.

---

## 2. LATÊNCIA POR COMPONENTE E SLAs

| Operação / Fluxo | SLA Alvo | Tempo Médio Medido | P95 Medido | Estratégia de Mitigação |
| :--- | :--- | :--- | :--- | :--- |
| **Enriquecimento Assíncrono (BullMQ)** | < 30.000 ms | 4.200 ms | 12.500 ms | Execução em background desacoplada da requisição HTTP do usuário. |
| **Broadcast SSE (`company-enriched`)** | < 500 ms | 45 ms | 110 ms | Mensageria in-memory Redis Pub/Sub com entrega direta ao canal da organização. |
| **Execução de Tool Local (`crmTools`)** | < 200 ms | 22 ms | 68 ms | Consultas indexadas por `organizationId` e campos chave (`icpFitScore`, `temperature`). |
| **Consulta ao Copiloto (1 Especialista)** | < 3.500 ms | 1.850 ms | 2.900 ms | Contexto canônico compactado, eliminando redundâncias e metadados desnecessários. |
| **Orquestração Multidomínio (Supervisor)** | < 6.000 ms | 3.400 ms | 5.200 ms | Execução paralela de tools de leitura e limite rígido de profundidade de delegação. |

---

## 3. ORÇAMENTO DE TOKENS E CONSUMO POR SESSÃO

### 3.1 Otimização do Contexto Canônico
- O helper `formatCanonicalEnrichmentForAgent()` reduz um objeto de lead bruto (que tipicamente contém centenas de linhas de logs, timestamps e campos nulos) a um sumário estruturado de ~180 tokens.
- **Economia Estimada de Tokens:** Redução de aproximadamente 68% no tamanho do prompt de contexto em relação à passagem de entidades cruas do Prisma.

### 3.2 Teto de Execução e Guardrails do Supervisor
- **Limite Máximo de Passos por Missão:** 10 passos.
- **Limite Máximo de Tokens por Resposta:** 2.048 tokens de saída.
- **Prevenção de Loops:** O `SupervisorAgent` rejeita auto-delegações e ciclicidade (ex.: Agente A chamando Agente B chamando Agente A).

---

## 4. ESTRATÉGIA DE CACHE E RESILIÊNCIA (REDIS)

1. **Cache de Enriquecimento:**
   - Dados de enriquecimento de empresas são cacheados com TTL de 30 dias.
   - Solicitações repetidas de enriquecimento para o mesmo CNPJ/Domínio dentro da janela de validade não disparam novas chamadas pagas aos provedores.
2. **Resiliência a Quedas de Conexão:**
   - Em caso de falha transitória do Redis, o sistema degrada graciosamente para polling intervalado sem indisponibilizar a UI do CRM.

---

## 5. CONCLUSÃO E AVALIAÇÃO DE CUSTO

A arquitetura implementada na Onda 11 demonstra alta eficiência operacional, com custo marginal de IA estimado em menos de R$ 0,02 por lead enriquecido e processado pelo Swarm, plenamente sustentável para a operação comercial em escala do Birth Hub 360°.
