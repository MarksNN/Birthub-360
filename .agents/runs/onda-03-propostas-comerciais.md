# MEMÓRIA TÉCNICA — EVOLUÇÃO 11: RASCUNHO AUTOMÁTICO DE PROPOSTAS COMERCIAIS E ASSINATURA DIGITAL
**Onda:** 03 — Autonomia Comercial: Agentes Autônomos Supervisionados e Execução Multicanal Confiável  
**Agente Responsável:** Agente 04 — CRM e BI / Agente 18 — Contratos, API e Documentação Viva  
**Revisão:** 2026-10-18  
**Status:** IMPLEMENTADO & HOMOLOGADO (100% TESTES PASS)  
**Branch:** `integracao/onda-03`

---

## 1. Contexto e Objetivo
Automatizar a geração e estruturação de propostas comerciais de alto valor (`proposalAutomation.service.ts`), consolidando escopo técnico, tabela de preços, condições contratuais, SLAs e integração transparente com plataformas de assinatura digital (ex: DocuSign / Clicksign / ZapSign) mediante aprovação humana obrigatória para descontos fora da alçada padrão.

---

## 2. Contratos e Interfaces Formais
Arquivo de contrato: `src/shared/contracts/proposalAutomation.contract.ts`
- `ProposalDraftInput`: Oportunidade, itens de produto/serviço, descontos solicitados, prazo de vigência, dados do signatário e organização.
- `CommercialProposal`: Estrutura canônica contendo sumário executivo, cronograma de implantação, precificação discriminada, hash SHA-256 de integridade e status de aprovação (`draft`, `pending_approval`, `ready_for_signature`, `sent_for_signature`, `signed`).
- `EsignatureRequest`: Metadados para despacho à API de assinatura digital (destinatários, posições de rubrica/assinatura, webhook de callback e prazo de validade).

---

## 3. Implementação Técnica
Arquivo de serviço: `src/features/proposals/proposalAutomation.service.ts`
- **Geração de Rascunho com IA e Templates:**
  - Extração contextual das dores e necessidades mapeadas no CRM para redigir o sumário executivo personalizado.
  - Composição matemática do Total Contract Value (TCV), Annual Recurring Revenue (ARR) e Monthly Recurring Revenue (MRR).
- **Alçadas e Limites de Desconto (Governance Gate):**
  - Descontos de até 10%: Aprovados automaticamente pelas regras da política comercial.
  - Descontos acima de 10%: Proposta entra em status `pending_approval`, notificando o gerente comercial e emitindo evento `PROPOSAL_APPROVAL_REQUIRED`.
- **Despacho para Assinatura Digital:**
  - Após aprovação, a proposta é renderizada em PDF/documento oficial, o hash criptográfico do documento é gerado e a requisição de assinatura é enviada.
  - Evento canônico emitido no mesh: `PROPOSAL_DISPATCHED_FOR_SIGNATURE`.

---

## 4. Testes de Unidade e Integração
- `tests/unit/proposals/proposalAutomation.service.test.ts`:
  - Cálculo exato de valores monetários e tabelas de parcelamento.
  - Bloqueio de envio e retenção em rascunho com exigência de aprovação para descontos superiores a 10%.
  - Geração de pacote de assinatura digital com signatários validados.
  - Emissão de eventos de auditoria no `DomainEventMesh`.
- `tests/integration/onda03ComprehensiveFlow.integration.test.ts` (Jornada C).

---

## 5. Integridade Contratual e Rastreabilidade
- **Hash de Integridade:** Cada versão de proposta possui hash SHA-256 garantindo que o documento assinado é idêntico ao rascunho validado pelo comitê.
- **Auditoria Jurídica:** Registro imutável de quem autorizou concessões extraordinárias e quem assinou digitalmente com IP, data e certificado.
