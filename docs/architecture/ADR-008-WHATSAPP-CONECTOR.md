# ADR-008: Conectividade WhatsApp — Baileys (Sessão Multi-Device no PostgreSQL) vs Cloud API Oficial (Meta)
**Status:** ACCEPTED  
**Data:** 2026-10-22  
**Autor:** Agente 06 (Integrações e Bitrix) & Agente 17 (Cadência Multicanal)  
**Decisores:** Agente 00 (Coordenador), Agente 15 (Segurança), Agente 21 (Privacidade e LGPD), Agente 24 (Revisão Independente)

## 1. Contexto
O canal WhatsApp é o principal vetor de engajamento comercial de pré-vendas e SDR autônomo no Brasil.
As operações comerciais demandam:
- Ativação ágil via QR Code para números corporativos existentes dos vendedores (SDRs/Closers).
- Disparos massivos homologados de templates oficiais para cadências de outbound em escala com selo verificado.

## 2. Decisão Arquitetural
Adota-se a convivência arquitetural de dois drivers sob a interface unificada `WhatsAppConnectorManager`:

1. **Baileys Multi-Device (Driver de Conexão Direta com Sessão Persistida no Postgres/Redis)**:
   - Destinado ao uso pessoal dos vendedores para atendimento humanizado e espelhamento no CRM.
   - Estado de autenticação salvo via `useRedisAuthState` com criptografia em repouso.
   - Zero dependência de aprovação de templates pela Meta para conversas iniciadas pelo vendedor.

2. **WhatsApp Cloud API Oficial (Meta Graph API)**:
   - Destinado a cadências automatizadas e notificações transacionais de alta escala.
   - Exige templates aprovados (HSM) e opt-in explícito do destinatário verificado contra `ConsentAuditChain`.
   - Risco zero de bloqueio de número por banimento em envios de grande porte.

## 3. Regras de Proteção LGPD
- Qualquer envio (via Baileys ou Cloud API) consulta obrigatoriamente a tabela de opt-out antes do envio.
- Mensagens com "SAIR", "STOP" ou "CANCELAR" ativam imediatamente o expurgo do canal.
