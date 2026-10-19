# POLÍTICA E TESTES DE GEOFENCING CONSENTIDO (EIXO 9)
**Data:** 18 de Outubro de 2026  
**Especialistas:** Agente 09 (Mobile) & Agente 21 (Privacidade e LGPD)  
**Status:** HOMOLOGADO  

---

## 1. Diretrizes Invioláveis de Geofencing

1. **Opt-In Explícito:** A funcionalidade de geofencing só processa coordenadas se o vendedor tiver habilitado voluntariamente o opt-in. Sem opt-in, as coordenadas são descartadas sem cálculo.
2. **Proibição de Gravação Automática:** Entrar no raio geográfico de um cliente **NUNCA** inicia gravação de áudio, envio de mensagem ou alteração de status de CRM automaticamente (`autoRecordingProhibited: true`).
3. **Apenas Sugestão Contextual:** A única ação permitida é sugerir ao vendedor a abertura do briefing pré-visita armazenado no cache local.
4. **Sem Rastreamento Contínuo:** As coordenadas não são enviadas a servidores remotos para fins de vigilância ou monitoramento de rota.
