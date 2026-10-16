# MATRIZ DE INTEGRAÇÃO — ONDA 11
## BIRTH HUB 360° — Mapeamento Canônico de Dados, Ferramentas, Eventos e Consumo por Agentes
**Data:** 16/10/2026  
**Autor:** Agente 00 — Coordenador de Engenharia e Orquestração  
**Auditoria de Referência:** Agente 24 (`.agents/reviews/24-onda-11-revisao-independente.md`)  
**Status:** VALIDADO E EM HOMOLOGAÇÃO  

---

## 1. INTRODUÇÃO E ESCOPO

Este documento consolida a rastreabilidade ponta a ponta da **Onda 11**, demonstrando a jornada dos dados de enriquecimento e inteligência comercial: desde a captação e processamento multi-provedor no CRM até a ingestão canônica, ferramentas do Intelligence Hub, Swarm Autônomo e visualização no Kanban e Copiloto.

---

## 2. MATRIZ DE DADOS CANÔNICOS (`CanonicalEnrichmentContext` v1.0.0)

| Campo Canônico | Tipo | Origem no Prisma / Serviço | Sensibilidade (LGPD) | Propósito Comercial |
| :--- | :--- | :--- | :--- | :--- |
| `leadId` | `string` | `Lead.id` | Identificador Interno | Indexação e correlação da oportunidade |
| `organizationId` | `string` | `Lead.organizationId` | Crítico (Tenant ID) | **Isolamento de Tenant estrito** |
| `companyId` | `string \| null` | `Lead.companyId` | Identificador Interno | Vínculo com a conta/empresa |
| `status` | `EnrichmentStatus` | `Lead.enrichmentStatus` \| `Company.enrichmentStatus` | Metadado de Processo | Determina confiabilidade e frescor |
| `updatedAt` | `string` | `Lead.enrichedAt` \| `Company.updatedAt` | Auditoria | Avaliação de frescor (threshold 30 dias) |
| `icpFitScore` | `number \| null` | `Lead.icpFitScore` \| `Company.score` (0-100) | Inteligência Analítica | Priorização objetiva de contas |
| `temperature` | `'HOT' \| 'WARM' \| 'COLD' \| 'UNKNOWN'` | `Lead.temperature` | Inteligência Analítica | Cadência de contato e timing de abordagem |
| `firmographics` | `FirmographicsData` | `Company.industry`, `revenue`, `employees`, `country`, `state`, `city` | Dados Corporativos Públicos | Qualificação BDR/SDR e aderência ao ICP |
| `technologies` | `string[]` | `Company.technologies` | Dados Tecnológicos Públicos | Battlecards técnicos e argumentos do Closer |
| `intentSignals` | `IntentSignal[]` | `Company.intentSignals` / Telemetria | Auditoria Comercial | Gatilhos de compra e urgência de contato |
| `commercialHistory` | `CommercialHistory` | `Lead.interactions`, `PipelineStage`, `tasks` | Interações Comerciais | Diagnóstico de pipeline e cadência ativa |
| `stagnation` | `StagnationIndicator` | `Lead.lastContactDate`, `Lead.stageEnteredAt` | Indicador de Risco | Alerta de perda de timing e reengajamento |
| `completeness` | `number` (0-100) | Calculado via `calculateCompleteness()` | Qualidade de Dados | Decisão de recomendação de reenriquecimento |
| `confidence` | `ConfidenceLevel` | `EnrichmentProvider.confidence` \| Padrão `HIGH`/`MEDIUM`/`LOW` | Confiabilidade | Alinhamento da agressividade da recomendação |

---

## 3. MATRIZ DE CONSUMO POR AGENTES ESPECIALISTAS

