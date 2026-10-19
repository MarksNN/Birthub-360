# ONDA 03 — CONTRATOS DAS CADÊNCIAS ADAPTATIVAS
**Eixo 7: Interfaces e Contratos Canônicos para Cadências Reativas**  
**Projeto:** Birth Hub 360°  
**Data:** Outubro de 2026  

---

## 1. Contrato Canônico de Cadência Adaptativa
Localização no repositório: `src/shared/contracts/selfDrivingCrm.contract.ts`.

### 1.1. Ingestão de Sinal de Engajamento
```typescript
export interface EngagementSignal {
  id: string;
  organizationId: string;
  leadId: string;
  dealId?: string;
  channel: EngagementChannel;
  signalType: EngagementSignalType;
  timestamp: string;
  verified: boolean;
  confidence: number; // 0.0 a 1.0
  metadata?: Record<string, unknown>;
}
```

### 1.2. Recomendação de Cadência
```typescript
export interface CadenceRecommendation {
  id: string;
  organizationId: string;
  leadId: string;
  recommendedAction:
    | 'reduce_calls_shift_whatsapp'
    | 'switch_to_email_consultative'
    | 'accelerate_touchpoints'
    | 'pause_cadence'
    | 'reactivate_with_new_angle';
  prioritizedChannel: EngagementChannel;
  suggestedContactWindow: string;
  rationale: string;
  proposedTouchAdjustments: {
    channel: EngagementChannel;
    currentFrequencyPerWeek: number;
    proposedFrequencyPerWeek: number;
    delayAdjustmentHours?: number;
  }[];
  autonomyLevel: 'ASSIST' | 'DRAFT' | 'CONTROLLED_AUTO';
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  approvedBy?: string;
  appliedAt?: string;
}
```

### 1.3. Análise de Leads Estagnados
```typescript
export interface StagnantLeadAnalysis {
  leadId: string;
  leadName: string;
  currentStage: string;
  daysWithoutActivity: number;
  hasActiveDeal: boolean;
  isOptedOut: boolean;
  eligibleForReactivation: boolean;
  ineligibilityReason?: string;
  recommendedStrategy?:
    | 'diagnostic_refresh'
    | 'consultative_breakup'
    | 'multidecision_stakeholder'
    | 'case_study_share';
  suggestedCopySubject?: string;
  suggestedCopyBody?: string;
}
```

---

## 2. Eventos Associados no DomainEventMesh
- `ENGAGEMENT_SIGNAL_RECEIVED`: Emitido quando qualquer interação de canal é validada.
- `CADENCE_RECOMMENDATION_CREATED`: Emitido ao concluir avaliação de otimização de toques.
- `CADENCE_CHANGE_APPROVED`: Emitido quando a supervisão comercial aprova a alteração da esteira.
- `LEAD_STAGNATED`: Emitido quando a varredura identifica inatividade superior ao limiar do tenant.
- `LEAD_REACTIVATION_SUGGESTED`: Emitido com proposta de abordagem para leads elegíveis.
- `LEAD_REACTIVATED`: Emitido após aprovação da reativação e inserção na cadência.
