# PLANO DE EXECUÇÃO — ONDA 01: FUNDAÇÃO DA INTELIGÊNCIA AUTÔNOMA
**Projeto:** BIRTH HUB 360  
**Versão:** 1.0.0 — Data: 2026-10-18  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  
**Branch de Integração:** `integracao/onda-01`  

---

## 1. Visão Geral e Arquitetura Unificada

A Onda 01 estabelece a infraestrutura compartilhada de inteligência autônoma do Birth Hub 360, integrando cinco eixos tecnológicos às seis capacidades consolidadas na Onda 00 (C1-RevOps, C2-Gamificação, C3-Roleplay, C4-Social Selling, C5-VoiceHub, C6-Mobile).

### Diagrama Arquitetural de Fluxo de Dados (Mermaid)

```mermaid
flowchart TD
    subgraph S1["1. Fontes Comerciais"]
        V[VoiceHub - C5]
        M[Mobile Campo - C6]
        CRM[CRM / Bitrix24 - C1]
        SS[Social Selling - C4]
    end

    subgraph S2["2. Ingestão Protegida & Privacidade"]
        PII[Tokenização & Minimização PII - Agente 15]
        CHAIN[Trilha de Consentimento Hash-Chaining - Agente 15]
    end

    subgraph S3["3. Event Mesh & Confiabilidade"]
        DEM[DomainEventMesh - Agente 16 / 18]
        OUTBOX[Transactional Outbox - Agente 16]
        REDIS[Redis Dedup & Idempotência - Agente 16]
    end

    subgraph S4["4. Curadoria & Inteligência Contextual"]
        FLY[Data Flywheel - Agente 07 / 13]
        CUR[Curadoria de Objeções & Copys - Agente 07]
        RAG[RAG Híbrido RRF k=60 - Agente 07]
        SIM[Similar Deals Engine - Agente 07 / 04]
    end

    subgraph S5["5. FinOps & AI Gateway"]
        CACHE[Cache Semântico Multi-Tenant - Agente 07 / 23]
        CASC[Model Cascade Roteamento - Agente 07 / 23]
        GATE[AI Gateway Seguro - Agente 07]
    end

    subgraph S6["6. As Seis Capacidades Habilitadas"]
        RP[Roleplay Dinâmico - C3]
        GAM[Gamificação - C2]
        REV[RevOps & Riscos - C1]
        SOC[Social Selling - C4]
        VOI[VoiceHub - C5]
        MOB[Mobile - C6]
    end

    %% Ligações de Ingestão
    V --> PII
    M --> PII
    CRM --> PII
    SS --> PII
    PII --> CHAIN
    CHAIN --> OUTBOX
    OUTBOX --> DEM
    DEM --> REDIS

    %% Ligações de Eventos para Curadoria e RAG
    DEM --> FLY
    FLY --> CUR
    CUR --> RAG
    CRM --> SIM
    SIM --> RAG

    %% Ligações de RAG e FinOps
    RAG --> CACHE
    CACHE --> CASC
    CASC --> GATE

    %% Retroalimentação para as Capacidades
    GATE --> RP
    GATE --> SOC
    GATE --> REV
    RP --> GAM
    SOC --> CRM
    CRM --> DEM
```

---

## 2. Roteiro de Implementação Cirúrgica em 7 Fases

### Fase 1: Contratos Compartilhados Versionados (Agente 18 & 01)
- `src/shared/contracts/domainEventMesh.contract.ts`: Tipagem estrita de envelopes de eventos, tipos canônicos e metadados de rastreabilidade.
- `src/shared/contracts/dataFlywheel.contract.ts`: Contratos de extração de objeções, ciclo de vida de curadoria e copys vencedoras.
- `src/shared/contracts/semanticCache.contract.ts`: Interfaces para chaves compostas, TTL e políticas de isolamento multi-tenant.
- `src/shared/contracts/consentAudit.contract.ts`: Tipagem de hash chaining criptográfico e inventário de consentimento.

### Fase 2: DomainEventMesh & Resiliência Assíncrona (Agente 16 & 13)
- `src/lib/queue/domainEventMesh.service.ts`: Publicação desacoplada, outbox seguro, deduplicação em Redis por TTL e proteção contra ciclos causais.
- `src/lib/queue/domainEventMesh.queue.ts`: Fila BullMQ com Dead-Letter Queue e retries exponenciais configurados.
- Integração dos 5 fluxos canônicos de eventos (Reunião Mobile, Chamada VoiceHub, Risco Elevado, Roleplay Concluído, Abordagem Convertida).

### Fase 3: Data Flywheel & Curadoria Comercial (Agente 07, 13, 12)
- `src/features/playbook/services/curatedObjection.service.ts`: Gestão do ciclo de vida das objeções (`DETECTED` -> `NORMALIZED` -> `REVIEW_REQUIRED`/`VERIFIED` -> `PROMOTED`/`REJECTED` -> `RETRACTED`).
- Conexão nativa ao `PlaybookRoleplayAdapter` e suporte à revogação imediata.
- `src/features/intelligence/services/commercialLearningFlywheel.service.ts`: Identificação de abordagens com conversão real e alimentação de biblioteca few-shot sem fine-tuning automático.

### Fase 4: RAG Híbrido Multi-Tenant & Deals Semelhantes (Agente 07, 01)
- `src/features/knowledge/similarDeals.service.ts`: Busca de até 3 negociações ganhas do mesmo tenant com contextualização explicável.
- Enriquecimento dos guardrails contra prompt injection no RAG.

### Fase 5: FinOps, Cache Semântico & Model Cascade (Agente 07, 23)
- `src/lib/ai/cache/semanticCache.service.ts`: Armazenamento de respostas geradas com isolamento estrito por `organizationId` e hash seguro.
- `src/lib/ai/gateway/model-cascade.ts`: Classificação de complexidade (Baixa, Média, Alta) e roteamento de modelos.

### Fase 6: Privacy-Preserving AI & Consent Hash Chain (Agente 15, 21, 22)
- `src/lib/security/piiTokenizer.service.ts`: Tokenização reversível baseada em sessão com reconstituição autorizada sob demanda.
- `src/lib/security/consentAuditChain.service.ts`: Encadeamento criptográfico SHA-256 e verificação de adulteração.

### Fase 7: Testes Integrados, Validação E2E e Auditoria 24 (Agente 08 & 24)
- Suítes de testes unitários e de integração cobrindo todos os eixos.
- Gate técnico completo (`typecheck`, `lint`, `test:architecture`, `test:unit`).
- Emissão do parecer independente pelo Agente 24.