| Agente | Ferramentas Autorizadas | Campos Consumidos | Ações Sugeridas / Saídas | Restrições Rígidas (Guardrails) |
| :--- | :--- | :--- | :--- | :--- |
| **BDRAgent** | `search_leads`, `get_lead_context`, `search_companies` | `icpFitScore`, `firmographics`, `technologies`, `intentSignals`, `completeness` | Priorização de prospecção, roteiro de abordagem fria, identificação de gaps cadastrais. | Somente leitura de dados; proibido disparo de mensagens diretas sem aprovação humana. |
| **SDRQualificationAgent** | `get_lead_context`, `search_leads` | `temperature`, `icpFitScore`, `firmographics`, `stagnation`, `commercialHistory` | Perguntas cirúrgicas de qualificação (SPIN/BANT), sugestão de agendamento de demo. | Não altera estágio do lead para "Qualificado" sem comprovação de critérios objetivos. |
| **CRMAgent** | `search_leads`, `get_lead_context`, `check_deal_health` | `stagnation` (dias sem contato, alerta), `temperature`, `completeness`, `commercialHistory` | Diagnóstico de estagnação de funil, sugestão de reativação, recomendação de reenriquecimento. | Não move leads de estágio automaticamente; não arquiva sem confirmação humana. |
| **CloserAgent** | `get_lead_context`, `check_deal_health`, `get_objection_battlecard`, `inspect_contract_readiness` | `icpFitScore`, `technologies`, `intentSignals`, `commercialHistory`, pendências contratuais | Estratégia de contorno de objeções, checklist de prontidão documental para fechamento. | **Trava B-07 / Anti-Win**: Proibido alterar status para `WON`, assinar minutas ou aplicar descontos. |
| **SupervisorAgent** | Orquestração interna via Hub | Intenção da missão do usuário, contexto sumarizado | Roteamento dinâmico para o especialista ideal com justificativa transparente. | Orçamento rígido de tokens (max 10 passos); interrupção com solicitação de aprovação humana para ações críticas. |

---

## 4. MATRIZ DE DISPATCH E EVENTOS EM TEMPO REAL (SSE & REDIS)

| Evento | Origem | Canal Redis Pub/Sub | Propagação SSE | Consumidores de UI | Efeito na Interface |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `company-enriched` | `enrichmentCascade.service.ts` / `enrichment.queue.ts` | `crm:enrichment:{tenantId}` | `sseService.sendToOrganization(tenantId, 'company-enriched', payload)` | `CrmBoard.tsx`, `KanbanCard.tsx`, `LeadDetailDrawer.tsx` | Atualização reativa de badges de ICP Fit, Temperatura, Firmografia e chips de tecnologia sem reload. |
| `lead-stagnation-alert` | `CRMAgent` / Cron de Pipeline | `crm:pipeline:{tenantId}` | SSE Event `lead-stagnation-alert` | `CrmBoard.tsx`, `ContextualCopilot.tsx` | Alerta visual em vermelho/laranja nos cards de Kanban com mais de 7/14 dias sem contato. |
| `copilot-stream` | `IntelligenceHub` / `SupervisorAgent` | Canal interno de sessão | SSE Token Stream | `ContextualCopilot.tsx`, `EliteCommercialAgentWorkspace.tsx` | Respostas assistidas com justificativa, citações de evidências, confiança e botão "Executar com Aprovação". |

---

## 5. RESUMO DE CONFORMIDADE E AUDITORIA

- **Isolamento de Tenant:** Todas as ferramentas e queries exigem obrigatoriamente `organizationId` obtido de contexto seguro (`getTenantId()`). Queries sem tenant são rejeitadas com erro de arquitetura.
- **Tratamento de PII:** Campos sensíveis de contato são anonimizados/tokenizados nas saídas de contexto destinadas a LLMs externos.
- **Transparência Algorítmica:** Nenhuma nota de ICP Fit ou temperatura gera automação invisível; todas as recomendações incluem o bloco explicativo `EVIDÊNCIAS CONSULTADAS` e `LIMITAÇÕES/INCERTEZAS`.
