# PLANO DE AÇÕES REMANESCENTES (PRIORIZADO POR BLOQUEIO DE PRODUÇÃO)

**Projeto:** Birth Hub 360° / Birthub 360  
**Data:** 2026-10-17  
**Autoridade:** Agente 00 (Coordenação Global) & Agente 08 (QA/Release)  

---

## 1. AÇÕES OBRIGATÓRIAS ANTES DO DEPLOY EM PRODUÇÃO (BLOQUEANTES)

| Item | Ação | Responsável | Pré-Requisito | Critério de Conclusão |
| :---: | :--- | :---: | :---: | :--- |
| **A-01** | **Autorização Humana Explícita:** Apresentar este pacote consolidado ao proprietário do repositório para aprovação de merge na `main` e deploy. | Agente 00 / Humano | Parecer 24 APROVADO | Veredito humano formal de aceite do GO CONDICIONAL. |
| **A-02** | **Deploy Controlado em Staging:** Publicar a imagem Docker em ambiente de homologação/staging com migrações aplicadas. | Agente 08A / 10 | A-01 | Containers ativos respondendo 200 em `/health/ready` e `/health/live`. |
| **A-03** | **Smoke Test Integrado com Usuários Sintéticos:** Executar as 6 jornadas no staging validando: discador VoiceHub com número de teste, roleplay com persona de teste e upload mobile. | Agente 08 | A-02 | Evidências salvas em CloudWatch / PostgreSQL sem erros 5xx. |

---

## 2. AÇÕES NÃO BLOQUEANTES (PÓS-LANÇAMENTO / MELHORIA CONTÍNUA)

| Item | Ação | Responsável | Prazo Alvo | Justificativa |
| :---: | :--- | :---: | :---: | :--- |
| **B-01** | **Upgrade de Plano GitHub (Opcional):** Avaliar migração para GitHub Pro ou Team para habilitar branch protection rulesets nativos. | Operações / Humano | Sprint seguinte | Controle atual suprido por gates locais e revisão independente. |
| **B-02** | **Refatoração Modular de Hotspots Acima de 800 Linhas:** Modularizar componentes extensos como `NewLoginScreen.tsx` (1591L) e `Landing360.tsx` (1951L). | Agente 02 / 03 | 2026-11-30 | Hotspots cobertos por exceções ativas em `HOTSPOT_EXCEPTIONS.md`. |
| **B-03** | **Saneamento da Deriva Estrutural DATA-007:** Alinhar nomenclatura de índices truncados em 63 bytes do Postgres em migration de saneamento. | Agente 01 | 2026-11-30 | Não impacta o runtime nem a integridade transacional da aplicação. |
| **B-04** | **Revisão de Redundância SonarQube:** Ajustar `sonarqube.yml` para baixar artefato de cobertura de `ci.yml` em vez de re-executar os testes unitários. | Agente 08 | Próxima onda de CI | Economizar minutos de runner do GitHub Actions (otimização de custo FinOps). |
