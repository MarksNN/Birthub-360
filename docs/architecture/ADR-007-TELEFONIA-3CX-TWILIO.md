# ADR-007: Arquitetura de Provedores de Telefonia — 3CX SIP/WebRTC vs Twilio Voice
**Status:** ACCEPTED  
**Data:** 2026-10-22  
**Autor:** Agente 12 (Voz e Telefonia) & Agente 10 (Infraestrutura e SRE)  
**Decisores:** Agente 00 (Coordenador), Agente 15 (Segurança), Agente 24 (Revisão Independente)

## 1. Contexto
A plataforma Birth Hub 360° opera módulos de telefonia comercial de alta performance, incluindo discagem ativa (Power/Predictive Dialer), SDR Autônomo e análise conversacional de chamadas receptivas e ativas.

Existem dois cenários operacionais distintos:
1. Clientes Enterprise com PBX corporativo on-premise ou cloud privada baseado em 3CX SIP/WebRTC.
2. Clientes com operação cloud-native sob demanda sem infraestrutura prévia de PABX, demandando provisionamento instantâneo via Twilio Voice.

## 2. Decisão Arquitetural
Adota-se uma **arquitetura híbrida desacoplada por adaptador de telefonia (Port & Adapter pattern)**:

1. **3CX SIP/WebRTC (Conector Primário Enterprise)**:
   - Utilizado quando o tenant possuir ramais dedicados configurados e PBX 3CX registrado em `Integration`.
   - Comunicação direta via SIP Trunking e WebRTC Gateway local.
   - Vantagens: Tarifa zero entre ramais, retenção de gravações na infraestrutura corporativa do cliente.

2. **Twilio Voice (Conector Cloud Elástico)**:
   - Utilizado como fallback automático ou provedor sob demanda para clientes sem PABX próprio.
   - Roteamento via WebRTC browser client e webhook de eventos de chamada.
   - Tarifação por minuto com débito em saldo de créditos do tenant.

## 3. Critérios de Ativação e Roteamento
- Cada chamada consulta a configuração de telefonia em `tenant_scoping_registry`:
  - Se `telephonyProvider == '3CX'` e credenciais ativas: rota 3CX.
  - Se `telephonyProvider == 'TWILIO'`: rota Twilio Voice.
  - Fallback automático para Twilio caso o SIP Gateway 3CX esteja inacessível (timeout > 3s).

## 4. Conformidade e Segurança
- Gravações e transcrições passam obrigatoriamente pelo `piiTokenizer` antes de persistência.
- Todas as chamadas geram evento de tarifação `TELEPHONY_CALL_BILLED` no `DomainEventMesh`.
