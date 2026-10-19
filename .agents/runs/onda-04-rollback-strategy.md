# PLANO DE ROLLBACK E FEATURE FLAGS — ONDA 04
**Data:** 18 de Outubro de 2026  
**Especialistas:** Agente 08 (QA e Release) & Agente 10 (Infraestrutura)  
**Status:** HOMOLOGADO  

---

## 1. Feature Flags da Onda 04

Cada eixo da Onda 04 é controlado por feature flag individual:
- `FF_BIMODAL_LIVE_VOICE`: Ativa copiloto de voz em tempo real (fallback automático para pipeline convencional se desativada).
- `FF_METHODOLOGICAL_DIGITAL_TWIN`: Ativa mentoria baseada em técnicas comprovadas.
- `FF_MOBILE_EDGE_AI`: Ativa briefings offline e geofencing no mobile.
- `FF_WAR_ROOM_ARENA`: Ativa módulo de duelos e torneios de vendas.
- `FF_SHADOW_COPYWRITING`: Ativa personalização consentida de estilo comercial.

---

## 2. Estratégia de Rollback

1. **Rollback Funcional via Feature Flags:** Desativação instantânea em runtime sem necessidade de redeploy ou interrupção de serviço.
2. **Rollback de Código:** Caso seja necessária reversão de commit:
   `git revert -m 1 <commit-hash-de-merge>`
3. **Sem Migrations Destrutivas:** Como a Onda 04 não alterou o schema do Prisma nem gerou migrações de banco, não há risco de inconsistência estrutural no PostgreSQL.
