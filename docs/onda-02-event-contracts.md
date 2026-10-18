# CONTRATOS DE EVENTOS DO DOMAINEVENTMESH — ONDA 02
**Projeto:** Birth Hub 360°  
**Barramento:** `src/lib/queue/domainEventMesh.service.ts`  
**Contrato Geral:** `src/shared/contracts/domainEventMesh.contract.ts`  

---

## Novos Eventos Canônicos Adicionados na Onda 02

### 1. `MARKET_SIGNAL_DETECTED` (Versão 1.0.0)
- **Disparado por:** `MarketSensingService`
- **Gatilho:** Novo sinal exógeno verificado e vinculado a conta ou setor.
- **Payload:**
  ```json
  {
    "signalId": "sig-uuid",
    "category": "regulatory_change",
    "title": "Nova Resolução Setorial de Conformidade",
    "sourceUrl": "https://diariooficial.gov.br/...",
    "confidenceScore": 0.95,
    "companyName": "Mercado Regulado / Setorial",
    "relevanceScore": 88
  }
  ```

### 2. `PROMISE_COMMITMENT_DETECTED` (Versão 1.0.0)
- **Disparado por:** `PromiseGuardianAgent`
- **Gatilho:** Compromisso comercial extraído de transcrição de reunião/chamada.
- **Payload:**
  ```json
  {
    "commitmentId": "prom-uuid",
    "commitmentType": "send_proposal",
    "promiserName": "Marcos Executivo",
    "recipientName": "Cliente / Decisor",
    "dueDate": "2026-10-20T14:00:00Z",
    "approvalStatus": "pending_human_review",
    "evidenceSnippet": "Trecho da fala contendo a promessa"
  }
  ```

### 3. `DEVILS_ADVOCATE_ALERT` (Versão 1.0.0)
- **Disparado por:** `DevilsAdvocateAgent`
- **Gatilho:** Avaliação de risco de forecast com viés de otimismo ou estagnação.
- **Payload:**
  ```json
  {
    "dealId": "deal-uuid",
    "dealTitle": "Implantação Enterprise",
    "optimismBiasDetected": true,
    "recommendedAction": "downgrade_probability",
    "currentProbability": 90,
    "recommendedProbability": 60,
    "stagnationDays": 25
  }
  ```

### 4. `WIN_LOSS_AUTOPSY_COMPLETED` (Versão 1.0.0)
- **Disparado por:** `WinLossAutopsyService`
- **Gatilho:** Finalização do relatório forense de oportunidade ganha ou perdida.
- **Payload:**
  ```json
  {
    "autopsyId": "autopsy-uuid",
    "dealId": "deal-uuid",
    "outcome": "DEAL_LOST",
    "dealTitle": "Migração de Sistema",
    "salesCycleDays": 45,
    "primaryHypothesis": "Atrito na percepção de valor x faixa orçamentária"
  }
  ```

### 5. `GRAPH_RELATIONSHIP_UPDATED` (Versão 1.0.0)
- **Disparado por:** `AccountKnowledgeGraphService`
- **Gatilho:** Inclusão, alteração ou confirmação de aresta no Knowledge Graph.
- **Payload:**
  ```json
  {
    "edgeId": "edge-uuid",
    "sourceNodeId": "dm-uuid",
    "targetNodeId": "acc-uuid",
    "relationshipType": "WORKS_AT",
    "confidence": "confirmed"
  }
  ```
