# REGRAS DE AVALIAÇÃO E GAMIFICAÇÃO DA ARENA (EIXO 14)
**Data:** 18 de Outubro de 2026  
**Especialistas:** Agente 13 (Swarm), Agente 04 (CRM & BI) e Agente 08 (QA)  
**Status:** HOMOLOGADO  

---

## 1. Critérios Pedagógicos Objetivos

A IA avalia cada resposta na Arena através de 4 critérios transparentes:
- **Identificação da Dor / Necessidade (0 a 30 pts):** O vendedor reconhece a trava real por trás da objeção.
- **Ancoragem de Valor e ROI (0 a 30 pts):** Conexão com retorno financeiro ou eficiência operacional mensurável.
- **Aderência ao Playbook (0 a 25 pts):** Aplicação de técnicas oficiais validadas na operação.
- **Clareza e Empatia (0 a 15 pts):** Tom profissional, escuta ativa e ausência de agressividade comercial.

---

## 2. Idempotência e Persistência de Recompensas

Para evitar fraudes, reprocessamentos indevidos ou duplicação de pontos:
1. **Hash de Idempotência:** Chave única composta por `SHA256(orgId:matchId:winnerId)`.
2. **Recompensa Unificada:** Integração direta com `behavioralEngineService.rewardSellerXp` e `calculateSellerLevel`.
3. **Persistência Real:** Leaderboards atualizados somente via transações auditadas de backend.
