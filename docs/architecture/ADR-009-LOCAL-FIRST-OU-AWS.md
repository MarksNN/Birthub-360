# ADR-009: Decisão de Arquitetura — Manutenção do Modelo LOCAL-FIRST e Estratégia de Transição para Nuvem Soberana

**Data:** 22 de outubro de 2026  
**Status:** ACCEPTED  
**Decisores:** Agente 00 (Coordenador Global), Agente 01 (Plataforma e Dados), Agente 10 (Infraestrutura e SRE)  
**Autor:** Agente 00 — Coordenador Global  

---

## 1. Contexto e Problema

O Birth Hub 360 opera como uma plataforma de inteligência preditiva, CRM, prospecção e copiloto comercial em tempo real com processamento de voz, WhatsApp e IA generativa.
Durante as primeiras fases de implantação com clientes piloto e operações comerciais intensivas em solo brasileiro, surgiu a decisão estratégica entre:
1. Manter a arquitetura **LOCAL-FIRST / Nuvem On-Premise Soberana** (servidores dedicados com Docker, PostgreSQL próprio com criptografia AES-256 e sem dependência de nuvens públicas de hiperescala).
2. Realizar migração imediata para **AWS (Amazon Web Services)** com serviços gerenciados (ECS/EKS, RDS, S3).

## 2. Critérios de Avaliação

- **Soberania e Privacidade LGPD:** Dados de voz, gravações de clientes e documentos comerciais devem permanecer sob custódia territorial restrita e sem trânsito transfronteiriço involuntário.
- **FinOps e Eficiência de Custo:** Custos fixos e previsíveis de infraestrutura vs. volatilidade de precificação em dólares (USD) de serviços de nuvem para tráfego intenso de websockets e inferência.
- **Latência e Tempo Real:** Interações de voz bimodal exigem TTFB < 800ms e barge-in subsegundo (< 300ms), favorecidas por proximidade de nós locais.
- **Isolamento de Falhas:** Resiliência a bloqueios externos e capacidade de execução isolada (air-gapped ou ambiente fechado do cliente).

## 3. Decisão

**Decidido por: MANTER A PLATAFORMA EM OPERAÇÃO LOCAL-FIRST NO LANÇAMENTO V1.0.0, COM CAPACIDADE HYBRID-CLOUD READY VIA INFRAESTRUTURA COMO CÓDIGO (IaC).**

- A versão 1.0.0 será lançada e operada formalmente no modelo **LOCAL-FIRST**, com orquestração via Docker Compose robusto, Nginx de alta performance com Brotli/Gzip, PostgreSQL 16 com RLS rigoroso e observabilidade centralizada.
- A migração para AWS ou outros provedores de nuvem é mantida como extensão futura desacoplada, utilizando templates modulares já homologados em `infrastructure/` e pipelines automatizados do Agente 08A, sem que nenhuma parte da aplicação dependa de SDKs proprietários ou vendor lock-in.

## 4. Consequências

- **Positivas:**
  - Custo operacional altamente previsível (FinOps zero-waste).
  - Conformidade nativa com a LGPD sem necessidade de transferências internacionais de dados pessoais.
  - Latência de websockets e rede minimizada para operadores locais.
  - Independência total de fornecedores proprietários.
- **Mitigações Técnicas:**
  - Backups criptografados automatizados diários com teste de restauração contínuo (Passo 89).
  - Procedimento de Disaster Recovery documentado com RTO < 15 min e RPO < 1 min (Passo 91).
