# MATRIZ DE SEGURANÇA, PRIVACIDADE E CONFORMIDADE LGPD — ONDA 03
**Onda:** 03 — Autonomia Comercial: Agentes Autônomos Supervisionados e Execução Multicanal Confiável  
**Agente Responsável:** Agente 01 — Plataforma, Segurança e Dados / Agente 21 — Privacidade e LGPD / Agente 15 — Segurança Aplicada  
**Revisão:** 2026-10-18  
**Status:** CONFORME & AUDITADO  
**Branch:** `integracao/onda-03`

---

## 1. Princípios de Proteção de Dados e Tenancy

Toda a arquitetura da Onda 03 foi projetada respeitando os princípios fundamentais da Lei Geral de Proteção de Dados (Lei 13.709/2018) e o isolamento rígido multi-tenant do Birthub 360°.

### 1.1 Opt-Out Unificado e Direito do Titular (Art. 18 LGPD)
- **Centralização de Consentimento:** O `OptOutRepository` mantém um registro indexado de leads que manifestaram intenção de descadastramento.
- **Efeito Cascata Imediato:** Qualquer solicitação de opt-out em um canal (ex: WhatsApp) revoga o consentimento para todos os canais de prospecção ativa (`email`, `voice`, `whatsapp`).
- **Persistência Inviolável:** Registros de opt-out são protegidos contra exclusões acidentais, servindo como base de defesa regulatória e bloqueio operacional automático.

### 1.2 Calling Hours e Prevenção de Abuso em Telecomunicações
- **Barreira Regulatória:** A discagem ativa pelo SDR Autônomo é estritamente condicionada à verificação de horário local (`coldCall.policy.ts`).
- **Bloqueio Nativo:** Chamadas fora do horário das 08:00 às 18:00 ou em fins de semana e feriados são interceptadas no núcleo da aplicação antes do envio de comandos à operadora/gateway SIP.

### 1.3 Alçadas de Segurança em Operações Financeiras e Contratuais
- **Proteção contra Concessões Indevidas:** A IA geradora de propostas comerciais não possui autonomia para emitir contratos com descontos superiores a 10% sem a assinatura digital/aprovação expressa do gestor comercial.
- **Assinatura Digital Auditável:** Geração de hash SHA-256 no rascunho de proposta comercial para prevenir fraudes, adulterações ou desalinhamentos contratuais entre aprovação e envio.

### 1.4 Limites de Autonomia de Agentes (Circuit Breakers)
- **Tiers Estritos:** Agentes de IA operam em tiers pré-definidos (Tier 0 a Tier 3). Nenhuma alteração irreversível de estado do CRM é feita sem chancela humana prévia.
- **Desarme Automático de Emergência:** Caso a taxa de erro ou intervenção em um agente de IA exceda 5%, o `autonomyGovernor.service.ts` desarma o agente automaticamente, reduzindo seu privilégio a modo estritamente consultivo.

---

## 2. Matriz de Controles e Evidências

| Item de Risco | Controle Implementado | Evidência de Verificação |
|---|---|---|
| **Vazamento Cross-Tenant de Leads** | Filtro obrigatório de `organizationId` em todas as consultas e eventos do Mesh | Teste de unidade e integração comprovando isolamento total entre Tenant Alpha e Beta |
| **Contatos após Descadastramento** | Verificação prévia de `isOptedOut` no `adaptiveMultichannelCadence.service.ts` e `selfDrivingCrm.service.ts` | Teste unitário de opt-out unificado (100% PASS) |
| **Perturbação Fora do Horário** | Validação de fuso horário e janela comercial em `autonomousSdr.service.ts` | Teste `bloqueia chamadas fora do horário comercial permitido` (PASS) |
| **Adulteração de Propostas** | Hash SHA-256 gerado no backend e anexado ao payload de assinatura | Teste `gera proposta com hash de integridade e signatários` (PASS) |
| **Alucinação / Ação Não Autorizada de IA** | Trava de alçada no `autonomyGovernor.service.ts` com gate humano | Teste `bloqueia ações de alto risco exigindo aprovação humana` (PASS) |
